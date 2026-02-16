CREATE OR REPLACE FUNCTION fn_clearance_stock_by_fc(p_tenant_id uuid, p_fc_ids uuid[])
RETURNS TABLE(fc_id uuid, total_on_hand bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT sp.fc_id, SUM(sp.on_hand)::bigint as total_on_hand
  FROM inv_state_positions sp
  WHERE sp.tenant_id = p_tenant_id
    AND sp.fc_id = ANY(p_fc_ids)
  GROUP BY sp.fc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;