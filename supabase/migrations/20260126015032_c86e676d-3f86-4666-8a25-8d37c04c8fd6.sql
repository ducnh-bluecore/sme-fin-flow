-- ============================================================
-- PHASE 2: ORCHESTRATION & SCHEDULING SPEC
-- Track job executions, idempotency, and retention policies
-- ============================================================

-- 2.1 Compute Job Runs - Track every computation execution
CREATE TABLE public.compute_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- JOB IDENTITY
  job_name TEXT NOT NULL,
  job_trigger TEXT NOT NULL CHECK (job_trigger IN ('scheduled', 'jit', 'manual', 'event', 'backfill')),
  
  -- EXECUTION TIMING
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 
    ELSE NULL END
  ) STORED,
  
  -- STATUS
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'skipped', 'cancelled')),
  
  -- OUTPUT TRACKING
  output_snapshot_id UUID,
  output_table TEXT,
  rows_affected INTEGER,
  rows_inserted INTEGER,
  rows_updated INTEGER,
  
  -- VERSIONING
  function_version TEXT DEFAULT 'v1.0.0',
  
  -- ERROR HANDLING
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- IDEMPOTENCY KEY
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT DEFAULT 'daily' CHECK (snapshot_type IN ('daily', 'hourly', 'weekly', 'monthly', 'decision', 'jit')),
  
  -- METADATA
  input_params JSONB DEFAULT '{}',
  output_summary JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate runs for same job/date/type
  CONSTRAINT unique_daily_job UNIQUE (tenant_id, job_name, snapshot_date, snapshot_type)
);

-- Indexes
CREATE INDEX idx_job_runs_tenant ON public.compute_job_runs(tenant_id);
CREATE INDEX idx_job_runs_name ON public.compute_job_runs(job_name);
CREATE INDEX idx_job_runs_status ON public.compute_job_runs(status);
CREATE INDEX idx_job_runs_date ON public.compute_job_runs(snapshot_date);
CREATE INDEX idx_job_runs_started ON public.compute_job_runs(started_at DESC);

-- RLS
ALTER TABLE public.compute_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job runs for their tenant"
  ON public.compute_job_runs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 2.2 Compute Retention Policy - Define how long to keep snapshots
CREATE TABLE public.compute_retention_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL DEFAULT 90,
  snapshot_type TEXT NOT NULL DEFAULT 'daily',
  auto_cleanup BOOLEAN DEFAULT TRUE,
  cleanup_schedule TEXT DEFAULT '0 3 * * *', -- 3 AM daily
  last_cleanup_at TIMESTAMPTZ,
  rows_deleted_last INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default retention policies
INSERT INTO public.compute_retention_policy (table_name, retention_days, snapshot_type) VALUES
  ('central_metrics_snapshots', 365, 'daily'),
  ('cdp_customer_equity_computed', 90, 'daily'),
  ('cdp_customer_metrics_daily', 30, 'daily'),
  ('cdp_customer_metrics_rolling', 90, 'rolling'),
  ('compute_job_runs', 180, 'execution'),
  ('decision_evidence_packs', 730, 'audit')
ON CONFLICT (table_name) DO NOTHING;

