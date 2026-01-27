-- ============================================
-- FIX: get_sku_profitability_by_date_range
-- ============================================
-- Issue: RPC using wrong column names from cdp_order_items
-- Fix: quantity → qty, total_amount → line_revenue, cogs_amount → line_cogs

DROP FUNCTION IF EXISTS get_sku_profitability_by_date_range(uuid, date, date, integer);

CREATE OR REPLACE FUNCTION get_sku_profitability_by_date_range(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  sku TEXT,
  product_name TEXT,
  channel TEXT,
  order_count BIGINT,
  total_quantity BIGINT,
  total_revenue NUMERIC,
  total_cogs NUMERIC,
  gross_profit NUMERIC,
  margin_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.sku, coi.product_id)::TEXT as sku,
    COALESCE(p.name, 'Product ' || coi.product_id)::TEXT as product_name,
    co.channel::TEXT as channel,
    COUNT(DISTINCT co.id)::BIGINT as order_count,
    -- FIX: qty thay vì quantity
    SUM(coi.qty)::BIGINT as total_quantity,
    -- FIX: line_revenue thay vì total_amount
    SUM(coi.line_revenue)::NUMERIC as total_revenue,
    -- FIX: line_cogs thay vì cogs_amount (with fallback to 55% if null)
    SUM(COALESCE(coi.line_cogs, coi.line_revenue * 0.55))::NUMERIC as total_cogs,
    -- Derived: gross_profit = revenue - cogs
    (SUM(coi.line_revenue) - SUM(COALESCE(coi.line_cogs, coi.line_revenue * 0.55)))::NUMERIC as gross_profit,
    -- Derived: margin_percent
    CASE 
      WHEN SUM(coi.line_revenue) > 0 
      THEN ROUND(
        ((SUM(coi.line_revenue) - SUM(COALESCE(coi.line_cogs, coi.line_revenue * 0.55))) / SUM(coi.line_revenue) * 100)::NUMERIC, 
        2
      )
      ELSE 0
    END as margin_percent
  FROM cdp_order_items coi
  INNER JOIN cdp_orders co ON coi.order_id = co.id AND coi.tenant_id = co.tenant_id
  LEFT JOIN products p ON coi.product_id = p.id AND coi.tenant_id = p.tenant_id
  WHERE coi.tenant_id = p_tenant_id
    AND co.order_at::date >= p_start_date
    AND co.order_at::date <= p_end_date
    AND co.status NOT IN ('cancelled', 'returned')
  GROUP BY 
    COALESCE(p.sku, coi.product_id),
    COALESCE(p.name, 'Product ' || coi.product_id),
    co.channel
  ORDER BY SUM(coi.line_revenue) DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sku_profitability_by_date_range(uuid, date, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sku_profitability_by_date_range(uuid, date, date, integer) TO anon;