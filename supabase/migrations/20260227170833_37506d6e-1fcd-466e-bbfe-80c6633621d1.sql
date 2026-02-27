CREATE OR REPLACE FUNCTION public.fn_store_on_hand_totals(p_tenant_id UUID)
RETURNS TABLE(store_id UUID, total_on_hand BIGINT)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT store_id, SUM(on_hand)::BIGINT AS total_on_hand
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id
  GROUP BY store_id;
$$;