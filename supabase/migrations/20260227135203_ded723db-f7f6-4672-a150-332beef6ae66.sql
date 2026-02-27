
-- Drop both overloads and recreate with consistent parameter type
DROP FUNCTION IF EXISTS public.fn_clearance_candidates(uuid, integer);
DROP FUNCTION IF EXISTS public.fn_clearance_candidates(uuid, numeric);

CREATE OR REPLACE FUNCTION public.fn_clearance_candidates(p_tenant_id uuid, p_min_risk integer DEFAULT 50)
RETURNS TABLE(
  product_id uuid, product_name text, fc_code text, category text, season text,
  collection_id uuid, collection_name text,
  markdown_risk_score numeric, markdown_eta_days int, reason text,
  health_score numeric, curve_state text, current_stock bigint,
  inventory_value numeric, cash_locked numeric, is_premium boolean,
  avg_daily_sales numeric, sales_velocity numeric, trend text,
  days_to_clear int, metadata jsonb, demand_space text,
  product_created_at date, clearance_group text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_latest_snapshot date;
  v_restock_lookback_days int := 90;
  v_val jsonb;
BEGIN
  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'clearance_restock_lookback_days';
  IF v_val IS NOT NULL THEN v_restock_lookback_days := (v_val->>'days')::int; END IF;

  SELECT MAX(sp.snapshot_date) INTO v_latest_snapshot
  FROM inv_state_positions sp WHERE sp.tenant_id = p_tenant_id;

  RETURN QUERY
  WITH risk AS (
    SELECT DISTINCT ON (r.product_id) r.product_id AS pid, r.markdown_risk_score, r.markdown_eta_days, r.reason
    FROM state_markdown_risk_daily r
    WHERE r.tenant_id = p_tenant_id::text AND r.markdown_risk_score >= p_min_risk
    ORDER BY r.product_id, r.markdown_risk_score DESC
  ),
  stock_agg AS (
    SELECT sp.fc_id, SUM(sp.on_hand) AS total_on_hand
    FROM inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id AND sp.snapshot_date = v_latest_snapshot
    GROUP BY sp.fc_id
  ),
  demand_agg AS (
    SELECT DISTINCT ON (dm.fc_id) dm.fc_id, dm.avg_daily_sales, dm.sales_velocity, dm.trend
    FROM inv_state_demand dm WHERE dm.tenant_id = p_tenant_id ORDER BY dm.fc_id
  ),
  health_latest AS (
    SELECT DISTINCT ON (sh.product_id) sh.product_id AS pid, sh.size_health_score, sh.curve_state
    FROM state_size_health_daily sh
    WHERE sh.tenant_id = p_tenant_id::text AND sh.store_id IS NULL
    ORDER BY sh.product_id, sh.as_of_date DESC
  ),
  cash_latest AS (
    SELECT DISTINCT ON (cl2.product_id) cl2.product_id AS pid, cl2.inventory_value, cl2.cash_locked_value
    FROM state_cash_lock_daily cl2 WHERE cl2.tenant_id = p_tenant_id::text
    ORDER BY cl2.product_id, cl2.as_of_date DESC
  ),
  base AS (
    SELECT
      fc.id AS p_id,
      COALESCE(fc.fc_name, '—')::TEXT AS p_name,
      COALESCE(fc.fc_code, '—')::TEXT AS p_fc_code,
      fc.category::TEXT AS p_category,
      fc.season::TEXT AS p_season,
      fc.collection_id AS p_collection_id,
      col.collection_name::TEXT AS p_collection_name,
      risk.markdown_risk_score AS p_risk_score,
      risk.markdown_eta_days::INT AS p_eta_days,
      risk.reason::TEXT AS p_reason,
      COALESCE(hl.size_health_score, 0) AS p_health,
      COALESCE(hl.curve_state, 'unknown')::TEXT AS p_curve,
      COALESCE(sa.total_on_hand, 0)::BIGINT AS p_stock,
      COALESCE(cl.inventory_value, 0) AS p_inv_value,
      COALESCE(cl.cash_locked_value, 0) AS p_cash,
      (fc.metadata::jsonb ? 'tags' AND (
        fc.metadata::jsonb->'tags' @> '"premium"'::jsonb
        OR fc.metadata::jsonb->'tags' @> '"signature"'::jsonb
      ) OR LOWER(COALESCE(fc.fc_name,'') || ' ' || COALESCE(fc.subcategory,'')) ~ '(premium|signature|embroidery|thêu|theu)') AS p_premium,
      COALESCE(da.avg_daily_sales, 0) AS p_ads,
      COALESCE(da.sales_velocity, 0) AS p_sv,
      COALESCE(da.trend, 'stable')::TEXT AS p_trend,
      CASE WHEN COALESCE(da.avg_daily_sales, 0) > 0
        THEN LEAST(ROUND(COALESCE(sa.total_on_hand, 0)::NUMERIC / da.avg_daily_sales)::INT, 9999)
        ELSE 9999 END AS p_dtc,
      fc.metadata::JSONB AS p_meta,
      fc.demand_space::TEXT AS p_ds,
      fc.product_created_date AS p_created,
      CASE WHEN fc.product_created_date IS NOT NULL 
        THEN (CURRENT_DATE - fc.product_created_date) ELSE NULL END AS age_days,
      COALESCE(hl.curve_state, 'unknown') AS raw_curve
    FROM risk
    JOIN inv_family_codes fc ON fc.id::text = risk.pid AND fc.tenant_id = p_tenant_id
    LEFT JOIN health_latest hl ON hl.pid = risk.pid
    LEFT JOIN cash_latest cl ON cl.pid = risk.pid
    LEFT JOIN stock_agg sa ON sa.fc_id = fc.id
    LEFT JOIN demand_agg da ON da.fc_id = fc.id
    LEFT JOIN inv_collections col ON col.id = fc.collection_id AND col.tenant_id = p_tenant_id
    WHERE COALESCE(fc.is_restock, false) = false
      AND (fc.restock_confirmed_at IS NULL OR fc.restock_confirmed_at < (CURRENT_DATE - v_restock_lookback_days))
      AND NOT (fc.ecom_port IS NOT NULL AND fc.ecom_port && ARRAY['core','hero'])
  ),
  classified AS (
    SELECT b.*,
      CASE
        WHEN b.raw_curve = 'broken' AND b.age_days IS NOT NULL AND b.age_days > 90 THEN 'broken_system'
        WHEN b.age_days IS NOT NULL AND b.age_days > 300 THEN 'aging_old'
        WHEN b.age_days IS NOT NULL AND b.age_days > 150 AND b.p_dtc > 200 THEN 'slow_extended'
        ELSE NULL
      END AS cgroup
    FROM base b
  ),
  ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY p_risk_score DESC) as rn FROM classified
  )
  SELECT
    f.p_id, f.p_name, f.p_fc_code, f.p_category, f.p_season,
    f.p_collection_id, f.p_collection_name,
    f.p_risk_score, f.p_eta_days, f.p_reason,
    f.p_health, f.p_curve, f.p_stock,
    f.p_inv_value, f.p_cash, f.p_premium,
    f.p_ads, f.p_sv, f.p_trend, f.p_dtc,
    f.p_meta, f.p_ds, f.p_created,
    f.cgroup::TEXT
  FROM ranked f
  WHERE f.rn <= 200 OR f.cgroup = 'broken_system'
  ORDER BY f.p_risk_score DESC;
END;
$$;
