
-- Update fn_rebalance_engine to exclude non-fashion collections (07-Others, 10-Accessories)
CREATE OR REPLACE FUNCTION fn_rebalance_engine(
  p_tenant_id uuid,
  p_run_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '120s' AS $$
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
  v_bst_new_age_days INT := 60;
  v_display_multiplier NUMERIC := 2.5;
  v_push_count INT := 0;
  v_push_units INT := 0;
  v_lateral_count INT := 0;
  v_lateral_units INT := 0;
  v_val JSONB;
  v_cw_last_sync timestamp;
BEGIN
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

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'bst_new_age_days';
  IF v_val IS NOT NULL THEN v_bst_new_age_days := (v_val->>'days')::int; END IF;

  SELECT constraint_value INTO v_val FROM inv_constraint_registry
    WHERE tenant_id = p_tenant_id AND is_active AND constraint_key = 'store_max_stock_vs_display';
  IF v_val IS NOT NULL THEN v_display_multiplier := (v_val->>'multiplier')::numeric; END IF;

  CREATE TEMP TABLE _latest_snap ON COMMIT DROP AS
  SELECT store_id, MAX(snapshot_date) AS max_date
  FROM inv_state_positions WHERE tenant_id = p_tenant_id
  GROUP BY store_id;
  CREATE INDEX ON _latest_snap(store_id);

  SELECT MAX(ls.max_date)::timestamp INTO v_cw_last_sync
  FROM _latest_snap ls
  JOIN inv_stores cws ON cws.id = ls.store_id AND cws.tenant_id = p_tenant_id
    AND cws.location_type = 'central_warehouse' AND cws.is_active = true;

  CREATE TEMP TABLE _pending_deductions ON COMMIT DROP AS
  SELECT fc_id, SUM(deducted) AS deducted FROM (
    SELECT ar.fc_id, SUM(ar.recommended_qty) AS deducted
    FROM inv_allocation_recommendations ar
    WHERE ar.tenant_id = p_tenant_id AND ar.status = 'approved'
      AND v_cw_last_sync IS NOT NULL AND ar.approved_at > v_cw_last_sync
    GROUP BY ar.fc_id
    UNION ALL
    SELECT rs.fc_id, SUM(rs.qty) AS deducted
    FROM inv_rebalance_suggestions rs
    WHERE rs.tenant_id = p_tenant_id AND rs.status = 'approved'
      AND rs.from_location_type = 'central_warehouse'
      AND v_cw_last_sync IS NOT NULL AND rs.approved_at > v_cw_last_sync
    GROUP BY rs.fc_id
  ) combined
  GROUP BY fc_id;
  CREATE INDEX ON _pending_deductions(fc_id);

  CREATE TEMP TABLE _pos ON COMMIT DROP AS
  SELECT
    p.store_id, p.fc_id,
    SUM(COALESCE(p.on_hand, 0)) AS on_hand,
    SUM(COALESCE(p.reserved, 0)) AS reserved,
    CASE WHEN s.location_type = 'central_warehouse'
      THEN GREATEST(0, SUM(COALESCE(p.on_hand, 0)) - SUM(COALESCE(p.reserved, 0)) - COALESCE(ded.deducted, 0))
      ELSE SUM(COALESCE(p.on_hand, 0)) - SUM(COALESCE(p.reserved, 0))
    END AS available,
    SUM(COALESCE(p.safety_stock, 0)) AS safety_stock,
    s.store_name, s.store_code, s.location_type, s.region, s.is_transfer_eligible, s.tier,
    COALESCE(s.display_capacity, 0) AS display_capacity
  FROM inv_state_positions p
  JOIN _latest_snap ls ON ls.store_id = p.store_id AND p.snapshot_date = ls.max_date
  JOIN inv_stores s ON s.id = p.store_id AND s.is_active
  LEFT JOIN _pending_deductions ded ON ded.fc_id = p.fc_id AND s.location_type = 'central_warehouse'
  WHERE p.tenant_id = p_tenant_id
  GROUP BY p.store_id, p.fc_id, s.store_name, s.store_code, s.location_type, s.region, s.is_transfer_eligible, s.tier, s.display_capacity, ded.deducted;

  CREATE INDEX ON _pos (store_id, fc_id);
  CREATE INDEX ON _pos (fc_id);

  CREATE TEMP TABLE _demand ON COMMIT DROP AS
  SELECT store_id, fc_id, COALESCE(avg_daily_sales, 0) AS avg_daily_sales
  FROM inv_state_demand
  WHERE tenant_id = p_tenant_id;
  CREATE INDEX ON _demand (store_id, fc_id);

  -- ── Excluded non-fashion collection IDs ──
  CREATE TEMP TABLE _excluded_collections ON COMMIT DROP AS
  SELECT id FROM inv_collections WHERE tenant_id = p_tenant_id AND collection_code IN ('07-Others', '10-Accessories');

  CREATE TEMP TABLE _fc ON COMMIT DROP AS
  SELECT id, COALESCE(fc_name, fc_code, '') AS fc_name, product_created_date
  FROM inv_family_codes
  WHERE tenant_id = p_tenant_id AND is_active
    AND fc_code NOT LIKE 'SP%'
    AND fc_code NOT LIKE 'GIFT%'
    AND fc_code NOT LIKE 'BAG%'
    AND fc_code NOT LIKE 'BOX%'
    AND fc_code NOT LIKE 'LB%'
    AND fc_code NOT LIKE 'GC%'
    AND fc_code NOT LIKE 'VC0%'
    AND fc_code NOT LIKE 'RFID%'
    AND fc_code NOT LIKE 'DTR%'
    AND fc_code NOT LIKE 'SER%'
    AND fc_code NOT LIKE 'TXN%'
    AND fc_code NOT LIKE '333%'
    AND fc_code NOT LIKE 'CLI%'
    AND fc_code NOT LIKE 'OBG%'
    AND fc_code NOT LIKE 'BVSE%'
    AND (collection_id IS NULL OR collection_id NOT IN (SELECT id FROM _excluded_collections));

  CREATE TEMP TABLE _size_ok ON COMMIT DROP AS
  SELECT fc_id FROM inv_state_size_integrity
  WHERE tenant_id = p_tenant_id AND is_full_size_run = true;

  CREATE TEMP TABLE _system_fc_stock ON COMMIT DROP AS
  SELECT fc_id, SUM(on_hand) AS system_total
  FROM _pos
  GROUP BY fc_id;

  CREATE TEMP TABLE _store_totals ON COMMIT DROP AS
  SELECT store_id, SUM(on_hand) AS total_on_hand
  FROM _pos
  GROUP BY store_id;

  -- ── Phase 1: Push from CW ──
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
      AND p.fc_id IN (SELECT id FROM _fc)
  ),
  fc_tier_check AS (
    SELECT 
      (r->>'max_fc')::numeric AS max_fc,
      ARRAY(SELECT jsonb_array_elements_text(r->'tiers')) AS eligible_tiers
    FROM inv_constraint_registry cr,
      jsonb_array_elements(cr.constraint_value->'ranges') AS r
    WHERE cr.tenant_id = p_tenant_id AND cr.is_active AND cr.constraint_key = 'fc_allocation_tier_rules'
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
      AND p.fc_id IN (SELECT id FROM _fc)
      AND CASE WHEN COALESCE(d.avg_daily_sales, 0) > 0
               THEN p.available / (d.avg_daily_sales * 7)
               ELSE CASE WHEN p.available > 0 THEN 99 ELSE 0 END
          END < v_min_cover_weeks
      AND (
        NOT EXISTS (SELECT 1 FROM fc_tier_check LIMIT 1)
        OR p.tier IS NULL
        OR EXISTS (
          SELECT 1 FROM fc_tier_check tr
          JOIN _system_fc_stock sfs ON sfs.fc_id = p.fc_id
          WHERE sfs.system_total <= tr.max_fc
            AND p.tier = ANY(tr.eligible_tiers)
          ORDER BY tr.max_fc
          LIMIT 1
        )
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
  ),
  push_cumulative AS (
    SELECT *,
      SUM(push_qty) OVER (PARTITION BY fc_id ORDER BY weeks_cover ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_push
    FROM ranked_push
    WHERE push_qty > 0
  ),
  push_grouped AS (
    SELECT
      fc_id, cw_id, cw_name, MAX(cw_available) AS cw_available,
      store_id, MAX(store_name) AS store_name, MAX(location_type) AS location_type,
      SUM(on_hand)::integer AS on_hand, AVG(velocity) AS velocity, MIN(weeks_cover) AS weeks_cover,
      SUM(push_qty)::integer AS push_qty
    FROM push_cumulative
    WHERE cum_push <= cw_available
    GROUP BY fc_id, cw_id, cw_name, store_id
  )
  SELECT
    p_tenant_id, p_run_id, 'push',
    pg.fc_id, COALESCE(f.fc_name, ''),
    pg.cw_id, pg.cw_name, 'central_warehouse',
    pg.store_id, pg.store_name, pg.location_type,
    pg.push_qty,
    pg.store_name || ' chỉ còn ' || ROUND(pg.weeks_cover, 1) || 'w cover, bổ sung từ kho tổng',
    0, pg.weeks_cover,
    CASE WHEN pg.velocity > 0 THEN (pg.on_hand + pg.push_qty) / (pg.velocity * 7) ELSE v_min_cover_weeks END,
    CASE WHEN pg.weeks_cover < 0.5 THEN 'P1' WHEN pg.weeks_cover < 1 THEN 'P2' ELSE 'P3' END,
    pg.push_qty * v_avg_price,
    pg.push_qty * v_logistics_default,
    pg.push_qty * v_avg_price - pg.push_qty * v_logistics_default,
    'pending'
  FROM push_grouped pg
  LEFT JOIN _fc f ON f.id = pg.fc_id
  WHERE pg.push_qty > 0;

  GET DIAGNOSTICS v_push_count = ROW_COUNT;
  SELECT COALESCE(SUM(qty), 0) INTO v_push_units
  FROM inv_rebalance_suggestions
  WHERE run_id = p_run_id AND transfer_type = 'push';

  -- ── Phase 2: Lateral with age restriction ──
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
        AND p.fc_id IN (SELECT id FROM _fc)
        AND (NOT v_no_broken_size OR EXISTS (SELECT 1 FROM _size_ok si WHERE si.fc_id = p.fc_id))
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
