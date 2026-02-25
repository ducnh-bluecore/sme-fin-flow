-- Add unique constraint for idempotent upsert of demand state
ALTER TABLE public.inv_state_demand
ADD CONSTRAINT inv_state_demand_tenant_store_sku_period_unique
UNIQUE (tenant_id, store_id, sku, period_start);