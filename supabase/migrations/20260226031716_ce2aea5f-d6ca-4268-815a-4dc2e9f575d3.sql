
-- Fix si_evidence_packs unique index to include evidence_type
DROP INDEX IF EXISTS idx_si_evidence_packs_unique;
CREATE UNIQUE INDEX idx_si_evidence_packs_unique ON public.si_evidence_packs (tenant_id, product_id, as_of_date, evidence_type);

-- Now recreate the function with correct ON CONFLICT clauses
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
  v_result jsonb := '{}'::jsonb;
  v_idi_count int := 0;
  v_scs_count int := 0;
  v_chi_count int := 0;
  v_size_count int := 0;
  v_md_count int := 0;
  v_ev_count int := 0;
  v_start timestamptz := clock_timestamp();
BEGIN

  -- 1) Lost Revenue
  DELETE FROM state_lost_revenue_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_lost_revenue_daily (tenant_id, product_id, as_of_date, lost_units_est, lost_revenue_est, driver)
  SELECT
    v_tid, sp.fc_id, p_as_of_date,
    GREATEST(0, COALESCE(d.velocity_30d, 0) * 14 - SUM(sp.on_hand)),
    GREATEST(0, COALESCE(d.velocity_30d, 0) * 14 - SUM(sp.on_hand)) * COALESCE(d.avg_price, 0),
    CASE WHEN SUM(sp.on_hand) = 0 THEN 'stockout'
         WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'no_demand'
         ELSE 'understock' END
  FROM inv_state_positions sp
  LEFT JOIN (
    SELECT tenant_id, fc_id, SUM(velocity_30d) as velocity_30d, AVG(avg_price) as avg_price
    FROM inv_state_demand WHERE tenant_id = v_tid GROUP BY tenant_id, fc_id
  ) d ON d.tenant_id = v_tid AND d.fc_id = sp.fc_id
  WHERE sp.tenant_id = v_tid AND sp.snapshot_date = p_as_of_date
  GROUP BY sp.fc_id, d.velocity_30d, d.avg_price
  HAVING COALESCE(d.velocity_30d, 0) * 14 > SUM(sp.on_hand);
  GET DIAGNOSTICS v_idi_count = ROW_COUNT;

  -- 2) Cash Lock
  DELETE FROM state_cash_lock_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_cash_lock_daily (tenant_id, product_id, as_of_date, inventory_value, cash_locked_value, locked_pct, expected_release_days, lock_driver)
  SELECT
    v_tid, sp.fc_id, p_as_of_date,
    SUM(sp.on_hand) * COALESCE(d.avg_price, 0),
    SUM(sp.on_hand) * COALESCE(d.avg_price, 0) * 0.6,
    0.6,
    CASE WHEN COALESCE(d.velocity_30d, 0) > 0
         THEN LEAST(180, (SUM(sp.on_hand) / d.velocity_30d))::int ELSE 180 END,
    CASE WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'dead_stock'
         WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 90 THEN 'severe_overstock'
         WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 45 THEN 'overstock'
         ELSE 'normal' END
  FROM inv_state_positions sp
  LEFT JOIN (
    SELECT tenant_id, fc_id, SUM(velocity_30d) as velocity_30d, AVG(avg_price) as avg_price
    FROM inv_state_demand WHERE tenant_id = v_tid GROUP BY tenant_id, fc_id
  ) d ON d.tenant_id = v_tid AND d.fc_id = sp.fc_id
  WHERE sp.tenant_id = v_tid AND sp.snapshot_date = p_as_of_date AND sp.on_hand > 0
  GROUP BY sp.fc_id, d.velocity_30d, d.avg_price;
  GET DIAGNOSTICS v_scs_count = ROW_COUNT;

  -- 3) Margin Leak
  DELETE FROM state_margin_leak_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_margin_leak_daily (tenant_id, product_id, as_of_date, margin_leak_value, leak_driver, leak_detail, cumulative_leak_30d)
  SELECT
    v_tid, sp.fc_id, p_as_of_date,
    GREATEST(0, SUM(sp.on_hand) - COALESCE(d.velocity_30d, 0) * 45) * COALESCE(d.avg_price, 0) * 0.3,
    CASE WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'dead_stock_holding'
         WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 90 THEN 'excess_holding_cost'
         ELSE 'opportunity_cost' END,
    jsonb_build_object('on_hand', SUM(sp.on_hand), 'velocity_30d', COALESCE(d.velocity_30d,0)),
    GREATEST(0, SUM(sp.on_hand) - COALESCE(d.velocity_30d, 0) * 45) * COALESCE(d.avg_price, 0) * 0.3
  FROM inv_state_positions sp
  LEFT JOIN (
    SELECT tenant_id, fc_id, SUM(velocity_30d) as velocity_30d, AVG(avg_price) as avg_price
    FROM inv_state_demand WHERE tenant_id = v_tid GROUP BY tenant_id, fc_id
  ) d ON d.tenant_id = v_tid AND d.fc_id = sp.fc_id
  WHERE sp.tenant_id = v_tid AND sp.snapshot_date = p_as_of_date AND sp.on_hand > 0
  GROUP BY sp.fc_id, d.velocity_30d, d.avg_price
  HAVING GREATEST(0, SUM(sp.on_hand) - COALESCE(d.velocity_30d, 0) * 45) > 0;
  GET DIAGNOSTICS v_chi_count = ROW_COUNT;

  -- 4) Size Health
  DELETE FROM state_size_health_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_size_health_daily (tenant_id, product_id, store_id, as_of_date, size_health_score, curve_state, deviation_score, core_size_missing, shallow_depth_count)
  SELECT
    v_tid, sp.fc_id, sp.store_id, p_as_of_date,
    LEAST(100, GREATEST(0, (COUNT(CASE WHEN sp.on_hand > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100)::int)),
    CASE WHEN COUNT(CASE WHEN sp.on_hand > 0 THEN 1 END) = COUNT(*) THEN 'full_curve'
         WHEN COUNT(CASE WHEN sp.on_hand > 0 THEN 1 END) = 0 THEN 'empty'
         WHEN COUNT(CASE WHEN sp.on_hand > 0 THEN 1 END)::numeric / COUNT(*) >= 0.7 THEN 'minor_break'
         ELSE 'major_break' END,
    LEAST(100, (COUNT(CASE WHEN sp.on_hand = 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100)::int),
    COUNT(CASE WHEN sp.on_hand = 0 THEN 1 END)::int,
    COUNT(CASE WHEN sp.on_hand BETWEEN 1 AND 2 THEN 1 END)::int
  FROM inv_state_positions sp
  WHERE sp.tenant_id = v_tid AND sp.snapshot_date = p_as_of_date
  GROUP BY sp.fc_id, sp.store_id;
  GET DIAGNOSTICS v_size_count = ROW_COUNT;

  -- 5) Markdown Risk
  DELETE FROM state_markdown_risk_daily WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO state_markdown_risk_daily (tenant_id, product_id, as_of_date, markdown_risk_score, markdown_eta_days, reason)
  SELECT
    v_tid, sp.fc_id, p_as_of_date,
    LEAST(100, GREATEST(0,
      CASE WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 90
           WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 90 THEN 75
           WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 60 THEN 50
           WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 30 THEN 25
           ELSE 10 END)),
    CASE WHEN COALESCE(d.velocity_30d, 0) > 0
         THEN GREATEST(0, (SUM(sp.on_hand) / d.velocity_30d - 60))::int ELSE 0 END,
    CASE WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'dead_stock'
         WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 90 THEN 'severe_overstock'
         WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 60 THEN 'aging_inventory'
         ELSE 'healthy' END
  FROM inv_state_positions sp
  LEFT JOIN (
    SELECT tenant_id, fc_id, SUM(velocity_30d) as velocity_30d
    FROM inv_state_demand WHERE tenant_id = v_tid GROUP BY tenant_id, fc_id
  ) d ON d.tenant_id = v_tid AND d.fc_id = sp.fc_id
  WHERE sp.tenant_id = v_tid AND sp.snapshot_date = p_as_of_date AND sp.on_hand > 0
  GROUP BY sp.fc_id, d.velocity_30d;
  GET DIAGNOSTICS v_md_count = ROW_COUNT;

  -- 6) Evidence Packs
  DELETE FROM si_evidence_packs WHERE tenant_id = v_tid AND as_of_date = p_as_of_date;
  INSERT INTO si_evidence_packs (tenant_id, product_id, as_of_date, evidence_type, severity, summary, data_snapshot, source_tables)
  SELECT
    v_tid, sp.fc_id, p_as_of_date, 'overstock_alert',
    CASE WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'critical'
         WHEN SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 90 THEN 'high'
         ELSE 'medium' END,
    'FC ' || sp.fc_id || ': ' || SUM(sp.on_hand) || ' units',
    jsonb_build_object('on_hand', SUM(sp.on_hand), 'velocity_30d', COALESCE(d.velocity_30d, 0),
      'overstock_units', GREATEST(0, SUM(sp.on_hand) - COALESCE(d.velocity_30d, 0) * 45)),
    ARRAY['inv_state_positions', 'inv_state_demand']
  FROM inv_state_positions sp
  LEFT JOIN (
    SELECT tenant_id, fc_id, SUM(velocity_30d) as velocity_30d
    FROM inv_state_demand WHERE tenant_id = v_tid GROUP BY tenant_id, fc_id
  ) d ON d.tenant_id = v_tid AND d.fc_id = sp.fc_id
  WHERE sp.tenant_id = v_tid AND sp.snapshot_date = p_as_of_date AND sp.on_hand > 0
  GROUP BY sp.fc_id, d.velocity_30d
  HAVING COALESCE(d.velocity_30d, 0) = 0 OR SUM(sp.on_hand) / NULLIF(d.velocity_30d, 0) > 60;
  GET DIAGNOSTICS v_ev_count = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'lost_revenue_rows', v_idi_count,
    'cash_lock_rows', v_scs_count,
    'margin_leak_rows', v_chi_count,
    'size_health_rows', v_size_count,
    'markdown_risk_rows', v_md_count,
    'evidence_packs', v_ev_count,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::int
  );
  RETURN v_result;
END;
$fn$;
