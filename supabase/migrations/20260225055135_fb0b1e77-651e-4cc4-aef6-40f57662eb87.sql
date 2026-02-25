
-- Add unique constraint for upsert on store_daily_metrics
ALTER TABLE public.store_daily_metrics 
ADD CONSTRAINT store_daily_metrics_tenant_store_date_unique 
UNIQUE (tenant_id, store_id, metrics_date);