-- 2.3 Function to start a job run (returns job_id for tracking)
CREATE OR REPLACE FUNCTION public.start_compute_job(
  p_tenant_id UUID,
  p_job_name TEXT,
  p_trigger TEXT DEFAULT 'scheduled',
  p_snapshot_date DATE DEFAULT CURRENT_DATE,
  p_snapshot_type TEXT DEFAULT 'daily',
  p_function_version TEXT DEFAULT 'v1.0.0',
  p_input_params JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check for existing successful run (idempotency)
  SELECT id INTO v_existing_id
  FROM compute_job_runs
  WHERE tenant_id = p_tenant_id
    AND job_name = p_job_name
    AND snapshot_date = p_snapshot_date
    AND snapshot_type = p_snapshot_type
    AND status = 'success';
  
  IF v_existing_id IS NOT NULL THEN
    -- Already ran successfully, skip
    RETURN NULL;
  END IF;
  
  -- Mark any previous failed/running runs as cancelled
  UPDATE compute_job_runs
  SET status = 'cancelled', completed_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND job_name = p_job_name
    AND snapshot_date = p_snapshot_date
    AND snapshot_type = p_snapshot_type
    AND status IN ('running', 'failed');
  
  -- Create new job run
  INSERT INTO compute_job_runs (
    tenant_id,
    job_name,
    job_trigger,
    snapshot_date,
    snapshot_type,
    function_version,
    input_params,
    status
  ) VALUES (
    p_tenant_id,
    p_job_name,
    p_trigger,
    p_snapshot_date,
    p_snapshot_type,
    p_function_version,
    p_input_params,
    'running'
  )
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;

-- 2.4 Function to complete a job run
CREATE OR REPLACE FUNCTION public.complete_compute_job(
  p_job_id UUID,
  p_status TEXT DEFAULT 'success',
  p_output_snapshot_id UUID DEFAULT NULL,
  p_output_table TEXT DEFAULT NULL,
  p_rows_affected INTEGER DEFAULT 0,
  p_rows_inserted INTEGER DEFAULT 0,
  p_rows_updated INTEGER DEFAULT 0,
  p_output_summary JSONB DEFAULT '{}',
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE compute_job_runs
  SET 
    status = p_status,
    completed_at = NOW(),
    output_snapshot_id = p_output_snapshot_id,
    output_table = p_output_table,
    rows_affected = p_rows_affected,
    rows_inserted = p_rows_inserted,
    rows_updated = p_rows_updated,
    output_summary = p_output_summary,
    error_message = p_error_message,
    error_code = p_error_code,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$;

-- 2.5 View for job monitoring dashboard
CREATE OR REPLACE VIEW public.v_compute_job_health AS
SELECT 
  tenant_id,
  job_name,
  COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') as runs_24h,
  COUNT(*) FILTER (WHERE status = 'success' AND started_at > NOW() - INTERVAL '24 hours') as success_24h,
  COUNT(*) FILTER (WHERE status = 'failed' AND started_at > NOW() - INTERVAL '24 hours') as failed_24h,
  AVG(duration_ms) FILTER (WHERE status = 'success' AND started_at > NOW() - INTERVAL '7 days') as avg_duration_ms_7d,
  MAX(completed_at) FILTER (WHERE status = 'success') as last_success_at,
  MAX(completed_at) FILTER (WHERE status = 'failed') as last_failure_at,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'failed' AND started_at > NOW() - INTERVAL '24 hours') > 2 THEN 'CRITICAL'
    WHEN COUNT(*) FILTER (WHERE status = 'failed' AND started_at > NOW() - INTERVAL '24 hours') > 0 THEN 'WARNING'
    WHEN MAX(completed_at) FILTER (WHERE status = 'success') < NOW() - INTERVAL '48 hours' THEN 'STALE'
    ELSE 'HEALTHY'
  END as health_status
FROM public.compute_job_runs
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY tenant_id, job_name;

-- 2.6 Function to cleanup old snapshots based on retention policy
CREATE OR REPLACE FUNCTION public.run_retention_cleanup()
RETURNS TABLE (
  table_name TEXT,
  rows_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy RECORD;
  v_deleted INTEGER;
  v_sql TEXT;
BEGIN
  FOR v_policy IN 
    SELECT p.table_name, p.retention_days 
    FROM compute_retention_policy p 
    WHERE p.auto_cleanup = TRUE
  LOOP
    -- Dynamic SQL to delete old rows
    v_sql := format(
      'DELETE FROM public.%I WHERE created_at < NOW() - INTERVAL ''%s days''',
      v_policy.table_name,
      v_policy.retention_days
    );
    
    BEGIN
      EXECUTE v_sql;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      
      -- Update policy with cleanup info
      UPDATE compute_retention_policy 
      SET last_cleanup_at = NOW(), 
          rows_deleted_last = v_deleted,
          updated_at = NOW()
      WHERE compute_retention_policy.table_name = v_policy.table_name;
      
      table_name := v_policy.table_name;
      rows_deleted := v_deleted;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE NOTICE 'Cleanup failed for %: %', v_policy.table_name, SQLERRM;
    END;
  END LOOP;
END;
$$;