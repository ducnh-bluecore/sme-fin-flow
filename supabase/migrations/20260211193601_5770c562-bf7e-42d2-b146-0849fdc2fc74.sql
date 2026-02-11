-- Aggregated positions view for allocation engine (reduces 34k rows → ~2k)
CREATE OR REPLACE FUNCTION public.fn_inv_positions_agg(p_tenant_id uuid)
RETURNS TABLE(
  store_id uuid,
  fc_id uuid,
  total_on_hand bigint,
  total_reserved bigint,
  total_in_transit bigint,
  total_safety_stock bigint,
  sku_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    store_id,
    fc_id,
    COALESCE(SUM(on_hand), 0) as total_on_hand,
    COALESCE(SUM(reserved), 0) as total_reserved,
    COALESCE(SUM(in_transit), 0) as total_in_transit,
    COALESCE(SUM(safety_stock), 0) as total_safety_stock,
    COUNT(*) as sku_count
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id
  GROUP BY store_id, fc_id;
$$;

-- Store-level on-hand totals for capacity checks
CREATE OR REPLACE FUNCTION public.fn_inv_store_totals(p_tenant_id uuid)
RETURNS TABLE(
  store_id uuid,
  total_on_hand bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    store_id,
    COALESCE(SUM(on_hand), 0) as total_on_hand
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id
  GROUP BY store_id;
$$;