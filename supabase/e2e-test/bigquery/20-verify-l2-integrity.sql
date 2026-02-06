-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 20: VERIFY L2 INTEGRITY
-- ============================================================================
-- Verify Master Model (L2) data integrity after all backfills complete
-- ============================================================================

-- ============================================================================
-- SECTION 1: CUSTOMER DATA QUALITY
-- ============================================================================

-- 1.1 Phone number format validation
SELECT 
  'PHONE_FORMAT_VALIDATION' as check_name,
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as has_phone,
  COUNT(*) FILTER (WHERE phone ~ '^0[0-9]{9,10}$') as valid_phone_format,
  COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone !~ '^0[0-9]{9,10}$') as invalid_phone_format,
  ROUND(
    COUNT(*) FILTER (WHERE phone ~ '^0[0-9]{9,10}$')::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE phone IS NOT NULL), 0) * 100, 1
  ) as valid_percent
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- 1.2 Email format validation  
SELECT 
  'EMAIL_FORMAT_VALIDATION' as check_name,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as has_email,
  COUNT(*) FILTER (WHERE email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') as valid_email,
  COUNT(*) FILTER (WHERE email IS NOT NULL AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') as invalid_email
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- 1.3 Customer source distribution
SELECT 
  acquisition_source,
  COUNT(*) as customer_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY acquisition_source
ORDER BY customer_count DESC;

-- 1.4 External IDs integrity
SELECT 
  'EXTERNAL_IDS_CHECK' as check_name,
  COUNT(*) FILTER (WHERE external_ids IS NULL) as null_external_ids,
  COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) = 0) as empty_external_ids,
  COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) = 1) as single_id,
  COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) > 1) as merged_profiles
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- SECTION 2: ORDER DATA QUALITY
-- ============================================================================

-- 2.1 Orders date range check
SELECT 
  'ORDER_DATE_RANGE' as check_name,
  MIN(order_at) as earliest_order,
  MAX(order_at) as latest_order,
  COUNT(DISTINCT DATE(order_at)) as unique_dates
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- 2.2 Order status distribution by channel
SELECT 
  channel,
  status,
  COUNT(*) as order_count,
  SUM(net_revenue) as total_revenue
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY channel, status
ORDER BY channel, order_count DESC;

-- 2.3 Revenue validation
SELECT 
  'REVENUE_VALIDATION' as check_name,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE gross_revenue IS NULL) as null_gross,
  COUNT(*) FILTER (WHERE net_revenue IS NULL) as null_net,
  COUNT(*) FILTER (WHERE net_revenue > gross_revenue) as net_exceeds_gross,
  COUNT(*) FILTER (WHERE net_revenue < 0) as negative_net,
  COUNT(*) FILTER (WHERE gross_revenue < 0) as negative_gross,
  COUNT(*) FILTER (WHERE net_revenue = 0 AND status NOT IN ('cancelled', 'refunded')) as zero_revenue_active
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- 2.4 Order key uniqueness per channel
SELECT 
  'ORDER_KEY_UNIQUENESS' as check_name,
  channel,
  COUNT(*) as total_orders,
  COUNT(DISTINCT order_key) as unique_keys,
  CASE WHEN COUNT(*) = COUNT(DISTINCT order_key) THEN '✓ PASS' ELSE '✗ DUPLICATES' END as status
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY channel;

-- ============================================================================
-- SECTION 3: PRODUCT DATA QUALITY
-- ============================================================================

-- 3.1 Product pricing completeness
SELECT 
  'PRODUCT_PRICING' as check_name,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE cost_price > 0) as has_cost,
  COUNT(*) FILTER (WHERE base_price > 0) as has_base,
  COUNT(*) FILTER (WHERE sell_price > 0) as has_sell,
  ROUND(COUNT(*) FILTER (WHERE cost_price > 0)::numeric / COUNT(*) * 100, 1) as cost_coverage_percent
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- 3.2 SKU/Barcode uniqueness
SELECT 
  'SKU_UNIQUENESS' as check_name,
  COUNT(*) as total_products,
  COUNT(DISTINCT sku) as unique_skus,
  COUNT(DISTINCT barcode) as unique_barcodes,
  CASE WHEN COUNT(*) = COUNT(DISTINCT sku) THEN '✓ PASS' ELSE '✗ DUPLICATES' END as sku_status
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- 3.3 Margin analysis
SELECT 
  'MARGIN_DISTRIBUTION' as check_name,
  COUNT(*) FILTER (WHERE (sell_price - cost_price) / NULLIF(sell_price, 0) < 0) as negative_margin,
  COUNT(*) FILTER (WHERE (sell_price - cost_price) / NULLIF(sell_price, 0) BETWEEN 0 AND 0.2) as low_margin_0_20,
  COUNT(*) FILTER (WHERE (sell_price - cost_price) / NULLIF(sell_price, 0) BETWEEN 0.2 AND 0.4) as mid_margin_20_40,
  COUNT(*) FILTER (WHERE (sell_price - cost_price) / NULLIF(sell_price, 0) BETWEEN 0.4 AND 0.6) as good_margin_40_60,
  COUNT(*) FILTER (WHERE (sell_price - cost_price) / NULLIF(sell_price, 0) > 0.6) as high_margin_60_plus
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND cost_price > 0 AND sell_price > 0;

-- ============================================================================
-- SECTION 4: CROSS-REFERENCE INTEGRITY
-- ============================================================================

-- 4.1 Customer-Order linkage potential (via phone)
SELECT 
  'CUSTOMER_ORDER_LINKAGE' as check_name,
  (SELECT COUNT(*) FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') as total_orders,
  (SELECT COUNT(*) FROM cdp_orders o 
   WHERE o.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
   AND EXISTS (
     SELECT 1 FROM cdp_customers c 
     WHERE c.tenant_id = o.tenant_id 
     AND c.phone = o.customer_phone
   )
  ) as orders_with_customer_match;

-- ============================================================================
-- FINAL INTEGRITY SCORE
-- ============================================================================

SELECT 
  '=== L2 INTEGRITY SCORE ===' as section;

WITH checks AS (
  SELECT 'customer_phone_valid' as check_name,
    (SELECT COUNT(*) FILTER (WHERE phone ~ '^0[0-9]{9,10}$')::numeric / 
     NULLIF(COUNT(*) FILTER (WHERE phone IS NOT NULL), 0) * 100
     FROM cdp_customers WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') as score
  UNION ALL
  SELECT 'product_cost_coverage',
    (SELECT COUNT(*) FILTER (WHERE cost_price > 0)::numeric / COUNT(*) * 100
     FROM products WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
  UNION ALL
  SELECT 'order_revenue_valid',
    (SELECT COUNT(*) FILTER (WHERE net_revenue > 0)::numeric / COUNT(*) * 100
     FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
)
SELECT 
  check_name,
  ROUND(score, 1) as score_percent,
  CASE 
    WHEN score >= 95 THEN '✓ EXCELLENT'
    WHEN score >= 85 THEN '✓ GOOD'
    WHEN score >= 70 THEN '~ ACCEPTABLE'
    ELSE '✗ NEEDS ATTENTION'
  END as grade
FROM checks;
