-- 1. Thêm cột phí sàn vào cdp_orders (SSOT Layer 1)
ALTER TABLE cdp_orders 
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_fees NUMERIC DEFAULT 0;

-- 2. Backfill từ external_orders
UPDATE cdp_orders co
SET 
  platform_fee = COALESCE(eo.platform_fee, 0),
  shipping_fee = COALESCE(eo.shipping_fee, 0),
  other_fees = COALESCE(eo.commission_fee, 0) + COALESCE(eo.payment_fee, 0)
FROM external_orders eo
WHERE co.tenant_id = eo.tenant_id
  AND co.order_key = COALESCE(eo.external_order_id, eo.order_number, eo.id::text);

-- 3. Drop existing view and recreate with total_fees
DROP VIEW IF EXISTS v_channel_performance;

CREATE VIEW v_channel_performance 
WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  channel,
  COUNT(*)::INTEGER as order_count,
  COALESCE(SUM(gross_revenue), 0) as gross_revenue,
  COALESCE(SUM(net_revenue), 0) as net_revenue,
  COALESCE(SUM(platform_fee + shipping_fee + other_fees), 0) as total_fees,
  COALESCE(SUM(cogs), 0) as cogs,
  COALESCE(SUM(gross_margin), 0) as gross_margin
FROM cdp_orders
GROUP BY tenant_id, channel;