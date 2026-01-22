
-- Create CDP Build Logs table for tracking scheduled runs
CREATE TABLE IF NOT EXISTS cdp_build_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL DEFAULT 'scheduled',
  summary jsonb NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying recent runs
CREATE INDEX IF NOT EXISTS idx_cdp_build_logs_created 
ON cdp_build_logs (created_at DESC);

-- Enable RLS
ALTER TABLE cdp_build_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role can manage build logs"
ON cdp_build_logs
FOR ALL
USING (true)
WITH CHECK (true);
