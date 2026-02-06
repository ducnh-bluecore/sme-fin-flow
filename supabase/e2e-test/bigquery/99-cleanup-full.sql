-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 99: CLEANUP
-- ============================================================================
-- Remove all test data for tenant: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
-- Run this to reset and rerun tests
-- ============================================================================

DO $$
DECLARE 
  v_tenant_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
BEGIN
  RAISE NOTICE '🧹 Starting cleanup for tenant %', v_tenant_id;
  
  -- L4 Layer: Alerts
  DELETE FROM alert_instances WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted alert_instances';
  
  DELETE FROM decision_cards WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted decision_cards';
  
  -- L3 Layer: KPIs
  DELETE FROM kpi_facts_daily WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted kpi_facts_daily';
  
  DELETE FROM kpi_targets WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted kpi_targets';
  
  DELETE FROM central_metric_facts WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted central_metric_facts';
  
  -- L2 Layer: Master Model
  DELETE FROM cdp_order_items WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted cdp_order_items';
  
  DELETE FROM cdp_orders WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted cdp_orders';
  
  DELETE FROM cdp_customers WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted cdp_customers';
  
  DELETE FROM products WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted products';
  
  -- L1.5 Layer: Ingestion
  DELETE FROM bigquery_backfill_jobs WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted bigquery_backfill_jobs';
  
  DELETE FROM bigquery_sync_watermarks WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted bigquery_sync_watermarks';
  
  DELETE FROM bigquery_data_models WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted bigquery_data_models';
  
  -- L1 Layer: Config
  DELETE FROM bigquery_configs WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted bigquery_configs';
  
  DELETE FROM connector_integrations WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted connector_integrations';
  
  -- L0 Layer: Foundation
  DELETE FROM tenant_ltv_config WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted tenant_ltv_config';
  
  DELETE FROM tenants WHERE id = v_tenant_id;
  RAISE NOTICE '✓ Deleted tenant';
  
  RAISE NOTICE '🎉 Cleanup complete for tenant %', v_tenant_id;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
  '=== CLEANUP VERIFICATION ===' as section;

SELECT 
  'tenants' as table_name,
  COUNT(*) as remaining
FROM tenants WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 'cdp_orders', COUNT(*) 
FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 'cdp_customers', COUNT(*) 
FROM cdp_customers WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 'products', COUNT(*) 
FROM products WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 'kpi_facts_daily', COUNT(*) 
FROM kpi_facts_daily WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 'alert_instances', COUNT(*) 
FROM alert_instances WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 'bigquery_backfill_jobs', COUNT(*) 
FROM bigquery_backfill_jobs WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/*
============================================================================
EXPECTED RESULTS
============================================================================

All counts should be 0 after cleanup:
- tenants: 0
- cdp_orders: 0
- cdp_customers: 0
- products: 0
- kpi_facts_daily: 0
- alert_instances: 0
- bigquery_backfill_jobs: 0

============================================================================
*/
