
-- Drop old FK to 'stores' table and add FK to 'inv_stores' table
ALTER TABLE public.store_daily_metrics DROP CONSTRAINT store_daily_metrics_store_id_fkey;
ALTER TABLE public.store_daily_metrics ADD CONSTRAINT store_daily_metrics_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES public.inv_stores(id) ON DELETE CASCADE;

-- Drop duplicate unique constraint
ALTER TABLE public.store_daily_metrics DROP CONSTRAINT IF EXISTS store_daily_metrics_tenant_id_store_id_metrics_date_key;
