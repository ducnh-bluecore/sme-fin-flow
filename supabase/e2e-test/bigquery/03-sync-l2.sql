-- ============================================================================
-- E2E BIGQUERY SYNC TEST - SCRIPT 03: SYNC TO L2 (MASTER MODEL)
-- ============================================================================
-- Sync data from BigQuery to cdp_orders (SSOT Layer 2)
-- ============================================================================

-- Option A: Manual sync via scheduled-bigquery-sync
/*
POST /functions/v1/scheduled-bigquery-sync
{
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "model_name": "shopee_orders"
}
*/

-- Option B: Manual insert (for testing when sync has memory limits)
INSERT INTO cdp_orders (
  tenant_id, integration_id, order_key, order_at, channel, status,
  customer_name, customer_phone, gross_revenue, net_revenue, currency, payment_method
) VALUES 
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
   '26010323GX5HGR', '2026-01-03 00:01:49+07', 'shopee', 'processing',
   'bchngng', '******80', 372400, 335160, 'VND', 'Cash on Delivery'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
   '26010323FAQ682', '2026-01-03 00:00:55+07', 'shopee', 'processing',
   'lamnhu6102007', '******34', 217280, 195552, 'VND', 'Cash on Delivery'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
   '26010323ESJ8EH', '2026-01-03 00:00:38+07', 'shopee', 'processing',
   'huongngocquach', '******78', 579500, 521550, 'VND', 'ShopeePay'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
   '260103217309G2', '2026-01-02 23:20:31+07', 'shopee', 'processing',
   'ms1020', '******86', 695200, 625680, 'VND', 'Cash on Delivery'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
   '260103205BD4NN', '2026-01-02 23:01:39+07', 'shopee', 'cancelled',
   'chinguynthu952', '******85', 650500, 0, 'VND', 'Cash on Delivery'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
   '2601021YQD3QNB', '2026-01-02 22:53:55+07', 'shopee', 'processing',
   'hangphamlucy', '******60', 1044108, 939697, 'VND', 'Cash on Delivery'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
   '2601021YGJQD4D', '2026-01-02 22:50:07+07', 'shopee', 'processing',
   'shopsinsin', '******08', 537510, 483759, 'VND', 'Credit Card')
ON CONFLICT (tenant_id, integration_id, order_key) DO NOTHING;

-- Verify L2 data
SELECT 
  COUNT(*) as total_orders,
  SUM(gross_revenue) as total_gross,
  SUM(net_revenue) as total_net,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
  MIN(order_at) as first_order,
  MAX(order_at) as last_order
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Expected result:
-- total_orders: 7
-- total_gross: 4,096,498 VND
-- total_net: 3,101,398 VND
-- cancelled_count: 1
