
-- =====================================================
-- CDP Insight Detection + Decision Cards Pipeline
-- =====================================================

-- 1) Add severity/priority columns to registry
ALTER TABLE cdp_insight_registry
  ADD COLUMN IF NOT EXISTS default_severity text NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS default_priority text NOT NULL DEFAULT 'P1',
  ADD COLUMN IF NOT EXISTS owner_role text NOT NULL DEFAULT 'CFO';

-- Set high priority insights
UPDATE cdp_insight_registry
SET default_severity = 'HIGH', default_priority = 'P0', owner_role = 'CFO'
WHERE insight_code IN ('V01','V02','V04','T01','M01','R02','Q01','Q02','Q04');

UPDATE cdp_insight_registry
SET default_severity = 'CRITICAL', default_priority = 'P0', owner_role = 'CEO'
WHERE insight_code IN ('V01','R02');

-- 2) Create config table for tenant-specific settings
CREATE TABLE IF NOT EXISTS cdp_config (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);

ALTER TABLE cdp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for cdp_config"
ON cdp_config FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
));

-- 3) Update cdp_insight_runs with missing columns
ALTER TABLE cdp_insight_runs
  ADD COLUMN IF NOT EXISTS window_days int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS baseline_days int NOT NULL DEFAULT 60;

-- 4) Add missing columns to cdp_decision_cards if needed
ALTER TABLE cdp_decision_cards
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_ref jsonb,
  ADD COLUMN IF NOT EXISTS population_ref jsonb,
  ADD COLUMN IF NOT EXISTS window_days int,
  ADD COLUMN IF NOT EXISTS baseline_days int,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS owner_role text,
  ADD COLUMN IF NOT EXISTS review_by date,
  ADD COLUMN IF NOT EXISTS decision_due date;

-- 5) Helper function: insert insight with cooldown check
CREATE OR REPLACE FUNCTION cdp_insert_insight_event(
  p_tenant_id uuid,
  p_run_id uuid,
  p_as_of_date date,
  p_insight_code text,
  p_population_type text,
  p_population_ref jsonb,
  p_metric_snapshot jsonb,
  p_impact_snapshot jsonb,
  p_headline text,
  p_n_customers integer,
  p_cooldown_days integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM cdp_insight_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.insight_code = p_insight_code
      AND e.population_ref = p_population_ref
      AND e.as_of_date >= (p_as_of_date - make_interval(days => p_cooldown_days))::date
  ) INTO v_exists;

  IF v_exists THEN
    RETURN false;
  END IF;

  INSERT INTO cdp_insight_events (
    id, tenant_id, insight_code, run_id, as_of_date,
    population_type, population_ref,
    metric_snapshot, impact_snapshot,
    headline, n_customers, cooldown_until, created_at
  ) VALUES (
    gen_random_uuid(), p_tenant_id, p_insight_code, p_run_id, p_as_of_date,
    p_population_type, p_population_ref,
    p_metric_snapshot, p_impact_snapshot,
    p_headline, p_n_customers, (p_as_of_date + p_cooldown_days)::date, now()
  );

  RETURN true;
END;
$$;

