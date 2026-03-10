CREATE TABLE public.bigquery_tenant_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_type text NOT NULL,
  channel text NOT NULL,
  dataset text NOT NULL,
  table_name text NOT NULL,
  mapping_overrides jsonb,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, model_type, channel)
);

ALTER TABLE public.bigquery_tenant_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bigquery_tenant_sources"
  ON public.bigquery_tenant_sources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);