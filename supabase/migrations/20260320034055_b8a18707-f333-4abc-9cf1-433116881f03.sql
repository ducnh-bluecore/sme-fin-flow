
-- Increase statement timeout for compute_inventory_kpi_all
CREATE OR REPLACE FUNCTION public.compute_inventory_kpi_all(p_tenant_id uuid, p_as_of_date date)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SET statement_timeout = '120s'
SET search_path = 'public'
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

  -- Size Health: Step 1 - build detail WITH store totals pre-computed
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
  LEFT JOIN inv_size_curves sc ON sc.fc_id = sp.fc_id AND sc.tenant_id = sp.tenant_id
  WHERE sp.tenant_id = p_tenant_id
    AND sp.snapshot_date = p_as_of_date
    AND m.is_active = true;

  -- Pre-compute store totals
  CREATE TEMP TABLE _store_totals ON COMMIT DROP AS
  SELECT fc_id, store_id, SUM(on_hand) AS store_total
  FROM _size_detail
  GROUP BY fc_id, store_id;

  -- Size Health: Step 2 - compute health scores
  DELETE FROM state_size_health_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_size_health_daily (
    tenant_id, product_id, store_id, as_of_date, 
    total_sizes, sizes_with_stock, missing_ratio,
    core_sizes_present, core_sizes_total, core_coverage,
    curve_deviation_score, depth_score, health_score, curve_state
  )
  SELECT 
    v_tid,
    d.fc_id::text,
    d.store_id,
    p_as_of_date,
    COUNT(DISTINCT d.size_code),
    COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand > v_min_stock),
    1.0 - COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand > v_min_stock)::numeric / NULLIF(COUNT(DISTINCT d.size_code), 0),
    COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core AND d.on_hand > v_min_stock),
    COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core),
    COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core AND d.on_hand > v_min_stock)::numeric / NULLIF(COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core), 0),
    CASE WHEN st.store_total > 0 THEN
      1.0 - LEAST(1.0, AVG(ABS(
        d.on_hand::numeric / NULLIF(st.store_total, 0) - d.ideal_ratio
      )) / v_max_dev)
    ELSE 0 END,
    CASE WHEN AVG(d.on_hand) <= v_shallow THEN 0.3
      WHEN AVG(d.on_hand) <= v_shallow * 2 THEN 0.6
      ELSE 1.0 END,
    -- Composite health score
    GREATEST(0, LEAST(100, (
      (1.0 - COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand > v_min_stock)::numeric / NULLIF(COUNT(DISTINCT d.size_code), 0)) * v_w_missing * (-100)
      + COALESCE(COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core AND d.on_hand > v_min_stock)::numeric / NULLIF(COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core), 0), 0) * v_w_core * 100
      + CASE WHEN st.store_total > 0 THEN
          (1.0 - LEAST(1.0, AVG(ABS(d.on_hand::numeric / NULLIF(st.store_total, 0) - d.ideal_ratio)) / v_max_dev)) * v_w_curve * 100
        ELSE 0 END
      + CASE WHEN AVG(d.on_hand) <= v_shallow THEN 0.3 WHEN AVG(d.on_hand) <= v_shallow * 2 THEN 0.6 ELSE 1.0 END * v_w_depth * 100
    ))),
    -- Curve state
    CASE 
      WHEN COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand > v_min_stock)::numeric / NULLIF(COUNT(DISTINCT d.size_code), 0) < 0.5 THEN 'broken'
      WHEN COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand > v_min_stock)::numeric / NULLIF(COUNT(DISTINCT d.size_code), 0) < 0.8 THEN 'risk'
      ELSE 'healthy'
    END
  FROM _size_detail d
  JOIN _store_totals st ON st.fc_id = d.fc_id AND st.store_id = d.store_id
  GROUP BY d.fc_id, d.store_id, st.store_total;
  GET DIAGNOSTICS v_sz = ROW_COUNT;

  -- Markdown risk
  DELETE FROM state_markdown_risk_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_markdown_risk_daily (tenant_id, product_id, as_of_date, risk_score, risk_level, markdown_pct_recommended, potential_loss)
  SELECT v_tid, fc_id::text, p_as_of_date,
    LEAST(100, GREATEST(0,
      CASE WHEN daily_vel = 0 THEN 90
        WHEN total_on_hand / NULLIF(daily_vel, 0) > 120 THEN 80
        WHEN total_on_hand / NULLIF(daily_vel, 0) > 60 THEN 50
        ELSE 20 END
    )),
    CASE WHEN daily_vel = 0 THEN 'critical'
      WHEN total_on_hand / NULLIF(daily_vel, 0) > 120 THEN 'high'
      WHEN total_on_hand / NULLIF(daily_vel, 0) > 60 THEN 'medium'
      ELSE 'low' END,
    CASE WHEN daily_vel = 0 THEN 50
      WHEN total_on_hand / NULLIF(daily_vel, 0) > 120 THEN 30
      WHEN total_on_hand / NULLIF(daily_vel, 0) > 60 THEN 15
      ELSE 0 END,
    CASE WHEN daily_vel = 0 THEN total_on_hand * cost
      ELSE GREATEST(0, total_on_hand - daily_vel * 45) * cost * 0.3 END
  FROM _inv_agg WHERE total_on_hand > 0;
  GET DIAGNOSTICS v_md = ROW_COUNT;

  -- Evidence packs
  DELETE FROM state_evidence_packs WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_evidence_packs (tenant_id, product_id, as_of_date, evidence_type, evidence_data)
  SELECT v_tid, fc_id::text, p_as_of_date, 'inventory_snapshot',
    jsonb_build_object('on_hand', total_on_hand, 'daily_velocity', daily_vel, 'days_of_cover',
      CASE WHEN daily_vel > 0 THEN (total_on_hand / daily_vel)::int ELSE 999 END,
      'sell_price', price, 'cost_price', cost)
  FROM _inv_agg WHERE total_on_hand > 0;
  GET DIAGNOSTICS v_ev = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'as_of_date', p_as_of_date,
    'lost_revenue_rows', v_lr,
    'cash_lock_rows', v_cl,
    'margin_leak_rows', v_ml,
    'size_health_rows', v_sz,
    'markdown_risk_rows', v_md,
    'evidence_rows', v_ev,
    'duration_ms', EXTRACT(MILLISECOND FROM clock_timestamp() - v_start)::int
  );
