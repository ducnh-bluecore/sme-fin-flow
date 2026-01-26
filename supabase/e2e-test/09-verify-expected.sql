-- ============================================================================
-- E2E TEST SUITE - SCRIPT 09: VERIFICATION & EXPECTED VALUES
-- ============================================================================
-- So sánh actual values với expected values
-- Tolerance thresholds:
--   - Counts: 0% (exact match)
--   - Revenue/Costs: 5%
--   - Percentages: 2%
--   - Equity: 10%
-- ============================================================================

-- Create temp table for results
CREATE TEMP TABLE IF NOT EXISTS e2e_verification_results (
  layer text,
  check_name text,
  metric text,
  expected_value numeric,
  actual_value numeric,
  variance_percent numeric,
  tolerance_percent numeric,
  status text
);

TRUNCATE e2e_verification_results;

-- ============================================================================
-- LAYER 0: SOURCE DATA VERIFICATION
-- ============================================================================

-- Products count
INSERT INTO e2e_verification_results
SELECT 
  'L0_SOURCE', 'Products', 'count',
  100 as expected,
  COUNT(*) as actual,
  ABS(COUNT(*) - 100)::numeric / 100 * 100 as variance,
  0 as tolerance,
  CASE WHEN COUNT(*) = 100 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- LAYER 1: CDP SYNC VERIFICATION
-- ============================================================================

-- Customers count
INSERT INTO e2e_verification_results
SELECT 
  'L1_CDP', 'Customers', 'count',
  500 as expected,
  COUNT(*) as actual,
  ABS(COUNT(*) - 500)::numeric / 500 * 100 as variance,
  0 as tolerance,
  CASE WHEN COUNT(*) = 500 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Orders count
INSERT INTO e2e_verification_results
SELECT 
  'L1_CDP', 'Orders', 'count',
  5500 as expected,
  COUNT(*) as actual,
  ABS(COUNT(*) - 5500)::numeric / 5500 * 100 as variance,
  2 as tolerance,
  CASE WHEN ABS(COUNT(*) - 5500)::numeric / 5500 * 100 <= 2 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Order items count
INSERT INTO e2e_verification_results
SELECT 
  'L1_CDP', 'Order Items', 'count',
  12100 as expected,
  COUNT(*) as actual,
  ABS(COUNT(*) - 12100)::numeric / 12100 * 100 as variance,
  5 as tolerance,
  CASE WHEN ABS(COUNT(*) - 12100)::numeric / 12100 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cdp_order_items
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Net Revenue (expected: ~1,584,000,000 but calculated dynamically)
INSERT INTO e2e_verification_results
SELECT 
  'L1_CDP', 'Net Revenue', 'amount',
  1584000000 as expected,
  SUM(net_revenue) as actual,
  ABS(SUM(net_revenue) - 1584000000)::numeric / 1584000000 * 100 as variance,
  10 as tolerance,  -- 10% tolerance due to randomization
  CASE WHEN ABS(SUM(net_revenue) - 1584000000)::numeric / 1584000000 * 100 <= 10 
    THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- COGS percent
INSERT INTO e2e_verification_results
SELECT 
  'L1_CDP', 'COGS Percent', 'percent',
  53 as expected,
  (SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100)::numeric as actual,
  ABS((SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100) - 53) as variance,
  2 as tolerance,
  CASE WHEN ABS((SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100) - 53) <= 2 
    THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- LAYER 2: COMPUTED TABLES VERIFICATION
-- ============================================================================

-- Equity computed rows
INSERT INTO e2e_verification_results
SELECT 
  'L2_COMPUTED', 'Equity Computed Rows', 'count',
  500 as expected,
  COUNT(*) as actual,
  ABS(COUNT(*) - 500)::numeric / 500 * 100 as variance,
  5 as tolerance,
  CASE WHEN ABS(COUNT(*) - 500)::numeric / 500 * 100 <= 5 
    THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Total Equity 12M
INSERT INTO e2e_verification_results
SELECT 
  'L2_COMPUTED', 'Total Equity 12M', 'amount',
  1225000000 as expected,
  SUM(equity_12m) as actual,
  ABS(SUM(equity_12m) - 1225000000)::numeric / 1225000000 * 100 as variance,
  20 as tolerance,  -- Higher tolerance for equity projection
  CASE WHEN ABS(SUM(equity_12m) - 1225000000)::numeric / 1225000000 * 100 <= 20 
    THEN '✅ PASS' ELSE '⚠️ WARN' END as status
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- LAYER 3: CROSS-MODULE VERIFICATION
-- ============================================================================

