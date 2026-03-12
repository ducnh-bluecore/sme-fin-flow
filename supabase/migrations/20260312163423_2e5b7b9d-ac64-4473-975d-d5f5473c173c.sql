
-- Cancel running/pending order backfill jobs for Icon Denim
UPDATE public.bigquery_backfill_jobs 
SET status = 'cancelled' 
WHERE tenant_id = '364a23ad-66f5-44d6-8da9-74c7ff333dcc' 
  AND model_type = 'orders' 
  AND status IN ('running', 'pending');
