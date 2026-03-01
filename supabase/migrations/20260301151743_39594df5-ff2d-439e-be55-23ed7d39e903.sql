
CREATE OR REPLACE VIEW public.v_size_health_by_state
WITH (security_invoker = on)
AS
WITH latest_health AS (
  SELECT DISTINCT ON (tenant_id, product_id)
    tenant_id, product_id, size_health_score, curve_state,
    deviation_score, core_size_missing, as_of_date
  FROM state_size_health_daily
  WHERE store_id IS NULL
  ORDER BY tenant_id, product_id, as_of_date DESC
),
product_stock AS (
  SELECT
    m.fc_id::text AS product_id,
    m.tenant_id::text AS tenant_id,
    COALESCE(SUM(sp.on_hand), 0) AS total_on_hand
  FROM inv_sku_fc_mapping m
  JOIN (
    SELECT DISTINCT ON (sku, store_id) sku, store_id, on_hand
    FROM inv_state_positions
    ORDER BY sku, store_id, snapshot_date DESC
  ) sp ON sp.sku = m.sku
  WHERE m.is_active = true
  GROUP BY m.fc_id, m.tenant_id
),
health_with_stock AS (
  SELECT
    h.tenant_id,
    h.product_id,
    h.size_health_score,
    CASE
      WHEN COALESCE(ps.total_on_hand, 0) = 0 THEN 'out_of_stock'
      ELSE h.curve_state
    END AS curve_state,
    h.deviation_score,
    h.core_size_missing
  FROM latest_health h
  LEFT JOIN product_stock ps ON ps.tenant_id = h.tenant_id AND ps.product_id = h.product_id
),
latest_lost_rev AS (
  SELECT DISTINCT ON (tenant_id, product_id)
    tenant_id, product_id, lost_revenue_est, lost_units_est
  FROM state_lost_revenue_daily
  ORDER BY tenant_id, product_id, as_of_date DESC
),
latest_cash_lock AS (
  SELECT DISTINCT ON (tenant_id, product_id)
    tenant_id, product_id, cash_locked_value
  FROM state_cash_lock_daily
  ORDER BY tenant_id, product_id, as_of_date DESC
),
latest_margin_leak AS (
  SELECT sub.tenant_id, sub.product_id, SUM(sub.margin_leak_value) AS margin_leak_value
  FROM (
    SELECT DISTINCT ON (tenant_id, product_id, leak_driver)
      tenant_id, product_id, margin_leak_value
    FROM state_margin_leak_daily
    ORDER BY tenant_id, product_id, leak_driver, as_of_date DESC
  ) sub
  GROUP BY sub.tenant_id, sub.product_id
),
latest_md_risk AS (
  SELECT DISTINCT ON (tenant_id, product_id)
    tenant_id, product_id, markdown_risk_score
  FROM state_markdown_risk_daily
  ORDER BY tenant_id, product_id, as_of_date DESC
)
SELECT
  h.tenant_id,
  h.curve_state,
  COUNT(*)::integer AS style_count,
  ROUND(AVG(h.size_health_score), 1) AS avg_health_score,
  ROUND(AVG(h.deviation_score), 3) AS avg_deviation,
  COUNT(*) FILTER (WHERE h.core_size_missing)::integer AS core_missing_count,
  COALESCE(SUM(lr.lost_revenue_est), 0) AS total_lost_revenue,
  COALESCE(SUM(lr.lost_units_est), 0)::integer AS total_lost_units,
  COALESCE(SUM(cl.cash_locked_value), 0) AS total_cash_locked,
  COALESCE(SUM(ml.margin_leak_value), 0) AS total_margin_leak,
  COUNT(*) FILTER (WHERE md.markdown_risk_score >= 60)::integer AS high_md_risk_count
FROM health_with_stock h
LEFT JOIN latest_lost_rev lr ON lr.tenant_id = h.tenant_id AND lr.product_id = h.product_id
LEFT JOIN latest_cash_lock cl ON cl.tenant_id = h.tenant_id AND cl.product_id = h.product_id
LEFT JOIN latest_margin_leak ml ON ml.tenant_id = h.tenant_id AND ml.product_id = h.product_id
LEFT JOIN latest_md_risk md ON md.tenant_id = h.tenant_id AND md.product_id = h.product_id
GROUP BY h.tenant_id, h.curve_state;
