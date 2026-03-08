
-- =============================================
-- Option B: Time-Based Virtual Deduction for both engines
-- =============================================

-- ── 1. Update fn_allocation_engine ──
CREATE OR REPLACE FUNCTION public.fn_allocation_engine(p_tenant_id uuid, p_run_id uuid, p_run_type text DEFAULT 'both'::text, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_store_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '120s'
AS $function$
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
BEGIN
  SELECT COALESCE((SELECT (constraint_value->>'enabled')::boolean FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='no_broken_size' AND is_active=true LIMIT 1),true) INTO v_no_broken_size;
  SELECT COALESCE((SELECT (constraint_value->>'weeks')::numeric FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='v2_min_cover_weeks' AND is_active=true LIMIT 1),1) INTO v_min_cover_weeks;
  SELECT COALESCE((SELECT (constraint_value->>'min_pcs')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='cw_core_hero_min_per_sku' AND is_active=true LIMIT 1),15) INTO v_core_hero_min_per_sku;
  SELECT COALESCE((SELECT (constraint_value->>'amount')::numeric FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='avg_unit_price_default' AND is_active=true LIMIT 1),250000) INTO v_avg_unit_price;
  SELECT COALESCE((SELECT (constraint_value->>'count')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='bst_scope_recent_count' AND is_active=true LIMIT 1),10) INTO v_bst_scope_recent_count;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='cw_reserved_min_by_total_sku' AND is_active=true LIMIT 1),'[{"max_sku":9999,"min_pcs":5}]'::jsonb) INTO v_cw_reserved_ranges;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='v1_min_store_stock_by_total_sku' AND is_active=true LIMIT 1),'[{"max_sku":9999,"min_qty":5}]'::jsonb) INTO v_v1_min_stock_ranges;

  SELECT COALESCE((SELECT (constraint_value->>'days')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='bst_new_age_days' AND is_active=true LIMIT 1), 60) INTO v_bst_new_age_days;

  SELECT weights INTO v_base_weights FROM sem_allocation_policies WHERE tenant_id=p_tenant_id AND policy_type='BASE' AND is_active=true LIMIT 1;
  SELECT weights INTO v_scarcity_weights FROM sem_allocation_policies WHERE tenant_id=p_tenant_id AND policy_type='SCARCITY' AND is_active=true LIMIT 1;
  v_scarcity_active := v_scarcity_weights IS NOT NULL;
  SELECT weights INTO v_dynamic_weights FROM sem_allocation_policies WHERE tenant_id=p_tenant_id AND policy_type='DYNAMIC' AND is_active=true LIMIT 1;

  CREATE TEMP TABLE tmp_latest_snap ON COMMIT DROP AS
  SELECT store_id, MAX(snapshot_date) AS max_date FROM inv_state_positions WHERE tenant_id = p_tenant_id GROUP BY store_id;
  CREATE INDEX ON tmp_latest_snap(store_id);

  -- ── Option B: Get CW last sync timestamp ──
  SELECT MAX(ls.max_date)::timestamp INTO v_cw_last_sync
  FROM tmp_latest_snap ls
  JOIN inv_stores cws ON cws.id = ls.store_id AND cws.tenant_id = p_tenant_id
    AND cws.location_type = 'central_warehouse' AND cws.is_active = true;

  -- ── Option B: Virtual deduction — approved qty after last CW sync ──
  CREATE TEMP TABLE tmp_pending_deductions ON COMMIT DROP AS
  SELECT fc_id, SUM(deducted) AS deducted FROM (
    SELECT ar.fc_id, SUM(ar.recommended_qty) AS deducted
    FROM inv_allocation_recommendations ar
    WHERE ar.tenant_id = p_tenant_id
      AND ar.status = 'approved'
      AND v_cw_last_sync IS NOT NULL
      AND ar.approved_at > v_cw_last_sync
    GROUP BY ar.fc_id
    UNION ALL
    SELECT rs.fc_id, SUM(rs.qty) AS deducted
    FROM inv_rebalance_suggestions rs
    WHERE rs.tenant_id = p_tenant_id
      AND rs.status = 'approved'
      AND rs.from_location_type = 'central_warehouse'
      AND v_cw_last_sync IS NOT NULL
      AND rs.approved_at > v_cw_last_sync
    GROUP BY rs.fc_id
  ) combined
  GROUP BY fc_id;
  CREATE INDEX ON tmp_pending_deductions(fc_id);

  -- ── CW stock with virtual deduction ──
  CREATE TEMP TABLE tmp_cw ON COMMIT DROP AS
  SELECT sp.fc_id, 
    GREATEST(0, SUM(GREATEST(COALESCE(sp.on_hand,0)-COALESCE(sp.reserved,0)-COALESCE(sp.safety_stock,0),0)) - COALESCE(ded.deducted, 0))::integer AS available
  FROM inv_state_positions sp
  JOIN tmp_latest_snap ls ON ls.store_id = sp.store_id AND sp.snapshot_date = ls.max_date
  JOIN inv_stores s ON s.id=sp.store_id AND s.tenant_id=p_tenant_id AND s.location_type='central_warehouse' AND s.is_active=true
  LEFT JOIN tmp_pending_deductions ded ON ded.fc_id = sp.fc_id
  WHERE sp.tenant_id=p_tenant_id 
  GROUP BY sp.fc_id, ded.deducted 
  HAVING GREATEST(0, SUM(GREATEST(COALESCE(sp.on_hand,0)-COALESCE(sp.reserved,0)-COALESCE(sp.safety_stock,0),0)) - COALESCE(ded.deducted, 0)) > 0;
  CREATE INDEX ON tmp_cw(fc_id);

  IF NOT EXISTS (SELECT 1 FROM tmp_cw) THEN
    RETURN jsonb_build_object('total_recommendations',0,'v1_count',0,'v2_count',0,'total_units',0,'message','No CW stock');
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
    AND (p_store_ids IS NULL OR id = ANY(p_store_ids));
  CREATE INDEX ON tmp_str(id);

  CREATE TEMP TABLE tmp_str_v1 ON COMMIT DROP AS SELECT id,store_name,store_code,tier,capacity,
    CASE WHEN COALESCE(capacity,0)<=0 THEN 999999 ELSE (capacity * 1.2)::integer END AS effective_capacity,
    CASE tier WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 9 END AS tord FROM inv_stores WHERE tenant_id=p_tenant_id AND is_active=true AND location_type!='central_warehouse' AND is_fill_enabled=true
    AND (p_store_ids IS NULL OR id = ANY(p_store_ids));
  CREATE INDEX ON tmp_str_v1(id);

  CREATE TEMP TABLE tmp_soh ON COMMIT DROP AS
  SELECT sp.store_id,SUM(COALESCE(sp.on_hand,0))::integer AS toh
  FROM inv_state_positions sp JOIN tmp_latest_snap ls ON ls.store_id = sp.store_id AND sp.snapshot_date = ls.max_date
  WHERE sp.tenant_id=p_tenant_id GROUP BY sp.store_id;
  CREATE INDEX ON tmp_soh(store_id);

  -- ── V1: Fixed with GROUP BY (Bug #1), percentage reserve (Bug #2), BST bypass scarcity (Bug #3) ──
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
        COALESCE(CASE s.tier WHEN 'S' THEN (v_base_weights->>'tier_S')::numeric WHEN 'A' THEN (v_base_weights->>'tier_A')::numeric WHEN 'B' THEN (v_base_weights->>'tier_B')::numeric WHEN 'C' THEN (v_base_weights->>'tier_C')::numeric END, 1.0) AS tier_weight
      FROM tmp_fc f JOIN tmp_cw cw ON cw.fc_id=f.id
      LEFT JOIN inv_collections c ON c.id=f.collection_id AND c.tenant_id=p_tenant_id
      CROSS JOIN tmp_str_v1 s
      LEFT JOIN tmp_pos p ON p.store_id=s.id AND p.fc_id=f.id
      LEFT JOIN tmp_sfc sfc ON sfc.store_id=s.id
      LEFT JOIN tmp_dem d ON d.store_id=s.id AND d.fc_id=f.id
      LEFT JOIN tmp_soh soh ON soh.store_id=s.id
      LEFT JOIN tmp_sys_fc sfs ON sfs.fc_id=f.id
      WHERE (COALESCE(p.oh,0)+COALESCE(p.it,0)) = 0
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
        COALESCE((SELECT (r->>'min_qty')::integer FROM jsonb_array_elements(v_v1_min_stock_ranges) r WHERE (r->>'max_sku')::integer >= sku_count ORDER BY (r->>'max_sku')::integer LIMIT 1), 5) AS min_stock,
        ROW_NUMBER() OVER (PARTITION BY fid ORDER BY tord, vel DESC, cs ASC) AS rn,
        SUM(COALESCE((SELECT (r->>'min_qty')::integer FROM jsonb_array_elements(v_v1_min_stock_ranges) r WHERE (r->>'max_sku')::integer >= sku_count ORDER BY (r->>'max_sku')::integer LIMIT 1), 5))
          OVER (PARTITION BY fid ORDER BY tord, vel DESC, cs ASC) AS cum_qty
      FROM v1_raw
    ),
    v1_ok AS (
      SELECT * FROM v1_ranked WHERE cum_qty <= (cwt - cwr) AND min_stock * tier_weight >= 1
    )
    INSERT INTO inv_allocation_recommendations(tenant_id,run_id,fc_id,fc_name,store_id,store_name,recommended_qty,reason,priority,status,potential_revenue,constraint_checks,allocation_version)
    SELECT p_tenant_id,p_run_id,fid,fc_name||' ('||fc_code||')',sid,store_name||' ('||store_code||')',
      GREATEST(1, (min_stock * tier_weight)::integer),
      CASE criticality_class
        WHEN 'CORE' THEN 'V1-Phủ nền CORE (trọng số '||tier||': '||ROUND(tier_weight,2)||')'
        WHEN 'HERO' THEN 'V1-Phủ nền HERO (trọng số '||tier||': '||ROUND(tier_weight,2)||')'
        ELSE 'V1-Phủ nền (trọng số '||tier||': '||ROUND(tier_weight,2)||')'
      END,
      CASE WHEN tord=0 THEN 'high' WHEN tord=1 THEN 'high' WHEN tord=2 THEN 'medium' ELSE 'low' END,
      'pending',
      GREATEST(1, (min_stock * tier_weight)::integer) * v_avg_unit_price,
      jsonb_build_object('source_on_hand',cwt,'dest_on_hand',cs,'sold_7d',ROUND(vel*7,1),'tier_weight',ROUND(tier_weight,2),'criticality',criticality_class),
      'V1'
    FROM v1_ok
    ON CONFLICT (run_id, fc_id, store_id) DO NOTHING;
    GET DIAGNOSTICS v_v1_count = ROW_COUNT;
  END IF;

  -- ── V2: Fixed with percentage reserve (Bug #2), BST mới bypass (Bug #5) ──
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
        f.sku_count
      FROM tmp_fc f JOIN tmp_cw cw ON cw.fc_id=f.id
      CROSS JOIN tmp_str s
      LEFT JOIN tmp_pos p ON p.store_id=s.id AND p.fc_id=f.id
      LEFT JOIN tmp_dem d ON d.store_id=s.id AND d.fc_id=f.id
      LEFT JOIN tmp_soh soh ON soh.store_id=s.id
      WHERE (COALESCE(d.vel,0) > 0 OR COALESCE(d.co,0) > 0
             OR (f.product_created_date IS NOT NULL AND (CURRENT_DATE - f.product_created_date) < v_bst_new_age_days))
        AND (CASE WHEN COALESCE(d.vel,0)>0 THEN COALESCE(p.oh,0)/d.vel ELSE 999 END) < v_min_cover_weeks * 7
        AND COALESCE(soh.toh,0) < s.effective_capacity
        AND NOT EXISTS (SELECT 1 FROM inv_allocation_recommendations ar WHERE ar.run_id=p_run_id AND ar.fc_id=f.id AND ar.store_id=s.id)
    ),
    v2_ranked AS (
      SELECT *,
        CASE WHEN is_bst_new AND vel = 0 THEN
          COALESCE((SELECT (r->>'min_qty')::integer FROM jsonb_array_elements(v_v1_min_stock_ranges) r WHERE (r->>'max_sku')::integer >= sku_count ORDER BY (r->>'max_sku')::integer LIMIT 1), 5)
        ELSE
          GREATEST(1, CEIL(vel * v_min_cover_weeks * 7 - cs)::integer + co)
        END AS need,
        ROW_NUMBER() OVER (PARTITION BY fid ORDER BY co DESC, vel DESC, tord) AS rn,
        SUM(
          CASE WHEN is_bst_new AND vel = 0 THEN
            COALESCE((SELECT (r->>'min_qty')::integer FROM jsonb_array_elements(v_v1_min_stock_ranges) r WHERE (r->>'max_sku')::integer >= sku_count ORDER BY (r->>'max_sku')::integer LIMIT 1), 5)
          ELSE
            GREATEST(1, CEIL(vel * v_min_cover_weeks * 7 - cs)::integer + co)
          END
        ) OVER (PARTITION BY fid ORDER BY co DESC, vel DESC, tord) AS cum_need
      FROM v2_raw
    ),
    v2_ok AS (
      SELECT * FROM v2_ranked WHERE cum_need <= (cwt - cwr) AND need * dyn_weight >= 1
    )
    INSERT INTO inv_allocation_recommendations(tenant_id,run_id,fc_id,fc_name,store_id,store_name,recommended_qty,reason,priority,status,potential_revenue,current_weeks_cover,projected_weeks_cover,constraint_checks,allocation_version)
    SELECT p_tenant_id,p_run_id,fid,fc_name||' ('||fc_code||')',sid,store_name||' ('||store_code||')',
      GREATEST(1, (need * dyn_weight)::integer),
      CASE WHEN is_bst_new AND vel = 0 THEN 'V2-BST mới (phủ nền, chưa có sales) ×'||ROUND(dyn_weight,2)
           WHEN co>0 THEN 'V2-Đơn KH: '||co||' pcs, vel='||ROUND(vel,2)||'/ngày (×'||ROUND(dyn_weight,2)||')'
           ELSE 'V2-Nhu cầu: vel='||ROUND(vel,2)||'/ngày, cover='||ROUND(wc,1)||'d (×'||ROUND(dyn_weight,2)||')' END,
      CASE WHEN co>0 THEN 'critical' WHEN tord<=1 THEN 'high' ELSE 'medium' END,
      'pending',
      GREATEST(1, (need * dyn_weight)::integer) * v_avg_unit_price,
      ROUND(wc,1),
      ROUND(CASE WHEN vel>0 THEN (cs + GREATEST(1,(need*dyn_weight)::integer))/vel ELSE 999 END, 1),
      jsonb_build_object('source_on_hand',cwt,'dest_on_hand',cs,'sold_7d',ROUND(vel*7,1),'customer_orders',co,'store_orders',so,'dyn_weight',ROUND(dyn_weight,2),'criticality',criticality_class,'is_bst_new',is_bst_new),
      'V2'
    FROM v2_ok
    ON CONFLICT (run_id, fc_id, store_id) DO NOTHING;
    GET DIAGNOSTICS v_v2_count = ROW_COUNT;
  END IF;

  SELECT COALESCE(SUM(recommended_qty),0)::integer INTO v_total_units FROM inv_allocation_recommendations WHERE run_id=p_run_id;

  RETURN jsonb_build_object(
    'total_recommendations', v_v1_count + v_v2_count,
    'v1_count', v_v1_count,
    'v2_count', v_v2_count,
    'total_units', v_total_units
  );
