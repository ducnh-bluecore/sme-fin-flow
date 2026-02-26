-- Add unique constraint on (tenant_id, collection_code) for upsert support
ALTER TABLE public.inv_collections
ADD CONSTRAINT inv_collections_tenant_collection_code_unique 
UNIQUE (tenant_id, collection_code);