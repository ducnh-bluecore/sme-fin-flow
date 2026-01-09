-- Create unique constraint for customers using external_customer_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_external_id 
ON public.customers (tenant_id, external_customer_id) 
WHERE external_customer_id IS NOT NULL;

-- Create unique constraint for bank_transactions using reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_tenant_reference 
ON public.bank_transactions (tenant_id, reference) 
WHERE reference IS NOT NULL;