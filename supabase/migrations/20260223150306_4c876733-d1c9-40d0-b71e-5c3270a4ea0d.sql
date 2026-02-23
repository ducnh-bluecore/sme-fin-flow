
CREATE OR REPLACE VIEW v_cash_lock_summary AS
SELECT 
  cl.tenant_id,
  cl.as_of_date,
  SUM(cl.cash_locked_value) AS total_cash_locked,
  SUM(cl.inventory_value) AS total_inventory_value,
  AVG(cl.locked_pct) AS avg_locked_pct,
  COUNT(*) AS affected_products,
  COALESCE(SUM(pos.on_hand), 0) AS total_units
FROM state_cash_lock_daily cl
LEFT JOIN LATERAL (
  SELECT SUM(p.on_hand) AS on_hand
  FROM inv_state_positions p
  WHERE p.fc_id::text = cl.product_id
    AND p.tenant_id::text = cl.tenant_id
    AND p.snapshot_date = (
      SELECT MAX(p2.snapshot_date) 
      FROM inv_state_positions p2 
      WHERE p2.tenant_id = p.tenant_id
    )
) pos ON true
GROUP BY cl.tenant_id, cl.as_of_date;
