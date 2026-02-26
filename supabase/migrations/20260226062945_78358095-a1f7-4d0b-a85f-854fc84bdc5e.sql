
ALTER TABLE public.inv_family_codes ADD COLUMN IF NOT EXISTS product_created_date date;
COMMENT ON COLUMN public.inv_family_codes.product_created_date IS 'Original product creation date from source system (e.g. KiotViet)';

-- Update fn_clearance_candidates to use product_created_date instead of created_at
DROP FUNCTION IF EXISTS public.fn_clearance_candidates(uuid, integer);

CREATE OR REPLACE FUNCTION public.fn_clearance_candidates(
  p_tenant_id uuid,
  p_min_risk integer DEFAULT 50
)
RETURNS TABLE(
  product_id uuid, product_name text, fc_code text, category text, season text,
  collection_id uuid, collection_name text, markdown_risk_score numeric,
  markdown_eta_days integer, reason text, health_score numeric, curve_state text,
  current_stock bigint, inventory_value numeric, cash_locked numeric,
  is_premium boolean, avg_daily_sales numeric, sales_velocity numeric,
  trend text, days_to_clear integer, metadata jsonb, demand_space text,
  product_created_at date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_latest_snapshot date;
BEGIN
  SELECT MAX(sp.snapshot_date) INTO v_latest_snapshot
  FROM inv_state_positions sp
  WHERE sp.tenant_id = p_tenant_id;

  RETURN QUERY
  WITH risk AS (
    SELECT r.product_id AS pid, r.markdown_risk_score, r.markdown_eta_days, r.reason
    FROM state_markdown_risk_daily r
    WHERE r.tenant_id = p_tenant_id::text
      AND r.markdown_risk_score >= p_min_risk
  ),
  stock_agg AS (
    SELECT sp.fc_id, SUM(sp.on_hand) AS total_on_hand
    FROM inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id
      AND sp.snapshot_date = v_latest_snapshot
    GROUP BY sp.fc_id
  ),
  demand_agg AS (
    SELECT DISTINCT ON (dm.fc_id) dm.fc_id, dm.avg_daily_sales, dm.sales_velocity, dm.trend
    FROM inv_state_demand dm
    WHERE dm.tenant_id = p_tenant_id
    ORDER BY dm.fc_id
  ),
  health_latest AS (
    SELECT DISTINCT ON (sh.product_id) sh.product_id AS pid, sh.size_health_score, sh.curve_state
    FROM state_size_health_daily sh
    WHERE sh.tenant_id = p_tenant_id::text
      AND sh.store_id IS NULL
    ORDER BY sh.product_id, sh.as_of_date DESC
  ),
  cash_latest AS (
    SELECT DISTINCT ON (cl2.product_id) cl2.product_id AS pid, cl2.inventory_value, cl2.cash_locked_value
    FROM state_cash_lock_daily cl2
    WHERE cl2.tenant_id = p_tenant_id::text
    ORDER BY cl2.product_id, cl2.as_of_date DESC
  )
  SELECT
    fc.id AS product_id,
    COALESCE(fc.fc_name, '—')::TEXT AS product_name,
    COALESCE(fc.fc_code, '—')::TEXT AS fc_code,
    fc.category::TEXT,
    fc.season::TEXT,
    fc.collection_id,
    col.collection_name::TEXT,
    risk.markdown_risk_score,
    risk.markdown_eta_days::INT,
    risk.reason::TEXT,
    COALESCE(hl.size_health_score, 0) AS health_score,
    COALESCE(hl.curve_state, 'unknown')::TEXT AS curve_state,
    COALESCE(sa.total_on_hand, 0)::BIGINT AS current_stock,
    COALESCE(cl.inventory_value, 0) AS inventory_value,
    COALESCE(cl.cash_locked_value, 0) AS cash_locked,
    (
      fc.metadata::jsonb ? 'tags' AND (
        fc.metadata::jsonb->'tags' @> '"premium"'::jsonb
        OR fc.metadata::jsonb->'tags' @> '"signature"'::jsonb
      )
      OR LOWER(COALESCE(fc.fc_name,'') || ' ' || COALESCE(fc.subcategory,'')) ~ '(premium|signature|embroidery|thêu|theu)'
    ) AS is_premium,
    COALESCE(da.avg_daily_sales, 0) AS avg_daily_sales,
    COALESCE(da.sales_velocity, 0) AS sales_velocity,
    COALESCE(da.trend, 'stable')::TEXT AS trend,
    CASE
      WHEN COALESCE(da.avg_daily_sales, 0) > 0
        THEN LEAST(ROUND(COALESCE(sa.total_on_hand, 0)::NUMERIC / da.avg_daily_sales)::INT, 9999)
      ELSE 9999
    END AS days_to_clear,
    fc.metadata::JSONB,
    fc.demand_space::TEXT,
    fc.product_created_date AS product_created_at
  FROM risk
  JOIN inv_family_codes fc ON fc.id::text = risk.pid AND fc.tenant_id = p_tenant_id
  LEFT JOIN health_latest hl ON hl.pid = risk.pid
  LEFT JOIN cash_latest cl ON cl.pid = risk.pid
  LEFT JOIN stock_agg sa ON sa.fc_id = fc.id
  LEFT JOIN demand_agg da ON da.fc_id = fc.id
  LEFT JOIN inv_collections col ON col.id = fc.collection_id AND col.tenant_id = p_tenant_id
  ORDER BY risk.markdown_risk_score DESC
  LIMIT 200;
END;
$function$;
