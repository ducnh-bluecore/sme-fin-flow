
-- 1. Add columns to inv_stores
ALTER TABLE public.inv_stores ADD COLUMN IF NOT EXISTS display_capacity integer;
COMMENT ON COLUMN public.inv_stores.display_capacity IS 'Max display units at store';

-- 2. Add columns to inv_family_codes
ALTER TABLE public.inv_family_codes ADD COLUMN IF NOT EXISTS is_restock boolean DEFAULT false;
ALTER TABLE public.inv_family_codes ADD COLUMN IF NOT EXISTS restock_confirmed_at timestamptz;
ALTER TABLE public.inv_family_codes ADD COLUMN IF NOT EXISTS ecom_port text[];
COMMENT ON COLUMN public.inv_family_codes.is_restock IS 'Has pending restock PO';
COMMENT ON COLUMN public.inv_family_codes.restock_confirmed_at IS 'Date restock confirmed with supplier';
COMMENT ON COLUMN public.inv_family_codes.ecom_port IS 'Ecom portfolio tags e.g. core, hero for TikTok/Shopee';

-- 3. Add action_category to inv_rebalance_suggestions
ALTER TABLE public.inv_rebalance_suggestions ADD COLUMN IF NOT EXISTS action_category text;
COMMENT ON COLUMN public.inv_rebalance_suggestions.action_category IS 'Classification: hot_selling_broken, slow_selling, slow_extended';

-- 4. Update fn_clearance_candidates with exclusion rules and clearance_group
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
  product_created_at date, clearance_group text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_latest_snapshot date;
  v_restock_lookback_days int := 90;
  v_val jsonb;
BEGIN
  -- Load restock lookback from constraints
  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'clearance_restock_lookback_days';
  IF v_val IS NOT NULL THEN v_restock_lookback_days := (v_val->>'days')::int; END IF;

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
    fc.product_created_date AS product_created_at,
    -- Clearance group classification
    CASE
      WHEN fc.product_created_date IS NOT NULL 
        AND (CURRENT_DATE - fc.product_created_date) > 300 THEN 'aging_old'
      WHEN fc.product_created_date IS NOT NULL 
        AND (CURRENT_DATE - fc.product_created_date) > 150
        AND CASE WHEN COALESCE(da.avg_daily_sales, 0) > 0 
              THEN ROUND(COALESCE(sa.total_on_hand, 0)::NUMERIC / da.avg_daily_sales)::INT 
              ELSE 9999 END > 200 THEN 'slow_extended'
      WHEN fc.product_created_date IS NOT NULL 
        AND (CURRENT_DATE - fc.product_created_date) > 90
        AND COALESCE(hl.curve_state, 'unknown') IN ('broken', 'critical') THEN 'broken_system'
      ELSE NULL
    END::TEXT AS clearance_group
  FROM risk
  JOIN inv_family_codes fc ON fc.id::text = risk.pid AND fc.tenant_id = p_tenant_id
  LEFT JOIN health_latest hl ON hl.pid = risk.pid
  LEFT JOIN cash_latest cl ON cl.pid = risk.pid
  LEFT JOIN stock_agg sa ON sa.fc_id = fc.id
  LEFT JOIN demand_agg da ON da.fc_id = fc.id
  LEFT JOIN inv_collections col ON col.id = fc.collection_id AND col.tenant_id = p_tenant_id
  -- Exclusion rules
  WHERE COALESCE(fc.is_restock, false) = false
    AND (fc.restock_confirmed_at IS NULL OR fc.restock_confirmed_at < (CURRENT_DATE - v_restock_lookback_days))
    AND NOT (fc.ecom_port IS NOT NULL AND fc.ecom_port && ARRAY['core','hero'])
  ORDER BY risk.markdown_risk_score DESC
  LIMIT 200;
END;
$function$;