-- 6) Main insight detection function (v1 subset - 8 insights)
CREATE OR REPLACE FUNCTION cdp_run_insights(
  p_tenant_id uuid,
  p_as_of_date date,
  p_window_days int DEFAULT 60,
  p_baseline_days int DEFAULT 60
)
RETURNS uuid
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
  -- Create run record
  INSERT INTO cdp_insight_runs (tenant_id, as_of_date, window_days, baseline_days, status)
  VALUES (p_tenant_id, p_as_of_date, p_window_days, p_baseline_days, 'RUNNING')
  RETURNING id INTO v_run_id;

  -- Get repeat segment ID from config (or use first segment as fallback)
  SELECT (value->>'segment_id')::uuid INTO v_repeat_segment_id
  FROM cdp_config WHERE tenant_id = p_tenant_id AND key = 'repeat_segment';
  
  IF v_repeat_segment_id IS NULL THEN
    SELECT segment_id INTO v_repeat_segment_id
    FROM cdp_segments WHERE tenant_id = p_tenant_id LIMIT 1;
  END IF;

  -- Skip if no segment configured
  IF v_repeat_segment_id IS NULL THEN
    UPDATE cdp_insight_runs SET status = 'SKIPPED', 
      stats = jsonb_build_object('reason', 'no_segment_configured')
    WHERE id = v_run_id;
    RETURN v_run_id;
  END IF;

  -------------------------------------------------------------------
  -- V02: AOV Compression
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, median_aov
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, median_aov
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = v_baseline_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    )
    SELECT c.tenant_id, 'V02'::text AS insight_code,
      jsonb_build_object('segment_id', c.segment_id, 'version', c.segment_version) AS pop_ref,
      c.n_customers, c.median_aov AS cur_val, b.median_aov AS base_val,
      (c.median_aov - b.median_aov) / NULLIF(b.median_aov, 0) AS pct_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.median_aov - b.median_aov) / NULLIF(b.median_aov, 0) <= -0.12
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code = 'V02'), 14) INTO v_cooldown;
    IF cdp_insert_insight_event(p_tenant_id, v_run_id, p_as_of_date, 'V02', 'SEGMENT', r.pop_ref,
      jsonb_build_object('metric', 'median_aov', 'current', r.cur_val, 'baseline', r.base_val, 'pct_change', r.pct_change),
      jsonb_build_object('impact_type', 'revenue', 'confidence', 'medium'),
      'AOV compression detected in repeat customers', r.n_customers, v_cooldown) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- V04: Net revenue after refunds decline
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, sum_net_revenue, sum_refund_amount
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, sum_net_revenue, sum_refund_amount
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = v_baseline_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    )
    SELECT c.tenant_id, 'V04'::text AS insight_code,
      jsonb_build_object('segment_id', c.segment_id) AS pop_ref, c.n_customers,
      (c.sum_net_revenue - c.sum_refund_amount) AS cur_val,
      (b.sum_net_revenue - b.sum_refund_amount) AS base_val,
      ((c.sum_net_revenue - c.sum_refund_amount) - (b.sum_net_revenue - b.sum_refund_amount))
        / NULLIF((b.sum_net_revenue - b.sum_refund_amount), 0) AS pct_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE ((c.sum_net_revenue - c.sum_refund_amount) - (b.sum_net_revenue - b.sum_refund_amount))
        / NULLIF((b.sum_net_revenue - b.sum_refund_amount), 0) <= -0.15
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code = 'V04'), 14) INTO v_cooldown;
    IF cdp_insert_insight_event(p_tenant_id, v_run_id, p_as_of_date, 'V04', 'SEGMENT', r.pop_ref,
      jsonb_build_object('metric', 'net_after_refund', 'current', r.cur_val, 'baseline', r.base_val, 'pct_change', r.pct_change),
      jsonb_build_object('impact_type', 'revenue', 'monthly_loss_est', GREATEST(0, (r.base_val - r.cur_val))),
      'Net revenue after refunds is declining', r.n_customers, v_cooldown) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- T01: Inter-purchase time expansion
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, segment_version, n_customers, median_inter_purchase_days
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, median_inter_purchase_days
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = v_baseline_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    )
    SELECT c.tenant_id, 'T01'::text AS insight_code,
      jsonb_build_object('segment_id', c.segment_id) AS pop_ref, c.n_customers,
      c.median_inter_purchase_days AS cur_val, b.median_inter_purchase_days AS base_val,
      (c.median_inter_purchase_days - b.median_inter_purchase_days) / NULLIF(b.median_inter_purchase_days, 0) AS pct_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.median_inter_purchase_days - b.median_inter_purchase_days) / NULLIF(b.median_inter_purchase_days, 0) >= 0.20
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code = 'T01'), 14) INTO v_cooldown;
    IF cdp_insert_insight_event(p_tenant_id, v_run_id, p_as_of_date, 'T01', 'SEGMENT', r.pop_ref,
      jsonb_build_object('metric', 'median_inter_purchase_days', 'current', r.cur_val, 'baseline', r.base_val, 'pct_change', r.pct_change),
      jsonb_build_object('impact_type', 'cashflow', 'confidence', 'medium'),
      'Customers are purchasing more slowly', r.n_customers, v_cooldown) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- M01: Discount dependency increase
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, n_customers, discounted_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, discounted_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = v_baseline_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    )
    SELECT c.tenant_id, 'M01'::text AS insight_code,
      jsonb_build_object('segment_id', c.segment_id) AS pop_ref, c.n_customers,
      c.discounted_order_share AS cur_val, b.discounted_order_share AS base_val,
      (c.discounted_order_share - b.discounted_order_share) AS pt_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.discounted_order_share - b.discounted_order_share) >= 0.15
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code = 'M01'), 14) INTO v_cooldown;
    IF cdp_insert_insight_event(p_tenant_id, v_run_id, p_as_of_date, 'M01', 'SEGMENT', r.pop_ref,
      jsonb_build_object('metric', 'discounted_order_share', 'current', r.cur_val, 'baseline', r.base_val, 'pt_change', r.pt_change),
      jsonb_build_object('impact_type', 'margin', 'confidence', 'medium'),
      'Discount dependency is increasing', r.n_customers, v_cooldown) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- M05: COD share rising
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, n_customers, cod_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, cod_order_share
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = v_baseline_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    )
    SELECT c.tenant_id, 'M05'::text AS insight_code,
      jsonb_build_object('segment_id', c.segment_id) AS pop_ref, c.n_customers,
      c.cod_order_share AS cur_val, b.cod_order_share AS base_val,
      (c.cod_order_share - b.cod_order_share) AS pt_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.cod_order_share - b.cod_order_share) >= 0.10
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code = 'M05'), 14) INTO v_cooldown;
    IF cdp_insert_insight_event(p_tenant_id, v_run_id, p_as_of_date, 'M05', 'SEGMENT', r.pop_ref,
      jsonb_build_object('metric', 'cod_order_share', 'current', r.cur_val, 'baseline', r.base_val, 'pt_change', r.pt_change),
      jsonb_build_object('impact_type', 'risk', 'confidence', 'medium'),
      'COD share is rising, increasing cash and return risk', r.n_customers, v_cooldown) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- R02: Refund rate escalation
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, segment_id, n_customers, refund_rate
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    ),
    base AS (
      SELECT tenant_id, segment_id, refund_rate
      FROM mv_cdp_segment_metrics_rolling
      WHERE tenant_id = p_tenant_id AND as_of_date = v_baseline_date
        AND window_days = p_window_days AND segment_id = v_repeat_segment_id
    )
    SELECT c.tenant_id, 'R02'::text AS insight_code,
      jsonb_build_object('segment_id', c.segment_id) AS pop_ref, c.n_customers,
      c.refund_rate AS cur_val, b.refund_rate AS base_val,
      (c.refund_rate - b.refund_rate) AS pt_change
    FROM cur c JOIN base b USING (tenant_id, segment_id)
    WHERE (c.refund_rate - b.refund_rate) >= 0.05
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code = 'R02'), 14) INTO v_cooldown;
    IF cdp_insert_insight_event(p_tenant_id, v_run_id, p_as_of_date, 'R02', 'SEGMENT', r.pop_ref,
      jsonb_build_object('metric', 'refund_rate', 'current', r.cur_val, 'baseline', r.base_val, 'pt_change', r.pt_change),
      jsonb_build_object('impact_type', 'margin', 'confidence', 'high'),
      'Return/refund rate is escalating', r.n_customers, v_cooldown) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- Q04: Identity coverage weakening
  FOR r IN
    WITH cur AS (
      SELECT tenant_id, identity_coverage FROM mv_cdp_data_quality_daily
      WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date
    ),
    base AS (
      SELECT tenant_id, identity_coverage FROM mv_cdp_data_quality_daily
      WHERE tenant_id = p_tenant_id AND as_of_date = v_baseline_date
    )
    SELECT p_tenant_id AS tenant_id, 'Q04'::text AS insight_code,
      jsonb_build_object('dq_metric', 'identity_coverage') AS pop_ref,
      c.identity_coverage AS cur_val, b.identity_coverage AS base_val,
      (c.identity_coverage - b.identity_coverage) AS pt_change
    FROM cur c CROSS JOIN base b
    WHERE (c.identity_coverage - b.identity_coverage) <= -0.05
  LOOP
    SELECT COALESCE((SELECT cooldown_days FROM cdp_insight_registry WHERE insight_code = 'Q04'), 7) INTO v_cooldown;
    IF cdp_insert_insight_event(p_tenant_id, v_run_id, p_as_of_date, 'Q04', 'ALL', r.pop_ref,
      jsonb_build_object('metric', 'identity_coverage', 'current', r.cur_val, 'baseline', r.base_val, 'pt_change', r.pt_change),
      jsonb_build_object('impact_type', 'data_risk', 'confidence', 'high'),
      'Identity coverage is weakening, reducing decision reliability', NULL, v_cooldown) THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -- Update run stats
  UPDATE cdp_insight_runs SET status = 'SUCCESS',
    stats = jsonb_build_object('inserted_events', v_inserted)
  WHERE id = v_run_id;

  RETURN v_run_id;

