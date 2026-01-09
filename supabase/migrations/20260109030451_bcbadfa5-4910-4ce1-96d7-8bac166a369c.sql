-- Drop partial indexes that don't work with upsert
DROP INDEX IF EXISTS idx_customers_tenant_external_id;
DROP INDEX IF EXISTS idx_customers_tenant_email;
DROP INDEX IF EXISTS idx_bank_transactions_tenant_reference;
DROP INDEX IF EXISTS idx_promotions_tenant_code;

-- Create proper unique constraints (not partial) for upsert to work
-- For customers - use external_customer_id with empty string as default for nulls
CREATE UNIQUE INDEX idx_customers_upsert ON public.customers (tenant_id, COALESCE(external_customer_id, ''));

-- For bank_transactions - use reference with empty string as default
CREATE UNIQUE INDEX idx_bank_transactions_upsert ON public.bank_transactions (tenant_id, COALESCE(reference, ''));

-- For promotions - use promotion_code with empty string as default  
CREATE UNIQUE INDEX idx_promotions_upsert ON public.promotions (tenant_id, COALESCE(promotion_code, ''));