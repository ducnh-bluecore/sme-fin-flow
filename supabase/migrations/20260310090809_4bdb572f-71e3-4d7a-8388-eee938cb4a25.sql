
CREATE OR REPLACE FUNCTION compute_inventory_kpi_all(p_tenant_id uuid, p_as_of_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tid text := p_tenant_id::text;
  v_lr int := 0; v_cl int := 0; v_ml int := 0; v_sz int := 0; v_md int := 0; v_ev int := 0;
  v_start timestamptz := clock_timestamp();
  v_min_stock int := 1;
  v_core_sizes text[] := ARRAY['S','M','L'];
  v_w_missing numeric := 0.30;
  v_w_core numeric := 0.35;
  v_w_curve numeric := 0.20;
  v_w_depth numeric := 0.15;
  v_shallow int := 2;
  v_max_dev numeric := 0.30;
BEGIN
  SELECT 
    COALESCE(r.min_stock_threshold, 1),
    COALESCE(r.core_sizes, ARRAY['S','M','L']),
    COALESCE(r.weight_missing_ratio, 0.30),
    COALESCE(r.weight_core_missing, 0.35),
    COALESCE(r.weight_curve_deviation, 0.20),
    COALESCE(r.weight_depth_score, 0.15),
    COALESCE(r.shallow_depth_threshold, 2),
    COALESCE(r.max_curve_deviation_pct, 0.30)
  INTO v_min_stock, v_core_sizes, v_w_missing, v_w_core, v_w_curve, v_w_depth, v_shallow, v_max_dev
  FROM sem_size_health_rules r
  WHERE r.tenant_id = p_tenant_id AND r.is_active = true
  LIMIT 1;

  CREATE TEMP TABLE _fc_prices ON COMMIT DROP AS
  SELECT fc.id AS fc_id,
    MAX(p.selling_price) AS selling_price,
    MAX(p.cost_price) AS cost_price
  FROM inv_family_codes fc
  JOIN products p ON p.sku LIKE fc.fc_code || '%' AND p.tenant_id = fc.tenant_id
  WHERE fc.tenant_id = p_tenant_id AND (p.selling_price > 0 OR p.cost_price > 0)
  GROUP BY fc.id;

  CREATE TEMP TABLE _inv_agg ON COMMIT DROP AS
  SELECT sp.fc_id, SUM(sp.on_hand) AS total_on_hand,
    COALESCE(d.daily_vel, 0) AS daily_vel,
    COALESCE(fp.selling_price, 0) AS price,
    COALESCE(fp.cost_price, COALESCE(fp.selling_price, 0) * 0.5) AS cost
  FROM inv_state_positions sp
  LEFT JOIN (SELECT fc_id, SUM(avg_daily_sales) AS daily_vel FROM inv_state_demand WHERE tenant_id = p_tenant_id GROUP BY fc_id) d ON d.fc_id = sp.fc_id
  LEFT JOIN _fc_prices fp ON fp.fc_id = sp.fc_id
  WHERE sp.tenant_id = p_tenant_id AND sp.snapshot_date = p_as_of_date
  GROUP BY sp.fc_id, d.daily_vel, fp.selling_price, fp.cost_price;

  -- Lost Revenue
  DELETE FROM state_lost_revenue_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_lost_revenue_daily (tenant_id, product_id, as_of_date, lost_units_est, lost_revenue_est, driver)
  SELECT v_tid, fc_id::text, p_as_of_date, GREATEST(0, daily_vel*14-total_on_hand), GREATEST(0, daily_vel*14-total_on_hand)*price,
    CASE WHEN total_on_hand=0 THEN 'stockout' WHEN daily_vel=0 THEN 'no_demand' ELSE 'understock' END
  FROM _inv_agg WHERE daily_vel*14 > total_on_hand;
  GET DIAGNOSTICS v_lr = ROW_COUNT;

  -- Cash Lock
  DELETE FROM state_cash_lock_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_cash_lock_daily (tenant_id, product_id, as_of_date, inventory_value, cash_locked_value, locked_pct, expected_release_days, lock_driver)
  SELECT v_tid, fc_id::text, p_as_of_date, total_on_hand*price, total_on_hand*cost,
    CASE WHEN price>0 THEN LEAST(1.0, cost/price) ELSE 0.6 END,
    CASE WHEN daily_vel>0 THEN LEAST(180, (total_on_hand/daily_vel)::int) ELSE 180 END,
    CASE WHEN daily_vel=0 THEN 'dead_stock' WHEN total_on_hand/NULLIF(daily_vel,0)>90 THEN 'severe_overstock' WHEN total_on_hand/NULLIF(daily_vel,0)>45 THEN 'overstock' ELSE 'normal' END
  FROM _inv_agg WHERE total_on_hand > 0;
  GET DIAGNOSTICS v_cl = ROW_COUNT;

  -- Margin Leak
  DELETE FROM state_margin_leak_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_margin_leak_daily (tenant_id, product_id, as_of_date, margin_leak_value, leak_driver, leak_detail, cumulative_leak_30d)
  SELECT v_tid, fc_id::text, p_as_of_date, GREATEST(0, total_on_hand-daily_vel*45)*cost*0.3,
    CASE WHEN daily_vel=0 THEN 'dead_stock_holding' WHEN total_on_hand/NULLIF(daily_vel,0)>90 THEN 'excess_holding_cost' ELSE 'opportunity_cost' END,
    jsonb_build_object('on_hand', total_on_hand, 'daily_vel', daily_vel),
    GREATEST(0, total_on_hand-daily_vel*45)*cost*0.3
  FROM _inv_agg WHERE total_on_hand>0 AND GREATEST(0, total_on_hand-daily_vel*45)>0;
  GET DIAGNOSTICS v_ml = ROW_COUNT;

  -- Size Health
  CREATE TEMP TABLE _size_detail ON COMMIT DROP AS
  SELECT 
    sp.fc_id,
    sp.store_id,
    m.size AS size_code,
    sp.on_hand,
    CASE WHEN m.size = ANY(v_core_sizes) THEN true ELSE false END AS is_core,
    COALESCE((sc.size_ratios ->> m.size)::numeric, 0) AS ideal_ratio
  FROM inv_state_positions sp
  JOIN inv_sku_fc_mapping m ON m.sku = sp.sku AND m.tenant_id = sp.tenant_id
  LEFT JOIN inv_family_codes fc ON fc.id = sp.fc_id AND fc.tenant_id = sp.tenant_id
  LEFT JOIN sem_size_curve_profiles sc 
    ON sc.tenant_id = sp.tenant_id 
    AND sc.is_current = true
    AND (sc.category_id IS NULL OR sc.category_id = fc.category)
  WHERE sp.tenant_id = p_tenant_id 
    AND sp.snapshot_date = p_as_of_date;

  DELETE FROM state_size_health_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_size_health_daily (tenant_id, product_id, store_id, as_of_date, size_health_score, curve_state, deviation_score, core_size_missing, shallow_depth_count)
  SELECT 
    v_tid, fc_id::text, store_id, p_as_of_date,
    LEAST(100, GREATEST(0, (
      v_w_missing * (COUNT(CASE WHEN on_hand > v_min_stock THEN 1 END)::numeric / NULLIF(COUNT(*), 0))
      + v_w_core * (
          CASE WHEN COUNT(CASE WHEN is_core THEN 1 END) = 0 THEN 1.0
          ELSE COUNT(CASE WHEN is_core AND on_hand > v_min_stock THEN 1 END)::numeric 
               / NULLIF(COUNT(CASE WHEN is_core THEN 1 END), 0)
          END
        )
      + v_w_curve * (
          CASE WHEN SUM(ideal_ratio) = 0 THEN 1.0
          ELSE GREATEST(0, 1.0 - LEAST(1.0, 
            SUM(ABS(
              on_hand::numeric / NULLIF(SUM(on_hand) OVER (PARTITION BY fc_id, store_id), 0)
              - ideal_ratio
            )) / NULLIF(COUNT(*), 0) / NULLIF(v_max_dev, 0)
          ))
          END
        )
      + v_w_depth * (COUNT(CASE WHEN on_hand > v_shallow THEN 1 END)::numeric / NULLIF(COUNT(*), 0))
    ) * 100)::int),
    CASE 
      WHEN COUNT(CASE WHEN on_hand > v_min_stock THEN 1 END) = COUNT(*) THEN 'full_curve'
      WHEN COUNT(CASE WHEN on_hand > v_min_stock THEN 1 END) = 0 THEN 'empty'
      WHEN COUNT(CASE WHEN on_hand > v_min_stock THEN 1 END)::numeric / COUNT(*) >= 0.7 THEN 'minor_break'
      ELSE 'major_break'
    END,
    LEAST(100, (COUNT(CASE WHEN on_hand <= v_min_stock THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100)::int),
    EXISTS(SELECT 1 FROM unnest(v_core_sizes) cs WHERE cs = ANY(ARRAY_AGG(CASE WHEN on_hand <= v_min_stock AND is_core THEN size_code END))),
    COUNT(CASE WHEN on_hand BETWEEN 1 AND v_shallow THEN 1 END)::int
  FROM _size_detail
  GROUP BY fc_id, store_id
  HAVING COUNT(CASE WHEN on_hand > 0 THEN 1 END) > 0;
  GET DIAGNOSTICS v_sz = ROW_COUNT;

  -- Markdown Risk
  DELETE FROM state_markdown_risk_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_markdown_risk_daily (tenant_id, product_id, as_of_date, markdown_risk_score, markdown_eta_days, reason)
  SELECT v_tid, fc_id::text, p_as_of_date,
    LEAST(100, GREATEST(0, CASE WHEN daily_vel=0 THEN 90 WHEN total_on_hand/NULLIF(daily_vel,0)>90 THEN 75 WHEN total_on_hand/NULLIF(daily_vel,0)>60 THEN 50 WHEN total_on_hand/NULLIF(daily_vel,0)>30 THEN 25 ELSE 10 END)),
    CASE WHEN daily_vel>0 THEN GREATEST(0, (total_on_hand/daily_vel-60))::int ELSE 0 END,
    CASE WHEN daily_vel=0 THEN 'dead_stock' WHEN total_on_hand/NULLIF(daily_vel,0)>90 THEN 'severe_overstock' WHEN total_on_hand/NULLIF(daily_vel,0)>60 THEN 'aging_inventory' ELSE 'healthy' END
  FROM _inv_agg WHERE total_on_hand > 0;
  GET DIAGNOSTICS v_md = ROW_COUNT;

  -- Evidence Packs
  DELETE FROM si_evidence_packs WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO si_evidence_packs (tenant_id, product_id, as_of_date, evidence_type, severity, summary, data_snapshot, source_tables)
  SELECT p_tenant_id, fc_id::text, p_as_of_date, 'overstock_alert',
    CASE WHEN daily_vel=0 THEN 'critical' WHEN total_on_hand/NULLIF(daily_vel,0)>90 THEN 'high' ELSE 'medium' END,
    'FC '||fc_id||': '||total_on_hand||' units',
    jsonb_build_object('on_hand', total_on_hand, 'daily_vel', daily_vel, 'overstock_units', GREATEST(0, total_on_hand-daily_vel*45)),
    ARRAY['inv_state_positions','inv_state_demand']
  FROM _inv_agg WHERE total_on_hand>0 AND (daily_vel=0 OR total_on_hand/NULLIF(daily_vel,0)>60);
  GET DIAGNOSTICS v_ev = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'lost_revenue_rows', v_lr, 'cash_lock_rows', v_cl, 'margin_leak_rows', v_ml, 'size_health_rows', v_sz, 'markdown_risk_rows', v_md, 'evidence_packs', v_ev, 'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp()-v_start)::int);
END;
$$;
