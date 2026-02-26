
CREATE OR REPLACE FUNCTION public.compute_inventory_kpi_all(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '300s'
AS $fn$
DECLARE
  v_tid text := p_tenant_id::text;
  v_lr_count int := 0;
  v_cl_count int := 0;
  v_ml_count int := 0;
  v_sz_count int := 0;
  v_md_count int := 0;
  v_ev_count int := 0;
  v_start timestamptz := clock_timestamp();
BEGIN

  -- Precompute product-level aggregates into temp table
  CREATE TEMP TABLE _inv_agg ON COMMIT DROP AS
  SELECT
    sp.fc_id,
    SUM(sp.on_hand) AS total_on_hand,
    COALESCE(d.daily_vel, 0) AS daily_vel,
    COALESCE(p.selling_price, 0) AS price,
    COALESCE(p.cost_price, 0) AS cost
  FROM inv_state_positions sp
  LEFT JOIN (
    SELECT fc_id, SUM(avg_daily_sales) AS daily_vel
    FROM inv_state_demand
    WHERE tenant_id = p_tenant_id  -- UUID
    GROUP BY fc_id
  ) d ON d.fc_id = sp.fc_id
  LEFT JOIN (
    SELECT id, selling_price, cost_price FROM products WHERE tenant_id = p_tenant_id  -- UUID
  ) p ON p.id = sp.fc_id
  WHERE sp.tenant_id = p_tenant_id  -- UUID
    AND sp.snapshot_date = p_as_of_date
  GROUP BY sp.fc_id, d.daily_vel, p.selling_price, p.cost_price;

  CREATE INDEX ON _inv_agg (fc_id);

  -- 1) Lost Revenue (tenant_id is TEXT in these tables)
  DELETE FROM state_lost_revenue_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_lost_revenue_daily (tenant_id, product_id, as_of_date, lost_units_est, lost_revenue_est, driver)
  SELECT v_tid, fc_id::text, p_as_of_date,
    GREATEST(0, daily_vel * 14 - total_on_hand),
    GREATEST(0, daily_vel * 14 - total_on_hand) * price,
    CASE WHEN total_on_hand = 0 THEN 'stockout'
         WHEN daily_vel = 0 THEN 'no_demand' ELSE 'understock' END
  FROM _inv_agg WHERE daily_vel * 14 > total_on_hand;
  GET DIAGNOSTICS v_lr_count = ROW_COUNT;

  -- 2) Cash Lock
  DELETE FROM state_cash_lock_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_cash_lock_daily (tenant_id, product_id, as_of_date, inventory_value, cash_locked_value, locked_pct, expected_release_days, lock_driver)
  SELECT v_tid, fc_id::text, p_as_of_date,
    total_on_hand * price,
    total_on_hand * cost,
    CASE WHEN price > 0 THEN LEAST(1.0, cost / price) ELSE 0.6 END,
    CASE WHEN daily_vel > 0 THEN LEAST(180, (total_on_hand / daily_vel)::int) ELSE 180 END,
    CASE WHEN daily_vel = 0 THEN 'dead_stock'
         WHEN total_on_hand / NULLIF(daily_vel, 0) > 90 THEN 'severe_overstock'
         WHEN total_on_hand / NULLIF(daily_vel, 0) > 45 THEN 'overstock'
         ELSE 'normal' END
  FROM _inv_agg WHERE total_on_hand > 0;
  GET DIAGNOSTICS v_cl_count = ROW_COUNT;

  -- 3) Margin Leak
  DELETE FROM state_margin_leak_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_margin_leak_daily (tenant_id, product_id, as_of_date, margin_leak_value, leak_driver, leak_detail, cumulative_leak_30d)
  SELECT v_tid, fc_id::text, p_as_of_date,
    GREATEST(0, total_on_hand - daily_vel * 45) * cost * 0.3,
    CASE WHEN daily_vel = 0 THEN 'dead_stock_holding'
         WHEN total_on_hand / NULLIF(daily_vel, 0) > 90 THEN 'excess_holding_cost'
         ELSE 'opportunity_cost' END,
    jsonb_build_object('on_hand', total_on_hand, 'daily_vel', daily_vel),
    GREATEST(0, total_on_hand - daily_vel * 45) * cost * 0.3
  FROM _inv_agg
  WHERE total_on_hand > 0 AND GREATEST(0, total_on_hand - daily_vel * 45) > 0;
  GET DIAGNOSTICS v_ml_count = ROW_COUNT;

  -- 4) Size Health (store × fc level, uses UUID tenant_id in inv_state_positions)
  DELETE FROM state_size_health_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_size_health_daily (tenant_id, product_id, store_id, as_of_date, size_health_score, curve_state, deviation_score, core_size_missing, shallow_depth_count)
  SELECT v_tid, sp.fc_id::text, sp.store_id::text, p_as_of_date,
    LEAST(100, GREATEST(0, (COUNT(CASE WHEN sp.on_hand > 0 THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100)::int)),
    CASE WHEN COUNT(CASE WHEN sp.on_hand > 0 THEN 1 END) = COUNT(*) THEN 'full_curve'
         WHEN COUNT(CASE WHEN sp.on_hand > 0 THEN 1 END) = 0 THEN 'empty'
         WHEN COUNT(CASE WHEN sp.on_hand > 0 THEN 1 END)::numeric / COUNT(*) >= 0.7 THEN 'minor_break'
         ELSE 'major_break' END,
    LEAST(100, (COUNT(CASE WHEN sp.on_hand = 0 THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100)::int),
    COUNT(CASE WHEN sp.on_hand = 0 THEN 1 END)::int,
    COUNT(CASE WHEN sp.on_hand BETWEEN 1 AND 2 THEN 1 END)::int
  FROM inv_state_positions sp
  WHERE sp.tenant_id = p_tenant_id AND sp.snapshot_date = p_as_of_date
  GROUP BY sp.fc_id, sp.store_id;
  GET DIAGNOSTICS v_sz_count = ROW_COUNT;

  -- 5) Markdown Risk
  DELETE FROM state_markdown_risk_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_markdown_risk_daily (tenant_id, product_id, as_of_date, markdown_risk_score, markdown_eta_days, reason)
  SELECT v_tid, fc_id::text, p_as_of_date,
    LEAST(100, GREATEST(0,
      CASE WHEN daily_vel = 0 THEN 90
           WHEN total_on_hand / NULLIF(daily_vel, 0) > 90 THEN 75
           WHEN total_on_hand / NULLIF(daily_vel, 0) > 60 THEN 50
           WHEN total_on_hand / NULLIF(daily_vel, 0) > 30 THEN 25
           ELSE 10 END)),
    CASE WHEN daily_vel > 0 THEN GREATEST(0, (total_on_hand / daily_vel - 60))::int ELSE 0 END,
    CASE WHEN daily_vel = 0 THEN 'dead_stock'
         WHEN total_on_hand / NULLIF(daily_vel, 0) > 90 THEN 'severe_overstock'
         WHEN total_on_hand / NULLIF(daily_vel, 0) > 60 THEN 'aging_inventory'
         ELSE 'healthy' END
  FROM _inv_agg WHERE total_on_hand > 0;
  GET DIAGNOSTICS v_md_count = ROW_COUNT;

  -- 6) Evidence Packs
  DELETE FROM si_evidence_packs WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO si_evidence_packs (tenant_id, product_id, as_of_date, evidence_type, severity, summary, data_snapshot, source_tables)
  SELECT v_tid, fc_id::text, p_as_of_date, 'overstock_alert',
    CASE WHEN daily_vel = 0 THEN 'critical'
         WHEN total_on_hand / NULLIF(daily_vel, 0) > 90 THEN 'high'
         ELSE 'medium' END,
    'FC ' || fc_id || ': ' || total_on_hand || ' units',
    jsonb_build_object('on_hand', total_on_hand, 'daily_vel', daily_vel,
      'overstock_units', GREATEST(0, total_on_hand - daily_vel * 45)),
    ARRAY['inv_state_positions', 'inv_state_demand']
  FROM _inv_agg
  WHERE total_on_hand > 0 AND (daily_vel = 0 OR total_on_hand / NULLIF(daily_vel, 0) > 60);
  GET DIAGNOSTICS v_ev_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'lost_revenue_rows', v_lr_count,
    'cash_lock_rows', v_cl_count,
    'margin_leak_rows', v_ml_count,
    'size_health_rows', v_sz_count,
    'markdown_risk_rows', v_md_count,
    'evidence_packs', v_ev_count,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::int
  );
END;
$fn$;
