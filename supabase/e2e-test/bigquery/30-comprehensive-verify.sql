-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 30: COMPREHENSIVE VERIFICATION
-- ============================================================================
-- Full verification of all synced data across L2, L3, L4 layers
-- Run after all backfill jobs complete
-- ============================================================================

-- ============================================================================
-- SECTION 1: L2 MASTER MODEL COUNTS
-- ============================================================================

SELECT 
  '=== L2 MASTER MODEL SUMMARY ===' as section;

WITH counts AS (
  SELECT 'cdp_customers' as table_name, COUNT(*) as count, 'expected: 300K-350K' as expectation
  FROM cdp_customers WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  UNION ALL
  SELECT 'products', COUNT(*), 'expected: ~16,700'
  FROM products WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  UNION ALL
  SELECT 'cdp_orders', COUNT(*), 'expected: ~560K'
  FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  UNION ALL
  SELECT 'cdp_order_items', COUNT(*), 'expected: ~1.2M'
  FROM cdp_order_items WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
)
SELECT 
  table_name,
  count,
  expectation,
  CASE 
    WHEN table_name = 'cdp_customers' AND count BETWEEN 280000 AND 380000 THEN '✓ PASS'
    WHEN table_name = 'products' AND count BETWEEN 15000 AND 18000 THEN '✓ PASS'
    WHEN table_name = 'cdp_orders' AND count BETWEEN 500000 AND 620000 THEN '✓ PASS'
    WHEN table_name = 'cdp_order_items' AND count BETWEEN 1000000 AND 1400000 THEN '✓ PASS'
    WHEN count = 0 THEN '✗ NOT SYNCED'
    ELSE '? CHECK'
  END as status
FROM counts
ORDER BY table_name;

-- ============================================================================
-- SECTION 2: CUSTOMER DEDUPLICATION ANALYSIS
-- ============================================================================

SELECT 
  '=== CUSTOMER DEDUPLICATION ===' as section;

SELECT 
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) = 1) as single_source,
  COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) = 2) as two_sources,
  COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) >= 3) as three_plus_sources,
  ROUND(COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) > 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as merge_rate_percent
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- SECTION 3: ORDER DISTRIBUTION BY CHANNEL
-- ============================================================================

SELECT 
  '=== ORDER DISTRIBUTION ===' as section;

SELECT 
  channel,
  COUNT(*) as order_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent_of_total,
  SUM(net_revenue) as total_revenue_vnd,
  ROUND(AVG(net_revenue), 0) as avg_order_value
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY channel
ORDER BY order_count DESC;

-- ============================================================================
-- SECTION 4: DATA INTEGRITY CHECKS
-- ============================================================================

SELECT 
  '=== DATA INTEGRITY CHECKS ===' as section;

WITH integrity_checks AS (
  -- Check 1: Orphaned order items
  SELECT 
    'orphaned_order_items' as check_name,
    COUNT(*) as issue_count,
    'Should be 0' as expectation
  FROM cdp_order_items oi
  LEFT JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
  WHERE oi.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    AND o.id IS NULL
  
  UNION ALL
  
  -- Check 2: Duplicate orders per channel
  SELECT 
    'duplicate_orders' as check_name,
    COUNT(*) as issue_count,
    'Should be 0' as expectation
  FROM (
    SELECT channel, order_key, COUNT(*) as cnt
    FROM cdp_orders
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    GROUP BY channel, order_key
    HAVING COUNT(*) > 1
  ) dups
  
  UNION ALL
  
  -- Check 3: Orders with invalid revenue
  SELECT 
    'negative_revenue_orders' as check_name,
    COUNT(*) as issue_count,
    'Should be 0 or minimal' as expectation
  FROM cdp_orders
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    AND net_revenue < 0
  
  UNION ALL
  
  -- Check 4: Products without SKU
  SELECT 
    'products_without_sku' as check_name,
    COUNT(*) as issue_count,
    'Should be 0' as expectation
  FROM products
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    AND (sku IS NULL OR sku = '')
    
  UNION ALL
  
  -- Check 5: Customers without phone or email
  SELECT 
    'customers_no_contact' as check_name,
    COUNT(*) as issue_count,
    'Should be minimal' as expectation
  FROM cdp_customers
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    AND (phone IS NULL OR phone = '')
    AND (email IS NULL OR email = '')
)
SELECT 
  check_name,
  issue_count,
  expectation,
  CASE 
    WHEN issue_count = 0 THEN '✓ PASS'
    WHEN issue_count < 100 THEN '~ ACCEPTABLE'
    ELSE '✗ INVESTIGATE'
  END as status
FROM integrity_checks;

-- ============================================================================
-- SECTION 5: BACKFILL JOB STATUS
-- ============================================================================

SELECT 
  '=== BACKFILL JOB STATUS ===' as section;

SELECT 
  model_type,
  status,
  processed_records,
  failed_records,
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at))::integer as duration_seconds,
  error_message
FROM bigquery_backfill_jobs
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY created_at DESC;

-- ============================================================================
-- SECTION 6: REVENUE SUMMARY (Financial Truth)
-- ============================================================================

SELECT 
  '=== REVENUE SUMMARY (FDP TRUTH) ===' as section;

SELECT 
  DATE_TRUNC('month', order_at)::date as month,
  channel,
  COUNT(*) as orders,
  SUM(gross_revenue) as gross_vnd,
  SUM(net_revenue) as net_vnd,
  SUM(gross_revenue - net_revenue) as platform_fees_vnd,
  ROUND(AVG(net_revenue), 0) as aov_vnd
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND order_at >= '2025-01-01'
  AND status NOT IN ('cancelled', 'refunded')
GROUP BY DATE_TRUNC('month', order_at), channel
ORDER BY month, net_vnd DESC;

-- ============================================================================
-- SECTION 7: FINAL VERDICT
-- ============================================================================

SELECT 
  '=== FINAL TEST VERDICT ===' as section;

WITH verdicts AS (
  SELECT 'L2_Customers' as layer, 
    CASE WHEN COUNT(*) BETWEEN 280000 AND 380000 THEN 'PASS' ELSE 'FAIL' END as status,
    COUNT(*) as value
  FROM cdp_customers WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  
  UNION ALL
  
  SELECT 'L2_Products',
    CASE WHEN COUNT(*) BETWEEN 15000 AND 18000 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)
  FROM products WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  
  UNION ALL
  
  SELECT 'L2_Orders',
    CASE WHEN COUNT(*) BETWEEN 500000 AND 620000 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)
  FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
)
SELECT 
  layer,
  status,
  value,
  CASE WHEN status = 'PASS' THEN '✓' ELSE '✗' END as icon
FROM verdicts
ORDER BY layer;

/*
============================================================================
SUCCESS CRITERIA SUMMARY
============================================================================

L2 MASTER MODEL:
[ ] cdp_customers: 300K - 350K (after dedup)
[ ] products: ~16,700
[ ] cdp_orders: ~560,000
[ ] cdp_order_items: ~1.2M

DATA INTEGRITY:
[ ] No orphaned order items
[ ] No duplicate order keys per channel
[ ] Minimal negative revenue orders
[ ] All products have SKU
[ ] Customers have phone or email

DEDUPLICATION:
[ ] Merge rate: 20-30%
[ ] All 3 customer sources represented

CHANNEL COVERAGE:
[ ] All 5 order channels synced
[ ] Revenue distribution reasonable

============================================================================
*/
