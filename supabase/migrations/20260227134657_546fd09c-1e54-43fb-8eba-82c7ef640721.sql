
-- Fix 1: Update fn_clearance_candidates to make broken_system a PARALLEL classification
-- (not overridden by aging_old/slow_extended)
CREATE OR REPLACE FUNCTION public.fn_clearance_candidates(p_tenant_id uuid, p_min_risk numeric DEFAULT 50)
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
    SELECT r.product_id AS pid, r.markdown_risk_score, r.markdown_eta_days, r.reason
    FROM state_markdown_risk_daily r
    WHERE r.tenant_id = p_tenant_id::text AND r.markdown_risk_score >= p_min_risk
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
      -- Age in days
      CASE WHEN fc.product_created_date IS NOT NULL 
        THEN (CURRENT_DATE - fc.product_created_date) ELSE NULL END AS age_days,
      -- Is broken size system-wide
      COALESCE(hl.curve_state, 'unknown') IN ('broken') AS is_broken_size
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
  )
  SELECT
    b.p_id, b.p_name, b.p_fc_code, b.p_category, b.p_season,
    b.p_collection_id, b.p_collection_name,
    b.p_risk_score, b.p_eta_days, b.p_reason,
    b.p_health, b.p_curve, b.p_stock,
    b.p_inv_value, b.p_cash, b.p_premium,
    b.p_ads, b.p_sv, b.p_trend, b.p_dtc,
    b.p_meta, b.p_ds, b.p_created,
    -- Clearance group: broken_system is PRIORITY if broken, then aging, then slow
    CASE
      WHEN b.is_broken_size AND b.age_days IS NOT NULL AND b.age_days > 90 THEN 'broken_system'
      WHEN b.age_days IS NOT NULL AND b.age_days > 300 THEN 'aging_old'
      WHEN b.age_days IS NOT NULL AND b.age_days > 150 AND b.p_dtc > 200 THEN 'slow_extended'
      ELSE NULL
    END::TEXT
  FROM base b
  ORDER BY b.p_risk_score DESC
  LIMIT 200;
END;
$$;
