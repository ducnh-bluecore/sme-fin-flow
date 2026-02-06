-- ============================================================================
-- Migration: cdp_customers profile fields + cdp_orders channel constraint + bigquery_backfill_jobs
-- ============================================================================

-- 1. Add customer profile fields to cdp_customers
ALTER TABLE cdp_customers
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Index for deduplication by phone
CREATE INDEX IF NOT EXISTS idx_cdp_customers_phone 
ON cdp_customers(tenant_id, phone) WHERE phone IS NOT NULL;

-- Index for deduplication by email
CREATE INDEX IF NOT EXISTS idx_cdp_customers_email 
ON cdp_customers(tenant_id, email) WHERE email IS NOT NULL;

-- 2. Update cdp_orders unique constraint to include channel
-- First drop existing constraint if it exists
DROP INDEX IF EXISTS idx_cdp_orders_key;
DROP INDEX IF EXISTS idx_cdp_orders_tenant_key;

-- Create new unique constraint with channel
CREATE UNIQUE INDEX IF NOT EXISTS idx_cdp_orders_channel_key 
ON cdp_orders(tenant_id, channel, order_key);

-- 3. Create bigquery_backfill_jobs table for tracking backfill progress
CREATE TABLE IF NOT EXISTS bigquery_backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  last_processed_date DATE,
  last_watermark TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE bigquery_backfill_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies using tenant_users table
CREATE POLICY "Tenant isolation for backfill jobs"
ON bigquery_backfill_jobs FOR ALL
USING (tenant_id IN (
  SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
));

-- Index for querying jobs by tenant and model
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_tenant_model 
ON bigquery_backfill_jobs(tenant_id, model_type);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_status 
ON bigquery_backfill_jobs(tenant_id, status);

-- Trigger for updated_at
CREATE TRIGGER update_bigquery_backfill_jobs_updated_at
  BEFORE UPDATE ON bigquery_backfill_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();