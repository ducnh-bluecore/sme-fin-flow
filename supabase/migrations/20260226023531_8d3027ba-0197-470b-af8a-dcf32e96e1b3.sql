
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
  v_idi_count INT := 0;
  v_scs_count INT := 0;
  v_chi_count INT := 0;
  v_gap_count INT := 0;
  v_size_health_count INT := 0;
  v_lost_revenue_count INT := 0;
  v_markdown_risk_count INT := 0;
  v_store_health_count INT := 0;
  v_cash_lock_count INT := 0;
  v_margin_leak_count INT := 0;
  v_evidence_count INT := 0;
BEGIN

  -- Prepare temp tables
  CREATE TEMP TABLE _retail_stores ON COMMIT DROP AS
  SELECT id AS store_id, store_name, store_code, tier, region, location_type
  FROM inv_stores
  WHERE tenant_id = p_tenant_id AND is_active = TRUE
    AND COALESCE(location_type, 'store') != 'central_warehouse';

  CREATE TEMP TABLE _positions ON COMMIT DROP AS
  SELECT p.id, p.store_id, p.fc_id, p.sku, p.on_hand, p.reserved, p.in_transit, p.safety_stock, p.weeks_of_cover
  FROM inv_state_positions p
  JOIN _retail_stores rs ON rs.store_id = p.store_id
  WHERE p.tenant_id = p_tenant_id AND COALESCE(p.on_hand, 0) > 0;

  CREATE TEMP TABLE _demand ON COMMIT DROP AS
  SELECT d.store_id, d.fc_id, d.avg_daily_sales, d.sales_velocity
  FROM inv_state_demand d
  JOIN _retail_stores rs ON rs.store_id = d.store_id
  WHERE d.tenant_id = p_tenant_id;

  -- NOTE: column is "size" not "size_code" in inv_sku_fc_mapping
  CREATE TEMP TABLE _sku_map ON COMMIT DROP AS
  SELECT m.fc_id, m.sku, m.size AS size_code
  FROM inv_sku_fc_mapping m
  WHERE m.tenant_id = p_tenant_id AND m.is_active = TRUE;

  CREATE TEMP TABLE _multi_size_fcs ON COMMIT DROP AS
  SELECT fc_id, COUNT(DISTINCT size_code) AS size_count
  FROM _sku_map WHERE size_code IS NOT NULL
  GROUP BY fc_id HAVING COUNT(DISTINCT size_code) >= 2;

  CREATE TEMP TABLE _fc_sizes ON COMMIT DROP AS
  SELECT fc_id, size_code FROM _sku_map WHERE size_code IS NOT NULL GROUP BY fc_id, size_code;

  CREATE TEMP TABLE _prices ON COMMIT DROP AS
  SELECT sku, avg_unit_price FROM v_inv_avg_unit_price WHERE tenant_id = p_tenant_id AND avg_unit_price > 0;

  CREATE TEMP TABLE _fc_price ON COMMIT DROP AS
  SELECT m.fc_id, AVG(pr.avg_unit_price) AS avg_price
  FROM _sku_map m JOIN _prices pr ON pr.sku = m.sku GROUP BY m.fc_id;

  CREATE TEMP TABLE _fc_velocity ON COMMIT DROP AS
  SELECT fc_id, SUM(COALESCE(avg_daily_sales, 0)) AS total_velocity
  FROM _demand WHERE fc_id IS NOT NULL GROUP BY fc_id;

  CREATE TEMP TABLE _fc_stock ON COMMIT DROP AS
  SELECT fc_id, SUM(COALESCE(on_hand, 0)) AS total_stock
  FROM _positions WHERE fc_id IS NOT NULL GROUP BY fc_id;

  -- ═══ STEP 1: IDI ═══
  DELETE FROM kpi_inventory_distortion WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  WITH store_doc AS (
    SELECT p.fc_id, p.store_id, p.on_hand,
      COALESCE(d.avg_daily_sales, 0) AS velocity,
      CASE WHEN COALESCE(d.avg_daily_sales, 0) > 0.01 THEN LEAST(180, p.on_hand / d.avg_daily_sales)
           ELSE CASE WHEN p.on_hand > 0 THEN 180 ELSE 0 END END AS doc
    FROM _positions p LEFT JOIN _demand d ON d.store_id = p.store_id AND d.fc_id = p.fc_id
  ),
  fc_stats AS (
    SELECT fc_id, AVG(doc) AS mean_doc, STDDEV_POP(doc) AS stddev_doc, COUNT(*) AS store_count
    FROM store_doc GROUP BY fc_id HAVING COUNT(*) >= 2
  ),
  fc_locked AS (
    SELECT sd.fc_id,
      SUM(CASE WHEN sd.doc > fs.mean_doc * 1.5 THEN sd.on_hand * 150000 ELSE 0 END) AS locked_cash,
      ARRAY_AGG(DISTINCT sd.store_id) FILTER (WHERE sd.doc > fs.mean_doc * 1.5) AS overstock_locs,
      ARRAY_AGG(DISTINCT sd.store_id) FILTER (WHERE sd.doc < fs.mean_doc * 0.5 AND sd.doc < 14) AS understock_locs
    FROM store_doc sd JOIN fc_stats fs ON fs.fc_id = sd.fc_id GROUP BY sd.fc_id
  )
  INSERT INTO kpi_inventory_distortion (tenant_id, as_of_date, fc_id, distortion_score, overstock_locations, understock_locations, locked_cash_estimate)
  SELECT p_tenant_id, p_as_of_date, fs.fc_id, ROUND(fs.stddev_doc::numeric, 2),
    COALESCE(fl.overstock_locs, '{}'), COALESCE(fl.understock_locs, '{}'), COALESCE(fl.locked_cash, 0)
  FROM fc_stats fs LEFT JOIN fc_locked fl ON fl.fc_id = fs.fc_id;
  GET DIAGNOSTICS v_idi_count = ROW_COUNT;

  -- ═══ STEP 2: SCS ═══
  DELETE FROM kpi_size_completeness WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  WITH pos_with_size AS (
    SELECT p.store_id, m.fc_id AS style_id, m.size_code
    FROM _positions p JOIN _sku_map m ON m.sku = p.sku
    JOIN _multi_size_fcs msf ON msf.fc_id = m.fc_id WHERE m.size_code IS NOT NULL
  ),
  store_style_sizes AS (
    SELECT store_id, style_id, COUNT(DISTINCT size_code) AS present_sizes, ARRAY_AGG(DISTINCT size_code) AS present_arr
    FROM pos_with_size GROUP BY store_id, style_id
  ),
  expected AS (
    SELECT fc_id, COUNT(DISTINCT size_code) AS total_sizes, ARRAY_AGG(DISTINCT size_code) AS all_sizes
    FROM _fc_sizes WHERE fc_id IN (SELECT fc_id FROM _multi_size_fcs) GROUP BY fc_id
  )
  INSERT INTO kpi_size_completeness (tenant_id, product_id, store_id, as_of_date, total_sizes, present_sizes, missing_sizes, completeness_pct)
  SELECT p_tenant_id, ss.style_id, ss.store_id, p_as_of_date, e.total_sizes, ss.present_sizes,
    ARRAY(SELECT unnest(e.all_sizes) EXCEPT SELECT unnest(ss.present_arr)),
    ROUND((ss.present_sizes::numeric / NULLIF(e.total_sizes, 0)) * 100, 2)
  FROM store_style_sizes ss JOIN expected e ON e.fc_id = ss.style_id;
  GET DIAGNOSTICS v_scs_count = ROW_COUNT;

  -- ═══ STEP 3: CHI ═══
  DELETE FROM kpi_curve_health WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  WITH scs_data AS (
    SELECT product_id AS style_id, store_id, completeness_pct / 100.0 AS scs
    FROM kpi_size_completeness WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date
  ),
  weighted AS (
    SELECT s.style_id, s.scs, COALESCE(d.avg_daily_sales, 0) AS weight
    FROM scs_data s LEFT JOIN _demand d ON d.store_id = s.store_id AND d.fc_id = s.style_id
  ),
  chi AS (
    SELECT style_id,
      CASE WHEN SUM(weight) > 0 THEN SUM(scs * weight) / SUM(weight) ELSE AVG(scs) END AS curve_health_index
    FROM weighted GROUP BY style_id
  )
  INSERT INTO kpi_curve_health (tenant_id, as_of_date, style_id, curve_health_index, markdown_risk_band)
  SELECT p_tenant_id, p_as_of_date, style_id, ROUND(curve_health_index::numeric, 4),
    CASE WHEN curve_health_index < 0.3 THEN 'CRITICAL' WHEN curve_health_index < 0.5 THEN 'HIGH'
         WHEN curve_health_index < 0.7 THEN 'MEDIUM' ELSE 'LOW' END
  FROM chi;
  GET DIAGNOSTICS v_chi_count = ROW_COUNT;

  -- ═══ STEP 4: Network Gap ═══
  DELETE FROM kpi_network_gap WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  WITH gap AS (
    SELECT COALESCE(fs.fc_id, fv.fc_id) AS style_id,
      COALESCE(fs.total_stock, 0) AS total_stock, COALESCE(fv.total_velocity, 0) * 28 AS demand_28d
    FROM _fc_stock fs FULL OUTER JOIN _fc_velocity fv ON fv.fc_id = fs.fc_id
    WHERE COALESCE(fs.total_stock, 0) > 0 OR COALESCE(fv.total_velocity, 0) > 0
  )
  INSERT INTO kpi_network_gap (tenant_id, as_of_date, style_id, reallocatable_units, true_shortage_units, net_gap_units, revenue_at_risk)
  SELECT p_tenant_id, p_as_of_date, g.style_id, FLOOR(g.total_stock * 0.7)::int,
    GREATEST(0, CEIL(g.demand_28d) - g.total_stock)::int, GREATEST(0, CEIL(g.demand_28d) - FLOOR(g.total_stock * 0.7))::int,
    GREATEST(0, CEIL(g.demand_28d) - g.total_stock) * COALESCE(fp.avg_price, 250000)
  FROM gap g LEFT JOIN _fc_price fp ON fp.fc_id = g.style_id
  WHERE CEIL(g.demand_28d) > g.total_stock;
  GET DIAGNOSTICS v_gap_count = ROW_COUNT;

  -- ═══ STEP 5: Size Health (network-wide) ═══
  DELETE FROM state_size_health_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND store_id IS NULL;
  WITH fc_size_stock AS (
    SELECT m.fc_id, m.size_code, SUM(p.on_hand) AS total_qty
    FROM _positions p JOIN _sku_map m ON m.sku = p.sku
    JOIN _multi_size_fcs msf ON msf.fc_id = m.fc_id WHERE m.size_code IS NOT NULL
    GROUP BY m.fc_id, m.size_code
  ),
  fc_totals AS (
    SELECT fc_id, SUM(total_qty) AS total_on_hand FROM fc_size_stock GROUP BY fc_id HAVING SUM(total_qty) > 0
  ),
  deviation AS (
    SELECT ft.fc_id, ft.total_on_hand,
      SUM(ABS((1.0 / msf.size_count) - (COALESCE(fss.total_qty, 0)::numeric / ft.total_on_hand))
        * CASE WHEN fs.size_code IN ('M', 'L') THEN 1.5 ELSE 1.0 END) AS deviation_sum,
      BOOL_OR(fs.size_code IN ('M', 'L') AND COALESCE(fss.total_qty, 0) <= 0) AS core_missing,
      COUNT(*) FILTER (WHERE COALESCE(fss.total_qty, 0) > 0 AND COALESCE(fss.total_qty, 0) < 2) AS shallow_count
    FROM fc_totals ft JOIN _multi_size_fcs msf ON msf.fc_id = ft.fc_id
    JOIN _fc_sizes fs ON fs.fc_id = ft.fc_id
    LEFT JOIN fc_size_stock fss ON fss.fc_id = ft.fc_id AND fss.size_code = fs.size_code
    GROUP BY ft.fc_id, ft.total_on_hand, msf.size_count
  )
  INSERT INTO state_size_health_daily (tenant_id, product_id, store_id, as_of_date, size_health_score, curve_state, deviation_score, core_size_missing, shallow_depth_count)
  SELECT p_tenant_id, fc_id, NULL, p_as_of_date,
    GREATEST(0, LEAST(100, 100 - LEAST(40, deviation_sum * 20) - CASE WHEN core_missing THEN 30 ELSE 0 END - shallow_count * 5)),
    CASE
      WHEN GREATEST(0, LEAST(100, 100 - LEAST(40, deviation_sum * 20) - CASE WHEN core_missing THEN 30 ELSE 0 END - shallow_count * 5)) < 40 THEN 'broken'
      WHEN GREATEST(0, LEAST(100, 100 - LEAST(40, deviation_sum * 20) - CASE WHEN core_missing THEN 30 ELSE 0 END - shallow_count * 5)) < 60 THEN 'risk'
      WHEN GREATEST(0, LEAST(100, 100 - LEAST(40, deviation_sum * 20) - CASE WHEN core_missing THEN 30 ELSE 0 END - shallow_count * 5)) < 80 THEN 'watch'
      ELSE 'healthy' END,
    ROUND(deviation_sum::numeric, 4), core_missing, shallow_count
  FROM deviation;
  GET DIAGNOSTICS v_size_health_count = ROW_COUNT;

  -- ═══ STEP 6: Lost Revenue ═══
  DELETE FROM state_lost_revenue_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  WITH fc_size_stock AS (
    SELECT m.fc_id, m.size_code, SUM(p.on_hand) AS total_qty
    FROM _positions p JOIN _sku_map m ON m.sku = p.sku
    JOIN _multi_size_fcs msf ON msf.fc_id = m.fc_id WHERE m.size_code IS NOT NULL
    GROUP BY m.fc_id, m.size_code
  ),
  fc_missing AS (
    SELECT fs.fc_id, msf.size_count,
      COUNT(*) FILTER (WHERE COALESCE(fss.total_qty, 0) <= 0) AS missing_count,
      COUNT(*) FILTER (WHERE COALESCE(fss.total_qty, 0) > 0 AND COALESCE(fss.total_qty, 0) < 2) AS shallow_count,
      BOOL_OR(fs.size_code IN ('M', 'L') AND COALESCE(fss.total_qty, 0) <= 0) AS core_missing
    FROM _fc_sizes fs JOIN _multi_size_fcs msf ON msf.fc_id = fs.fc_id
    LEFT JOIN fc_size_stock fss ON fss.fc_id = fs.fc_id AND fss.size_code = fs.size_code
    GROUP BY fs.fc_id, msf.size_count
    HAVING COUNT(*) FILTER (WHERE COALESCE(fss.total_qty, 0) <= 0) > 0
       OR COUNT(*) FILTER (WHERE COALESCE(fss.total_qty, 0) > 0 AND COALESCE(fss.total_qty, 0) < 2) > 0
  )
  INSERT INTO state_lost_revenue_daily (tenant_id, product_id, as_of_date, lost_units_est, lost_revenue_est, driver)
  SELECT p_tenant_id, fm.fc_id, p_as_of_date,
    CEIL(COALESCE(fv.total_velocity, 0) * 28 * LEAST(0.8, fm.missing_count::numeric / fm.size_count + (fm.shallow_count::numeric / fm.size_count * 0.3)))::int,
    CEIL(COALESCE(fv.total_velocity, 0) * 28 * LEAST(0.8, fm.missing_count::numeric / fm.size_count + (fm.shallow_count::numeric / fm.size_count * 0.3)))
      * COALESCE(fp.avg_price, 250000),
    CASE WHEN fm.core_missing THEN 'core_missing' WHEN fm.shallow_count > 0 THEN 'shallow' ELSE 'imbalance' END
  FROM fc_missing fm JOIN _fc_velocity fv ON fv.fc_id = fm.fc_id
  LEFT JOIN _fc_price fp ON fp.fc_id = fm.fc_id
  WHERE COALESCE(fv.total_velocity, 0) > 0;
  GET DIAGNOSTICS v_lost_revenue_count = ROW_COUNT;

  -- ═══ STEP 7: Markdown Risk ═══
  DELETE FROM state_markdown_risk_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  WITH health AS (
    SELECT product_id, size_health_score, curve_state FROM state_size_health_daily
    WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND store_id IS NULL
  ),
  fc_woc AS (SELECT fc_id, AVG(weeks_of_cover) AS avg_woc FROM _positions WHERE weeks_of_cover IS NOT NULL GROUP BY fc_id),
  risk_calc AS (
    SELECT h.product_id, h.size_health_score,
      COALESCE(fv.total_velocity, 0) AS velocity, COALESCE(fs.total_stock, 0) AS stock, COALESCE(fw.avg_woc, 0) AS avg_woc,
      CASE WHEN h.size_health_score < 40 THEN 40 WHEN h.size_health_score < 60 THEN 20 ELSE 0 END
      + CASE WHEN COALESCE(fw.avg_woc, 0) > 12 THEN 30 WHEN COALESCE(fw.avg_woc, 0) > 8 THEN 15 ELSE 0 END
      + CASE WHEN COALESCE(fv.total_velocity, 0) > 0 AND COALESCE(fs.total_stock, 0) > 0 AND COALESCE(fs.total_stock, 0) / fv.total_velocity > 90 THEN 30
             WHEN COALESCE(fv.total_velocity, 0) > 0 AND COALESCE(fs.total_stock, 0) > 0 AND COALESCE(fs.total_stock, 0) / fv.total_velocity > 60 THEN 15
             WHEN COALESCE(fs.total_stock, 0) > 0 AND COALESCE(fv.total_velocity, 0) <= 0 THEN 30 ELSE 0 END AS raw_risk
    FROM health h LEFT JOIN _fc_velocity fv ON fv.fc_id = h.product_id
    LEFT JOIN _fc_stock fs ON fs.fc_id = h.product_id LEFT JOIN fc_woc fw ON fw.fc_id = h.product_id
  )
  INSERT INTO state_markdown_risk_daily (tenant_id, product_id, as_of_date, markdown_risk_score, markdown_eta_days, reason)
  SELECT p_tenant_id, product_id, p_as_of_date, LEAST(100, raw_risk),
    CASE WHEN raw_risk >= 60 AND velocity > 0 THEN LEAST(90, GREATEST(7, ROUND(stock / GREATEST(velocity, 0.1) / 2)))::int
         WHEN raw_risk >= 40 AND velocity > 0 THEN LEAST(120, ROUND(stock / velocity))::int
         WHEN raw_risk >= 40 THEN 60 ELSE NULL END,
    CONCAT_WS(' + ',
      CASE WHEN size_health_score < 40 THEN 'size_break' WHEN size_health_score < 60 THEN 'size_stress' END,
      CASE WHEN avg_woc > 12 THEN 'high_age' WHEN avg_woc > 8 THEN 'moderate_age' END,
      CASE WHEN velocity > 0 AND stock > 0 AND stock/velocity > 90 THEN 'slow_velocity'
           WHEN velocity > 0 AND stock > 0 AND stock/velocity > 60 THEN 'declining_velocity'
           WHEN stock > 0 AND velocity <= 0 THEN 'zero_velocity' END)
  FROM risk_calc WHERE raw_risk >= 20;
  GET DIAGNOSTICS v_markdown_risk_count = ROW_COUNT;

  -- ═══ STEP 8: Per-store Size Health ═══
  DELETE FROM state_size_health_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND store_id IS NOT NULL;
  WITH store_fc_size AS (
    SELECT p.store_id, m.fc_id, m.size_code, SUM(p.on_hand) AS qty
    FROM _positions p JOIN _sku_map m ON m.sku = p.sku
    JOIN _multi_size_fcs msf ON msf.fc_id = m.fc_id WHERE m.size_code IS NOT NULL
    GROUP BY p.store_id, m.fc_id, m.size_code
  ),
  store_fc_total AS (
    SELECT store_id, fc_id, SUM(qty) AS total_qty FROM store_fc_size GROUP BY store_id, fc_id HAVING SUM(qty) > 0
  ),
  store_deviation AS (
    SELECT sft.store_id, sft.fc_id, sft.total_qty, msf.size_count,
      SUM(ABS((1.0 / msf.size_count) - (COALESCE(sfs.qty, 0)::numeric / sft.total_qty))
        * CASE WHEN fs.size_code IN ('M', 'L') THEN 1.5 ELSE 1.0 END) AS deviation_sum,
      BOOL_OR(fs.size_code IN ('M', 'L') AND COALESCE(sfs.qty, 0) <= 0) AS core_missing,
      COUNT(*) FILTER (WHERE COALESCE(sfs.qty, 0) > 0 AND COALESCE(sfs.qty, 0) < 2) AS shallow_count
    FROM store_fc_total sft JOIN _multi_size_fcs msf ON msf.fc_id = sft.fc_id
    JOIN _fc_sizes fs ON fs.fc_id = sft.fc_id
    LEFT JOIN store_fc_size sfs ON sfs.store_id = sft.store_id AND sfs.fc_id = sft.fc_id AND sfs.size_code = fs.size_code
    GROUP BY sft.store_id, sft.fc_id, sft.total_qty, msf.size_count
  )
  INSERT INTO state_size_health_daily (tenant_id, product_id, store_id, as_of_date, size_health_score, curve_state, deviation_score, core_size_missing, shallow_depth_count)
  SELECT p_tenant_id, fc_id, store_id, p_as_of_date,
    GREATEST(0, LEAST(100, 100 - LEAST(40, deviation_sum * 20) - CASE WHEN core_missing THEN 30 ELSE 0 END - shallow_count * 5)),
    CASE
      WHEN GREATEST(0, LEAST(100, 100 - LEAST(40, deviation_sum * 20) - CASE WHEN core_missing THEN 30 ELSE 0 END - shallow_count * 5)) < 40 THEN 'broken'
      WHEN GREATEST(0, LEAST(100, 100 - LEAST(40, deviation_sum * 20) - CASE WHEN core_missing THEN 30 ELSE 0 END - shallow_count * 5)) < 60 THEN 'risk'
      WHEN GREATEST(0, LEAST(100, 100 - LEAST(40, deviation_sum * 20) - CASE WHEN core_missing THEN 30 ELSE 0 END - shallow_count * 5)) < 80 THEN 'watch'
      ELSE 'healthy' END,
    ROUND(deviation_sum::numeric, 4), core_missing, shallow_count
  FROM store_deviation;
  GET DIAGNOSTICS v_store_health_count = ROW_COUNT;

  -- ═══ STEP 9: Cash Lock ═══
  DELETE FROM state_cash_lock_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO state_cash_lock_daily (tenant_id, product_id, as_of_date, inventory_value, cash_locked_value, locked_pct, expected_release_days, lock_driver)
  SELECT p_tenant_id, sh.product_id, p_as_of_date,
    ROUND(COALESCE(fs.total_stock, 0) * COALESCE(fp.avg_price, 250000) * 0.6),
    ROUND(COALESCE(fs.total_stock, 0) * COALESCE(fp.avg_price, 250000) * 0.6 *
      CASE sh.curve_state WHEN 'broken' THEN 0.7 WHEN 'risk' THEN 0.4 WHEN 'watch' THEN 0.15 END),
    CASE sh.curve_state WHEN 'broken' THEN 70 WHEN 'risk' THEN 40 WHEN 'watch' THEN 15 END,
    CASE WHEN COALESCE(fv.total_velocity, 0) > 0 THEN LEAST(180, ROUND(COALESCE(fs.total_stock, 0) / fv.total_velocity))::int ELSE 180 END,
    CASE sh.curve_state WHEN 'broken' THEN 'broken_size' WHEN 'risk' THEN 'broken_size' ELSE 'slow_moving' END
  FROM state_size_health_daily sh
  LEFT JOIN _fc_stock fs ON fs.fc_id = sh.product_id
  LEFT JOIN _fc_price fp ON fp.fc_id = sh.product_id
  LEFT JOIN _fc_velocity fv ON fv.fc_id = sh.product_id
  WHERE sh.tenant_id = p_tenant_id AND sh.as_of_date = p_as_of_date AND sh.store_id IS NULL
    AND sh.curve_state IN ('broken', 'risk', 'watch');
  GET DIAGNOSTICS v_cash_lock_count = ROW_COUNT;

  -- ═══ STEP 10: Margin Leak ═══
  DELETE FROM state_margin_leak_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  -- Driver 1: Size break
  INSERT INTO state_margin_leak_daily (tenant_id, product_id, as_of_date, margin_leak_value, leak_driver, leak_detail, cumulative_leak_30d)
  SELECT p_tenant_id, product_id, p_as_of_date, ROUND(lost_revenue_est * 0.4), 'size_break',
    jsonb_build_object('lost_units', lost_units_est, 'lost_revenue', lost_revenue_est, 'driver', driver),
    ROUND(lost_revenue_est * 0.4)
  FROM state_lost_revenue_daily
  WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND lost_revenue_est > 0;
  -- Driver 2: Markdown risk
  INSERT INTO state_margin_leak_daily (tenant_id, product_id, as_of_date, margin_leak_value, leak_driver, leak_detail, cumulative_leak_30d)
  SELECT p_tenant_id, md.product_id, p_as_of_date,
    ROUND(COALESCE(fs.total_stock, 0) * COALESCE(fp.avg_price, 250000) * 0.35 * (md.markdown_risk_score::numeric / 100) * 0.5),
    'markdown_risk',
    jsonb_build_object('risk_score', md.markdown_risk_score, 'eta_days', md.markdown_eta_days, 'stock', COALESCE(fs.total_stock, 0)),
    ROUND(COALESCE(fs.total_stock, 0) * COALESCE(fp.avg_price, 250000) * 0.35 * (md.markdown_risk_score::numeric / 100) * 0.5)
  FROM state_markdown_risk_daily md
  LEFT JOIN _fc_stock fs ON fs.fc_id = md.product_id
  LEFT JOIN _fc_price fp ON fp.fc_id = md.product_id
  WHERE md.tenant_id = p_tenant_id AND md.as_of_date = p_as_of_date AND md.markdown_risk_score >= 60
    AND COALESCE(fs.total_stock, 0) > 0;
  GET DIAGNOSTICS v_margin_leak_count = ROW_COUNT;

  -- ═══ STEP 11: Evidence Packs ═══
  DELETE FROM si_evidence_packs WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO si_evidence_packs (tenant_id, product_id, as_of_date, evidence_type, severity, summary, data_snapshot, source_tables)
  SELECT p_tenant_id, sh.product_id, p_as_of_date, 'size_intelligence',
    CASE WHEN sh.curve_state = 'broken' AND COALESCE(md.markdown_risk_score, 0) >= 60 THEN 'critical'
         WHEN sh.curve_state = 'broken' THEN 'high' ELSE 'medium' END,
    CONCAT_WS(' | ',
      'Health: ' || ROUND(sh.size_health_score) || ' (' || sh.curve_state || ')',
      CASE WHEN lr.lost_revenue_est IS NOT NULL THEN 'Lost Rev: ' || lr.lost_revenue_est END,
      CASE WHEN cl.cash_locked_value IS NOT NULL THEN 'Cash Locked: ' || cl.cash_locked_value END,
      CASE WHEN md.markdown_risk_score IS NOT NULL THEN 'MD Risk: ' || md.markdown_risk_score || ', ETA: ' || md.markdown_eta_days || 'd' END),
    jsonb_build_object(
      'health', jsonb_build_object('score', sh.size_health_score, 'state', sh.curve_state, 'core_missing', sh.core_size_missing, 'deviation', sh.deviation_score),
      'lost_revenue', CASE WHEN lr.product_id IS NOT NULL THEN jsonb_build_object('units', lr.lost_units_est, 'revenue', lr.lost_revenue_est, 'driver', lr.driver) END,
      'markdown_risk', CASE WHEN md.product_id IS NOT NULL THEN jsonb_build_object('score', md.markdown_risk_score, 'eta_days', md.markdown_eta_days, 'reason', md.reason) END,
      'cash_lock', CASE WHEN cl.product_id IS NOT NULL THEN jsonb_build_object('value', cl.cash_locked_value, 'pct', cl.locked_pct, 'release_days', cl.expected_release_days) END),
    ARRAY['state_size_health_daily']
      || CASE WHEN lr.product_id IS NOT NULL THEN ARRAY['state_lost_revenue_daily'] ELSE ARRAY[]::text[] END
      || CASE WHEN md.product_id IS NOT NULL THEN ARRAY['state_markdown_risk_daily'] ELSE ARRAY[]::text[] END
      || CASE WHEN cl.product_id IS NOT NULL THEN ARRAY['state_cash_lock_daily'] ELSE ARRAY[]::text[] END
  FROM state_size_health_daily sh
  LEFT JOIN state_lost_revenue_daily lr ON lr.tenant_id = p_tenant_id AND lr.as_of_date = p_as_of_date AND lr.product_id = sh.product_id
  LEFT JOIN state_markdown_risk_daily md ON md.tenant_id = p_tenant_id AND md.as_of_date = p_as_of_date AND md.product_id = sh.product_id
  LEFT JOIN state_cash_lock_daily cl ON cl.tenant_id = p_tenant_id AND cl.as_of_date = p_as_of_date AND cl.product_id = sh.product_id
  WHERE sh.tenant_id = p_tenant_id AND sh.as_of_date = p_as_of_date AND sh.store_id IS NULL
    AND sh.curve_state IN ('broken', 'risk');
  GET DIAGNOSTICS v_evidence_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true, 'date', p_as_of_date,
    'idi', v_idi_count, 'scs', v_scs_count, 'chi', v_chi_count, 'gap', v_gap_count,
    'size_health', v_size_health_count, 'lost_revenue', v_lost_revenue_count,
    'markdown_risk', v_markdown_risk_count, 'store_health', v_store_health_count,
    'cash_lock', v_cash_lock_count, 'margin_leak', v_margin_leak_count,
    'evidence', v_evidence_count,
    'duration_ms', EXTRACT(MILLISECOND FROM clock_timestamp() - v_start)::int
  );
END;
$$;
