
CREATE OR REPLACE FUNCTION fn_cash_lock_units(p_tenant_id text)
RETURNS TABLE(affected_units bigint) 
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(p.on_hand), 0)::bigint AS affected_units
  FROM state_cash_lock_daily cl
  JOIN inv_state_positions p 
    ON p.fc_id::text = cl.product_id 
    AND p.tenant_id::text = cl.tenant_id
  WHERE cl.tenant_id = p_tenant_id
    AND cl.as_of_date = (SELECT MAX(as_of_date) FROM state_cash_lock_daily WHERE tenant_id = p_tenant_id)
    AND p.snapshot_date = (SELECT MAX(snapshot_date) FROM inv_state_positions WHERE tenant_id = p_tenant_id::uuid);
$$;
