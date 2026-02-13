
CREATE OR REPLACE FUNCTION public.fn_store_size_heatmap(p_tenant_id text)
RETURNS TABLE(
  store_id uuid, store_name text, region text,
  broken int, risk int, watch int, healthy int,
  lost_revenue numeric, cash_locked numeric
) AS $$
  SELECT 
    s.id,
    s.store_name,
    s.region,
    COUNT(*) FILTER (WHERE h.curve_state = 'broken')::int,
    COUNT(*) FILTER (WHERE h.curve_state = 'risk')::int,
    COUNT(*) FILTER (WHERE h.curve_state = 'watch')::int,
    COUNT(*) FILTER (WHERE h.curve_state = 'healthy')::int,
    COALESCE(SUM(lr.lost_revenue_est), 0)::numeric,
    COALESCE(SUM(cl.cash_locked_value), 0)::numeric
  FROM state_size_health_daily h
  JOIN inv_stores s ON s.id = h.store_id AND s.tenant_id::text = h.tenant_id
  LEFT JOIN state_lost_revenue_daily lr ON lr.product_id = h.product_id AND lr.tenant_id = h.tenant_id
  LEFT JOIN state_cash_lock_daily cl ON cl.product_id = h.product_id AND cl.tenant_id = h.tenant_id
  WHERE h.tenant_id = p_tenant_id AND h.store_id IS NOT NULL
  GROUP BY s.id, s.store_name, s.region;
$$ LANGUAGE sql SECURITY INVOKER;
