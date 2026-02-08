-- Index to speed up COGS aggregation JOIN
CREATE INDEX IF NOT EXISTS idx_cdp_order_items_cogs_agg 
ON cdp_order_items (tenant_id, order_id) 
WHERE line_cogs > 0;

-- Index to find orders needing COGS update
CREATE INDEX IF NOT EXISTS idx_cdp_orders_cogs_zero
ON cdp_orders (tenant_id, id)
WHERE cogs = 0;