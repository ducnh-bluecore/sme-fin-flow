-- ============================================================================
-- E2E TEST SUITE - COMPREHENSIVE VERIFICATION
-- ============================================================================
-- Tests ALL screens and expected values based on generated test data
-- Run after: 00-08 scripts and date shifting
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════════'
\echo '         E2E COMPREHENSIVE TEST - ALL SCREENS VERIFICATION             '
\echo '═══════════════════════════════════════════════════════════════════════'

-- ============================================================================
-- SETUP: Create results table
-- ============================================================================
DROP TABLE IF EXISTS e2e_test_results;
CREATE TEMP TABLE e2e_test_results (
  screen text,
  component text,
  metric text,
  expected_value text,
  actual_value text,
  variance_percent numeric,
  tolerance_percent numeric,
  status text,
  tested_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TEST 1: CDP Overview (/cdp)
-- ============================================================================
\echo ''
\echo '📊 Testing: CDP Overview (/cdp)'
\echo '─────────────────────────────────────────'

-- CustomerEquitySnapshot
INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp', 'CustomerEquitySnapshot', 'total_equity_12m',
  '1227758419' as expected,
  SUM(equity_12m)::text as actual,
  ABS(SUM(equity_12m) - 1227758419) / 1227758419 * 100,
  20,
  CASE WHEN ABS(SUM(equity_12m) - 1227758419) / 1227758419 * 100 <= 20 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp', 'CustomerEquitySnapshot', 'total_equity_24m',
  '1825614700' as expected,
  SUM(equity_24m)::text as actual,
  ABS(SUM(equity_24m) - 1825614700) / 1825614700 * 100,
  20,
  CASE WHEN ABS(SUM(equity_24m) - 1825614700) / 1825614700 * 100 <= 20 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp', 'CustomerEquitySnapshot', 'at_risk_equity',
  '98424070' as expected,
  SUM(CASE WHEN risk_level = 'high' THEN equity_12m ELSE 0 END)::text as actual,
  ABS(SUM(CASE WHEN risk_level = 'high' THEN equity_12m ELSE 0 END) - 98424070) / 98424070 * 100,
  20,
  CASE WHEN ABS(SUM(CASE WHEN risk_level = 'high' THEN equity_12m ELSE 0 END) - 98424070) / 98424070 * 100 <= 20 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ActiveCustomersCard
INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp', 'ActiveCustomersCard', 'customers_with_equity',
  '500' as expected,
  COUNT(*)::text as actual,
  ABS(COUNT(*) - 500)::numeric / 500 * 100,
  0,
  CASE WHEN COUNT(*) = 500 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- TEST 2: CDP Explore (/cdp/explore)
-- ============================================================================
\echo ''
\echo '🔍 Testing: CDP Explore (/cdp/explore)'
\echo '─────────────────────────────────────────'

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp/explore', 'CustomerResearchTable', 'customers_with_orders',
  '300' as expected,
  COUNT(DISTINCT customer_id)::text as actual,
  ABS(COUNT(DISTINCT customer_id) - 300)::numeric / 300 * 100,
  5,
  CASE WHEN ABS(COUNT(DISTINCT customer_id) - 300)::numeric / 300 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- TEST 3: CDP LTV Engine (/cdp/ltv-engine)
-- ============================================================================
\echo ''
\echo '💰 Testing: CDP LTV Engine (/cdp/ltv-engine)'
\echo '─────────────────────────────────────────'

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp/ltv-engine', 'Overview', 'total_net_revenue',
  '2346175150' as expected,
  SUM(net_revenue)::text as actual,
  ABS(SUM(net_revenue) - 2346175150) / 2346175150 * 100,
  10,
  CASE WHEN ABS(SUM(net_revenue) - 2346175150) / 2346175150 * 100 <= 10 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp/ltv-engine', 'Overview', 'avg_equity_12m',
  '2455517' as expected,
  AVG(equity_12m)::text as actual,
  ABS(AVG(equity_12m) - 2455517) / 2455517 * 100,
  20,
  CASE WHEN ABS(AVG(equity_12m) - 2455517) / 2455517 * 100 <= 20 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Risk level distribution
INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp/ltv-engine', 'ByRisk', 'low_risk_count',
  '100' as expected,
  COUNT(*)::text as actual,
  ABS(COUNT(*) - 100)::numeric / 100 * 100,
  5,
  CASE WHEN ABS(COUNT(*) - 100)::numeric / 100 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' AND risk_level = 'low';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp/ltv-engine', 'ByRisk', 'medium_risk_count',
  '150' as expected,
  COUNT(*)::text as actual,
  ABS(COUNT(*) - 150)::numeric / 150 * 100,
  5,
  CASE WHEN ABS(COUNT(*) - 150)::numeric / 150 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' AND risk_level = 'medium';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/cdp/ltv-engine', 'ByRisk', 'high_risk_count',
  '250' as expected,
  COUNT(*)::text as actual,
  ABS(COUNT(*) - 250)::numeric / 250 * 100,
  5,
  CASE WHEN ABS(COUNT(*) - 250)::numeric / 250 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' AND risk_level = 'high';

-- ============================================================================
-- TEST 4: FDP Dashboard (/dashboard)
-- ============================================================================
\echo ''
\echo '📈 Testing: FDP Dashboard (/dashboard)'
\echo '─────────────────────────────────────────'

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/dashboard', 'RevenueCard', 'total_orders',
  '5500' as expected,
  COUNT(*)::text as actual,
  ABS(COUNT(*) - 5500)::numeric / 5500 * 100,
  2,
  CASE WHEN ABS(COUNT(*) - 5500)::numeric / 5500 * 100 <= 2 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/dashboard', 'COGSCard', 'cogs_percent',
  '53' as expected,
  (SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100)::text as actual,
  ABS((SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100) - 53),
  2,
  CASE WHEN ABS((SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100) - 53) <= 2 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Channel breakdown
INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/dashboard', 'ChannelBreakdown', 'shopee_orders',
  '2200' as expected,
  COUNT(*)::text as actual,
  ABS(COUNT(*) - 2200)::numeric / 2200 * 100,
  5,
  CASE WHEN ABS(COUNT(*) - 2200)::numeric / 2200 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' AND channel = 'Shopee';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/dashboard', 'ChannelBreakdown', 'lazada_orders',
  '1375' as expected,
  COUNT(*)::text as actual,
  ABS(COUNT(*) - 1375)::numeric / 1375 * 100,
  5,
  CASE WHEN ABS(COUNT(*) - 1375)::numeric / 1375 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' AND channel = 'Lazada';

-- ============================================================================
-- TEST 5: MDP Profit (/mdp/profit)
-- ============================================================================
\echo ''
\echo '💵 Testing: MDP Profit Attribution (/mdp/profit)'
\echo '─────────────────────────────────────────'

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/mdp/profit', 'ChannelTable', 'shopee_revenue',
  '857164000' as expected,
  SUM(net_revenue)::text as actual,
  ABS(SUM(net_revenue) - 857164000) / 857164000 * 100,
  5,
  CASE WHEN ABS(SUM(net_revenue) - 857164000) / 857164000 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' AND channel = 'Shopee';

-- ============================================================================
-- TEST 6: Cross-Module Data
-- ============================================================================
\echo ''
\echo '🔗 Testing: Cross-Module Integration'
\echo '─────────────────────────────────────────'

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  'cross-module', 'fdp_locked_costs', 'row_count',
  '18' as expected,
  COUNT(*)::text as actual,
  0,
  0,
  CASE WHEN COUNT(*) >= 18 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM fdp_locked_costs
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  'cross-module', 'cdp_segment_ltv', 'row_count',
  '4' as expected,
  COUNT(*)::text as actual,
  0,
  0,
  CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_segment_ltv_for_mdp
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  'cross-module', 'cdp_cohort_cac', 'row_count',
  '100' as expected,
  COUNT(*)::text as actual,
  ABS(COUNT(*) - 100)::numeric / 100 * 100,
  5,
  CASE WHEN ABS(COUNT(*) - 100)::numeric / 100 * 100 <= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customer_cohort_cac
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- TEST 7: Control Tower
-- ============================================================================
\echo ''
\echo '🎯 Testing: Control Tower (/control-tower/*)'
\echo '─────────────────────────────────────────'

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/control-tower/ceo', 'VarianceAlerts', 'count',
  '7' as expected,
  COUNT(*)::text as actual,
  0,
  0,
  CASE WHEN COUNT(*) BETWEEN 5 AND 10 THEN '✅ PASS' ELSE '⚠️ WARN' END
FROM cross_domain_variance_alerts
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_test_results (screen, component, metric, expected_value, actual_value, variance_percent, tolerance_percent, status)
SELECT 
  '/control-tower/ceo', 'PriorityQueue', 'count',
  '12' as expected,
  COUNT(*)::text as actual,
  0,
  0,
  CASE WHEN COUNT(*) BETWEEN 5 AND 20 THEN '✅ PASS' ELSE '⚠️ WARN' END
FROM control_tower_priority_queue
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- FINAL REPORT
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '                         FINAL TEST REPORT                              '
\echo '═══════════════════════════════════════════════════════════════════════'

-- Summary by screen
SELECT 
  screen,
  COUNT(*) as total_tests,
  COUNT(*) FILTER (WHERE status LIKE '%PASS%') as passed,
  COUNT(*) FILTER (WHERE status LIKE '%FAIL%') as failed,
  COUNT(*) FILTER (WHERE status LIKE '%WARN%') as warnings
FROM e2e_test_results
GROUP BY screen
ORDER BY screen;

\echo ''
\echo '─────────────────────────────────────────────────────────────────────'

-- Detailed results
SELECT 
  screen,
  component,
  metric,
  expected_value,
  actual_value,
  ROUND(variance_percent, 1) as variance_pct,
  tolerance_percent as tolerance,
  status
FROM e2e_test_results
ORDER BY screen, component, metric;

\echo ''
\echo '─────────────────────────────────────────────────────────────────────'

-- Overall summary
SELECT 
  'OVERALL' as summary,
  COUNT(*) as total_tests,
  COUNT(*) FILTER (WHERE status LIKE '%PASS%') as passed,
  COUNT(*) FILTER (WHERE status LIKE '%FAIL%') as failed,
  COUNT(*) FILTER (WHERE status LIKE '%WARN%') as warnings,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status LIKE '%FAIL%') = 0 THEN '✅ ALL TESTS PASSED'
    WHEN COUNT(*) FILTER (WHERE status LIKE '%FAIL%') <= 2 THEN '⚠️ MINOR ISSUES'
    ELSE '❌ SIGNIFICANT FAILURES'
  END as final_status
FROM e2e_test_results;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
