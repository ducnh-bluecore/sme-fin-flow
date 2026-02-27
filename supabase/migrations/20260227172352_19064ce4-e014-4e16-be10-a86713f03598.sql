CREATE OR REPLACE FUNCTION public.fn_store_inventory_value(p_tenant_id UUID)
RETURNS TABLE(store_id UUID, total_value NUMERIC, total_on_hand BIGINT, avg_unit_cost NUMERIC)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH latest_snap AS (
    SELECT MAX(snapshot_date) AS sd
    FROM inv_state_positions
    WHERE tenant_id = p_tenant_id
  ),
  pos AS (
    SELECT p.store_id, p.sku, p.on_hand
    FROM inv_state_positions p, latest_snap ls
    WHERE p.tenant_id = p_tenant_id
      AND p.snapshot_date = ls.sd
      AND p.on_hand > 0
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