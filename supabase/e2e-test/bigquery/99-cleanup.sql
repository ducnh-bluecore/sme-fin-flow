-- ============================================================================
-- E2E BIGQUERY SYNC TEST - SCRIPT 99: CLEANUP
-- ============================================================================
-- Remove all test data for tenant: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
-- ============================================================================

DO $$
DECLARE 
  v_tenant_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_integration_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- L4 Alerts
  DELETE FROM alert_instances WHERE tenant_id = v_tenant_id;
  
  -- L3 KPI/Metrics
  DELETE FROM central_metric_facts WHERE tenant_id = v_tenant_id;
  
  -- L2 Master Model
  DELETE FROM cdp_order_items WHERE tenant_id = v_tenant_id;
  DELETE FROM cdp_orders WHERE tenant_id = v_tenant_id;
  
  -- L1.5 Ingestion
  DELETE FROM bigquery_sync_watermarks WHERE tenant_id = v_tenant_id;
  DELETE FROM bigquery_data_models WHERE tenant_id = v_tenant_id;
  
  -- L1 Config
  DELETE FROM bigquery_configs WHERE tenant_id = v_tenant_id;
  DELETE FROM connector_integrations WHERE id = v_integration_id;
  
  -- L0 Tenant
  DELETE FROM tenant_ltv_config WHERE tenant_id = v_tenant_id;
  DELETE FROM tenants WHERE id = v_tenant_id;
  
  RAISE NOTICE '✅ Cleaned up all test data for tenant %', v_tenant_id;
END $$;

-- Verify cleanup
SELECT 
  'tenants' as table_name,
  COUNT(*) as remaining
FROM tenants WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 'cdp_orders', COUNT(*) FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 'alert_instances', COUNT(*) FROM alert_instances WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
