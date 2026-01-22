-- Create function to calculate SKU profitability by date range
-- Following DB-First Metrics architecture - all calculations in database

CREATE OR REPLACE FUNCTION get_sku_profitability_by_date_range(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  sku TEXT,
  product_name TEXT,
  channel TEXT,
  total_quantity NUMERIC,
  total_revenue NUMERIC,
  total_cogs NUMERIC,
  total_fees NUMERIC,
  gross_profit NUMERIC,
  margin_percent NUMERIC,
  aov NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH order_items_in_range AS (
    SELECT 
      eoi.sku,
      eoi.product_name,
      eo.channel,
      COALESCE(eoi.quantity, 1) as quantity,
      COALESCE(eoi.line_total, eoi.unit_price * COALESCE(eoi.quantity, 1)) as revenue,
      -- Get unit cost from products table or estimate from order item
      COALESCE(p.unit_cost, eoi.unit_price * 0.6) as unit_cost,
      COALESCE(eoi.platform_fee, 0) + COALESCE(eoi.shipping_fee, 0) as fees
    FROM external_order_items eoi
    JOIN external_orders eo ON eo.id = eoi.order_id AND eo.tenant_id = eoi.tenant_id
    LEFT JOIN products p ON p.sku = eoi.sku AND p.tenant_id = eoi.tenant_id
    WHERE eoi.tenant_id = p_tenant_id
      AND eo.order_date >= p_start_date
      AND eo.order_date <= p_end_date
      AND eo.status NOT IN ('cancelled', 'returned', 'refunded')
  ),
  aggregated AS (
    SELECT 
      oi.sku,
      MAX(oi.product_name) as product_name,
      STRING_AGG(DISTINCT oi.channel, ', ') as channel,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.revenue) as total_revenue,
      SUM(oi.unit_cost * oi.quantity) as total_cogs,
      SUM(oi.fees) as total_fees
    FROM order_items_in_range oi
    WHERE oi.sku IS NOT NULL
    GROUP BY oi.sku
  )
  SELECT 
    a.sku,
    a.product_name,
    a.channel,
    a.total_quantity,
    a.total_revenue,
    a.total_cogs,
    a.total_fees,
    (a.total_revenue - a.total_cogs - a.total_fees) as gross_profit,
    CASE 
      WHEN a.total_revenue > 0 THEN 
        ROUND(((a.total_revenue - a.total_cogs - a.total_fees) / a.total_revenue * 100)::numeric, 2)
      ELSE 0 
    END as margin_percent,
    CASE 
      WHEN a.total_quantity > 0 THEN ROUND((a.total_revenue / a.total_quantity)::numeric, 0)
      ELSE 0 
    END as aov,
    CASE 
      WHEN a.total_revenue > 0 AND ((a.total_revenue - a.total_cogs - a.total_fees) / a.total_revenue * 100) >= 10 THEN 'profitable'
      WHEN a.total_revenue > 0 AND ((a.total_revenue - a.total_cogs - a.total_fees) / a.total_revenue * 100) >= 0 THEN 'marginal'
      ELSE 'loss'
    END as status
  FROM aggregated a
  WHERE a.total_revenue > 0
  ORDER BY a.total_revenue DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sku_profitability_by_date_range(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sku_profitability_by_date_range(UUID, DATE, DATE) TO anon;