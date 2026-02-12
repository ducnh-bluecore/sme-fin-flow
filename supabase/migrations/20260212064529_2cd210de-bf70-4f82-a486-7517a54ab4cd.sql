
-- 1. Reset stuck runs
UPDATE daily_sync_runs 
SET status = 'failed', 
    error_summary = 'Auto-reset: stuck in running state',
    completed_at = NOW()
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '1 hour';

-- 2. Recompute KPI facts cho Feb 1-12
SELECT compute_kpi_facts_daily(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '2026-02-01',
  '2026-02-12'
);

-- 3. Recompute central metrics snapshot
SELECT compute_central_metrics_snapshot(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
);