END;
$$;

-- Also increase timeout for compute_size_transfers
CREATE OR REPLACE FUNCTION public.compute_size_transfers(p_tenant_id uuid, p_as_of_date date)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SET statement_timeout = '120s'
SET search_path = 'public'
AS $$
DECLARE
  v_count int := 0;
  v_start timestamptz := clock_timestamp();
  v_snapshot_date date;
BEGIN
  SELECT MAX(snapshot_date) INTO v_snapshot_date 
  FROM inv_state_positions WHERE tenant_id = p_tenant_id;
  
  IF v_snapshot_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no inventory snapshot found');
  END IF;

  DELETE FROM state_size_transfer_daily 
  WHERE tenant_id = p_tenant_id::text AND as_of_date = p_as_of_date;

  CREATE TEMP TABLE _fc_prices ON COMMIT DROP AS
  SELECT fc.id AS fc_id, MAX(p.selling_price) AS selling_price
  FROM inv_family_codes fc
  JOIN products p ON p.sku LIKE fc.fc_code || '%' AND p.tenant_id = fc.tenant_id
  WHERE fc.tenant_id = p_tenant_id AND p.selling_price > 0
  GROUP BY fc.id;

  CREATE TEMP TABLE _multi_size_fcs ON COMMIT DROP AS
  SELECT fc_id
  FROM inv_sku_fc_mapping
  WHERE tenant_id = p_tenant_id AND is_active = true
  GROUP BY fc_id
  HAVING COUNT(DISTINCT COALESCE(NULLIF(TRIM(size), ''), '__none__')) > 1;

  WITH latest_inv AS (
    SELECT isp.fc_id, isp.store_id,
           upper(regexp_replace(isp.sku, '.*[0-9]', '')) AS size_code,
           SUM(isp.on_hand) AS on_hand
    FROM inv_state_positions isp
    JOIN inv_stores s ON s.id = isp.store_id AND s.is_transfer_eligible = true AND s.location_type = 'store'
    JOIN _multi_size_fcs msf ON msf.fc_id = isp.fc_id
    WHERE isp.tenant_id = p_tenant_id 
      AND isp.snapshot_date = v_snapshot_date
    GROUP BY isp.fc_id, isp.store_id, upper(regexp_replace(isp.sku, '.*[0-9]', ''))
  ),
  stores_with_partial_stock AS (
    SELECT DISTINCT fc_id, store_id
    FROM latest_inv
    WHERE on_hand > 0
  ),
  velocity AS (
    SELECT d.fc_id, d.store_id,
           upper(regexp_replace(d.sku, '.*[0-9]', '')) AS size_code,
           SUM(d.avg_daily_sales) AS daily_vel
    FROM inv_state_demand d
    JOIN inv_stores s ON s.id = d.store_id AND s.is_transfer_eligible = true AND s.location_type = 'store'
    JOIN _multi_size_fcs msf ON msf.fc_id = d.fc_id
    WHERE d.tenant_id = p_tenant_id AND d.avg_daily_sales > 0
    GROUP BY d.fc_id, d.store_id, upper(regexp_replace(d.sku, '.*[0-9]', ''))
  ),
  store_size AS (
    SELECT i.fc_id, i.store_id, i.size_code, i.on_hand,
           COALESCE(v.daily_vel, 0) AS daily_vel,
           CASE WHEN COALESCE(v.daily_vel, 0) > 0 THEN i.on_hand / v.daily_vel ELSE 999 END AS days_cover,
           s.region
    FROM latest_inv i
    JOIN inv_stores s ON s.id = i.store_id
    LEFT JOIN velocity v ON v.fc_id = i.fc_id AND v.store_id = i.store_id AND v.size_code = i.size_code
  ),
  sources AS (
    SELECT * FROM store_size WHERE on_hand >= 3 AND days_cover > 14
  ),
  dests AS (
    SELECT ss.* 
    FROM store_size ss
    JOIN stores_with_partial_stock ps ON ps.fc_id = ss.fc_id AND ps.store_id = ss.store_id
    WHERE ss.on_hand <= 1 AND ss.daily_vel > 0
  ),
  matches AS (
    SELECT 
      src.fc_id, src.size_code,
      src.store_id AS source_store_id,
      dst.store_id AS dest_store_id,
      src.on_hand AS source_on_hand,
      dst.on_hand AS dest_on_hand,
      dst.daily_vel AS dest_velocity,
      LEAST(
        GREATEST(1, (src.on_hand - CEIL(COALESCE(src.daily_vel, 0.03) * 14))::int),
        CASE WHEN dst.daily_vel >= 0.1 THEN 3 ELSE 2 END
      ) AS transfer_qty,
      COALESCE(fp.selling_price, 500000) AS price,
      dst.daily_vel,
      CASE WHEN src.region = dst.region THEN 35000 ELSE 70000 END AS logistics_cost,
      CASE WHEN dst.on_hand = 0 THEN 'size_break' ELSE 'low_stock' END || 
      CASE WHEN src.region != dst.region THEN ' + cross_region' ELSE '' END ||
      CASE WHEN dst.size_code IN ('S','M','L') THEN ' + core_size' ELSE '' END AS reason
    FROM sources src
    JOIN dests dst ON dst.fc_id = src.fc_id AND dst.size_code = src.size_code AND dst.store_id != src.store_id
    LEFT JOIN _fc_prices fp ON fp.fc_id = src.fc_id
    WHERE (src.on_hand - LEAST(
        GREATEST(1, (src.on_hand - CEIL(COALESCE(src.daily_vel, 0.03) * 14))::int),
        CASE WHEN dst.daily_vel >= 0.1 THEN 3 ELSE 2 END
      )) >= CEIL(COALESCE(src.daily_vel, 0.03) * 14)
  ),
  ranked AS (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY fc_id, size_code, dest_store_id ORDER BY source_on_hand DESC) AS rn
    FROM matches
  ),
  final AS (
    SELECT * FROM ranked WHERE rn = 1
  )
  INSERT INTO state_size_transfer_daily (
    tenant_id, product_id, size_code, source_store_id, dest_store_id, as_of_date,
    transfer_qty, transfer_score, source_on_hand, dest_on_hand, dest_velocity,
    estimated_revenue_gain, estimated_transfer_cost, net_benefit, reason, status
  )
  SELECT
    p_tenant_id::text, f.fc_id::text, f.size_code,
    f.source_store_id, f.dest_store_id, p_as_of_date,
    f.transfer_qty,
    LEAST(100, (f.daily_vel * f.price / 10000)::int),
    f.source_on_hand, f.dest_on_hand, f.dest_velocity,
    f.transfer_qty * f.price * 0.8,
    f.logistics_cost,
    f.transfer_qty * f.price * 0.8 - f.logistics_cost,
    f.reason,
    'pending'
  WHERE f.transfer_qty * f.price * 0.8 - f.logistics_cost > 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_date', v_snapshot_date,
    'transfers_generated', v_count,
    'duration_ms', EXTRACT(MILLISECOND FROM clock_timestamp() - v_start)::int
  );
END;
$$;
