-- Add external_customer_id column to customers table for BigQuery reference
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS external_customer_id TEXT;

-- Create unique constraint on tenant_id + email for upsert (only if email is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_email 
ON public.customers (tenant_id, email) 
WHERE email IS NOT NULL;

-- Create unique constraint on tenant_id + promotion_code for promotions
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_tenant_code 
ON public.promotions (tenant_id, promotion_code) 
WHERE promotion_code IS NOT NULL;