
CREATE OR REPLACE FUNCTION public.fn_size_health_details(
  p_tenant_id text, 
  p_curve_state text, 
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0, 
  p_sort_by text DEFAULT 'lost_revenue'::text,
  p_created_after date DEFAULT NULL
)
RETURNS TABLE(
  product_id text, product_name text, size_health_score numeric, curve_state text,
  deviation_score numeric, core_size_missing boolean, lost_revenue_est numeric,
  lost_units_est integer, cash_locked_value numeric, margin_leak_value numeric,
  markdown_risk_score numeric, markdown_eta_days integer, product_created_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH latest_health AS (
    SELECT DISTINCT ON (sh.product_id)
      sh.product_id, sh.size_health_score, sh.curve_state, sh.deviation_score, sh.core_size_missing
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
    h.size_health_score, h.curve_state, h.deviation_score, h.core_size_missing,
    COALESCE(lr.lost_revenue_est, 0) AS lost_revenue_est,
    COALESCE(lr.lost_units_est, 0)::INT AS lost_units_est,
    COALESCE(cl.cash_locked_value, 0) AS cash_locked_value,
    COALESCE(ml.margin_leak_value, 0) AS margin_leak_value,
    COALESCE(md.markdown_risk_score, 0) AS markdown_risk_score,
    md.markdown_eta_days,
    fc.product_created_date
  FROM latest_health h
  LEFT JOIN inv_family_codes fc ON fc.id::text = h.product_id AND fc.tenant_id::text = p_tenant_id
  LEFT JOIN latest_lr lr ON lr.product_id = h.product_id
  LEFT JOIN latest_cl cl ON cl.product_id = h.product_id
  LEFT JOIN latest_ml ml ON ml.product_id = h.product_id
  LEFT JOIN latest_md md ON md.product_id = h.product_id
  WHERE (p_created_after IS NULL OR fc.product_created_date >= p_created_after)
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
$function$;