-- 5. Update fn_rebalance_engine with FC-tier filtering
CREATE OR REPLACE FUNCTION fn_rebalance_engine(
  p_tenant_id UUID,
  p_run_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '300s'
AS $$
DECLARE
  v_min_cover_weeks NUMERIC := 2;
  v_max_cover_weeks NUMERIC := 10;
  v_max_transfer_pct NUMERIC := 0.6;
  v_avg_price NUMERIC := 250000;
  v_logistics_same NUMERIC := 20000;
  v_logistics_diff NUMERIC := 45000;
  v_logistics_default NUMERIC := 30000;
  v_min_net_benefit NUMERIC := 500000;
  v_lateral_enabled BOOLEAN := true;
  v_no_broken_size BOOLEAN := false;
  v_lateral_min_age_days INT := 60;
  v_push_count INT := 0;
  v_push_units INT := 0;
  v_lateral_count INT := 0;
  v_lateral_units INT := 0;
  v_val JSONB;
BEGIN
  -- ── Load constraints from registry ──
  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'min_cover_weeks';
  IF v_val IS NOT NULL THEN v_min_cover_weeks := (v_val->>'weeks')::numeric; END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'max_cover_weeks';
  IF v_val IS NOT NULL THEN v_max_cover_weeks := (v_val->>'weeks')::numeric; END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'max_transfer_pct';
  IF v_val IS NOT NULL THEN v_max_transfer_pct := (v_val->>'pct')::numeric / 100.0; END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'avg_unit_price_default';
  IF v_val IS NOT NULL THEN v_avg_price := (v_val->>'amount')::numeric; END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'logistics_cost_by_region';
  IF v_val IS NOT NULL THEN
    v_logistics_same := COALESCE((v_val->>'same_region')::numeric, 20000);
    v_logistics_diff := COALESCE((v_val->>'diff_region')::numeric, 45000);
    v_logistics_default := COALESCE((v_val->>'default')::numeric, 30000);
  END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'min_lateral_net_benefit';
  IF v_val IS NOT NULL THEN v_min_net_benefit := (v_val->>'amount')::numeric; END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'lateral_enabled';
  IF v_val IS NOT NULL THEN v_lateral_enabled := COALESCE((v_val->>'enabled')::boolean, true); END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'no_broken_size';
  IF v_val IS NOT NULL THEN v_no_broken_size := COALESCE((v_val->>'enabled')::boolean, false); END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'lateral_min_age_days';
  IF v_val IS NOT NULL THEN v_lateral_min_age_days := (v_val->>'days')::int; END IF;

  -- ── Build temp tables for positions + demand ──
  CREATE TEMP TABLE _pos ON COMMIT DROP AS
  SELECT
    p.store_id, p.fc_id,
    SUM(COALESCE(p.on_hand, 0)) AS on_hand,
    SUM(COALESCE(p.reserved, 0)) AS reserved,
    SUM(COALESCE(p.on_hand, 0)) - SUM(COALESCE(p.reserved, 0)) AS available,
    SUM(COALESCE(p.safety_stock, 0)) AS safety_stock,
    s.store_name, s.store_code, s.location_type, s.region, s.is_transfer_eligible, s.tier, s.display_capacity
  FROM inv_state_positions p
  JOIN inv_stores s ON s.id = p.store_id AND s.is_active
  WHERE p.tenant_id = p_tenant_id
  GROUP BY p.store_id, p.fc_id, s.store_name, s.store_code, s.location_type, s.region, s.is_transfer_eligible, s.tier, s.display_capacity;

  CREATE INDEX ON _pos (store_id, fc_id);
  CREATE INDEX ON _pos (fc_id);

  CREATE TEMP TABLE _demand ON COMMIT DROP AS
  SELECT store_id, fc_id, COALESCE(avg_daily_sales, 0) AS avg_daily_sales
  FROM inv_state_demand
  WHERE tenant_id = p_tenant_id;

  CREATE INDEX ON _demand (store_id, fc_id);

  -- FC info lookup
  CREATE TEMP TABLE _fc ON COMMIT DROP AS
  SELECT id, COALESCE(fc_name, fc_code, '') AS fc_name, product_created_date
  FROM inv_family_codes
  WHERE tenant_id = p_tenant_id AND is_active;

  -- Size integrity
  CREATE TEMP TABLE _size_ok ON COMMIT DROP AS
  SELECT fc_id FROM inv_state_size_integrity
  WHERE tenant_id = p_tenant_id AND is_full_size_run = true;

  -- System FC stock for tier filtering
  CREATE TEMP TABLE _system_fc_stock ON COMMIT DROP AS
  SELECT fc_id, SUM(on_hand) AS system_total
  FROM _pos
  GROUP BY fc_id;

  -- FC allocation tier rules
  CREATE TEMP TABLE _fc_tier_rules ON COMMIT DROP AS
  SELECT 
    (r->>'max_fc')::numeric AS max_fc,
    ARRAY(SELECT jsonb_array_elements_text(r->'tiers')) AS eligible_tiers
  FROM inv_constraint_registry cr,
    jsonb_array_elements(cr.constraint_value->'ranges') AS r
  WHERE cr.tenant_id = p_tenant_id AND cr.is_active AND cr.constraint_key = 'fc_allocation_tier_rules';

  -- Store total on-hand for capacity check
  CREATE TEMP TABLE _store_totals ON COMMIT DROP AS
  SELECT store_id, SUM(on_hand) AS total_on_hand
  FROM _pos
  GROUP BY store_id;

  -- BST new age days
  DECLARE v_bst_new_age_days INT := 60;
  BEGIN
    SELECT (constraint_value->>'days')::int INTO v_bst_new_age_days FROM inv_constraint_registry
      WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'bst_new_age_days';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Display capacity multiplier
  DECLARE v_display_multiplier NUMERIC := 2.5;
  BEGIN
    SELECT (constraint_value->>'multiplier')::numeric INTO v_display_multiplier FROM inv_constraint_registry
      WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'store_max_stock_vs_display';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- ── Phase 1: Push from CW to shortage stores ──
  INSERT INTO inv_rebalance_suggestions (
    tenant_id, run_id, transfer_type, fc_id, fc_name,
    from_location, from_location_name, from_location_type,
    to_location, to_location_name, to_location_type,
    qty, reason, from_weeks_cover, to_weeks_cover, balanced_weeks_cover,
    priority, potential_revenue_gain, logistics_cost_estimate, net_benefit, status
  )
  WITH cw_stock AS (
    SELECT p.fc_id, p.store_id AS cw_id, p.store_name AS cw_name,
           p.on_hand - p.reserved - p.safety_stock AS cw_available
    FROM _pos p
    WHERE p.location_type = 'central_warehouse'
      AND p.on_hand - p.reserved - p.safety_stock > 0
      AND (NOT v_no_broken_size OR EXISTS (SELECT 1 FROM _size_ok si WHERE si.fc_id = p.fc_id))
  ),
  shortage AS (
    SELECT p.fc_id, p.store_id, p.store_name, p.location_type, p.tier,
           p.available AS on_hand,
           COALESCE(d.avg_daily_sales, 0) AS velocity,
           CASE WHEN COALESCE(d.avg_daily_sales, 0) > 0
                THEN p.available / (d.avg_daily_sales * 7)
                ELSE CASE WHEN p.available > 0 THEN 99 ELSE 0 END
           END AS weeks_cover
    FROM _pos p
    LEFT JOIN _demand d ON d.store_id = p.store_id AND d.fc_id = p.fc_id
    WHERE p.location_type NOT IN ('central_warehouse', 'sub_warehouse')
      AND COALESCE(p.is_transfer_eligible, true) = true
      AND CASE WHEN COALESCE(d.avg_daily_sales, 0) > 0
               THEN p.available / (d.avg_daily_sales * 7)
               ELSE CASE WHEN p.available > 0 THEN 99 ELSE 0 END
          END < v_min_cover_weeks
      -- FC-tier filtering: check if store tier is eligible based on system FC stock
      AND (
        -- If no tier rules configured, allow all
        NOT EXISTS (SELECT 1 FROM _fc_tier_rules LIMIT 1)
        OR sh.tier IS NULL
        OR EXISTS (
          SELECT 1 FROM _fc_tier_rules tr
          JOIN _system_fc_stock sfs ON sfs.fc_id = p.fc_id
          WHERE sfs.system_total <= tr.max_fc
            AND p.tier = ANY(tr.eligible_tiers)
          ORDER BY tr.max_fc
          LIMIT 1
        )
        -- BST new override: age < bst_new_age_days => allow all tiers
        OR EXISTS (
          SELECT 1 FROM _fc f
          WHERE f.id = p.fc_id
            AND f.product_created_date IS NOT NULL
            AND (CURRENT_DATE - f.product_created_date) < v_bst_new_age_days
        )
      )
  ),
  ranked_push AS (
    SELECT
      cw.fc_id, cw.cw_id, cw.cw_name, cw.cw_available,
      sh.store_id, sh.store_name, sh.location_type,
      sh.on_hand, sh.velocity, sh.weeks_cover,
      LEAST(
        CEIL((v_min_cover_weeks - sh.weeks_cover) * sh.velocity * 7),
        cw.cw_available
      )::int AS push_qty,
      ROW_NUMBER() OVER (PARTITION BY cw.fc_id ORDER BY sh.weeks_cover ASC) AS rn
    FROM cw_stock cw
    JOIN shortage sh ON sh.fc_id = cw.fc_id
    WHERE CEIL((v_min_cover_weeks - sh.weeks_cover) * sh.velocity * 7) > 0
  )
  SELECT
    p_tenant_id, p_run_id, 'push',
    rp.fc_id, COALESCE(f.fc_name, ''),
    rp.cw_id, rp.cw_name, 'central_warehouse',
    rp.store_id, rp.store_name, rp.location_type,
    rp.push_qty,
    rp.store_name || ' chỉ còn ' || ROUND(rp.weeks_cover, 1) || 'w cover, bổ sung từ kho tổng',
    0, rp.weeks_cover,
    CASE WHEN rp.velocity > 0 THEN (rp.on_hand + rp.push_qty) / (rp.velocity * 7) ELSE v_min_cover_weeks END,
    CASE WHEN rp.weeks_cover < 0.5 THEN 'P1' WHEN rp.weeks_cover < 1 THEN 'P2' ELSE 'P3' END,
    rp.push_qty * v_avg_price,
    rp.push_qty * v_logistics_default,
    rp.push_qty * v_avg_price - rp.push_qty * v_logistics_default,
    'pending'
  FROM ranked_push rp
  LEFT JOIN _fc f ON f.id = rp.fc_id
  WHERE rp.push_qty > 0;

  GET DIAGNOSTICS v_push_count = ROW_COUNT;
  SELECT COALESCE(SUM(qty), 0) INTO v_push_units
  FROM inv_rebalance_suggestions
  WHERE run_id = p_run_id AND transfer_type = 'push';

  -- ── Phase 2: Lateral (store-to-store) with age restriction ──
  IF v_lateral_enabled THEN
    INSERT INTO inv_rebalance_suggestions (
      tenant_id, run_id, transfer_type, fc_id, fc_name,
      from_location, from_location_name, from_location_type,
      to_location, to_location_name, to_location_type,
      qty, reason, from_weeks_cover, to_weeks_cover, balanced_weeks_cover,
      priority, potential_revenue_gain, logistics_cost_estimate, net_benefit, status
    )
    WITH store_cover AS (
      SELECT p.fc_id, p.store_id, p.store_name, p.location_type, p.region,
             p.available AS on_hand, p.safety_stock,
             COALESCE(d.avg_daily_sales, 0) AS velocity,
             CASE WHEN COALESCE(d.avg_daily_sales, 0) > 0
                  THEN p.available / (d.avg_daily_sales * 7)
                  ELSE CASE WHEN p.available > 0 THEN 99 ELSE 0 END
             END AS weeks_cover
      FROM _pos p
      LEFT JOIN _demand d ON d.store_id = p.store_id AND d.fc_id = p.fc_id
      WHERE p.location_type NOT IN ('central_warehouse', 'sub_warehouse')
        AND COALESCE(p.is_transfer_eligible, true) = true
        AND (NOT v_no_broken_size OR EXISTS (SELECT 1 FROM _size_ok si WHERE si.fc_id = p.fc_id))
        -- Lateral age restriction: skip BST < lateral_min_age_days
        AND NOT EXISTS (
          SELECT 1 FROM _fc f
          WHERE f.id = p.fc_id
            AND f.product_created_date IS NOT NULL
            AND (CURRENT_DATE - f.product_created_date) < v_lateral_min_age_days
        )
    ),
    surplus AS (
      SELECT fc_id, store_id, store_name, location_type, region, on_hand, velocity, weeks_cover,
             LEAST(
               FLOOR(on_hand * v_max_transfer_pct),
               on_hand - safety_stock - CEIL(v_max_cover_weeks * velocity * 7)
             )::int AS surplus_qty
      FROM store_cover
      WHERE weeks_cover > v_max_cover_weeks
    ),
    short AS (
      SELECT fc_id, store_id, store_name, location_type, region, on_hand, velocity, weeks_cover,
             CEIL((v_min_cover_weeks - weeks_cover) * velocity * 7)::int AS shortage_qty
      FROM store_cover
      WHERE weeks_cover < v_min_cover_weeks AND velocity > 0
    ),
    matches AS (
      SELECT
        sh.fc_id,
        su.store_id AS from_id, su.store_name AS from_name, su.location_type AS from_type,
        su.region AS from_region, su.weeks_cover AS from_wc,
        sh.store_id AS to_id, sh.store_name AS to_name, sh.location_type AS to_type,
        sh.region AS to_region, sh.weeks_cover AS to_wc, sh.on_hand AS to_on_hand, sh.velocity AS to_vel,
        LEAST(su.surplus_qty, sh.shortage_qty)::int AS transfer_qty,
        CASE WHEN su.region IS NOT NULL AND su.region = sh.region THEN true ELSE false END AS same_region,
        ROW_NUMBER() OVER (PARTITION BY sh.fc_id, sh.store_id ORDER BY
          CASE WHEN su.region = sh.region THEN 0 ELSE 1 END, su.weeks_cover DESC
        ) AS rn
      FROM short sh
      JOIN surplus su ON su.fc_id = sh.fc_id AND su.store_id != sh.store_id AND su.surplus_qty > 0
      WHERE LEAST(su.surplus_qty, sh.shortage_qty) > 0
    )
    SELECT
      p_tenant_id, p_run_id, 'lateral',
      m.fc_id, COALESCE(f.fc_name, ''),
      m.from_id, m.from_name, m.from_type,
      m.to_id, m.to_name, m.to_type,
      m.transfer_qty,
      m.from_name || ' thừa (' || ROUND(m.from_wc, 1) || 'w) → ' || m.to_name || ' thiếu (' || ROUND(m.to_wc, 1) || 'w)' ||
        CASE WHEN m.same_region THEN ' [cùng vùng]' ELSE '' END,
      m.from_wc, m.to_wc,
      CASE WHEN m.to_vel > 0 THEN (m.to_on_hand + m.transfer_qty) / (m.to_vel * 7) ELSE 0 END,
      CASE WHEN m.to_wc < 0.5 THEN 'P1' WHEN m.to_wc < 1 THEN 'P2' ELSE 'P3' END,
      m.transfer_qty * v_avg_price,
      m.transfer_qty * CASE WHEN m.same_region THEN v_logistics_same ELSE v_logistics_diff END,
      m.transfer_qty * v_avg_price - m.transfer_qty * CASE WHEN m.same_region THEN v_logistics_same ELSE v_logistics_diff END,
      'pending'
    FROM matches m
    LEFT JOIN _fc f ON f.id = m.fc_id
    WHERE m.rn = 1
      AND (m.transfer_qty * v_avg_price - m.transfer_qty * CASE WHEN m.same_region THEN v_logistics_same ELSE v_logistics_diff END) >= v_min_net_benefit;

    GET DIAGNOSTICS v_lateral_count = ROW_COUNT;
    SELECT COALESCE(SUM(qty), 0) INTO v_lateral_units
    FROM inv_rebalance_suggestions
    WHERE run_id = p_run_id AND transfer_type = 'lateral';
  END IF;

  RETURN jsonb_build_object(
    'push_suggestions', v_push_count,
    'push_units', v_push_units,
    'lateral_suggestions', v_lateral_count,
    'lateral_units', v_lateral_units,
    'total_suggestions', v_push_count + v_lateral_count
  );
END;
$$;
