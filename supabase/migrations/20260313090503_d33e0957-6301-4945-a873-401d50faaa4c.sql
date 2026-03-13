
-- Fix 1: Create optimized indexes for schema-isolated queries
CREATE INDEX IF NOT EXISTS idx_cdp_orders_order_at 
ON tenant_icondenim.cdp_orders (order_at);

CREATE INDEX IF NOT EXISTS idx_cdp_orders_order_at_channel 
ON tenant_icondenim.cdp_orders (order_at, channel);
