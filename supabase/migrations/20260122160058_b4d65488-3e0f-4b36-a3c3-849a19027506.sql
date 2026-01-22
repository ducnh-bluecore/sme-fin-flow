
-- =====================================================
-- CDP Tier Membership + Cooldown + Pipeline Upgrade
-- =====================================================

-- 1) Create tier membership table
CREATE TABLE IF NOT EXISTS cdp_value_tier_membership_daily (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  tier_label text NOT NULL,
  customer_id uuid NOT NULL REFERENCES cdp_customers(id) ON DELETE CASCADE,
  is_member boolean NOT NULL DEFAULT true,
  metric_name text NOT NULL DEFAULT 'net_revenue_365',
  metric_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, as_of_date, tier_label, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_tier_mem_tenant_date
ON cdp_value_tier_membership_daily (tenant_id, as_of_date);

CREATE INDEX IF NOT EXISTS idx_tier_mem_tenant_customer
ON cdp_value_tier_membership_daily (tenant_id, customer_id, as_of_date);

-- Enable RLS
ALTER TABLE cdp_value_tier_membership_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for tier membership"
ON cdp_value_tier_membership_daily
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
));

-- 2) Cooldown indexes for cdp_insight_events
CREATE INDEX IF NOT EXISTS idx_insight_events_lookup
ON cdp_insight_events (tenant_id, insight_code, as_of_date);

CREATE INDEX IF NOT EXISTS idx_insight_events_popref_gin
ON cdp_insight_events USING gin (population_ref);

-- 3) Function to build tier membership for a day
CREATE OR REPLACE FUNCTION cdp_build_tier_membership(
  p_tenant_id uuid,
  p_as_of_date date
)
RETURNS int
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Delete existing for this day (tiers can change)
  DELETE FROM cdp_value_tier_membership_daily
  WHERE tenant_id = p_tenant_id
    AND as_of_date = p_as_of_date;

  -- Insert new tier assignments based on 365-day net revenue
  WITH src AS (
    SELECT
      tenant_id,
      p_as_of_date AS as_of_date,
      customer_id,
      net_revenue::numeric AS metric_value
    FROM cdp_customer_metrics_rolling
    WHERE tenant_id = p_tenant_id
      AND as_of_date = p_as_of_date
      AND window_days = 365
      AND net_revenue > 0
  ),
  ranked AS (
    SELECT
      tenant_id,
      as_of_date,
      customer_id,
      metric_value,
      percent_rank() OVER (
        PARTITION BY tenant_id, as_of_date 
        ORDER BY metric_value DESC
      ) AS pr
    FROM src
  ),
  assigned AS (
    SELECT
      tenant_id,
      as_of_date,
      customer_id,
      metric_value,
      CASE
        WHEN pr <= 0.10 THEN 'TOP10'
        WHEN pr <= 0.20 THEN 'TOP20'
        WHEN pr <= 0.30 THEN 'TOP30'
        ELSE 'REST'
      END AS tier_label
    FROM ranked
  ),
  inserted AS (
    INSERT INTO cdp_value_tier_membership_daily (
      tenant_id, as_of_date, tier_label, customer_id, 
      is_member, metric_name, metric_value
    )
    SELECT
      tenant_id, as_of_date, tier_label, customer_id,
      true, 'net_revenue_365', metric_value
    FROM assigned
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

-- 4) Create insight runs table for tracking detection batches
CREATE TABLE IF NOT EXISTS cdp_insight_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  insights_triggered int DEFAULT 0,
  insights_skipped_cooldown int DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error_message text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_insight_runs_tenant_date
ON cdp_insight_runs (tenant_id, as_of_date DESC);

ALTER TABLE cdp_insight_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for insight runs"
ON cdp_insight_runs
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
));

-- 5) Update master pipeline function
CREATE OR REPLACE FUNCTION cdp_run_daily_build(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE - 1
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_daily_count int;
  v_rolling_count int;
  v_tier_count int;
  v_start_ts timestamptz;
  v_step_ts timestamptz;
  v_timings jsonb;
BEGIN
  v_start_ts := clock_timestamp();
  v_timings := '{}'::jsonb;

  -- Step 1: Build daily metrics
  v_daily_count := cdp_build_customer_metrics_daily(p_tenant_id, p_as_of_date);
  v_timings := v_timings || jsonb_build_object(
    'daily_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_ts)) * 1000
  );
  v_step_ts := clock_timestamp();

  -- Step 2: Build rolling metrics (30/60/90/365)
  v_rolling_count := cdp_build_customer_metrics_rolling(p_tenant_id, p_as_of_date);
  v_timings := v_timings || jsonb_build_object(
    'rolling_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_step_ts)) * 1000
  );
  v_step_ts := clock_timestamp();

  -- Step 3: Build tier membership
  v_tier_count := cdp_build_tier_membership(p_tenant_id, p_as_of_date);
  v_timings := v_timings || jsonb_build_object(
    'tier_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_step_ts)) * 1000
  );
  v_step_ts := clock_timestamp();

  -- Step 4: Refresh MVs concurrently
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_segment_metrics_rolling;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_cohort_metrics_rolling;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_value_tier_metrics_rolling;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_data_quality_daily;
  EXCEPTION WHEN OTHERS THEN
    -- Log but continue if MV refresh fails
    RAISE WARNING 'MV refresh failed: %', SQLERRM;
  END;
  
  v_timings := v_timings || jsonb_build_object(
    'mv_refresh_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_step_ts)) * 1000
  );

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'as_of_date', p_as_of_date,
    'daily_customers', v_daily_count,
    'rolling_customers', v_rolling_count,
    'tier_assignments', v_tier_count,
    'timings', v_timings,
    'total_duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_ts)) * 1000,
    'completed_at', clock_timestamp()
  );
END;
$$;

-- 6) Helper function to check cooldown before inserting insight
CREATE OR REPLACE FUNCTION cdp_check_insight_cooldown(
  p_tenant_id uuid,
  p_insight_code text,
  p_population_ref jsonb,
  p_as_of_date date,
  p_cooldown_days int DEFAULT 7
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM cdp_insight_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.insight_code = p_insight_code
      AND e.population_ref = p_population_ref
      AND e.as_of_date >= (p_as_of_date - p_cooldown_days)
  );
$$;
