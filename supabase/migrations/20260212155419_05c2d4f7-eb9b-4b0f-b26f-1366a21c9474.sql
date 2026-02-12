
-- View: v_size_health_by_state
-- Groups size health by curve_state with aggregated impact metrics
CREATE OR REPLACE VIEW public.v_size_health_by_state AS
WITH latest_health AS (
  SELECT DISTINCT ON (tenant_id, product_id)
    tenant_id, product_id, size_health_score, curve_state, deviation_score, core_size_missing, as_of_date
  FROM public.state_size_health_daily
  WHERE store_id IS NULL
  ORDER BY tenant_id, product_id, as_of_date DESC
),
latest_lost_rev AS (
  SELECT DISTINCT ON (tenant_id, product_id)
    tenant_id, product_id, lost_revenue_est, lost_units_est
  FROM public.state_lost_revenue_daily
  ORDER BY tenant_id, product_id, as_of_date DESC
),
latest_cash_lock AS (
  SELECT DISTINCT ON (tenant_id, product_id)
    tenant_id, product_id, cash_locked_value
  FROM public.state_cash_lock_daily
  ORDER BY tenant_id, product_id, as_of_date DESC
),
latest_margin_leak AS (
  SELECT tenant_id, product_id, SUM(margin_leak_value) AS margin_leak_value
  FROM (
    SELECT DISTINCT ON (tenant_id, product_id, leak_driver)
      tenant_id, product_id, margin_leak_value
    FROM public.state_margin_leak_daily
    ORDER BY tenant_id, product_id, leak_driver, as_of_date DESC
  ) sub
  GROUP BY tenant_id, product_id
),
latest_md_risk AS (
  SELECT DISTINCT ON (tenant_id, product_id)
    tenant_id, product_id, markdown_risk_score
  FROM public.state_markdown_risk_daily
  ORDER BY tenant_id, product_id, as_of_date DESC
)
SELECT
  h.tenant_id,
  h.curve_state,
  COUNT(*)::int AS style_count,
  ROUND(AVG(h.size_health_score), 1) AS avg_health_score,
  ROUND(AVG(h.deviation_score), 3) AS avg_deviation,
  COUNT(*) FILTER (WHERE h.core_size_missing)::int AS core_missing_count,
  COALESCE(SUM(lr.lost_revenue_est), 0) AS total_lost_revenue,
  COALESCE(SUM(lr.lost_units_est), 0)::int AS total_lost_units,
  COALESCE(SUM(cl.cash_locked_value), 0) AS total_cash_locked,
  COALESCE(SUM(ml.margin_leak_value), 0) AS total_margin_leak,
  COUNT(*) FILTER (WHERE md.markdown_risk_score >= 60)::int AS high_md_risk_count
FROM latest_health h
LEFT JOIN latest_lost_rev lr ON lr.tenant_id = h.tenant_id AND lr.product_id = h.product_id
LEFT JOIN latest_cash_lock cl ON cl.tenant_id = h.tenant_id AND cl.product_id = h.product_id
LEFT JOIN latest_margin_leak ml ON ml.tenant_id = h.tenant_id AND ml.product_id = h.product_id
LEFT JOIN latest_md_risk md ON md.tenant_id = h.tenant_id AND md.product_id = h.product_id
GROUP BY h.tenant_id, h.curve_state;

-- RPC: fn_size_health_details
-- Returns paginated detail rows for a specific curve_state, joined with product names
CREATE OR REPLACE FUNCTION public.fn_size_health_details(
  p_tenant_id TEXT,
  p_curve_state TEXT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'lost_revenue'
)
RETURNS TABLE (
  product_id TEXT,
  product_name TEXT,
  size_health_score NUMERIC,
  curve_state TEXT,
  deviation_score NUMERIC,
  core_size_missing BOOLEAN,
  lost_revenue_est NUMERIC,
  lost_units_est INT,
  cash_locked_value NUMERIC,
  margin_leak_value NUMERIC,
  markdown_risk_score NUMERIC,
  markdown_eta_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH latest_health AS (
    SELECT DISTINCT ON (sh.product_id)
      sh.product_id,
      sh.size_health_score,
      sh.curve_state,
      sh.deviation_score,
      sh.core_size_missing
    FROM state_size_health_daily sh
    WHERE sh.tenant_id = p_tenant_id
      AND sh.store_id IS NULL
      AND sh.curve_state = p_curve_state
    ORDER BY sh.product_id, sh.as_of_date DESC
  ),
  latest_lr AS (
    SELECT DISTINCT ON (lr.product_id)
      lr.product_id, lr.lost_revenue_est, lr.lost_units_est
    FROM state_lost_revenue_daily lr
    WHERE lr.tenant_id = p_tenant_id
    ORDER BY lr.product_id, lr.as_of_date DESC
  ),
  latest_cl AS (
    SELECT DISTINCT ON (cl.product_id)
      cl.product_id, cl.cash_locked_value
    FROM state_cash_lock_daily cl
    WHERE cl.tenant_id = p_tenant_id
    ORDER BY cl.product_id, cl.as_of_date DESC
  ),
  latest_ml AS (
    SELECT ml_sub.product_id, SUM(ml_sub.margin_leak_value) AS margin_leak_value
    FROM (
      SELECT DISTINCT ON (ml.product_id, ml.leak_driver)
        ml.product_id, ml.margin_leak_value
      FROM state_margin_leak_daily ml
      WHERE ml.tenant_id = p_tenant_id
      ORDER BY ml.product_id, ml.leak_driver, ml.as_of_date DESC
    ) ml_sub
    GROUP BY ml_sub.product_id
  ),
  latest_md AS (
    SELECT DISTINCT ON (md.product_id)
      md.product_id, md.markdown_risk_score, md.markdown_eta_days
    FROM state_markdown_risk_daily md
    WHERE md.tenant_id = p_tenant_id
    ORDER BY md.product_id, md.as_of_date DESC
  )
  SELECT
    h.product_id,
    COALESCE(fc.fc_name, fc.fc_code, h.product_id) AS product_name,
    h.size_health_score,
    h.curve_state,
    h.deviation_score,
    h.core_size_missing,
    COALESCE(lr.lost_revenue_est, 0) AS lost_revenue_est,
    COALESCE(lr.lost_units_est, 0)::INT AS lost_units_est,
    COALESCE(cl.cash_locked_value, 0) AS cash_locked_value,
    COALESCE(ml.margin_leak_value, 0) AS margin_leak_value,
    COALESCE(md.markdown_risk_score, 0) AS markdown_risk_score,
    md.markdown_eta_days
  FROM latest_health h
  LEFT JOIN inv_family_codes fc ON fc.id::text = h.product_id AND fc.tenant_id::text = p_tenant_id
  LEFT JOIN latest_lr lr ON lr.product_id = h.product_id
  LEFT JOIN latest_cl cl ON cl.product_id = h.product_id
  LEFT JOIN latest_ml ml ON ml.product_id = h.product_id
  LEFT JOIN latest_md md ON md.product_id = h.product_id
  ORDER BY
    CASE p_sort_by
      WHEN 'lost_revenue' THEN COALESCE(lr.lost_revenue_est, 0)
      WHEN 'cash_lock' THEN COALESCE(cl.cash_locked_value, 0)
      WHEN 'margin_leak' THEN COALESCE(ml.margin_leak_value, 0)
      WHEN 'markdown' THEN COALESCE(md.markdown_risk_score, 0)
      ELSE h.size_health_score
    END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
