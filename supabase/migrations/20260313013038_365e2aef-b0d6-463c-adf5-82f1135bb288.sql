
CREATE INDEX IF NOT EXISTS idx_cdp_customers_phone_tenant 
ON tenant_icondenim.cdp_customers (phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cdp_orders_unlinked_phone 
ON tenant_icondenim.cdp_orders (customer_phone) 
WHERE customer_id IS NULL AND customer_phone IS NOT NULL;
