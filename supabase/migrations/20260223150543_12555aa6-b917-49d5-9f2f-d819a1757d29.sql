
DROP VIEW IF EXISTS v_cash_lock_summary;
CREATE VIEW v_cash_lock_summary AS
SELECT 
  tenant_id,
  as_of_date,
  SUM(cash_locked_value) AS total_cash_locked,
  SUM(inventory_value) AS total_inventory_value,
  AVG(locked_pct) AS avg_locked_pct,
  COUNT(*) AS affected_products
FROM state_cash_lock_daily
GROUP BY tenant_id, as_of_date;
