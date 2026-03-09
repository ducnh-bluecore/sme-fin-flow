ALTER TABLE public.bigquery_configs 
ADD COLUMN IF NOT EXISTS gcp_project_id text,
ADD COLUMN IF NOT EXISTS dataset_id text,
ADD COLUMN IF NOT EXISTS credentials_json jsonb;