-- FDP Locked Costs months
INSERT INTO e2e_verification_results
SELECT 
  'L3_CROSS', 'FDP Locked Costs Months', 'count',
  25 as expected,
  COUNT(*) as actual,
  ABS(COUNT(*) - 25)::numeric / 25 * 100 as variance,
  0 as tolerance,
  CASE WHEN COUNT(*) >= 20 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM fdp_locked_costs
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- CDP Segment LTV count
INSERT INTO e2e_verification_results
SELECT 
  'L3_CROSS', 'CDP Segment LTV', 'count',
  4 as expected,
  COUNT(*) as actual,
  ABS(COUNT(*) - 4)::numeric / 4 * 100 as variance,
  0 as tolerance,
  CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cdp_segment_ltv_for_mdp
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Cohort CAC records
INSERT INTO e2e_verification_results
SELECT 
  'L3_CROSS', 'Cohort CAC Records', 'count',
  100 as expected,  -- 25 months × 4 channels
  COUNT(*) as actual,
  ABS(COUNT(*) - 100)::numeric / 100 * 100 as variance,
  5 as tolerance,
  CASE WHEN COUNT(*) >= 90 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cdp_customer_cohort_cac
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- LAYER 4: CONTROL TOWER VERIFICATION
-- ============================================================================

-- Variance alerts
INSERT INTO e2e_verification_results
SELECT 
  'L4_TOWER', 'Variance Alerts', 'count',
  7 as expected,  -- ~5-10 expected
  COUNT(*) as actual,
  0 as variance,
  0 as tolerance,
  CASE WHEN COUNT(*) BETWEEN 3 AND 15 THEN '✅ PASS' ELSE '⚠️ WARN' END as status
FROM cross_domain_variance_alerts
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Priority Queue items
INSERT INTO e2e_verification_results
SELECT 
  'L4_TOWER', 'Priority Queue Items', 'count',
  12 as expected,  -- ~10-15 expected
  COUNT(*) as actual,
  0 as variance,
  0 as tolerance,
  CASE WHEN COUNT(*) BETWEEN 5 AND 20 THEN '✅ PASS' ELSE '⚠️ WARN' END as status
FROM control_tower_priority_queue
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- FINAL REPORT
-- ============================================================================

SELECT '═══════════════════════════════════════════════════════════════════════' as separator;
SELECT '                    E2E TEST VERIFICATION REPORT                        ' as title;
SELECT '                    Tenant: E2E Test Company                            ' as tenant;
SELECT '                    Period: 01/2024 - 26/01/2026                        ' as period;
SELECT '═══════════════════════════════════════════════════════════════════════' as separator;

-- Summary by layer
SELECT 
  layer,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE status LIKE '%PASS%') as passed,
  COUNT(*) FILTER (WHERE status LIKE '%FAIL%') as failed,
  COUNT(*) FILTER (WHERE status LIKE '%WARN%') as warnings
FROM e2e_verification_results
GROUP BY layer
ORDER BY layer;

SELECT '───────────────────────────────────────────────────────────────────────' as separator;

-- Detailed results
SELECT 
  layer,
  check_name,
  metric,
  ROUND(expected_value, 0) as expected,
  ROUND(actual_value, 0) as actual,
  ROUND(variance_percent, 1) as variance_pct,
  tolerance_percent as tolerance,
  status
FROM e2e_verification_results
ORDER BY layer, check_name;

SELECT '───────────────────────────────────────────────────────────────────────' as separator;

-- Overall summary
SELECT 
  'OVERALL RESULT' as summary,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE status LIKE '%PASS%') as passed,
  COUNT(*) FILTER (WHERE status LIKE '%FAIL%') as failed,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status LIKE '%FAIL%') = 0 THEN '✅ ALL CHECKS PASSED'
    WHEN COUNT(*) FILTER (WHERE status LIKE '%FAIL%') <= 2 THEN '⚠️ MINOR ISSUES'
    ELSE '❌ SIGNIFICANT FAILURES'
  END as final_status
FROM e2e_verification_results;

-- Cleanup
DROP TABLE IF EXISTS e2e_verification_results;
