
-- Fix: cast UUID fc_id to TEXT in temp tables so they match KPI table TEXT columns
CREATE OR REPLACE FUNCTION public.compute_inventory_kpi_all(
  p_tenant_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_idi_count INT := 0; v_scs_count INT := 0; v_chi_count INT := 0; v_gap_count INT := 0;
  v_size_health_count INT := 0; v_lost_revenue_count INT := 0; v_markdown_risk_count INT := 0;
  v_store_health_count INT := 0; v_cash_lock_count INT := 0; v_margin_leak_count INT := 0; v_evidence_count INT := 0;
BEGIN
  -- Temp tables - cast fc_id to TEXT to match KPI tables
  CREATE TEMP TABLE _retail_stores ON COMMIT DROP AS
  SELECT id AS store_id, region FROM inv_stores WHERE tenant_id = p_tenant_id AND is_active = TRUE AND COALESCE(location_type, 'store') != 'central_warehouse';

  CREATE TEMP TABLE _positions ON COMMIT DROP AS
  SELECT p.store_id, p.fc_id::text AS fc_id, p.sku, p.on_hand, p.weeks_of_cover
  FROM inv_state_positions p JOIN _retail_stores rs ON rs.store_id = p.store_id
  WHERE p.tenant_id = p_tenant_id AND COALESCE(p.on_hand, 0) > 0;

  CREATE TEMP TABLE _demand ON COMMIT DROP AS
  SELECT d.store_id, d.fc_id::text AS fc_id, d.avg_daily_sales
  FROM inv_state_demand d JOIN _retail_stores rs ON rs.store_id = d.store_id WHERE d.tenant_id = p_tenant_id;

  CREATE TEMP TABLE _sku_map ON COMMIT DROP AS
  SELECT m.fc_id::text AS fc_id, m.sku, m.size AS size_code FROM inv_sku_fc_mapping m WHERE m.tenant_id = p_tenant_id AND m.is_active = TRUE;

  CREATE TEMP TABLE _multi_size_fcs ON COMMIT DROP AS
  SELECT fc_id, COUNT(DISTINCT size_code) AS size_count FROM _sku_map WHERE size_code IS NOT NULL GROUP BY fc_id HAVING COUNT(DISTINCT size_code) >= 2;

  CREATE TEMP TABLE _fc_sizes ON COMMIT DROP AS
  SELECT fc_id, size_code FROM _sku_map WHERE size_code IS NOT NULL GROUP BY fc_id, size_code;

  CREATE TEMP TABLE _prices ON COMMIT DROP AS
  SELECT sku, avg_unit_price FROM v_inv_avg_unit_price WHERE tenant_id = p_tenant_id AND avg_unit_price > 0;

  CREATE TEMP TABLE _fc_price ON COMMIT DROP AS
  SELECT m.fc_id, AVG(pr.avg_unit_price) AS avg_price FROM _sku_map m JOIN _prices pr ON pr.sku = m.sku GROUP BY m.fc_id;

  CREATE TEMP TABLE _fc_velocity ON COMMIT DROP AS
  SELECT fc_id, SUM(COALESCE(avg_daily_sales, 0)) AS total_velocity FROM _demand WHERE fc_id IS NOT NULL GROUP BY fc_id;

  CREATE TEMP TABLE _fc_stock ON COMMIT DROP AS
  SELECT fc_id, SUM(COALESCE(on_hand, 0)) AS total_stock FROM _positions WHERE fc_id IS NOT NULL GROUP BY fc_id;

  -- IDI
  DELETE FROM kpi_inventory_distortion WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  WITH store_doc AS (
    SELECT p.fc_id, p.store_id, p.on_hand,
      CASE WHEN COALESCE(d.avg_daily_sales,0) > 0.01 THEN LEAST(180, p.on_hand/d.avg_daily_sales) ELSE CASE WHEN p.on_hand>0 THEN 180 ELSE 0 END END AS doc
    FROM _positions p LEFT JOIN _demand d ON d.store_id=p.store_id AND d.fc_id=p.fc_id
  ), fc_stats AS (
    SELECT fc_id, AVG(doc) AS mean_doc, STDDEV_POP(doc) AS stddev_doc FROM store_doc GROUP BY fc_id HAVING COUNT(*)>=2
  ), fc_locked AS (
    SELECT sd.fc_id, SUM(CASE WHEN sd.doc>fs.mean_doc*1.5 THEN sd.on_hand*150000 ELSE 0 END) AS locked_cash,
      to_jsonb(ARRAY_AGG(DISTINCT sd.store_id::text) FILTER (WHERE sd.doc>fs.mean_doc*1.5)) AS ol,
      to_jsonb(ARRAY_AGG(DISTINCT sd.store_id::text) FILTER (WHERE sd.doc<fs.mean_doc*0.5 AND sd.doc<14)) AS ul
    FROM store_doc sd JOIN fc_stats fs ON fs.fc_id=sd.fc_id GROUP BY sd.fc_id
  )
  INSERT INTO kpi_inventory_distortion(tenant_id,as_of_date,fc_id,distortion_score,overstock_locations,understock_locations,locked_cash_estimate)
  SELECT p_tenant_id,p_as_of_date,fs.fc_id,ROUND(fs.stddev_doc::numeric,2),COALESCE(fl.ol,'[]'::jsonb),COALESCE(fl.ul,'[]'::jsonb),COALESCE(fl.locked_cash,0)
  FROM fc_stats fs LEFT JOIN fc_locked fl ON fl.fc_id=fs.fc_id;
  GET DIAGNOSTICS v_idi_count = ROW_COUNT;

  -- SCS
  DELETE FROM kpi_size_completeness WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date;
  WITH pos_s AS (
    SELECT p.store_id, m.fc_id AS sid, m.size_code FROM _positions p JOIN _sku_map m ON m.sku=p.sku JOIN _multi_size_fcs msf ON msf.fc_id=m.fc_id WHERE m.size_code IS NOT NULL
  ), ss AS (
    SELECT store_id, sid, COUNT(DISTINCT size_code) AS ps, ARRAY_AGG(DISTINCT size_code) AS pa FROM pos_s GROUP BY store_id, sid
  ), ex AS (
    SELECT fc_id, COUNT(DISTINCT size_code) AS ts, ARRAY_AGG(DISTINCT size_code) AS az FROM _fc_sizes WHERE fc_id IN (SELECT fc_id FROM _multi_size_fcs) GROUP BY fc_id
  ), calc AS (
    SELECT s.sid, s.store_id, e.ts, s.ps,
      to_jsonb(ARRAY(SELECT unnest(e.az) EXCEPT SELECT unnest(s.pa))) AS missing,
      ROUND((s.ps::numeric/NULLIF(e.ts,0)),4) AS scs
    FROM ss s JOIN ex e ON e.fc_id=s.sid
  )
  INSERT INTO kpi_size_completeness(tenant_id,style_id,store_id,as_of_date,sizes_total,sizes_present,missing_sizes,size_completeness_score,status)
  SELECT p_tenant_id,sid,store_id,p_as_of_date,ts,ps,missing,scs,
    CASE WHEN scs<0.3 THEN 'BROKEN' WHEN scs<0.5 THEN 'AT_RISK' ELSE 'HEALTHY' END FROM calc;
  GET DIAGNOSTICS v_scs_count = ROW_COUNT;

  -- CHI
  DELETE FROM kpi_curve_health WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date;
  WITH sd AS (SELECT style_id,store_id,size_completeness_score AS scs FROM kpi_size_completeness WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date),
  w AS (SELECT s.style_id,s.scs,COALESCE(d.avg_daily_sales,0) AS wt FROM sd s LEFT JOIN _demand d ON d.store_id=s.store_id AND d.fc_id=s.style_id),
  c AS (SELECT style_id,CASE WHEN SUM(wt)>0 THEN SUM(scs*wt)/SUM(wt) ELSE AVG(scs) END AS chi FROM w GROUP BY style_id)
  INSERT INTO kpi_curve_health(tenant_id,as_of_date,style_id,curve_health_index,markdown_risk_band)
  SELECT p_tenant_id,p_as_of_date,style_id,ROUND(chi::numeric,4),
    CASE WHEN chi<0.3 THEN 'CRITICAL' WHEN chi<0.5 THEN 'HIGH' WHEN chi<0.7 THEN 'MEDIUM' ELSE 'LOW' END FROM c;
  GET DIAGNOSTICS v_chi_count = ROW_COUNT;

  -- Network Gap
  DELETE FROM kpi_network_gap WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date;
  WITH g AS (
    SELECT COALESCE(fs.fc_id,fv.fc_id) AS sid, COALESCE(fs.total_stock,0) AS ts, COALESCE(fv.total_velocity,0)*28 AS d28
    FROM _fc_stock fs FULL OUTER JOIN _fc_velocity fv ON fv.fc_id=fs.fc_id WHERE COALESCE(fs.total_stock,0)>0 OR COALESCE(fv.total_velocity,0)>0
  )
  INSERT INTO kpi_network_gap(tenant_id,as_of_date,style_id,reallocatable_units,true_shortage_units,net_gap_units,revenue_at_risk)
  SELECT p_tenant_id,p_as_of_date,g.sid,FLOOR(g.ts*0.7)::int,GREATEST(0,CEIL(g.d28)-g.ts)::int,GREATEST(0,CEIL(g.d28)-FLOOR(g.ts*0.7))::int,
    GREATEST(0,CEIL(g.d28)-g.ts)*COALESCE(fp.avg_price,250000)
  FROM g LEFT JOIN _fc_price fp ON fp.fc_id=g.sid WHERE CEIL(g.d28)>g.ts;
  GET DIAGNOSTICS v_gap_count = ROW_COUNT;

  -- Size Health (network)
  DELETE FROM state_size_health_daily WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date AND store_id IS NULL;
  WITH fss AS (SELECT m.fc_id,m.size_code,SUM(p.on_hand) AS tq FROM _positions p JOIN _sku_map m ON m.sku=p.sku JOIN _multi_size_fcs msf ON msf.fc_id=m.fc_id WHERE m.size_code IS NOT NULL GROUP BY m.fc_id,m.size_code),
  ft AS (SELECT fc_id,SUM(tq) AS toh FROM fss GROUP BY fc_id HAVING SUM(tq)>0),
  dev AS (
    SELECT ft.fc_id,
      SUM(ABS((1.0/msf.size_count)-(COALESCE(f.tq,0)::numeric/ft.toh))*CASE WHEN fs.size_code IN('M','L') THEN 1.5 ELSE 1 END) AS ds,
      BOOL_OR(fs.size_code IN('M','L') AND COALESCE(f.tq,0)<=0) AS cm,
      COUNT(*) FILTER(WHERE COALESCE(f.tq,0)>0 AND COALESCE(f.tq,0)<2) AS sc
    FROM ft JOIN _multi_size_fcs msf ON msf.fc_id=ft.fc_id JOIN _fc_sizes fs ON fs.fc_id=ft.fc_id
    LEFT JOIN fss f ON f.fc_id=ft.fc_id AND f.size_code=fs.size_code GROUP BY ft.fc_id,msf.size_count,ft.toh
  )
  INSERT INTO state_size_health_daily(tenant_id,product_id,store_id,as_of_date,size_health_score,curve_state,deviation_score,core_size_missing,shallow_depth_count)
  SELECT p_tenant_id,fc_id,NULL,p_as_of_date,
    GREATEST(0,LEAST(100,100-LEAST(40,ds*20)-CASE WHEN cm THEN 30 ELSE 0 END-sc*5)),
    CASE WHEN GREATEST(0,LEAST(100,100-LEAST(40,ds*20)-CASE WHEN cm THEN 30 ELSE 0 END-sc*5))<40 THEN 'broken'
         WHEN GREATEST(0,LEAST(100,100-LEAST(40,ds*20)-CASE WHEN cm THEN 30 ELSE 0 END-sc*5))<60 THEN 'risk'
         WHEN GREATEST(0,LEAST(100,100-LEAST(40,ds*20)-CASE WHEN cm THEN 30 ELSE 0 END-sc*5))<80 THEN 'watch' ELSE 'healthy' END,
    ROUND(ds::numeric,4),cm,sc FROM dev;
  GET DIAGNOSTICS v_size_health_count = ROW_COUNT;

  -- Lost Revenue
  DELETE FROM state_lost_revenue_daily WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date;
  WITH fss AS (SELECT m.fc_id,m.size_code,SUM(p.on_hand) AS tq FROM _positions p JOIN _sku_map m ON m.sku=p.sku JOIN _multi_size_fcs msf ON msf.fc_id=m.fc_id WHERE m.size_code IS NOT NULL GROUP BY m.fc_id,m.size_code),
  fm AS (
    SELECT fs.fc_id,msf.size_count,
      COUNT(*) FILTER(WHERE COALESCE(f.tq,0)<=0) AS mc, COUNT(*) FILTER(WHERE COALESCE(f.tq,0)>0 AND COALESCE(f.tq,0)<2) AS shc,
      BOOL_OR(fs.size_code IN('M','L') AND COALESCE(f.tq,0)<=0) AS cm
    FROM _fc_sizes fs JOIN _multi_size_fcs msf ON msf.fc_id=fs.fc_id LEFT JOIN fss f ON f.fc_id=fs.fc_id AND f.size_code=fs.size_code
    GROUP BY fs.fc_id,msf.size_count HAVING COUNT(*) FILTER(WHERE COALESCE(f.tq,0)<=0)>0 OR COUNT(*) FILTER(WHERE COALESCE(f.tq,0)>0 AND COALESCE(f.tq,0)<2)>0
  )
  INSERT INTO state_lost_revenue_daily(tenant_id,product_id,as_of_date,lost_units_est,lost_revenue_est,driver)
  SELECT p_tenant_id,fm.fc_id,p_as_of_date,
    CEIL(fv.total_velocity*28*LEAST(0.8,fm.mc::numeric/fm.size_count+(fm.shc::numeric/fm.size_count*0.3)))::int,
    CEIL(fv.total_velocity*28*LEAST(0.8,fm.mc::numeric/fm.size_count+(fm.shc::numeric/fm.size_count*0.3)))*COALESCE(fp.avg_price,250000),
    CASE WHEN fm.cm THEN 'core_missing' WHEN fm.shc>0 THEN 'shallow' ELSE 'imbalance' END
  FROM fm JOIN _fc_velocity fv ON fv.fc_id=fm.fc_id LEFT JOIN _fc_price fp ON fp.fc_id=fm.fc_id WHERE fv.total_velocity>0;
  GET DIAGNOSTICS v_lost_revenue_count = ROW_COUNT;

  -- Markdown Risk
  DELETE FROM state_markdown_risk_daily WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date;
  WITH h AS (SELECT product_id,size_health_score,curve_state FROM state_size_health_daily WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date AND store_id IS NULL),
  fw AS (SELECT fc_id,AVG(weeks_of_cover) AS aw FROM _positions WHERE weeks_of_cover IS NOT NULL GROUP BY fc_id),
  rc AS (
    SELECT h.product_id,h.size_health_score AS shs,COALESCE(fv.total_velocity,0) AS vel,COALESCE(fs.total_stock,0) AS stk,COALESCE(fw.aw,0) AS aw,
      LEAST(100,
        CASE WHEN h.size_health_score<40 THEN 40 WHEN h.size_health_score<60 THEN 20 ELSE 0 END
        +CASE WHEN COALESCE(fw.aw,0)>12 THEN 30 WHEN COALESCE(fw.aw,0)>8 THEN 15 ELSE 0 END
        +CASE WHEN COALESCE(fv.total_velocity,0)>0 AND COALESCE(fs.total_stock,0)/fv.total_velocity>90 THEN 30
              WHEN COALESCE(fv.total_velocity,0)>0 AND COALESCE(fs.total_stock,0)/fv.total_velocity>60 THEN 15
              WHEN COALESCE(fs.total_stock,0)>0 AND COALESCE(fv.total_velocity,0)<=0 THEN 30 ELSE 0 END) AS rr
    FROM h LEFT JOIN _fc_velocity fv ON fv.fc_id=h.product_id LEFT JOIN _fc_stock fs ON fs.fc_id=h.product_id LEFT JOIN fw ON fw.fc_id=h.product_id
  )
  INSERT INTO state_markdown_risk_daily(tenant_id,product_id,as_of_date,markdown_risk_score,markdown_eta_days,reason)
  SELECT p_tenant_id,product_id,p_as_of_date,rr,
    CASE WHEN rr>=60 AND vel>0 THEN LEAST(90,GREATEST(7,ROUND(stk/GREATEST(vel,0.1)/2)))::int
         WHEN rr>=40 AND vel>0 THEN LEAST(120,ROUND(stk/vel))::int WHEN rr>=40 THEN 60 ELSE NULL END,
    CONCAT_WS(' + ',CASE WHEN shs<40 THEN 'size_break' WHEN shs<60 THEN 'size_stress' END,
      CASE WHEN aw>12 THEN 'high_age' WHEN aw>8 THEN 'moderate_age' END,
      CASE WHEN vel>0 AND stk>0 AND stk/vel>90 THEN 'slow_velocity' WHEN vel>0 AND stk>0 AND stk/vel>60 THEN 'declining_velocity'
           WHEN stk>0 AND vel<=0 THEN 'zero_velocity' END)
  FROM rc WHERE rr>=20;
  GET DIAGNOSTICS v_markdown_risk_count = ROW_COUNT;

  -- Per-store Health
  DELETE FROM state_size_health_daily WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date AND store_id IS NOT NULL;
  WITH sfs AS (SELECT p.store_id,m.fc_id,m.size_code,SUM(p.on_hand) AS q FROM _positions p JOIN _sku_map m ON m.sku=p.sku JOIN _multi_size_fcs msf ON msf.fc_id=m.fc_id WHERE m.size_code IS NOT NULL GROUP BY p.store_id,m.fc_id,m.size_code),
  sft AS (SELECT store_id,fc_id,SUM(q) AS tq FROM sfs GROUP BY store_id,fc_id HAVING SUM(q)>0),
  sd2 AS (
    SELECT sft.store_id,sft.fc_id,
      SUM(ABS((1.0/msf.size_count)-(COALESCE(s.q,0)::numeric/sft.tq))*CASE WHEN fs.size_code IN('M','L') THEN 1.5 ELSE 1 END) AS ds,
      BOOL_OR(fs.size_code IN('M','L') AND COALESCE(s.q,0)<=0) AS cm,
      COUNT(*) FILTER(WHERE COALESCE(s.q,0)>0 AND COALESCE(s.q,0)<2) AS sc
    FROM sft JOIN _multi_size_fcs msf ON msf.fc_id=sft.fc_id JOIN _fc_sizes fs ON fs.fc_id=sft.fc_id
    LEFT JOIN sfs s ON s.store_id=sft.store_id AND s.fc_id=sft.fc_id AND s.size_code=fs.size_code
    GROUP BY sft.store_id,sft.fc_id,sft.tq,msf.size_count
  )
  INSERT INTO state_size_health_daily(tenant_id,product_id,store_id,as_of_date,size_health_score,curve_state,deviation_score,core_size_missing,shallow_depth_count)
  SELECT p_tenant_id,fc_id,store_id,p_as_of_date,
    GREATEST(0,LEAST(100,100-LEAST(40,ds*20)-CASE WHEN cm THEN 30 ELSE 0 END-sc*5)),
    CASE WHEN GREATEST(0,LEAST(100,100-LEAST(40,ds*20)-CASE WHEN cm THEN 30 ELSE 0 END-sc*5))<40 THEN 'broken'
         WHEN GREATEST(0,LEAST(100,100-LEAST(40,ds*20)-CASE WHEN cm THEN 30 ELSE 0 END-sc*5))<60 THEN 'risk'
         WHEN GREATEST(0,LEAST(100,100-LEAST(40,ds*20)-CASE WHEN cm THEN 30 ELSE 0 END-sc*5))<80 THEN 'watch' ELSE 'healthy' END,
    ROUND(ds::numeric,4),cm,sc FROM sd2;
  GET DIAGNOSTICS v_store_health_count = ROW_COUNT;

  -- Cash Lock
  DELETE FROM state_cash_lock_daily WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date;
  INSERT INTO state_cash_lock_daily(tenant_id,product_id,as_of_date,inventory_value,cash_locked_value,locked_pct,expected_release_days,lock_driver)
  SELECT p_tenant_id,sh.product_id,p_as_of_date,
    ROUND(COALESCE(fs.total_stock,0)*COALESCE(fp.avg_price,250000)*0.6),
    ROUND(COALESCE(fs.total_stock,0)*COALESCE(fp.avg_price,250000)*0.6*CASE sh.curve_state WHEN 'broken' THEN 0.7 WHEN 'risk' THEN 0.4 WHEN 'watch' THEN 0.15 END),
    CASE sh.curve_state WHEN 'broken' THEN 70 WHEN 'risk' THEN 40 WHEN 'watch' THEN 15 END,
    CASE WHEN COALESCE(fv.total_velocity,0)>0 THEN LEAST(180,ROUND(COALESCE(fs.total_stock,0)/fv.total_velocity))::int ELSE 180 END,
    CASE sh.curve_state WHEN 'watch' THEN 'slow_moving' ELSE 'broken_size' END
  FROM state_size_health_daily sh LEFT JOIN _fc_stock fs ON fs.fc_id=sh.product_id LEFT JOIN _fc_price fp ON fp.fc_id=sh.product_id
  LEFT JOIN _fc_velocity fv ON fv.fc_id=sh.product_id
  WHERE sh.tenant_id=p_tenant_id AND sh.as_of_date=p_as_of_date AND sh.store_id IS NULL AND sh.curve_state IN('broken','risk','watch');
  GET DIAGNOSTICS v_cash_lock_count = ROW_COUNT;

  -- Margin Leak
  DELETE FROM state_margin_leak_daily WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date;
  INSERT INTO state_margin_leak_daily(tenant_id,product_id,as_of_date,margin_leak_value,leak_driver,leak_detail,cumulative_leak_30d)
  SELECT p_tenant_id,product_id,p_as_of_date,ROUND(lost_revenue_est*0.4),'size_break',
    jsonb_build_object('lost_units',lost_units_est,'lost_revenue',lost_revenue_est,'driver',driver),ROUND(lost_revenue_est*0.4)
  FROM state_lost_revenue_daily WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date AND lost_revenue_est>0;
  INSERT INTO state_margin_leak_daily(tenant_id,product_id,as_of_date,margin_leak_value,leak_driver,leak_detail,cumulative_leak_30d)
  SELECT p_tenant_id,md.product_id,p_as_of_date,
    ROUND(COALESCE(fs.total_stock,0)*COALESCE(fp.avg_price,250000)*0.35*(md.markdown_risk_score::numeric/100)*0.5),
    'markdown_risk',jsonb_build_object('risk_score',md.markdown_risk_score,'eta_days',md.markdown_eta_days,'stock',COALESCE(fs.total_stock,0)),
    ROUND(COALESCE(fs.total_stock,0)*COALESCE(fp.avg_price,250000)*0.35*(md.markdown_risk_score::numeric/100)*0.5)
  FROM state_markdown_risk_daily md LEFT JOIN _fc_stock fs ON fs.fc_id=md.product_id LEFT JOIN _fc_price fp ON fp.fc_id=md.product_id
  WHERE md.tenant_id=p_tenant_id AND md.as_of_date=p_as_of_date AND md.markdown_risk_score>=60 AND COALESCE(fs.total_stock,0)>0;
  GET DIAGNOSTICS v_margin_leak_count = ROW_COUNT;

  -- Evidence Packs
  DELETE FROM si_evidence_packs WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date;
  INSERT INTO si_evidence_packs(tenant_id,product_id,as_of_date,evidence_type,severity,summary,data_snapshot,source_tables)
  SELECT p_tenant_id,sh.product_id,p_as_of_date,'size_intelligence',
    CASE WHEN sh.curve_state='broken' AND COALESCE(md.markdown_risk_score,0)>=60 THEN 'critical' WHEN sh.curve_state='broken' THEN 'high' ELSE 'medium' END,
    CONCAT_WS(' | ','Health: '||ROUND(sh.size_health_score)||' ('||sh.curve_state||')',
      CASE WHEN lr.lost_revenue_est IS NOT NULL THEN 'Lost Rev: '||lr.lost_revenue_est END,
      CASE WHEN cl.cash_locked_value IS NOT NULL THEN 'Cash Locked: '||cl.cash_locked_value END),
    jsonb_build_object('health',jsonb_build_object('score',sh.size_health_score,'state',sh.curve_state,'core_missing',sh.core_size_missing),
      'lost_revenue',CASE WHEN lr.product_id IS NOT NULL THEN jsonb_build_object('units',lr.lost_units_est,'revenue',lr.lost_revenue_est) END,
      'cash_lock',CASE WHEN cl.product_id IS NOT NULL THEN jsonb_build_object('value',cl.cash_locked_value,'pct',cl.locked_pct) END),
    ARRAY['state_size_health_daily']
  FROM state_size_health_daily sh
  LEFT JOIN state_lost_revenue_daily lr ON lr.tenant_id=p_tenant_id AND lr.as_of_date=p_as_of_date AND lr.product_id=sh.product_id
  LEFT JOIN state_markdown_risk_daily md ON md.tenant_id=p_tenant_id AND md.as_of_date=p_as_of_date AND md.product_id=sh.product_id
  LEFT JOIN state_cash_lock_daily cl ON cl.tenant_id=p_tenant_id AND cl.as_of_date=p_as_of_date AND cl.product_id=sh.product_id
  WHERE sh.tenant_id=p_tenant_id AND sh.as_of_date=p_as_of_date AND sh.store_id IS NULL AND sh.curve_state IN('broken','risk');
  GET DIAGNOSTICS v_evidence_count = ROW_COUNT;

  RETURN jsonb_build_object('success',true,'date',p_as_of_date,
    'idi',v_idi_count,'scs',v_scs_count,'chi',v_chi_count,'gap',v_gap_count,
    'size_health',v_size_health_count,'lost_revenue',v_lost_revenue_count,
    'markdown_risk',v_markdown_risk_count,'store_health',v_store_health_count,
    'cash_lock',v_cash_lock_count,'margin_leak',v_margin_leak_count,'evidence',v_evidence_count,
    'duration_ms',EXTRACT(MILLISECOND FROM clock_timestamp()-v_start)::int);
END;
$$;
