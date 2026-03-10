UPDATE bigquery_tenant_sources 
SET table_name = 'raw_hrv_product'
WHERE tenant_id = '364a23ad-66f5-44d6-8da9-74c7ff333dcc' 
AND model_type = 'products';