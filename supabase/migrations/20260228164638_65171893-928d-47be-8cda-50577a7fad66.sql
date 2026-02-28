
-- Update fn_size_health_details to detect out-of-stock products (total on_hand = 0)
-- and override curve_state to 'out_of_stock' instead of misleading 'broken'
DROP FUNCTION IF EXISTS public.fn_size_health_details(text, text, integer, integer, text, date);

CREATE OR REPLACE FUNCTION public.fn_size_health_details(
  p_tenant_id text,
  p_curve_state text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_sort_by text DEFAULT 'lost_revenue',
  p_created_after date DEFAULT NULL
)
RETURNS TABLE (
  product_id text,
  product_name text,
  size_health_score numeric,
  curve_state text,
  deviation_score numeric,
  core_size_missing boolean,
  lost_revenue_est numeric,
  lost_units_est integer,
  cash_locked_value numeric,
  margin_leak_value numeric,
  markdown_risk_score numeric,
  markdown_eta_days integer,
  product_created_date date,
  total_on_hand bigint
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH latest_health AS (
    SELECT DISTINCT ON (h.product_id)
      h.product_id,
      h.size_health_score,
      h.curve_state,
      h.deviation_score,
      h.core_size_missing
    FROM state_size_health_daily h
    WHERE h.tenant_id = p_tenant_id
      AND h.store_id IS NULL
    ORDER BY h.product_id, h.as_of_date DESC
  ),
  product_stock AS (
    SELECT sp.fc_id::text AS product_id, COALESCE(SUM(sp.on_hand), 0) AS total_on_hand
    FROM inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id::uuid
    GROUP BY sp.fc_id
  ),
  enriched AS (
    SELECT
      h.product_id,
      fc.fc_name AS product_name,
      h.size_health_score,
      -- Override: if total stock = 0 across all stores, mark as out_of_stock
      CASE WHEN COALESCE(ps.total_on_hand, 0) = 0 THEN 'out_of_stock' ELSE h.curve_state END AS curve_state,
      h.deviation_score,
      h.core_size_missing,
      COALESCE(lr.lost_revenue_est, 0) AS lost_revenue_est,
      COALESCE(lr.lost_units_est, 0)::integer AS lost_units_est,
      COALESCE(cl.cash_locked_value, 0) AS cash_locked_value,
      COALESCE(ml.margin_leak_value, 0) AS margin_leak_value,
      COALESCE(md.markdown_risk_score, 0) AS markdown_risk_score,
      md.markdown_eta_days::integer AS markdown_eta_days,
      fc.created_at::date AS product_created_date,
      COALESCE(ps.total_on_hand, 0) AS total_on_hand
    FROM latest_health h
    JOIN inv_family_codes fc ON fc.id = h.product_id::uuid AND fc.tenant_id = p_tenant_id::uuid
    LEFT JOIN product_stock ps ON ps.product_id = h.product_id
    LEFT JOIN LATERAL (
      SELECT lr2.lost_revenue_est, lr2.lost_units_est
      FROM state_lost_revenue_daily lr2
      WHERE lr2.tenant_id = p_tenant_id AND lr2.product_id = h.product_id
      ORDER BY lr2.as_of_date DESC LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
      SELECT cl2.cash_locked_value
      FROM state_cash_lock_daily cl2
      WHERE cl2.tenant_id = p_tenant_id AND cl2.product_id = h.product_id
      ORDER BY cl2.as_of_date DESC LIMIT 1
    ) cl ON true
    LEFT JOIN LATERAL (
      SELECT SUM(sub.margin_leak_value) AS margin_leak_value
      FROM (
        SELECT DISTINCT ON (ml2.leak_driver) ml2.margin_leak_value
        FROM state_margin_leak_daily ml2
        WHERE ml2.tenant_id = p_tenant_id AND ml2.product_id = h.product_id
        ORDER BY ml2.leak_driver, ml2.as_of_date DESC
      ) sub
    ) ml ON true
    LEFT JOIN LATERAL (
      SELECT md2.markdown_risk_score, md2.markdown_eta_days
      FROM state_markdown_risk_daily md2
      WHERE md2.tenant_id = p_tenant_id AND md2.product_id = h.product_id
      ORDER BY md2.as_of_date DESC LIMIT 1
    ) md ON true
  )
  SELECT e.*
  FROM enriched e
  WHERE (
    -- Match the requested curve_state
    -- 'broken' also matches the new 'major_break' label and legacy 'broken'
    CASE p_curve_state
      WHEN 'broken' THEN e.curve_state IN ('broken', 'major_break')
      WHEN 'risk' THEN e.curve_state IN ('risk', 'minor_break')
      WHEN 'healthy' THEN e.curve_state IN ('healthy', 'full_curve')
      WHEN 'watch' THEN e.curve_state = 'watch'
      WHEN 'out_of_stock' THEN e.curve_state = 'out_of_stock'
      ELSE e.curve_state = p_curve_state
    END
  )
  AND (p_created_after IS NULL OR e.product_created_date >= p_created_after)
  ORDER BY
    CASE WHEN p_sort_by = 'lost_revenue' THEN e.lost_revenue_est END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'health' THEN e.size_health_score END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'cash_locked' THEN e.cash_locked_value END DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;
