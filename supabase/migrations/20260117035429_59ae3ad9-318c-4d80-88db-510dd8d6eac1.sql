
-- Fix function to not insert into generated columns
CREATE OR REPLACE FUNCTION public.recalculate_product_metrics(
  p_tenant_id UUID,
  p_sku TEXT DEFAULT NULL,
  p_days_back INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
  v_date_filter TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_days_back IS NOT NULL THEN
    v_date_filter := NOW() - (p_days_back || ' days')::INTERVAL;
  ELSE
    v_date_filter := '1970-01-01'::TIMESTAMP WITH TIME ZONE;
  END IF;

  FOR v_record IN
    SELECT 
      eoi.tenant_id,
      eoi.sku,
      COALESCE(p.name, MAX(eoi.product_name), eoi.sku) as product_name,
      p.id as product_id,
      COALESCE(p.selling_price, AVG(eoi.unit_price)) as unit_price,
      COALESCE(p.cost_price, AVG(eoi.unit_cogs)) as unit_cost,
      COUNT(DISTINCT eoi.external_order_id) as order_count,
      SUM(eoi.quantity) as total_qty,
      SUM(eoi.total_amount) as total_revenue,
      SUM(eoi.total_cogs) as total_cost,
      MAX(eo.order_date) as last_order
    FROM external_order_items eoi
    LEFT JOIN external_orders eo ON eo.id = eoi.external_order_id
    LEFT JOIN products p ON p.tenant_id = eoi.tenant_id AND p.sku = eoi.sku
    WHERE eoi.tenant_id = p_tenant_id
      AND eo.order_date >= v_date_filter
      AND eo.status NOT IN ('cancelled', 'returned')
      AND COALESCE(eoi.is_returned, false) = false
      AND (p_sku IS NULL OR eoi.sku = p_sku)
      AND eoi.sku IS NOT NULL
    GROUP BY eoi.tenant_id, eoi.sku, p.id, p.name, p.selling_price, p.cost_price
  LOOP
    -- Only insert non-generated columns
    -- Generated columns: gross_margin, gross_margin_percent, avg_daily_*, gross_profit_30d, profit_per_unit, days_of_stock, is_profitable, profit_status
    INSERT INTO product_metrics (
      tenant_id, sku, product_name, product_id, 
      unit_price, unit_cost,
      total_orders_30d, total_quantity_30d, 
      total_revenue_30d, total_cost_30d,
      last_order_date, last_calculated_at
    )
    VALUES (
      v_record.tenant_id,
      v_record.sku,
      v_record.product_name,
      v_record.product_id,
      v_record.unit_price,
      v_record.unit_cost,
      v_record.order_count,
      v_record.total_qty,
      v_record.total_revenue,
      v_record.total_cost,
      v_record.last_order,
      NOW()
    )
    ON CONFLICT (tenant_id, sku) DO UPDATE SET
      product_name = EXCLUDED.product_name,
      product_id = EXCLUDED.product_id,
      unit_price = EXCLUDED.unit_price,
      unit_cost = EXCLUDED.unit_cost,
      total_orders_30d = EXCLUDED.total_orders_30d,
      total_quantity_30d = EXCLUDED.total_quantity_30d,
      total_revenue_30d = EXCLUDED.total_revenue_30d,
      total_cost_30d = EXCLUDED.total_cost_30d,
      last_order_date = EXCLUDED.last_order_date,
      last_calculated_at = EXCLUDED.last_calculated_at,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
