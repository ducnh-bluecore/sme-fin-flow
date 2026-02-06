-- Create table to track progress per data source within a backfill job
CREATE TABLE IF NOT EXISTS public.backfill_source_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.bigquery_backfill_jobs(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  dataset TEXT NOT NULL,
  table_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  last_offset INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, source_name)
);

-- Create index for faster lookups by job_id
CREATE INDEX IF NOT EXISTS idx_backfill_source_progress_job_id ON public.backfill_source_progress(job_id);

-- Enable RLS
ALTER TABLE public.backfill_source_progress ENABLE ROW LEVEL SECURITY;

-- RLS policy - allow authenticated users to read/write their tenant's data
CREATE POLICY "Allow authenticated access to backfill_source_progress"
  ON public.backfill_source_progress
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bigquery_backfill_jobs j
      WHERE j.id = backfill_source_progress.job_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bigquery_backfill_jobs j
      WHERE j.id = backfill_source_progress.job_id
    )
  );

-- Also allow service role full access
CREATE POLICY "Service role full access to backfill_source_progress"
  ON public.backfill_source_progress
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.backfill_source_progress IS 'Tracks sync progress per data source (KiotViet, Haravan, Shopee, etc.) within a BigQuery backfill job';