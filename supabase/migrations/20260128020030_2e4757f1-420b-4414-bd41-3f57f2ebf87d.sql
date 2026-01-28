-- Fix: Change p.code to p.sku (products table has 'sku' column, not 'code')
DROP FUNCTION IF EXISTS public.get_sku_profitability_by_date_range(uuid, date, date, integer);

CREATE OR REPLACE FUNCTION public.get_sku_profitability_by_date_range(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  sku text,
  product_name text,
  channel text,
  order_count bigint,
  total_quantity numeric,
  total_revenue numeric,
  total_cogs numeric,
  gross_profit numeric,
  margin_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.sku, coi.product_id, 'Unknown')::text AS sku,
    COALESCE(p.name, 'Unknown')::text AS product_name,
    COALESCE(co.channel, 'Unknown')::text AS channel,
    COUNT(DISTINCT coi.order_id) AS order_count,
    COALESCE(SUM(coi.qty), 0)::numeric AS total_quantity,
    COALESCE(SUM(coi.line_revenue), 0)::numeric AS total_revenue,
    COALESCE(SUM(coi.line_cogs), 0)::numeric AS total_cogs,
    COALESCE(SUM(coi.line_revenue) - SUM(coi.line_cogs), 0)::numeric AS gross_profit,
    CASE 
      WHEN COALESCE(SUM(coi.line_revenue), 0) > 0 
      THEN ROUND(((SUM(coi.line_revenue) - SUM(coi.line_cogs)) / SUM(coi.line_revenue) * 100)::numeric, 2)
      ELSE 0
    END AS margin_percent
  FROM cdp_order_items coi
  INNER JOIN cdp_orders co ON co.id = coi.order_id AND co.tenant_id = coi.tenant_id
  LEFT JOIN products p ON p.tenant_id = coi.tenant_id
    AND p.id = CASE
      WHEN coi.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN coi.product_id::uuid
      ELSE NULL
    END
  WHERE coi.tenant_id = p_tenant_id
    AND co.order_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY 
    COALESCE(p.sku, coi.product_id, 'Unknown'),
    COALESCE(p.name, 'Unknown'),
    COALESCE(co.channel, 'Unknown')
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_sku_profitability_by_date_range(uuid, date, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sku_profitability_by_date_range(uuid, date, date, integer) TO anon;