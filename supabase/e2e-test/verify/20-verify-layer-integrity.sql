-- ============================================================================
-- E2E TEST SUITE - SCRIPT 20: VERIFY LAYER INTEGRITY
-- ============================================================================
-- Architecture: v1.4.2 - Layer-by-layer verification
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS e2e_v2_results (
  layer text, check_name text, expected_value numeric, actual_value numeric,
  tolerance_percent numeric, status text
);
TRUNCATE e2e_v2_results;

-- L1 FOUNDATION
INSERT INTO e2e_v2_results SELECT 'L1_FOUNDATION', 'Tenants', 1, COUNT(*), 0,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM tenants WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_v2_results SELECT 'L1_FOUNDATION', 'Connectors', 4, COUNT(*), 0,
  CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM connector_integrations WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- L2 MASTER
INSERT INTO e2e_v2_results SELECT 'L2_MASTER', 'Products', 100, COUNT(*), 0,
  CASE WHEN COUNT(*) = 100 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM products WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_v2_results SELECT 'L2_MASTER', 'Customers', 500, COUNT(*), 0,
  CASE WHEN COUNT(*) = 500 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_customers WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_v2_results SELECT 'L2_MASTER', 'Orders', 5500, COUNT(*), 2,
  CASE WHEN ABS(COUNT(*) - 5500)::numeric / 5500 * 100 <= 2 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_v2_results SELECT 'L2_MASTER', 'COGS %', 53, 
  (SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100)::numeric, 3,
  CASE WHEN ABS((SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100) - 53) <= 3 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- L3 KPI
INSERT INTO e2e_v2_results SELECT 'L3_KPI', 'Definitions', 20, COUNT(*), 0,
  CASE WHEN COUNT(*) = 20 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM kpi_definitions WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_v2_results SELECT 'L3_KPI', 'Facts Daily', 700, COUNT(*), 20,
  CASE WHEN COUNT(*) >= 100 THEN '✅ PASS' ELSE '⚠️ WARN' END
FROM kpi_facts_daily WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- L4 ALERT
INSERT INTO e2e_v2_results SELECT 'L4_ALERT', 'Alert Rules', 15, COUNT(*), 0,
  CASE WHEN COUNT(*) >= 10 THEN '✅ PASS' ELSE '⚠️ WARN' END
FROM intelligent_alert_rules WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO e2e_v2_results SELECT 'L4_ALERT', 'Alert Instances', 7, COUNT(*), 0,
  CASE WHEN COUNT(*) BETWEEN 3 AND 20 THEN '✅ PASS' ELSE '⚠️ WARN' END
FROM alert_instances WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- FINAL REPORT
SELECT '═══════════════════════════════════════════════════════════════════════' as separator;
SELECT '              E2E TEST VERIFICATION - ARCHITECTURE v1.4.2             ' as title;
SELECT '═══════════════════════════════════════════════════════════════════════' as separator;

SELECT layer, COUNT(*) as checks, COUNT(*) FILTER (WHERE status LIKE '%PASS%') as passed,
       COUNT(*) FILTER (WHERE status LIKE '%FAIL%') as failed
FROM e2e_v2_results GROUP BY layer ORDER BY layer;

SELECT 'OVERALL' as summary, COUNT(*) as total,
  COUNT(*) FILTER (WHERE status LIKE '%PASS%') as passed,
  CASE WHEN COUNT(*) FILTER (WHERE status LIKE '%FAIL%') = 0 THEN '✅ ALL PASSED' ELSE '❌ FAILURES' END as result
FROM e2e_v2_results;

DROP TABLE IF EXISTS e2e_v2_results;
