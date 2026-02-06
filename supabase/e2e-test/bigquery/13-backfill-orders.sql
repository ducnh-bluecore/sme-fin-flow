-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 13: BACKFILL ORDERS
-- ============================================================================
-- Sync orders from 5 channels: Shopee, Lazada, TikTok, Tiki, KiotViet
-- Expected: ~560,000 orders (from 01/2025)
-- ============================================================================

/*
============================================================================
STEP 1: Start Order Backfill (All Channels)
============================================================================

POST /functions/v1/backfill-bigquery
{
  "action": "start",
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "model_type": "orders",
  "options": {
    "batch_size": 500,
    "date_from": "2025-01-01",
    "date_to": "2026-01-31"
  }
}

EXPECTED RESPONSE:
{
  "success": true,
  "job_id": "<uuid>",
  "model_type": "orders",
  "result": {
    "processed": 560000,
    "inserted": 560000
  },
  "duration_ms": <number>
}

============================================================================
STEP 2: Alternative - Sync by Channel (for large datasets)
============================================================================

-- Shopee only
POST /functions/v1/backfill-bigquery
{
  "action": "start",
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "model_type": "orders",
  "options": {
    "source_table": "shopee_Orders",
    "date_from": "2025-01-01"
  }
}

-- Lazada only
POST /functions/v1/backfill-bigquery
{
  "action": "start",
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "model_type": "orders",
  "options": {
    "source_table": "lazada_Orders",
    "date_from": "2025-01-01"
  }
}

============================================================================
STEP 3: Verify Results
============================================================================
*/

-- Verification Query 1: Order counts by channel
SELECT 
  'ORDER_BY_CHANNEL' as check_name,
  channel,
  COUNT(*) as order_count,
  SUM(gross_revenue) as total_gross,
  SUM(net_revenue) as total_net,
  ROUND(AVG(net_revenue), 0) as avg_order_value
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND order_at >= '2025-01-01'
GROUP BY channel
ORDER BY order_count DESC;

-- Verification Query 2: Monthly trend
SELECT 
  'MONTHLY_TREND' as check_name,
  DATE_TRUNC('month', order_at)::date as month,
  COUNT(*) as order_count,
  SUM(net_revenue) as total_revenue
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND order_at >= '2025-01-01'
GROUP BY DATE_TRUNC('month', order_at)
ORDER BY month;

-- Verification Query 3: Order status distribution
SELECT 
  'STATUS_DISTRIBUTION' as check_name,
  channel,
  status,
  COUNT(*) as count
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY channel, status
ORDER BY channel, count DESC;

-- Verification Query 4: Duplicate check (should be 0)
SELECT 
  'DUPLICATE_CHECK' as check_name,
  channel,
  order_key,
  COUNT(*) as duplicate_count
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY channel, order_key
HAVING COUNT(*) > 1
LIMIT 10;

-- Verification Query 5: Revenue sanity check
SELECT 
  'REVENUE_SANITY' as check_name,
  COUNT(*) as total_orders,
  SUM(gross_revenue) as total_gross_vnd,
  SUM(net_revenue) as total_net_vnd,
  ROUND(SUM(net_revenue) / 1000000000, 2) as total_net_billion_vnd,
  COUNT(*) FILTER (WHERE net_revenue < 0) as negative_revenue_count,
  COUNT(*) FILTER (WHERE net_revenue > 100000000) as very_high_orders
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND order_at >= '2025-01-01';

/*
============================================================================
EXPECTED RESULTS
============================================================================

Check 1 - By Channel:
- shopee: largest volume (expected 200K - 300K)
- lazada: second largest
- kiotviet: offline POS orders
- tiktok: growing channel
- tiki: smallest typically

Check 2 - Monthly Trend:
- Should show consistent monthly volume
- Dec/Jan may have holiday spikes

Check 4 - Duplicates:
- Should return 0 rows (unique constraint enforced)

Check 5 - Revenue:
- No negative revenue orders
- Very few orders > 100M VND

============================================================================
SUCCESS CRITERIA
============================================================================
[ ] Total orders: ~560,000 (from 01/2025)
[ ] All 5 channels represented
[ ] No duplicate order_key per channel
[ ] Net revenue > 0 for completed orders
[ ] Order dates within expected range
*/
