
-- Update recalculate_product_metrics to use external_order_items table (SSOT)
-- Instead of parsing JSON from external_orders.items

CREATE OR REPLACE FUNCTION public.recalculate_product_metrics(
  p_tenant_id UUID,
  p_sku TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Get aggregated data from external_order_items (SSOT for order line items)
  -- JOIN with products for master pricing (if available)
  FOR v_record IN
    SELECT 
      eoi.tenant_id,
      eoi.sku,
      COALESCE(p.name, MAX(eoi.product_name), eoi.sku) as product_name,
      p.id as product_id,
      -- SSOT: Use master product pricing if available, otherwise use order item pricing
      COALESCE(p.selling_price, AVG(eoi.unit_price)) as unit_price,
      COALESCE(p.cost_price, AVG(eoi.unit_cogs)) as unit_cost,
      COUNT(DISTINCT eoi.external_order_id) as order_count,
      SUM(eoi.quantity) as total_qty,
      SUM(eoi.total_amount) as total_revenue,
      SUM(eoi.total_cogs) as total_cost,
      SUM(eoi.gross_profit) as total_profit,
      MAX(eoi.created_at) as last_order
    FROM external_order_items eoi
    LEFT JOIN external_orders eo ON eo.id = eoi.external_order_id
    LEFT JOIN products p ON p.tenant_id = eoi.tenant_id AND p.sku = eoi.sku
    WHERE eoi.tenant_id = p_tenant_id
      AND eo.order_date >= NOW() - INTERVAL '30 days'
      AND eo.status NOT IN ('cancelled', 'returned')
      AND COALESCE(eoi.is_returned, false) = false
      AND (p_sku IS NULL OR eoi.sku = p_sku)
      AND eoi.sku IS NOT NULL
    GROUP BY eoi.tenant_id, eoi.sku, p.id, p.name, p.selling_price, p.cost_price
  LOOP
    -- Calculate derived metrics
    DECLARE
      v_gross_margin NUMERIC;
      v_gross_margin_pct NUMERIC;
      v_profit_per_unit NUMERIC;
      v_avg_daily_qty NUMERIC;
      v_is_profitable BOOLEAN;
      v_profit_status TEXT;
    BEGIN
      v_gross_margin := v_record.unit_price - v_record.unit_cost;
      v_gross_margin_pct := CASE 
        WHEN v_record.unit_price > 0 THEN ((v_record.unit_price - v_record.unit_cost) / v_record.unit_price) * 100 
        ELSE 0 
      END;
      v_profit_per_unit := CASE 
        WHEN v_record.total_qty > 0 THEN v_record.total_profit / v_record.total_qty 
        ELSE v_gross_margin 
      END;
      v_avg_daily_qty := v_record.total_qty / 30.0;
      v_is_profitable := v_gross_margin_pct >= 10;
      v_profit_status := CASE 
        WHEN v_gross_margin_pct < 0 THEN 'critical'
        WHEN v_gross_margin_pct < 10 THEN 'marginal'
        ELSE 'profitable'
      END;
      
      INSERT INTO product_metrics (
        tenant_id, sku, product_name, product_id, unit_price, unit_cost,
        gross_margin, gross_margin_percent,
        total_orders_30d, total_quantity_30d, total_revenue_30d, total_cost_30d,
        gross_profit_30d, profit_per_unit, avg_daily_quantity,
        is_profitable, profit_status,
        last_order_date, last_calculated_at
      )
      VALUES (
        v_record.tenant_id,
        v_record.sku,
        v_record.product_name,
        v_record.product_id,
        v_record.unit_price,
        v_record.unit_cost,
        v_gross_margin,
        v_gross_margin_pct,
        v_record.order_count,
        v_record.total_qty,
        v_record.total_revenue,
        v_record.total_cost,
        v_record.total_profit,
        v_profit_per_unit,
        v_avg_daily_qty,
        v_is_profitable,
        v_profit_status,
        v_record.last_order,
        NOW()
      )
      ON CONFLICT (tenant_id, sku) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        product_id = EXCLUDED.product_id,
        unit_price = EXCLUDED.unit_price,
        unit_cost = EXCLUDED.unit_cost,
        gross_margin = EXCLUDED.gross_margin,
        gross_margin_percent = EXCLUDED.gross_margin_percent,
        total_orders_30d = EXCLUDED.total_orders_30d,
        total_quantity_30d = EXCLUDED.total_quantity_30d,
        total_revenue_30d = EXCLUDED.total_revenue_30d,
        total_cost_30d = EXCLUDED.total_cost_30d,
        gross_profit_30d = EXCLUDED.gross_profit_30d,
        profit_per_unit = EXCLUDED.profit_per_unit,
        avg_daily_quantity = EXCLUDED.avg_daily_quantity,
        is_profitable = EXCLUDED.is_profitable,
        profit_status = EXCLUDED.profit_status,
        last_order_date = EXCLUDED.last_order_date,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = NOW();
      
      v_count := v_count + 1;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Also update products table from external_order_items where products don't exist
-- This syncs master product data from order history
INSERT INTO products (tenant_id, sku, name, selling_price, cost_price, category, is_active)
SELECT DISTINCT ON (eoi.tenant_id, eoi.sku)
  eoi.tenant_id,
  eoi.sku,
  MAX(eoi.product_name) as name,
  AVG(eoi.unit_price) as selling_price,
  AVG(eoi.unit_cogs) as cost_price,
  SPLIT_PART(MAX(eoi.product_name), ' ', 1) as category,
  true
FROM external_order_items eoi
LEFT JOIN products p ON p.sku = eoi.sku AND p.tenant_id = eoi.tenant_id
WHERE p.id IS NULL 
  AND eoi.sku IS NOT NULL
  AND eoi.unit_price > 0
GROUP BY eoi.tenant_id, eoi.sku
ON CONFLICT (tenant_id, sku) DO NOTHING;
