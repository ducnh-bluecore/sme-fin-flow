
-- RPC to aggregate inv_state_positions without row limits
-- Joins with products to get cost_price for locked cash calculation
CREATE OR REPLACE FUNCTION public.fn_inv_overview_stats(p_tenant_id uuid)
RETURNS TABLE(total_units bigint, locked_cash numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(isp.on_hand), 0)::bigint AS total_units,
    COALESCE(SUM(isp.on_hand * COALESCE(p.cost_price, 0)), 0)::numeric AS locked_cash
  FROM inv_state_positions isp
  LEFT JOIN products p ON p.sku = isp.sku AND p.tenant_id = isp.tenant_id
  WHERE isp.tenant_id = p_tenant_id;
$$;
