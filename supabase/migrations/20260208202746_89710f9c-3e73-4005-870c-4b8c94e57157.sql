-- Pre-computed COGS aggregation table
CREATE TABLE IF NOT EXISTS _cogs_precomputed (
  order_id UUID PRIMARY KEY,
  total_cogs NUMERIC NOT NULL
);

-- Populate it - this runs as DDL so has higher timeout
INSERT INTO _cogs_precomputed (order_id, total_cogs)
SELECT oi.order_id, SUM(oi.line_cogs)
FROM cdp_order_items oi
WHERE oi.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND oi.line_cogs > 0
GROUP BY oi.order_id
ON CONFLICT (order_id) DO UPDATE SET total_cogs = EXCLUDED.total_cogs;