END;
$function$;

-- ── 2. Update fn_rebalance_engine ──
CREATE OR REPLACE FUNCTION public.fn_rebalance_engine(p_tenant_id uuid, p_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '120s'
AS $function$
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

  -- ── Option B: Get CW last sync timestamp ──
  SELECT MAX(ls.max_date)::timestamp INTO v_cw_last_sync
  FROM _latest_snap ls
  JOIN inv_stores cws ON cws.id = ls.store_id AND cws.tenant_id = p_tenant_id
    AND cws.location_type = 'central_warehouse' AND cws.is_active = true;

  -- ── Option B: Virtual deduction — approved qty after last CW sync ──
  CREATE TEMP TABLE _pending_deductions ON COMMIT DROP AS
  SELECT fc_id, SUM(deducted) AS deducted FROM (
    SELECT ar.fc_id, SUM(ar.recommended_qty) AS deducted
    FROM inv_allocation_recommendations ar
    WHERE ar.tenant_id = p_tenant_id
      AND ar.status = 'approved'
      AND v_cw_last_sync IS NOT NULL
      AND ar.approved_at > v_cw_last_sync
    GROUP BY ar.fc_id
    UNION ALL
    SELECT rs.fc_id, SUM(rs.qty) AS deducted
    FROM inv_rebalance_suggestions rs
    WHERE rs.tenant_id = p_tenant_id
      AND rs.status = 'approved'
      AND rs.from_location_type = 'central_warehouse'
      AND v_cw_last_sync IS NOT NULL
      AND rs.approved_at > v_cw_last_sync
    GROUP BY rs.fc_id
  ) combined
  GROUP BY fc_id;
  CREATE INDEX ON _pending_deductions(fc_id);

  CREATE TEMP TABLE _pos ON COMMIT DROP AS
  SELECT
    p.store_id, p.fc_id,
    SUM(COALESCE(p.on_hand, 0)) AS on_hand,
    SUM(COALESCE(p.reserved, 0)) AS reserved,
    -- ── Option B: For CW stores, subtract virtual deductions from available ──
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
    AND fc_code NOT LIKE 'BVSE%';

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

  -- ── Phase 1: Push from CW — Bug #4 FIX: cumulative stock tracking ──
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

  -- ── Phase 2: Lateral with age restriction (unchanged) ──
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
$function$;
