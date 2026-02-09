-- Add index on order_key for efficient lookup during dedup cleanup
CREATE INDEX IF NOT EXISTS idx_cdp_orders_tenant_channel_orderkey 
ON cdp_orders (tenant_id, channel, order_key);