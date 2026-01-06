-- Create sync watermarks table for incremental sync tracking
CREATE TABLE IF NOT EXISTS public.bigquery_sync_watermarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  data_model TEXT NOT NULL, -- 'orders', 'settlements', 'cash_flow', 'customers', 'marketing'
  channel TEXT, -- 'shopee', 'lazada', 'tiktok', 'tiki', or NULL for cross-channel
  dataset_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_record_timestamp TIMESTAMP WITH TIME ZONE,
  last_record_id TEXT,
  total_records_synced BIGINT DEFAULT 0,
  sync_status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, data_model, channel, dataset_id, table_id)
);

-- Enable RLS
ALTER TABLE public.bigquery_sync_watermarks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant watermarks"
  ON public.bigquery_sync_watermarks
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant watermarks"
  ON public.bigquery_sync_watermarks
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_watermarks_tenant_model ON public.bigquery_sync_watermarks(tenant_id, data_model);

-- Create BigQuery data model configs table
CREATE TABLE IF NOT EXISTS public.bigquery_data_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL, -- 'orders', 'cash_flow', 'customers', 'marketing', 'settlements'
  model_label TEXT NOT NULL,
  description TEXT,
  bigquery_dataset TEXT NOT NULL,
  bigquery_table TEXT NOT NULL,
  primary_key_field TEXT NOT NULL,
  timestamp_field TEXT, -- Field to use for incremental sync
  mapping_config JSONB, -- Column mappings from BigQuery to local tables
  target_table TEXT, -- Local Supabase table to sync to
  is_enabled BOOLEAN DEFAULT true,
  sync_frequency_hours INTEGER DEFAULT 24,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, model_name, bigquery_dataset, bigquery_table)
);

-- Enable RLS
ALTER TABLE public.bigquery_data_models ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant data models"
  ON public.bigquery_data_models
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant data models"
  ON public.bigquery_data_models
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Create BigQuery cache table for dashboard queries
CREATE TABLE IF NOT EXISTS public.bigquery_query_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  query_hash TEXT NOT NULL, -- MD5 hash of the query
  query_type TEXT NOT NULL, -- 'revenue', 'orders', 'customers', 'marketing'
  date_range_start DATE,
  date_range_end DATE,
  result_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, query_hash)
);

-- Enable RLS
ALTER TABLE public.bigquery_query_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant cache"
  ON public.bigquery_query_cache
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant cache"
  ON public.bigquery_query_cache
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Index for fast cache lookups
CREATE INDEX idx_cache_lookup ON public.bigquery_query_cache(tenant_id, query_hash, is_valid, expires_at);

-- Add update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_bigquery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_watermarks_updated_at
  BEFORE UPDATE ON public.bigquery_sync_watermarks
  FOR EACH ROW
  EXECUTE FUNCTION update_bigquery_updated_at();

CREATE TRIGGER update_data_models_updated_at
  BEFORE UPDATE ON public.bigquery_data_models
  FOR EACH ROW
  EXECUTE FUNCTION update_bigquery_updated_at();