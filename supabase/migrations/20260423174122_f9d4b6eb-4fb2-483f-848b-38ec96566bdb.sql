
-- 1. Update V1 matrix: Set C=0 across all ranges
UPDATE inv_constraint_registry
SET constraint_value = '{"ranges":[{"max_cw":29,"S":0,"A":0,"B":0,"C":0},{"max_cw":40,"S":4,"A":2,"B":1,"C":0},{"max_cw":60,"S":5,"A":3,"B":2,"C":0},{"max_cw":80,"S":5,"A":3,"B":2,"C":0},{"max_cw":100,"S":6,"A":4,"B":2,"C":0},{"max_cw":999999,"S":6,"A":4,"B":3,"C":0}]}'::jsonb,
    updated_at = now()
WHERE constraint_key = 'v1_allocation_matrix' AND is_active = true;

-- 2. Recreate fn_allocation_engine with updated V1 WHERE clause
-- Allow S-tier stores to receive V1 fill even when they have stock below matrix_min_stock
CREATE OR REPLACE FUNCTION public.fn_allocation_engine(
  p_tenant_id uuid,
  p_run_id uuid,
  p_run_type text DEFAULT 'both',
  p_collection_ids uuid[] DEFAULT NULL,
  p_store_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_v1_count integer := 0;
  v_v2_count integer := 0;
  v_total_units integer := 0;
  v_no_broken_size boolean;
  v_min_cover_weeks numeric;
  v_core_hero_min_per_sku integer;
  v_avg_unit_price numeric;
  v_bst_scope_recent_count integer;
  v_cw_reserved_ranges jsonb;
  v_v1_min_stock_ranges jsonb;
  v_cw_total_skus integer;
  v_cw_reserve_min integer;
  v_base_weights jsonb;
  v_scarcity_weights jsonb;
  v_scarcity_active boolean := false;
  v_dynamic_weights jsonb;
  v_bst_new_age_days integer := 60;
  v_cw_last_sync timestamp;
  v_cw_min_threshold integer := 6;
  v_v1_alloc_matrix jsonb;
  v_v2_tier_cap jsonb;
BEGIN
  SELECT COALESCE((SELECT (constraint_value->>'enabled')::boolean FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='no_broken_size' AND is_active=true LIMIT 1),true) INTO v_no_broken_size;
  SELECT COALESCE((SELECT (constraint_value->>'weeks')::numeric FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='v2_min_cover_weeks' AND is_active=true LIMIT 1),1) INTO v_min_cover_weeks;
  SELECT COALESCE((SELECT (constraint_value->>'min_pcs')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='cw_core_hero_min_per_sku' AND is_active=true LIMIT 1),15) INTO v_core_hero_min_per_sku;
  SELECT COALESCE((SELECT (constraint_value->>'amount')::numeric FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='avg_unit_price_default' AND is_active=true LIMIT 1),250000) INTO v_avg_unit_price;
  SELECT COALESCE((SELECT (constraint_value->>'count')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='bst_scope_recent_count' AND is_active=true LIMIT 1),10) INTO v_bst_scope_recent_count;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='cw_reserved_min_by_total_sku' AND is_active=true LIMIT 1),'[{"max_sku":9999,"min_pcs":5}]'::jsonb) INTO v_cw_reserved_ranges;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='v1_min_store_stock_by_total_sku' AND is_active=true LIMIT 1),'[{"max_sku":9999,"min_qty":5}]'::jsonb) INTO v_v1_min_stock_ranges;
  SELECT COALESCE((SELECT (constraint_value->>'days')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='bst_new_age_days' AND is_active=true LIMIT 1), 60) INTO v_bst_new_age_days;
  SELECT COALESCE((SELECT (constraint_value->>'min_qty')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='cw_min_threshold' AND is_active=true LIMIT 1), 6) INTO v_cw_min_threshold;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='v1_allocation_matrix' AND is_active=true LIMIT 1), NULL) INTO v_v1_alloc_matrix;
  SELECT COALESCE((SELECT constraint_value FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='v2_order_cap_by_tier' AND is_active=true LIMIT 1), '{"S":6,"A":4,"B":2,"C":1}'::jsonb) INTO v_v2_tier_cap;

  SELECT weights INTO v_base_weights FROM sem_allocation_policies WHERE tenant_id=p_tenant_id AND policy_type='BASE' AND is_active=true LIMIT 1;
  SELECT weights INTO v_scarcity_weights FROM sem_allocation_policies WHERE tenant_id=p_tenant_id AND policy_type='SCARCITY' AND is_active=true LIMIT 1;
  v_scarcity_active := v_scarcity_weights IS NOT NULL;
  SELECT weights INTO v_dynamic_weights FROM sem_allocation_policies WHERE tenant_id=p_tenant_id AND policy_type='DYNAMIC' AND is_active=true LIMIT 1;

  CREATE TEMP TABLE tmp_latest_snap ON COMMIT DROP AS
  SELECT store_id, MAX(snapshot_date) AS max_date FROM inv_state_positions WHERE tenant_id = p_tenant_id GROUP BY store_id;
  CREATE INDEX ON tmp_latest_snap(store_id);

  SELECT MAX(ls.max_date)::timestamp INTO v_cw_last_sync
  FROM tmp_latest_snap ls
  JOIN inv_stores cws ON cws.id = ls.store_id AND cws.tenant_id = p_tenant_id
    AND cws.location_type = 'central_warehouse' AND cws.is_active = true;

  CREATE TEMP TABLE tmp_pending_deductions ON COMMIT DROP AS
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
  CREATE INDEX ON tmp_pending_deductions(fc_id);

  CREATE TEMP TABLE tmp_cw ON COMMIT DROP AS
  SELECT sp.fc_id, 
    GREATEST(0, SUM(GREATEST(COALESCE(sp.on_hand,0)-COALESCE(sp.reserved,0)-COALESCE(sp.safety_stock,0),0)) - COALESCE(ded.deducted, 0))::integer AS available
  FROM inv_state_positions sp
  JOIN tmp_latest_snap ls ON ls.store_id = sp.store_id AND sp.snapshot_date = ls.max_date
  JOIN inv_stores s ON s.id=sp.store_id AND s.tenant_id=p_tenant_id AND s.location_type='central_warehouse' AND s.is_active=true
  LEFT JOIN tmp_pending_deductions ded ON ded.fc_id = sp.fc_id
  WHERE sp.tenant_id=p_tenant_id 
  GROUP BY sp.fc_id, ded.deducted 
  HAVING GREATEST(0, SUM(GREATEST(COALESCE(sp.on_hand,0)-COALESCE(sp.reserved,0)-COALESCE(sp.safety_stock,0),0)) - COALESCE(ded.deducted, 0)) >= v_cw_min_threshold;
  CREATE INDEX ON tmp_cw(fc_id);

  IF NOT EXISTS (SELECT 1 FROM tmp_cw) THEN
    RETURN jsonb_build_object('total_recommendations',0,'v1_count',0,'v2_count',0,'total_units',0,'message','No CW stock above threshold');
  END IF;

  SELECT COUNT(*) INTO v_cw_total_skus FROM tmp_cw;
  SELECT COALESCE((SELECT (r->>'min_pcs')::integer FROM jsonb_array_elements(v_cw_reserved_ranges) r WHERE (r->>'max_sku')::integer>=v_cw_total_skus ORDER BY (r->>'max_sku')::integer LIMIT 1),5) INTO v_cw_reserve_min;

  CREATE TEMP TABLE tmp_sok ON COMMIT DROP AS SELECT fc_id FROM inv_state_size_integrity WHERE tenant_id=p_tenant_id AND fc_id IN (SELECT fc_id FROM tmp_cw) GROUP BY fc_id HAVING bool_and(is_full_size_run);
  CREATE INDEX ON tmp_sok(fc_id);

  CREATE TEMP TABLE tmp_criticality ON COMMIT DROP AS
  SELECT style_id, criticality_class, min_presence_rule FROM sem_sku_criticality WHERE tenant_id = p_tenant_id AND is_current = true;
  CREATE INDEX ON tmp_criticality(style_id);

  CREATE TEMP TABLE tmp_sys_fc ON COMMIT DROP AS
  SELECT fc_id, SUM(COALESCE(on_hand,0))::integer AS system_total
  FROM inv_state_positions sp JOIN tmp_latest_snap ls ON ls.store_id = sp.store_id AND sp.snapshot_date = ls.max_date
  WHERE sp.tenant_id = p_tenant_id GROUP BY fc_id;
  CREATE INDEX ON tmp_sys_fc(fc_id);

  CREATE TEMP TABLE tmp_excluded_collections ON COMMIT DROP AS
  SELECT id FROM inv_collections WHERE tenant_id = p_tenant_id AND collection_code IN ('07-Others', '10-Accessories');

  CREATE TEMP TABLE tmp_fc ON COMMIT DROP AS
  SELECT f.id, f.fc_code, f.fc_name,
    CASE WHEN cr.criticality_class IN ('CORE','HERO') THEN true ELSE COALESCE(f.is_core_hero, false) END AS is_core_hero,
    COALESCE(cr.criticality_class, CASE WHEN f.is_core_hero THEN 'HERO' ELSE 'LONGTAIL' END) AS criticality_class,
    f.collection_id,
    COALESCE((SELECT COUNT(*)::integer FROM inv_sku_fc_mapping m WHERE m.tenant_id=p_tenant_id AND m.fc_id=f.id),1) AS sku_count,
    f.product_created_date
  FROM inv_family_codes f
  LEFT JOIN tmp_criticality cr ON cr.style_id = f.fc_code
  WHERE f.tenant_id=p_tenant_id AND f.is_active=true AND f.id IN (SELECT fc_id FROM tmp_cw)
    AND (NOT v_no_broken_size OR f.id IN (SELECT fc_id FROM tmp_sok) OR NOT EXISTS (SELECT 1 FROM inv_state_size_integrity WHERE tenant_id=p_tenant_id AND fc_id=f.id))
    AND f.fc_code NOT LIKE 'SP%' AND f.fc_code NOT LIKE 'GIFT%' AND f.fc_code NOT LIKE 'BAG%' AND f.fc_code NOT LIKE 'BOX%'
    AND f.fc_code NOT LIKE 'LB%' AND f.fc_code NOT LIKE 'GC%' AND f.fc_code NOT LIKE 'VC0%' AND f.fc_code NOT LIKE 'RFID%'
    AND f.fc_code NOT LIKE 'DTR%' AND f.fc_code NOT LIKE 'SER%' AND f.fc_code NOT LIKE 'TXN%' AND f.fc_code NOT LIKE '333%'
    AND f.fc_code NOT LIKE 'CLI%' AND f.fc_code NOT LIKE 'OBG%' AND f.fc_code NOT LIKE 'BVSE%'
    AND (f.collection_id IS NULL OR f.collection_id NOT IN (SELECT id FROM tmp_excluded_collections))
    AND (p_collection_ids IS NULL OR f.collection_id = ANY(p_collection_ids));
  CREATE INDEX ON tmp_fc(id);

  CREATE TEMP TABLE tmp_pos ON COMMIT DROP AS
  SELECT sp.store_id,sp.fc_id,SUM(COALESCE(sp.on_hand,0))::integer AS oh,SUM(COALESCE(sp.in_transit,0))::integer AS it
  FROM inv_state_positions sp JOIN tmp_latest_snap ls ON ls.store_id = sp.store_id AND sp.snapshot_date = ls.max_date
  WHERE sp.tenant_id=p_tenant_id GROUP BY sp.store_id,sp.fc_id;
  CREATE INDEX ON tmp_pos(store_id,fc_id);

  CREATE TEMP TABLE tmp_sfc ON COMMIT DROP AS
  SELECT sp.store_id,COUNT(DISTINCT sp.fc_id)::integer AS fc_count
  FROM inv_state_positions sp JOIN tmp_latest_snap ls ON ls.store_id = sp.store_id AND sp.snapshot_date = ls.max_date
  WHERE sp.tenant_id=p_tenant_id GROUP BY sp.store_id;
  CREATE INDEX ON tmp_sfc(store_id);

  CREATE TEMP TABLE tmp_dem ON COMMIT DROP AS SELECT store_id,fc_id,COALESCE(avg_daily_sales,sales_velocity,0)::numeric AS vel,COALESCE(customer_orders_qty,0)::integer AS co,COALESCE(store_orders_qty,0)::integer AS so FROM inv_state_demand WHERE tenant_id=p_tenant_id AND fc_id IN (SELECT fc_id FROM tmp_cw);
  CREATE INDEX ON tmp_dem(store_id,fc_id);

  CREATE TEMP TABLE tmp_str ON COMMIT DROP AS SELECT id,store_name,store_code,tier,capacity,
    CASE WHEN COALESCE(capacity,0)<=0 THEN 999999 ELSE (capacity * 1.2)::integer END AS effective_capacity,
    CASE tier WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 9 END AS tord FROM inv_stores WHERE tenant_id=p_tenant_id AND is_active=true AND location_type!='central_warehouse'
    AND tier IN ('S','A','B','C')
    AND (p_store_ids IS NULL OR id = ANY(p_store_ids));
  CREATE INDEX ON tmp_str(id);

  CREATE TEMP TABLE tmp_str_v1 ON COMMIT DROP AS SELECT id,store_name,store_code,tier,capacity,
    CASE WHEN COALESCE(capacity,0)<=0 THEN 999999 ELSE (capacity * 1.2)::integer END AS effective_capacity,
    CASE tier WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 9 END AS tord FROM inv_stores WHERE tenant_id=p_tenant_id AND is_active=true AND location_type!='central_warehouse' AND is_fill_enabled=true
    AND tier IN ('S','A','B','C')
    AND (p_store_ids IS NULL OR id = ANY(p_store_ids));
  CREATE INDEX ON tmp_str_v1(id);

  CREATE TEMP TABLE tmp_soh ON COMMIT DROP AS
  SELECT sp.store_id,SUM(COALESCE(sp.on_hand,0))::integer AS toh
  FROM inv_state_positions sp JOIN tmp_latest_snap ls ON ls.store_id = sp.store_id AND sp.snapshot_date = ls.max_date
  WHERE sp.tenant_id=p_tenant_id GROUP BY sp.store_id;
  CREATE INDEX ON tmp_soh(store_id);

  -- ═══════════════ V1: Base Fill (S-tier can top-up below matrix min) ═══════════════
  IF p_run_type IN ('V1','both') THEN
    WITH v1_raw AS (
      SELECT f.id AS fid, f.fc_name, f.fc_code, f.is_core_hero, f.criticality_class, f.sku_count,
        s.id AS sid, s.store_name, s.store_code, s.tier, s.capacity, s.effective_capacity, s.tord,
        cw.available AS cwt,
        GREATEST(3,
          CASE f.criticality_class
            WHEN 'CORE' THEN v_core_hero_min_per_sku * f.sku_count
            WHEN 'HERO' THEN GREATEST((v_core_hero_min_per_sku * f.sku_count * 0.7)::integer, FLOOR(cw.available * 0.15)::integer)
            ELSE FLOOR(cw.available * 0.15)::integer
          END
        ) AS cwr,
        MAX(COALESCE(p.oh,0)+COALESCE(p.it,0)) AS cs,
        MAX(COALESCE(sfc.fc_count,0)) AS sfc,
        MAX(COALESCE(d.vel,0)) AS vel,
        MAX(COALESCE(soh.toh,0)) AS stoh,
        COALESCE(CASE s.tier WHEN 'S' THEN (v_base_weights->>'tier_S')::numeric WHEN 'A' THEN (v_base_weights->>'tier_A')::numeric WHEN 'B' THEN (v_base_weights->>'tier_B')::numeric WHEN 'C' THEN (v_base_weights->>'tier_C')::numeric END, 1.0) AS tier_weight,
        CASE WHEN v_v1_alloc_matrix IS NOT NULL THEN
          COALESCE(
            (SELECT (r->>s.tier)::integer FROM jsonb_array_elements(v_v1_alloc_matrix) r WHERE (r->>'max_cw')::integer >= cw.available ORDER BY (r->>'max_cw')::integer LIMIT 1),
            0
          )
        ELSE
          COALESCE((SELECT (r->>'min_qty')::integer FROM jsonb_array_elements(v_v1_min_stock_ranges) r WHERE (r->>'max_sku')::integer >= f.sku_count ORDER BY (r->>'max_sku')::integer LIMIT 1), 5)
        END AS matrix_min_stock
      FROM tmp_fc f JOIN tmp_cw cw ON cw.fc_id=f.id
      LEFT JOIN inv_collections c ON c.id=f.collection_id AND c.tenant_id=p_tenant_id
      CROSS JOIN tmp_str_v1 s
      LEFT JOIN tmp_pos p ON p.store_id=s.id AND p.fc_id=f.id
      LEFT JOIN tmp_sfc sfc ON sfc.store_id=s.id
      LEFT JOIN tmp_dem d ON d.store_id=s.id AND d.fc_id=f.id
      LEFT JOIN tmp_soh soh ON soh.store_id=s.id
      LEFT JOIN tmp_sys_fc sfs ON sfs.fc_id=f.id
      WHERE (
          -- S-tier: allow fill if current stock < matrix_min_stock (top-up logic)
          (s.tier = 'S' AND (COALESCE(p.oh,0)+COALESCE(p.it,0)) < 
            COALESCE(
              (SELECT (r->>'S')::integer FROM jsonb_array_elements(v_v1_alloc_matrix) r WHERE (r->>'max_cw')::integer >= cw.available ORDER BY (r->>'max_cw')::integer LIMIT 1),
              0
            )
          )
          -- Other tiers: only fill when store has zero stock for this FC
          OR (s.tier != 'S' AND (COALESCE(p.oh,0)+COALESCE(p.it,0)) = 0)
        )
        AND COALESCE(soh.toh,0) < s.effective_capacity
        AND (NOT v_scarcity_active
             OR s.tier != 'C'
             OR COALESCE(sfs.system_total,0) > COALESCE((v_scarcity_weights->>'min_system_stock')::integer, 20)
             OR (f.product_created_date IS NOT NULL AND (CURRENT_DATE - f.product_created_date) < v_bst_new_age_days)
        )
      GROUP BY f.id, f.fc_name, f.fc_code, f.is_core_hero, f.criticality_class, f.sku_count,
        s.id, s.store_name, s.store_code, s.tier, s.capacity, s.effective_capacity, s.tord,
        cw.available, v_base_weights
    ),
    v1_ranked AS (
      SELECT *,
        -- For S-tier top-up: only allocate the gap (matrix_min - current stock)
        CASE WHEN cs > 0 THEN GREATEST(1, matrix_min_stock - cs) ELSE matrix_min_stock END AS fill_qty,
        ROW_NUMBER() OVER (PARTITION BY fid ORDER BY tord, vel DESC, cs ASC) AS rn,
        SUM(CASE WHEN cs > 0 THEN GREATEST(1, matrix_min_stock - cs) ELSE matrix_min_stock END) OVER (PARTITION BY fid ORDER BY tord, vel DESC, cs ASC) AS cum_qty
      FROM v1_raw
      WHERE matrix_min_stock > 0
    ),
    v1_ok AS (
      SELECT * FROM v1_ranked WHERE cum_qty <= (cwt - cwr)
    )
    INSERT INTO inv_allocation_recommendations(tenant_id,run_id,fc_id,fc_name,store_id,store_name,recommended_qty,reason,priority,status,potential_revenue,constraint_checks,allocation_version)
    SELECT p_tenant_id,p_run_id,fid,fc_name||' ('||fc_code||')',sid,store_name||' ('||store_code||')',
      GREATEST(1, fill_qty),
      CASE 
        WHEN cs > 0 THEN 'V1-Top-up '||tier||' (hiện có '||cs||', matrix='||matrix_min_stock||', bổ sung '||fill_qty||')'
        ELSE CASE criticality_class
          WHEN 'CORE' THEN 'V1-Phủ nền CORE (trọng số '||tier||': '||ROUND(tier_weight,2)||', matrix='||matrix_min_stock||')'
          WHEN 'HERO' THEN 'V1-Phủ nền HERO (trọng số '||tier||': '||ROUND(tier_weight,2)||', matrix='||matrix_min_stock||')'
          ELSE 'V1-Phủ nền (trọng số '||tier||': '||ROUND(tier_weight,2)||', matrix='||matrix_min_stock||')'
        END
      END,
      CASE WHEN tord=0 THEN 'high' WHEN tord=1 THEN 'high' WHEN tord=2 THEN 'medium' ELSE 'low' END,
      'pending',
      GREATEST(1, fill_qty) * v_avg_unit_price,
      jsonb_build_object('source_on_hand',cwt,'dest_on_hand',cs,'sold_7d',ROUND(vel*7,1),'tier_weight',ROUND(tier_weight,2),'criticality',criticality_class,'matrix_min_stock',matrix_min_stock,'fill_qty',fill_qty),
      'V1'
    FROM v1_ok
    ON CONFLICT (run_id, fc_id, store_id) DO NOTHING;
    GET DIAGNOSTICS v_v1_count = ROW_COUNT;
  END IF;

  -- ═══════════════ V2: Demand-Based (TIER-PRIORITY ORDER) ═══════════════
  IF p_run_type IN ('V2','both') THEN
    WITH v2_raw AS (
      SELECT f.id AS fid,f.fc_name,f.fc_code,f.is_core_hero,f.criticality_class,
        s.id AS sid,s.store_name,s.store_code,s.tier,s.capacity,s.effective_capacity,s.tord,
        cw.available AS cwt,
        GREATEST(3,
          CASE f.criticality_class
            WHEN 'CORE' THEN v_core_hero_min_per_sku * f.sku_count
            WHEN 'HERO' THEN GREATEST((v_core_hero_min_per_sku * f.sku_count * 0.7)::integer, FLOOR(cw.available * 0.15)::integer)
            ELSE FLOOR(cw.available * 0.15)::integer
          END
        ) AS cwr,
        COALESCE(p.oh,0) AS cs,COALESCE(d.vel,0) AS vel,COALESCE(d.co,0) AS co,COALESCE(d.so,0) AS so,COALESCE(soh.toh,0) AS stoh,
        CASE WHEN COALESCE(d.vel,0)>0 THEN COALESCE(p.oh,0)/d.vel ELSE 999 END AS wc,
        COALESCE(CASE s.tier WHEN 'S' THEN (v_dynamic_weights->>'tier_S')::numeric WHEN 'A' THEN (v_dynamic_weights->>'tier_A')::numeric WHEN 'B' THEN (v_dynamic_weights->>'tier_B')::numeric WHEN 'C' THEN (v_dynamic_weights->>'tier_C')::numeric END, 1.0) AS dyn_weight,
        CASE WHEN f.product_created_date IS NOT NULL AND (CURRENT_DATE - f.product_created_date) < v_bst_new_age_days THEN true ELSE false END AS is_bst_new,
        f.sku_count,
        COALESCE((v_v2_tier_cap->>s.tier)::integer, 6) AS tier_cap
      FROM tmp_fc f JOIN tmp_cw cw ON cw.fc_id=f.id
      CROSS JOIN tmp_str s
      LEFT JOIN tmp_pos p ON p.store_id=s.id AND p.fc_id=f.id
      LEFT JOIN tmp_dem d ON d.store_id=s.id AND d.fc_id=f.id
      LEFT JOIN tmp_soh soh ON soh.store_id=s.id
      WHERE (COALESCE(d.vel,0)>0 OR COALESCE(d.co,0)>0 OR COALESCE(d.so,0)>0)
        AND COALESCE(soh.toh,0) < s.effective_capacity
    ),
    v2_need AS (
      SELECT *,
        LEAST(
          GREATEST(1,
            GREATEST(
              CEIL(vel * v_min_cover_weeks * 7) - cs,
              co + so - cs
            )::integer
          ),
          tier_cap
        ) AS need
      FROM v2_raw
      WHERE (vel > 0 AND (CASE WHEN vel>0 THEN cs/vel ELSE 999 END) < v_min_cover_weeks * 7) OR (co + so) > cs
    ),
    v2_ranked AS (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY fid ORDER BY tord, co DESC, vel DESC) AS rn,
        SUM(need) OVER (PARTITION BY fid ORDER BY tord, co DESC, vel DESC) AS cum
      FROM v2_need WHERE need > 0
    ),
    v2_ok AS (
      SELECT * FROM v2_ranked WHERE cum <= (cwt - cwr)
    )
    INSERT INTO inv_allocation_recommendations(tenant_id,run_id,fc_id,fc_name,store_id,store_name,recommended_qty,reason,priority,status,potential_revenue,constraint_checks,allocation_version)
    SELECT p_tenant_id,p_run_id,fid,fc_name||' ('||fc_code||')',sid,store_name||' ('||store_code||')',
      need,
      'V2-Bổ sung theo demand (vel='||ROUND(vel,2)||'/d, CO='||co||', SO='||so||', cover='||ROUND(wc,1)||'w, cap='||tier_cap||')',
      CASE WHEN tord=0 THEN 'high' WHEN tord=1 THEN 'high' WHEN tord=2 THEN 'medium' ELSE 'low' END,
      'pending',
      need * v_avg_unit_price,
      jsonb_build_object('velocity',ROUND(vel,3),'customer_orders',co,'store_orders',so,'weeks_cover',ROUND(wc,1),'current_stock',cs,'tier_cap',tier_cap,'dyn_weight',ROUND(dyn_weight,2)),
      'V2'
    FROM v2_ok
    ON CONFLICT (run_id, fc_id, store_id) DO UPDATE SET
      recommended_qty = inv_allocation_recommendations.recommended_qty + EXCLUDED.recommended_qty,
      reason = inv_allocation_recommendations.reason || ' + ' || EXCLUDED.reason,
      potential_revenue = inv_allocation_recommendations.potential_revenue + EXCLUDED.potential_revenue,
      allocation_version = 'V1+V2';
    GET DIAGNOSTICS v_v2_count = ROW_COUNT;
  END IF;

  SELECT COALESCE(COUNT(*),0), COALESCE(SUM(recommended_qty),0)
  INTO v_v1_count, v_total_units
  FROM inv_allocation_recommendations WHERE run_id=p_run_id;
  v_v1_count := COALESCE(v_v1_count, 0);
  v_v2_count := COALESCE(v_v2_count, 0);

  RETURN jsonb_build_object(
    'total_recommendations', v_v1_count,
    'v1_count', (SELECT COUNT(*) FROM inv_allocation_recommendations WHERE run_id=p_run_id AND allocation_version='V1'),
    'v2_count', (SELECT COUNT(*) FROM inv_allocation_recommendations WHERE run_id=p_run_id AND allocation_version IN ('V2','V1+V2')),
    'total_units', v_total_units
  );
END;
$$;
