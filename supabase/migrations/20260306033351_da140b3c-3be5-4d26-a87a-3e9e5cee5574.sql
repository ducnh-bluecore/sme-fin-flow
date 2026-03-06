
-- Fix fn_store_inventory_value: use per-store MAX(snapshot_date) + statement_timeout
CREATE OR REPLACE FUNCTION fn_store_inventory_value(p_tenant_id uuid)
RETURNS TABLE(store_id uuid, total_value numeric, total_on_hand bigint, avg_unit_cost numeric)
LANGUAGE sql STABLE
SET statement_timeout = '60s'
AS $$
  WITH pos AS (
    SELECT p.store_id, p.sku, p.on_hand
    FROM inv_state_positions p
    WHERE p.tenant_id = p_tenant_id
      AND p.on_hand > 0
      AND p.snapshot_date = (
        SELECT MAX(p2.snapshot_date) 
        FROM inv_state_positions p2 
        WHERE p2.store_id = p.store_id AND p2.tenant_id = p_tenant_id
      )
  ),
  priced AS (
    SELECT 
      pos.store_id,
      pos.on_hand,
      COALESCE(
        pr.cost_price,
        pr.selling_price * 0.6,
        150000
      ) AS unit_cost
    FROM pos
    LEFT JOIN LATERAL (
      SELECT cost_price, selling_price
      FROM products
      WHERE tenant_id = p_tenant_id
        AND sku = pos.sku
        AND (cost_price > 0 OR selling_price > 0)
      LIMIT 1
    ) pr ON true
  )
  SELECT 
    priced.store_id,
    SUM(priced.on_hand * priced.unit_cost)::NUMERIC AS total_value,
    SUM(priced.on_hand)::BIGINT AS total_on_hand,
    CASE WHEN SUM(priced.on_hand) > 0 
      THEN (SUM(priced.on_hand * priced.unit_cost) / SUM(priced.on_hand))::NUMERIC 
      ELSE 0 
    END AS avg_unit_cost
  FROM priced
  GROUP BY priced.store_id;
$$;

-- Also add statement_timeout to fn_batch_size_split_v2 if not already set
ALTER FUNCTION fn_batch_size_split_v2(uuid, uuid, text, integer) SET statement_timeout = '120s';
