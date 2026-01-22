-- Clean version of cdp_run_insights that reads config from cdp_config table
-- Runs 8 stable insights (V02, V04, T01, M01, M03, M05, R02, Q04)

CREATE OR REPLACE FUNCTION cdp_run_insights(
  p_tenant_id uuid,
  p_as_of_date date,
  p_window_days int DEFAULT 60,
  p_baseline_days int DEFAULT 60
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_baseline_date date := (p_as_of_date - make_interval(days => p_baseline_days))::date;
  v_inserted int := 0;

  v_repeat_segment_id uuid;
  v_cooldown int;

  r record;
BEGIN
  -- Get repeat segment config
  SELECT (value->>'segment_id')::uuid
  INTO v_repeat_segment_id
  FROM cdp_config
  WHERE tenant_id = p_tenant_id
    AND key = 'repeat_segment';

  IF v_repeat_segment_id IS NULL THEN
    RAISE EXCEPTION 'Missing cdp_config repeat_segment for tenant %', p_tenant_id;
  END IF;

  INSERT INTO cdp_insight_runs (tenant_id, as_of_date, window_days, baseline_days, status)
  VALUES (p_tenant_id, p_as_of_date, p_window_days, p_baseline_days, 'SUCCESS')
  RETURNING id INTO v_run_id;

  -------------------------------------------------------------------
  -- V02: AOV Compression in Repeat Segment
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, median_aov
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id
        AND as_of_date = p_as_of_date
        AND window_days = p_window_days
        AND segment_id = v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, segment_version, median_aov
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id
        AND as_of_date = v_baseline_date
        AND window_days = p_window_days
        AND segment_id = v_repeat_segment_id
    )
    SELECT
      jsonb_build_object('segment_id',c.segment_id,'version',c.segment_version) AS pop_ref,
      c.n_customers,
      c.median_aov AS cur_val,
      b.median_aov AS base_val,
      (c.median_aov-b.median_aov)/NULLIF(b.median_aov,0) AS pct_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.median_aov-b.median_aov)/NULLIF(b.median_aov,0) <= -0.12
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code='V02'), 14)
      INTO v_cooldown;

    IF cdp_insert_insight_event(
      p_tenant_id, v_run_id, p_as_of_date,
      'V02','SEGMENT', r.pop_ref,
      jsonb_build_object('metric','median_aov','current',r.cur_val,'baseline',r.base_val,'pct_change',r.pct_change),
      jsonb_build_object('impact_type','revenue','monthly_loss_est',null,'confidence','medium'),
      'AOV compression detected in repeat customers',
      r.n_customers, v_cooldown
    ) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- V04: Net after refund decline (Repeat segment)
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, sum_net_revenue, sum_refund_amount
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, segment_version, sum_net_revenue, sum_refund_amount
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=v_baseline_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    )
    SELECT
      jsonb_build_object('segment_id',c.segment_id,'version',c.segment_version) AS pop_ref,
      c.n_customers,
      (c.sum_net_revenue - c.sum_refund_amount) AS cur_val,
      (b.sum_net_revenue - b.sum_refund_amount) AS base_val,
      ((c.sum_net_revenue - c.sum_refund_amount) - (b.sum_net_revenue - b.sum_refund_amount))
        / NULLIF((b.sum_net_revenue - b.sum_refund_amount),0) AS pct_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (((c.sum_net_revenue - c.sum_refund_amount) - (b.sum_net_revenue - b.sum_refund_amount))
        / NULLIF((b.sum_net_revenue - b.sum_refund_amount),0)) <= -0.15
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code='V04'), 14)
      INTO v_cooldown;

    IF cdp_insert_insight_event(
      p_tenant_id, v_run_id, p_as_of_date,
      'V04','SEGMENT', r.pop_ref,
      jsonb_build_object('metric','net_after_refund','current',r.cur_val,'baseline',r.base_val,'pct_change',r.pct_change),
      jsonb_build_object('impact_type','revenue','monthly_loss_est',GREATEST(0,(r.base_val-r.cur_val)),'confidence','medium'),
      'Net revenue after refunds is declining',
      r.n_customers, v_cooldown
    ) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- T01: Inter-purchase time expansion
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, median_inter_purchase_days
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, segment_version, median_inter_purchase_days
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=v_baseline_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    )
    SELECT
      jsonb_build_object('segment_id',c.segment_id,'version',c.segment_version) AS pop_ref,
      c.n_customers,
      c.median_inter_purchase_days AS cur_val,
      b.median_inter_purchase_days AS base_val,
      (c.median_inter_purchase_days-b.median_inter_purchase_days)/NULLIF(b.median_inter_purchase_days,0) AS pct_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.median_inter_purchase_days-b.median_inter_purchase_days)/NULLIF(b.median_inter_purchase_days,0) >= 0.20
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code='T01'), 14)
      INTO v_cooldown;

    IF cdp_insert_insight_event(
      p_tenant_id, v_run_id, p_as_of_date,
      'T01','SEGMENT', r.pop_ref,
      jsonb_build_object('metric','median_inter_purchase_days','current',r.cur_val,'baseline',r.base_val,'pct_change',r.pct_change),
      jsonb_build_object('impact_type','cashflow','monthly_loss_est',null,'confidence','medium'),
      'Customers are purchasing more slowly',
      r.n_customers, v_cooldown
    ) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- M01: Discount dependency increase
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, discounted_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, segment_version, discounted_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=v_baseline_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    )
    SELECT
      jsonb_build_object('segment_id',c.segment_id,'version',c.segment_version) AS pop_ref,
      c.n_customers,
      c.discounted_order_share AS cur_val,
      b.discounted_order_share AS base_val,
      (c.discounted_order_share - b.discounted_order_share) AS pt_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.discounted_order_share - b.discounted_order_share) >= 0.15
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code='M01'), 14)
      INTO v_cooldown;

    IF cdp_insert_insight_event(
      p_tenant_id, v_run_id, p_as_of_date,
      'M01','SEGMENT', r.pop_ref,
      jsonb_build_object('metric','discounted_order_share','current',r.cur_val,'baseline',r.base_val,'pt_change',r.pt_change),
      jsonb_build_object('impact_type','margin','monthly_loss_est',null,'confidence','medium'),
      'Discount dependency is increasing',
      r.n_customers, v_cooldown
    ) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- M03: Bundle share declining
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, bundle_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, segment_version, bundle_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=v_baseline_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    )
    SELECT
      jsonb_build_object('segment_id',c.segment_id,'version',c.segment_version) AS pop_ref,
      c.n_customers,
      c.bundle_order_share AS cur_val,
      b.bundle_order_share AS base_val,
      (c.bundle_order_share - b.bundle_order_share) AS pt_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.bundle_order_share - b.bundle_order_share) <= -0.20
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code='M03'), 14)
      INTO v_cooldown;

    IF cdp_insert_insight_event(
      p_tenant_id, v_run_id, p_as_of_date,
      'M03','SEGMENT', r.pop_ref,
      jsonb_build_object('metric','bundle_order_share','current',r.cur_val,'baseline',r.base_val,'pt_change',r.pt_change),
      jsonb_build_object('impact_type','revenue','monthly_loss_est',null,'confidence','medium'),
      'Bundle purchasing is declining (shift to single-item)',
      r.n_customers, v_cooldown
    ) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- M05: COD share rising
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, cod_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, segment_version, cod_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=v_baseline_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    )
    SELECT
      jsonb_build_object('segment_id',c.segment_id,'version',c.segment_version) AS pop_ref,
      c.n_customers,
      c.cod_order_share AS cur_val,
      b.cod_order_share AS base_val,
      (c.cod_order_share - b.cod_order_share) AS pt_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.cod_order_share - b.cod_order_share) >= 0.10
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code='M05'), 14)
      INTO v_cooldown;

    IF cdp_insert_insight_event(
      p_tenant_id, v_run_id, p_as_of_date,
      'M05','SEGMENT', r.pop_ref,
      jsonb_build_object('metric','cod_order_share','current',r.cur_val,'baseline',r.base_val,'pt_change',r.pt_change),
      jsonb_build_object('impact_type','risk','monthly_loss_est',null,'confidence','medium'),
      'COD share is rising, increasing cash and return risk',
      r.n_customers, v_cooldown
    ) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- R02: Refund rate escalation
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, refund_rate
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, segment_version, refund_rate
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id=p_tenant_id AND as_of_date=v_baseline_date
        AND window_days=p_window_days AND segment_id=v_repeat_segment_id
    )
    SELECT
      jsonb_build_object('segment_id',c.segment_id,'version',c.segment_version) AS pop_ref,
      c.n_customers,
      c.refund_rate AS cur_val,
      b.refund_rate AS base_val,
      (c.refund_rate - b.refund_rate) AS pt_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.refund_rate - b.refund_rate) >= 0.05
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code='R02'), 14)
      INTO v_cooldown;

    IF cdp_insert_insight_event(
      p_tenant_id, v_run_id, p_as_of_date,
      'R02','SEGMENT', r.pop_ref,
      jsonb_build_object('metric','refund_rate','current',r.cur_val,'baseline',r.base_val,'pt_change',r.pt_change),
      jsonb_build_object('impact_type','margin','monthly_loss_est',null,'confidence','medium'),
      'Return/refund rate is escalating',
      r.n_customers, v_cooldown
    ) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- Q04: Identity coverage weakening (DQ)
  FOR r IN
    WITH cur AS (
      SELECT identity_coverage
      FROM mv_cdp_data_quality_daily
      WHERE tenant_id=p_tenant_id AND as_of_date=p_as_of_date
    ),
    base AS (
      SELECT identity_coverage
      FROM mv_cdp_data_quality_daily
      WHERE tenant_id=p_tenant_id AND as_of_date=v_baseline_date
    )
    SELECT
      c.identity_coverage AS cur_val,
      b.identity_coverage AS base_val,
      (c.identity_coverage - b.identity_coverage) AS pt_change
    FROM cur c CROSS JOIN base b
    WHERE (c.identity_coverage - b.identity_coverage) <= -0.05
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code='Q04'), 7)
      INTO v_cooldown;

    IF cdp_insert_insight_event(
      p_tenant_id, v_run_id, p_as_of_date,
      'Q04','ALL', jsonb_build_object('dq_metric','identity_coverage'),
      jsonb_build_object('metric','identity_coverage','current',r.cur_val,'baseline',r.base_val,'pt_change',r.pt_change),
      jsonb_build_object('impact_type','data_risk','monthly_loss_est',null,'confidence','high'),
      'Identity coverage is weakening, reducing decision reliability',
      null, v_cooldown
    ) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  UPDATE cdp_insight_runs
  SET stats = jsonb_build_object('inserted_events', v_inserted)
  WHERE id = v_run_id;

  RETURN v_run_id;

EXCEPTION WHEN OTHERS THEN
  UPDATE cdp_insight_runs
  SET status='FAILED', stats=jsonb_build_object('error', SQLERRM)
  WHERE id = v_run_id;
  RAISE;
END;
$$;