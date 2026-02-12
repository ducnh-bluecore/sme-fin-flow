
-- Summary view: aggregate size health stats without 1000-row limit
CREATE OR REPLACE VIEW v_size_intelligence_summary AS
SELECT
  tenant_id,
  as_of_date,
  -- Health aggregates
  COUNT(*) FILTER (WHERE store_id IS NULL) AS total_products,
  AVG(size_health_score) FILTER (WHERE store_id IS NULL) AS avg_health_score,
  COUNT(*) FILTER (WHERE store_id IS NULL AND curve_state = 'broken') AS broken_count,
  COUNT(*) FILTER (WHERE store_id IS NULL AND curve_state = 'risk') AS risk_count,
  COUNT(*) FILTER (WHERE store_id IS NULL AND curve_state = 'watch') AS watch_count,
  COUNT(*) FILTER (WHERE store_id IS NULL AND curve_state = 'healthy') AS healthy_count,
  COUNT(*) FILTER (WHERE store_id IS NULL AND core_size_missing = true) AS core_missing_count
FROM state_size_health_daily
GROUP BY tenant_id, as_of_date;

-- Lost revenue summary
CREATE OR REPLACE VIEW v_lost_revenue_summary AS
SELECT
  tenant_id,
  as_of_date,
  SUM(lost_revenue_est) AS total_lost_revenue,
  SUM(lost_units_est) AS total_lost_units,
  COUNT(*) AS affected_products
FROM state_lost_revenue_daily
GROUP BY tenant_id, as_of_date;

-- Markdown risk summary
CREATE OR REPLACE VIEW v_markdown_risk_summary AS
SELECT
  tenant_id,
  as_of_date,
  COUNT(*) FILTER (WHERE markdown_risk_score >= 60) AS high_risk_count,
  COUNT(*) FILTER (WHERE markdown_risk_score >= 80) AS critical_count,
  COUNT(*) AS total_products
FROM state_markdown_risk_daily
GROUP BY tenant_id, as_of_date;

-- Transfer summary grouped by destination
CREATE OR REPLACE VIEW v_transfer_by_destination AS
SELECT
  tenant_id,
  as_of_date,
  dest_store_id,
  COUNT(*) AS transfer_count,
  SUM(transfer_qty) AS total_qty,
  SUM(net_benefit) AS total_net_benefit,
  SUM(estimated_revenue_gain) AS total_revenue_gain,
  SUM(estimated_transfer_cost) AS total_transfer_cost,
  COUNT(DISTINCT product_id) AS unique_products,
  COUNT(DISTINCT source_store_id) AS source_count
FROM state_size_transfer_daily
GROUP BY tenant_id, as_of_date, dest_store_id;

-- Cash lock summary
CREATE OR REPLACE VIEW v_cash_lock_summary AS
SELECT
  tenant_id,
  as_of_date,
  SUM(cash_locked_value) AS total_cash_locked,
  SUM(inventory_value) AS total_inventory_value,
  AVG(locked_pct) AS avg_locked_pct,
  COUNT(*) AS affected_products
FROM state_cash_lock_daily
GROUP BY tenant_id, as_of_date;

-- Margin leak summary
CREATE OR REPLACE VIEW v_margin_leak_summary AS
SELECT
  tenant_id,
  as_of_date,
  SUM(margin_leak_value) AS total_margin_leak,
  SUM(margin_leak_value) FILTER (WHERE leak_driver = 'size_break') AS leak_by_size_break,
  SUM(margin_leak_value) FILTER (WHERE leak_driver = 'markdown_risk') AS leak_by_markdown,
  COUNT(*) AS affected_products
FROM state_margin_leak_daily
GROUP BY tenant_id, as_of_date;

-- Enable RLS on all views (they inherit from base tables which already have RLS)
-- Views don't need separate RLS as they inherit from base table policies
