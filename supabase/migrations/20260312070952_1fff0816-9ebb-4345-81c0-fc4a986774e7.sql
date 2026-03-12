
-- Add indexes without CONCURRENTLY (required inside transaction)
CREATE INDEX IF NOT EXISTS idx_cdp_orders_unlinked_phone 
  ON tenant_icondenim.cdp_orders (tenant_id, customer_phone) 
  WHERE customer_id IS NULL AND customer_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cdp_orders_unlinked_name 
  ON tenant_icondenim.cdp_orders (tenant_id, customer_name) 
  WHERE customer_id IS NULL AND customer_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cdp_customers_canonical_key 
  ON tenant_icondenim.cdp_customers (tenant_id, canonical_key) 
  WHERE canonical_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cdp_customers_name_lower 
  ON tenant_icondenim.cdp_customers (tenant_id, lower(trim(name))) 
  WHERE name IS NOT NULL;

ALTER FUNCTION public.link_orders_batch SET statement_timeout = '60s';
