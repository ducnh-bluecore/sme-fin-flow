-- Fix text=uuid type mismatch in get_sku_profitability_by_date_range
-- Must DROP first because return type differs from existing function

DROP FUNCTION IF EXISTS public.get_sku_profitability_by_date_range(uuid, date, date, integer);

CREATE FUNCTION public.get_sku_profitability_by_date_range(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_limit integer DEFAULT 500
)
RETURNS TABLE(
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
    COALESCE(coi.sku, 'Unknown')::TEXT AS sku,
    COALESCE(p.name, coi.product_name, coi.sku, 'Unknown')::TEXT AS product_name,
    COALESCE(co.channel, 'Unknown')::TEXT AS channel,
    COUNT(DISTINCT co.id) AS order_count,
    COALESCE(SUM(coi.quantity), 0)::NUMERIC AS total_quantity,
    COALESCE(SUM(coi.line_total), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(coi.cogs_amount), 0)::NUMERIC AS total_cogs,
    (COALESCE(SUM(coi.line_total), 0) - COALESCE(SUM(coi.cogs_amount), 0))::NUMERIC AS gross_profit,
    CASE 
      WHEN COALESCE(SUM(coi.line_total), 0) > 0 
      THEN ROUND(((COALESCE(SUM(coi.line_total), 0) - COALESCE(SUM(coi.cogs_amount), 0)) / COALESCE(SUM(coi.line_total), 0) * 100)::NUMERIC, 2)
      ELSE 0
    END AS margin_percent
  FROM cdp_order_items coi
  JOIN cdp_orders co ON co.id = coi.order_id AND co.tenant_id = coi.tenant_id
  -- Safe JOIN with regex guard: only cast to uuid if product_id matches UUID format
  LEFT JOIN products p ON p.tenant_id = coi.tenant_id
    AND p.id = CASE
      WHEN coi.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN coi.product_id::uuid
      ELSE NULL
    END
  WHERE coi.tenant_id = p_tenant_id
    AND co.order_date >= p_start_date
    AND co.order_date <= p_end_date
    AND co.status NOT IN ('cancelled', 'returned', 'refunded')
  GROUP BY coi.sku, p.name, coi.product_name, co.channel
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_sku_profitability_by_date_range(uuid, date, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sku_profitability_by_date_range(uuid, date, date, integer) TO anon;