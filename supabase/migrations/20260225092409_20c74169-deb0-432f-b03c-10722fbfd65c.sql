
-- RPC: Top Family Codes by store with inventory
CREATE OR REPLACE FUNCTION fn_store_top_fc(
  p_tenant_id uuid,
  p_store_id uuid,
  p_limit int DEFAULT 15
)
RETURNS TABLE(
  fc_id uuid,
  fc_code text,
  fc_name text,
  category text,
  collection_id uuid,
  collection_name text,
  is_core_hero boolean,
  total_sold bigint,
  on_hand bigint,
  in_transit bigint,
  weeks_of_cover numeric
) LANGUAGE sql STABLE AS $$
  SELECT
    fc.id AS fc_id,
    fc.fc_code,
    fc.fc_name,
    fc.category,
    fc.collection_id,
    c.collection_name,
    fc.is_core_hero,
    COALESCE(SUM(d.total_sold), 0)::bigint AS total_sold,
    COALESCE(inv.on_hand, 0)::bigint AS on_hand,
    COALESCE(inv.in_transit, 0)::bigint AS in_transit,
    inv.weeks_of_cover
  FROM inv_family_codes fc
  LEFT JOIN inv_state_demand d
    ON d.tenant_id = p_tenant_id
    AND d.store_id = p_store_id
    AND d.fc_id = fc.id
  LEFT JOIN LATERAL (
    SELECT
      SUM(p.on_hand) AS on_hand,
      SUM(p.in_transit) AS in_transit,
      AVG(p.weeks_of_cover) AS weeks_of_cover
    FROM inv_state_positions p
    WHERE p.tenant_id = p_tenant_id
      AND p.store_id = p_store_id
      AND p.fc_id = fc.id
  ) inv ON true
  LEFT JOIN inv_collections c ON c.id = fc.collection_id
  WHERE fc.tenant_id = p_tenant_id
    AND fc.is_active = true
  GROUP BY fc.id, fc.fc_code, fc.fc_name, fc.category, fc.collection_id, c.collection_name, fc.is_core_hero, inv.on_hand, inv.in_transit, inv.weeks_of_cover
  HAVING COALESCE(SUM(d.total_sold), 0) > 0 OR COALESCE(inv.on_hand, 0) > 0
  ORDER BY COALESCE(SUM(d.total_sold), 0) DESC
  LIMIT p_limit;
$$;

-- RPC: Top Collections by store with inventory
CREATE OR REPLACE FUNCTION fn_store_top_collections(
  p_tenant_id uuid,
  p_store_id uuid,
  p_limit int DEFAULT 10
)
RETURNS TABLE(
  collection_id uuid,
  collection_code text,
  collection_name text,
  season text,
  is_new_collection boolean,
  total_sold bigint,
  fc_count bigint,
  on_hand bigint,
  in_transit bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    c.id AS collection_id,
    c.collection_code,
    c.collection_name,
    c.season,
    c.is_new_collection,
    COALESCE(SUM(d.total_sold), 0)::bigint AS total_sold,
    COUNT(DISTINCT fc.id)::bigint AS fc_count,
    COALESCE(SUM(inv.on_hand), 0)::bigint AS on_hand,
    COALESCE(SUM(inv.in_transit), 0)::bigint AS in_transit
  FROM inv_collections c
  JOIN inv_family_codes fc ON fc.collection_id = c.id AND fc.tenant_id = p_tenant_id AND fc.is_active = true
  LEFT JOIN inv_state_demand d
    ON d.tenant_id = p_tenant_id
    AND d.store_id = p_store_id
    AND d.fc_id = fc.id
  LEFT JOIN LATERAL (
    SELECT
      SUM(p.on_hand) AS on_hand,
      SUM(p.in_transit) AS in_transit
    FROM inv_state_positions p
    WHERE p.tenant_id = p_tenant_id
      AND p.store_id = p_store_id
      AND p.fc_id = fc.id
  ) inv ON true
  WHERE c.tenant_id = p_tenant_id
  GROUP BY c.id, c.collection_code, c.collection_name, c.season, c.is_new_collection
  HAVING COALESCE(SUM(d.total_sold), 0) > 0 OR COALESCE(SUM(inv.on_hand), 0) > 0
  ORDER BY COALESCE(SUM(d.total_sold), 0) DESC
  LIMIT p_limit;
$$;
