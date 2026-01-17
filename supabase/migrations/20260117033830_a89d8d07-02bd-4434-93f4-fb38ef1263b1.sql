
-- Fix recalculate function - proper GROUP BY
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
  -- Get aggregated order data for each SKU, JOIN with products for MASTER pricing
  FOR v_record IN
    WITH order_items AS (
      SELECT 
        eo.tenant_id,
        item->>'sku' as sku,
        item->>'product_name' as item_product_name,
        COALESCE((item->>'quantity')::INTEGER, 1) as qty,
        eo.order_date,
        eo.id as order_id
      FROM external_orders eo
      CROSS JOIN LATERAL jsonb_array_elements(eo.items) as item
      WHERE eo.tenant_id = p_tenant_id
        AND eo.order_date >= NOW() - INTERVAL '30 days'
        AND eo.status NOT IN ('cancelled', 'returned')
        AND (p_sku IS NULL OR item->>'sku' = p_sku)
    )
    SELECT 
      oi.tenant_id,
      oi.sku,
      COALESCE(p.name, MAX(oi.item_product_name), oi.sku) as product_name,
      p.id as product_id,
      COALESCE(p.selling_price, 0) as unit_price,
      COALESCE(p.cost_price, 0) as unit_cost,
      COUNT(DISTINCT oi.order_id) as order_count,
      SUM(oi.qty) as total_qty,
      SUM(oi.qty * COALESCE(p.selling_price, 0)) as total_revenue,
      SUM(oi.qty * COALESCE(p.cost_price, 0)) as total_cost,
      MAX(oi.order_date) as last_order
    FROM order_items oi
    LEFT JOIN products p ON p.tenant_id = oi.tenant_id AND p.sku = oi.sku
    GROUP BY oi.tenant_id, oi.sku, p.id, p.name, p.selling_price, p.cost_price
  LOOP
    INSERT INTO product_metrics (
      tenant_id, sku, product_name, product_id, unit_price, unit_cost,
      total_orders_30d, total_quantity_30d, total_revenue_30d, total_cost_30d,
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
      COALESCE(v_record.total_qty, 0),
      COALESCE(v_record.total_revenue, 0),
      COALESCE(v_record.total_cost, 0),
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
      last_calculated_at = NOW(),
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;
