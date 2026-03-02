
CREATE OR REPLACE FUNCTION public.fn_allocation_engine(p_tenant_id uuid, p_run_id uuid, p_run_type text DEFAULT 'both')
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
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
BEGIN
  SELECT COALESCE((SELECT (constraint_value->>'enabled')::boolean FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='no_broken_size' AND is_active=true LIMIT 1),true) INTO v_no_broken_size;
  SELECT COALESCE((SELECT (constraint_value->>'weeks')::numeric FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='v2_min_cover_weeks' AND is_active=true LIMIT 1),1) INTO v_min_cover_weeks;
  SELECT COALESCE((SELECT (constraint_value->>'min_pcs')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='cw_core_hero_min_per_sku' AND is_active=true LIMIT 1),15) INTO v_core_hero_min_per_sku;
  SELECT COALESCE((SELECT (constraint_value->>'amount')::numeric FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='avg_unit_price_default' AND is_active=true LIMIT 1),250000) INTO v_avg_unit_price;
  SELECT COALESCE((SELECT (constraint_value->>'count')::integer FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='bst_scope_recent_count' AND is_active=true LIMIT 1),10) INTO v_bst_scope_recent_count;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='cw_reserved_min_by_total_sku' AND is_active=true LIMIT 1),'[{"max_sku":9999,"min_pcs":5}]'::jsonb) INTO v_cw_reserved_ranges;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id=p_tenant_id AND constraint_key='v1_min_store_stock_by_total_sku' AND is_active=true LIMIT 1),'[{"max_sku":9999,"min_qty":5}]'::jsonb) INTO v_v1_min_stock_ranges;

  CREATE TEMP TABLE tmp_cw ON COMMIT DROP AS
  SELECT sp.fc_id, SUM(GREATEST(COALESCE(sp.on_hand,0)-COALESCE(sp.reserved,0)-COALESCE(sp.safety_stock,0),0))::integer AS available
  FROM inv_state_positions sp JOIN inv_stores s ON s.id=sp.store_id AND s.tenant_id=p_tenant_id AND s.location_type='central_warehouse' AND s.is_active=true
  WHERE sp.tenant_id=p_tenant_id GROUP BY sp.fc_id HAVING SUM(GREATEST(COALESCE(sp.on_hand,0)-COALESCE(sp.reserved,0)-COALESCE(sp.safety_stock,0),0))>0;
  CREATE INDEX ON tmp_cw(fc_id);

  IF NOT EXISTS (SELECT 1 FROM tmp_cw) THEN
    RETURN jsonb_build_object('total_recommendations',0,'v1_count',0,'v2_count',0,'total_units',0,'message','No CW stock');
  END IF;

  SELECT COUNT(*) INTO v_cw_total_skus FROM tmp_cw;
  SELECT COALESCE((SELECT (r->>'min_pcs')::integer FROM jsonb_array_elements(v_cw_reserved_ranges) r WHERE (r->>'max_sku')::integer>=v_cw_total_skus ORDER BY (r->>'max_sku')::integer LIMIT 1),5) INTO v_cw_reserve_min;

  CREATE TEMP TABLE tmp_sok ON COMMIT DROP AS SELECT fc_id FROM inv_state_size_integrity WHERE tenant_id=p_tenant_id AND fc_id IN (SELECT fc_id FROM tmp_cw) GROUP BY fc_id HAVING bool_and(is_full_size_run);
  CREATE INDEX ON tmp_sok(fc_id);

  CREATE TEMP TABLE tmp_fc ON COMMIT DROP AS
  SELECT f.id,f.fc_code,f.fc_name,f.is_core_hero,f.collection_id,
    COALESCE((SELECT COUNT(*)::integer FROM inv_sku_fc_mapping m WHERE m.tenant_id=p_tenant_id AND m.fc_id=f.id),1) AS sku_count
  FROM inv_family_codes f WHERE f.tenant_id=p_tenant_id AND f.is_active=true AND f.id IN (SELECT fc_id FROM tmp_cw)
    AND (NOT v_no_broken_size OR f.id IN (SELECT fc_id FROM tmp_sok) OR NOT EXISTS (SELECT 1 FROM inv_state_size_integrity WHERE tenant_id=p_tenant_id AND fc_id=f.id));
  CREATE INDEX ON tmp_fc(id);

  CREATE TEMP TABLE tmp_pos ON COMMIT DROP AS SELECT store_id,fc_id,SUM(COALESCE(on_hand,0))::integer AS oh,SUM(COALESCE(in_transit,0))::integer AS it FROM inv_state_positions WHERE tenant_id=p_tenant_id GROUP BY store_id,fc_id;
  CREATE INDEX ON tmp_pos(store_id,fc_id);
  CREATE TEMP TABLE tmp_sfc ON COMMIT DROP AS SELECT store_id,COUNT(DISTINCT fc_id)::integer AS fc_count FROM inv_state_positions WHERE tenant_id=p_tenant_id GROUP BY store_id;
  CREATE INDEX ON tmp_sfc(store_id);
  CREATE TEMP TABLE tmp_dem ON COMMIT DROP AS SELECT store_id,fc_id,COALESCE(avg_daily_sales,sales_velocity,0)::numeric AS vel,COALESCE(customer_orders_qty,0)::integer AS co,COALESCE(store_orders_qty,0)::integer AS so FROM inv_state_demand WHERE tenant_id=p_tenant_id AND fc_id IN (SELECT fc_id FROM tmp_cw);
  CREATE INDEX ON tmp_dem(store_id,fc_id);

  -- All active non-CW stores (for V2)
  CREATE TEMP TABLE tmp_str ON COMMIT DROP AS SELECT id,store_name,store_code,tier,capacity,CASE tier WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 9 END AS tord FROM inv_stores WHERE tenant_id=p_tenant_id AND is_active=true AND location_type!='central_warehouse';
  CREATE INDEX ON tmp_str(id);

  -- V1-only: stores with is_fill_enabled = true
  CREATE TEMP TABLE tmp_str_v1 ON COMMIT DROP AS SELECT id,store_name,store_code,tier,capacity,CASE tier WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 9 END AS tord FROM inv_stores WHERE tenant_id=p_tenant_id AND is_active=true AND location_type!='central_warehouse' AND is_fill_enabled=true;
  CREATE INDEX ON tmp_str_v1(id);

  CREATE TEMP TABLE tmp_soh ON COMMIT DROP AS SELECT store_id,SUM(COALESCE(on_hand,0))::integer AS toh FROM inv_state_positions WHERE tenant_id=p_tenant_id GROUP BY store_id;
  CREATE INDEX ON tmp_soh(store_id);

  -- V1: Use tmp_str_v1 (only fill-enabled stores)
  IF p_run_type IN ('V1','both') THEN
    WITH v1_raw AS (
      SELECT f.id AS fid,f.fc_name,f.fc_code,f.is_core_hero,f.sku_count,s.id AS sid,s.store_name,s.store_code,s.tier,s.capacity,s.tord,
        cw.available AS cwt,GREATEST(v_cw_reserve_min,CASE WHEN f.is_core_hero THEN v_core_hero_min_per_sku*f.sku_count ELSE 0 END) AS cwr,
        COALESCE(p.oh,0)+COALESCE(p.it,0) AS cs,COALESCE(sfc.fc_count,0) AS sfc,COALESCE(d.vel,0) AS vel,COALESCE(soh.toh,0) AS stoh
      FROM tmp_fc f
      JOIN tmp_cw cw ON cw.fc_id=f.id
      LEFT JOIN inv_collections c ON c.id=f.collection_id AND c.tenant_id=p_tenant_id
      CROSS JOIN tmp_str_v1 s
      LEFT JOIN tmp_pos p ON p.store_id=s.id AND p.fc_id=f.id
      LEFT JOIN tmp_sfc sfc ON sfc.store_id=s.id
      LEFT JOIN tmp_dem d ON d.store_id=s.id AND d.fc_id=f.id
      LEFT JOIN tmp_soh soh ON soh.store_id=s.id
      WHERE cw.available>GREATEST(v_cw_reserve_min,CASE WHEN f.is_core_hero THEN v_core_hero_min_per_sku*f.sku_count ELSE 0 END)
        AND (f.collection_id IS NULL OR c.is_new_collection=true OR f.collection_id IN (SELECT cc.id FROM inv_collections cc WHERE cc.tenant_id=p_tenant_id AND cc.air_date IS NOT NULL ORDER BY cc.air_date DESC LIMIT v_bst_scope_recent_count))
    ),v1_mq AS (
      SELECT *,COALESCE((SELECT (r->>'min_qty')::integer FROM jsonb_array_elements(v_v1_min_stock_ranges) r WHERE (r->>'max_sku')::integer>=sfc ORDER BY (r->>'max_sku')::integer LIMIT 1),5) AS mq FROM v1_raw
    ),v1_sh AS (
      SELECT *,mq-cs AS shortage,LEAST(mq-cs,cwt-cwr) AS ra FROM v1_mq WHERE mq-cs>0 AND (capacity<=0 OR capacity-stoh>0)
    ),v1_ord AS (
      SELECT *,LEAST(ra,CASE WHEN capacity>0 THEN GREATEST(capacity-stoh,0) ELSE ra END) AS abd,
        SUM(LEAST(ra,CASE WHEN capacity>0 THEN GREATEST(capacity-stoh,0) ELSE ra END)) OVER (PARTITION BY fid ORDER BY tord,shortage DESC ROWS UNBOUNDED PRECEDING) AS cum
      FROM v1_sh WHERE LEAST(ra,CASE WHEN capacity>0 THEN GREATEST(capacity-stoh,0) ELSE ra END)>0
    ),v1_fin AS (
      SELECT *,CASE WHEN cum<=cwt-cwr THEN abd WHEN cum-abd<cwt-cwr THEN (cwt-cwr)-(cum-abd) ELSE 0 END AS aq FROM v1_ord
    )
    INSERT INTO inv_allocation_recommendations(tenant_id,run_id,fc_id,fc_name,store_id,store_name,sku,recommended_qty,current_on_hand,current_weeks_cover,projected_weeks_cover,sales_velocity,priority,reason,potential_revenue,status,stage,constraint_checks,explain_text,size_breakdown)
    SELECT p_tenant_id,p_run_id,fid,COALESCE(fc_name,fc_code,''),sid,COALESCE(store_name,store_code,''),NULL,aq::integer,cs,
      CASE WHEN vel>0 THEN cs/(vel*7) ELSE 99 END,CASE WHEN vel>0 THEN (cs+aq)/(vel*7) ELSE 99 END,vel,
      CASE WHEN cs=0 THEN 'P1' WHEN shortage>mq*0.5 THEN 'P2' ELSE 'P3' END,
      format('V1: %s thiếu %s (min=%s,tier=%s)',store_name,shortage,mq,tier),aq*v_avg_unit_price,'pending','V1',
      jsonb_build_object('rule','v1_min_store_stock','tier',tier,'min_qty_required',mq,'current_stock',cs,'source_on_hand',cwt,'dest_on_hand',cs,'sold_7d',ROUND(vel*7)::integer),
      format('V1: FC %s, CH %s (tier %s) min %s, có %s, bổ sung %s',COALESCE(fc_name,fc_code),store_name,tier,mq,cs,aq),NULL
    FROM v1_fin WHERE aq>0;
    GET DIAGNOSTICS v_v1_count=ROW_COUNT;
  END IF;

  -- V2: Uses tmp_str (all active stores, regardless of fill setting)
  IF p_run_type IN ('V2','both') THEN
    CREATE TEMP TABLE tmp_cw2 ON COMMIT DROP AS
    SELECT c.fc_id, c.available - COALESCE(v1s.used,0) AS available
    FROM tmp_cw c LEFT JOIN (SELECT fc_id,SUM(recommended_qty)::integer AS used FROM inv_allocation_recommendations WHERE run_id=p_run_id AND stage='V1' GROUP BY fc_id) v1s ON v1s.fc_id=c.fc_id;
    DELETE FROM tmp_cw2 WHERE available<=0;
    CREATE INDEX ON tmp_cw2(fc_id);

    CREATE TEMP TABLE tmp_soh2 ON COMMIT DROP AS
    SELECT s.store_id, s.toh+COALESCE(v1a.added,0) AS toh
    FROM tmp_soh s LEFT JOIN (SELECT store_id,SUM(recommended_qty)::integer AS added FROM inv_allocation_recommendations WHERE run_id=p_run_id AND stage='V1' GROUP BY store_id) v1a ON v1a.store_id=s.store_id;
    CREATE INDEX ON tmp_soh2(store_id);

    WITH v2_raw AS (
      SELECT f.id AS fid,f.fc_name,f.fc_code,f.is_core_hero,f.sku_count,s.id AS sid,s.store_name,s.store_code,s.tier,s.capacity,
        cw.available AS cwt,GREATEST(v_cw_reserve_min,CASE WHEN f.is_core_hero THEN v_core_hero_min_per_sku*f.sku_count ELSE 0 END) AS cwr,
        COALESCE(p.oh,0) AS cs,d.vel,
        CASE WHEN d.vel>0 THEN COALESCE(p.oh,0)/(d.vel*7) WHEN COALESCE(p.oh,0)>0 THEN 99 ELSE 0 END AS wc,
        d.co,d.so,
        CASE WHEN d.co>0 THEN 'customer_orders' WHEN d.so>0 THEN 'store_orders' WHEN d.vel>0 AND (CASE WHEN d.vel>0 THEN COALESCE(p.oh,0)/(d.vel*7) ELSE 99 END)<v_min_cover_weeks THEN 'top_fc' END AS pt,
        CASE WHEN d.co>0 THEN d.co WHEN d.so>0 THEN d.so WHEN d.vel>0 AND (CASE WHEN d.vel>0 THEN COALESCE(p.oh,0)/(d.vel*7) ELSE 99 END)<v_min_cover_weeks THEN CEIL(v_min_cover_weeks*d.vel*7-COALESCE(p.oh,0))::integer ELSE 0 END AS dq,
        COALESCE(soh.toh,0) AS stoh
      FROM tmp_dem d JOIN tmp_fc f ON f.id=d.fc_id JOIN tmp_str s ON s.id=d.store_id JOIN tmp_cw2 cw ON cw.fc_id=f.id AND cw.available>0
      LEFT JOIN tmp_pos p ON p.store_id=s.id AND p.fc_id=f.id LEFT JOIN tmp_soh2 soh ON soh.store_id=s.id
      WHERE cw.available>GREATEST(v_cw_reserve_min,CASE WHEN f.is_core_hero THEN v_core_hero_min_per_sku*f.sku_count ELSE 0 END)
    ),v2_f AS (
      SELECT * FROM v2_raw WHERE pt IS NOT NULL AND dq>0 AND (capacity<=0 OR capacity-stoh>0)
    ),v2_ord AS (
      SELECT *,LEAST(dq,cwt-cwr,CASE WHEN capacity>0 THEN GREATEST(capacity-stoh,0) ELSE dq END) AS abd,
        SUM(LEAST(dq,cwt-cwr,CASE WHEN capacity>0 THEN GREATEST(capacity-stoh,0) ELSE dq END)) OVER (PARTITION BY fid ORDER BY CASE pt WHEN 'customer_orders' THEN 0 WHEN 'store_orders' THEN 1 ELSE 2 END,wc ROWS UNBOUNDED PRECEDING) AS cum
      FROM v2_f WHERE LEAST(dq,cwt-cwr,CASE WHEN capacity>0 THEN GREATEST(capacity-stoh,0) ELSE dq END)>0
    ),v2_fin AS (
      SELECT *,CASE WHEN cum<=cwt-cwr THEN abd WHEN cum-abd<cwt-cwr THEN (cwt-cwr)-(cum-abd) ELSE 0 END AS aq FROM v2_ord
    )
    INSERT INTO inv_allocation_recommendations(tenant_id,run_id,fc_id,fc_name,store_id,store_name,sku,recommended_qty,current_on_hand,current_weeks_cover,projected_weeks_cover,sales_velocity,priority,reason,potential_revenue,status,stage,constraint_checks,explain_text,size_breakdown)
    SELECT p_tenant_id,p_run_id,fid,COALESCE(fc_name,fc_code,''),sid,COALESCE(store_name,store_code,''),NULL,aq::integer,cs,wc,
      CASE WHEN vel>0 THEN (cs+aq)/(vel*7) ELSE 99 END,vel,
      CASE pt WHEN 'customer_orders' THEN 'P1' WHEN 'store_orders' THEN 'P2' ELSE 'P3' END,
      format('V2: %s — %s cần %s, chia %s',CASE pt WHEN 'customer_orders' THEN 'ĐH khách' WHEN 'store_orders' THEN 'ĐH CH' ELSE 'Top FC' END,store_name,dq,aq),
      aq*v_avg_unit_price,'pending','V2',
      jsonb_build_object('rule','v2_demand','priority_type',pt,'demand_qty',dq,'source_on_hand',cwt,'dest_on_hand',cs,'sold_7d',ROUND(vel*7)::integer),
      format('V2 %s: FC %s, CH %s cần %s, chia %s',CASE pt WHEN 'customer_orders' THEN 'ĐH khách' WHEN 'store_orders' THEN 'ĐH CH' ELSE 'Top FC' END,COALESCE(fc_name,fc_code),store_name,dq,aq),NULL
    FROM v2_fin WHERE aq>0;
    GET DIAGNOSTICS v_v2_count=ROW_COUNT;
  END IF;

  SELECT COALESCE(SUM(recommended_qty),0)::integer INTO v_total_units FROM inv_allocation_recommendations WHERE run_id=p_run_id;

  RETURN jsonb_build_object('total_recommendations',v_v1_count+v_v2_count,'v1_count',v_v1_count,'v2_count',v_v2_count,'total_units',v_total_units);
END;
$$;
