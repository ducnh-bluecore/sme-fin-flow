
-- Fix get_actual_monthly_revenue: use lower(status) and net_revenue instead of gross_revenue
CREATE OR REPLACE FUNCTION public.get_actual_monthly_revenue(
  p_tenant_id uuid,
  p_months text[]
)
RETURNS TABLE(month text, actual_revenue numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(o.order_at, 'YYYY-MM') AS month,
    COALESCE(SUM(o.net_revenue), 0)::numeric AS actual_revenue
  FROM public.cdp_orders o
  WHERE o.tenant_id = p_tenant_id
    AND lower(o.status) NOT IN ('cancelled', 'canceled', 'returned', 'refunded', 'shipped_back_success', 'to_return', 'to_confirm_receive')
    AND to_char(o.order_at, 'YYYY-MM') = ANY(p_months)
  GROUP BY to_char(o.order_at, 'YYYY-MM')
  ORDER BY month;
END;
$$;
