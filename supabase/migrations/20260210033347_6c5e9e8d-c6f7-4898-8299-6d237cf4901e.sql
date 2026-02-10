
-- Aggregated store metrics view to avoid client-side 1000-row limit
CREATE OR REPLACE VIEW v_inv_store_metrics AS
SELECT 
  d.tenant_id,
  d.store_id,
  SUM(d.total_sold) as total_sold,
  AVG(d.sales_velocity) as avg_velocity,
  COUNT(DISTINCT d.fc_id) as active_fcs
FROM inv_state_demand d
GROUP BY d.tenant_id, d.store_id;

CREATE OR REPLACE VIEW v_inv_store_position_metrics AS
SELECT 
  p.tenant_id,
  p.store_id,
  SUM(p.on_hand) as total_on_hand,
  SUM(p.available) as total_available,
  AVG(CASE WHEN p.weeks_of_cover < 999 THEN p.weeks_of_cover ELSE NULL END) as avg_woc
FROM inv_state_positions p
GROUP BY p.tenant_id, p.store_id;

-- Revenue per store: join demand SKU-level with actual prices
CREATE OR REPLACE VIEW v_inv_store_revenue AS
SELECT 
  d.tenant_id,
  d.store_id,
  SUM(d.total_sold * COALESCE(p.avg_unit_price, 250000)) as est_revenue,
  SUM(CASE WHEN p.avg_unit_price IS NULL THEN d.total_sold ELSE 0 END)::float 
    / NULLIF(SUM(d.total_sold), 0) * 100 as estimated_pct
FROM inv_state_demand d
LEFT JOIN v_inv_avg_unit_price p ON p.tenant_id = d.tenant_id AND p.sku = d.sku
GROUP BY d.tenant_id, d.store_id;
