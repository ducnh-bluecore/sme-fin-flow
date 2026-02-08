
-- Table to store daily sync run history and results
CREATE TABLE IF NOT EXISTS public.daily_sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  run_type TEXT NOT NULL DEFAULT 'daily_incremental', -- 'daily_incremental' | 'manual_full'
  status TEXT NOT NULL DEFAULT 'running', -- 'running' | 'completed' | 'partial' | 'failed'
  date_from TEXT, -- lookback start date
  total_duration_ms INTEGER,
  total_models INTEGER DEFAULT 0,
  succeeded_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_records_processed INTEGER DEFAULT 0,
  results JSONB DEFAULT '{}',
  error_summary TEXT,
  triggered_by TEXT DEFAULT 'cron', -- 'cron' | 'manual'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX idx_daily_sync_runs_tenant_started ON public.daily_sync_runs(tenant_id, started_at DESC);

-- Enable RLS
ALTER TABLE public.daily_sync_runs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role full access on daily_sync_runs"
  ON public.daily_sync_runs
  FOR ALL
  USING (true)
  WITH CHECK (true);