EXCEPTION WHEN OTHERS THEN
  UPDATE cdp_insight_runs SET status = 'FAILED',
    stats = jsonb_build_object('error', SQLERRM)
  WHERE id = v_run_id;
  RAISE;
END;
$$;

-- 7) Create decision cards from insights
CREATE OR REPLACE FUNCTION cdp_create_decision_cards_from_insights(
  p_tenant_id uuid,
  p_as_of_date date,
  p_window_days int DEFAULT 60,
  p_baseline_days int DEFAULT 60
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT e.id AS insight_event_id, e.insight_code, e.population_ref,
      e.headline, e.metric_snapshot, e.impact_snapshot,
      reg.category, reg.default_severity, reg.default_priority, reg.owner_role
    FROM cdp_insight_events e
    JOIN cdp_insight_registry reg ON reg.insight_code = e.insight_code
    WHERE e.tenant_id = p_tenant_id AND e.as_of_date = p_as_of_date
      AND reg.default_severity IN ('HIGH', 'CRITICAL')
  LOOP
    -- Dedupe by source_ref
    IF EXISTS (
      SELECT 1 FROM cdp_decision_cards c
      WHERE c.tenant_id = p_tenant_id AND c.source_type = 'INSIGHT_EVENT'
        AND c.source_ref = jsonb_build_object('insight_event_id', r.insight_event_id)
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO cdp_decision_cards (
      tenant_id, source_type, source_ref, title, summary, category,
      population_ref, window_days, baseline_days,
      status, severity, priority, owner_role, review_by, decision_due
    ) VALUES (
      p_tenant_id, 'INSIGHT_EVENT',
      jsonb_build_object('insight_event_id', r.insight_event_id),
      r.headline,
      COALESCE((r.metric_snapshot->>'metric')::text, 'metric') || ' shifted vs baseline; review recommended.',
      r.category, r.population_ref, p_window_days, p_baseline_days,
      'NEW', r.default_severity, r.default_priority, r.owner_role,
      (p_as_of_date + 3), (p_as_of_date + 7)
    );

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END;
$$;

-- 8) Update orchestrator to include insights + cards
CREATE OR REPLACE FUNCTION cdp_run_daily(p_tenant_id uuid, p_as_of_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_cards int;
BEGIN
  -- Build metrics
  PERFORM cdp_build_customer_metrics_daily(p_tenant_id, p_as_of_date);
  PERFORM cdp_build_customer_metrics_rolling(p_tenant_id, p_as_of_date);
  PERFORM cdp_build_value_tiers(p_tenant_id, p_as_of_date);

  -- Refresh MVs
  PERFORM cdp_refresh_mvs();

  -- Run insights
  v_run_id := cdp_run_insights(p_tenant_id, p_as_of_date, 60, 60);

  -- Create decision cards
  v_cards := cdp_create_decision_cards_from_insights(p_tenant_id, p_as_of_date, 60, 60);
END;
$$;
