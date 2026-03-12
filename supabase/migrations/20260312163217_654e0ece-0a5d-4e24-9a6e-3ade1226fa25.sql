
-- Add extra_where column for custom SQL filters (e.g., exclude marketplace orders from Haravan)
ALTER TABLE public.bigquery_tenant_sources ADD COLUMN IF NOT EXISTS extra_where text;

-- Set filter for Icon Denim's Haravan orders: exclude Shopee and TikTok originated orders
UPDATE public.bigquery_tenant_sources
SET extra_where = 'LOWER(COALESCE(`source_name`, '''')) NOT LIKE ''%shopee%'' AND LOWER(COALESCE(`source_name`, '''')) NOT LIKE ''%tiktok%'''
WHERE tenant_id = '364a23ad-66f5-44d6-8da9-74c7ff333dcc'
  AND channel = 'haravan'
  AND model_type = 'orders';
