-- ============================================================================
-- E2E TEST SUITE - SCRIPT 99: CLEANUP TEST DATA
-- ============================================================================
-- Removes all test data for tenant: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
-- ============================================================================

DO $$
DECLARE v_tenant_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
BEGIN
  -- L4
  DELETE FROM control_tower_priority_queue WHERE tenant_id = v_tenant_id;
  DELETE FROM decision_cards WHERE tenant_id = v_tenant_id;
  DELETE FROM alert_instances WHERE tenant_id = v_tenant_id;
  DELETE FROM intelligent_alert_rules WHERE tenant_id = v_tenant_id;
  DELETE FROM cross_domain_variance_alerts WHERE tenant_id = v_tenant_id;
  
  -- L3
  DELETE FROM kpi_targets WHERE tenant_id = v_tenant_id;
  DELETE FROM kpi_facts_daily WHERE tenant_id = v_tenant_id;
  DELETE FROM kpi_definitions WHERE tenant_id = v_tenant_id;
  DELETE FROM fdp_locked_costs WHERE tenant_id = v_tenant_id;
  DELETE FROM cdp_segment_ltv_for_mdp WHERE tenant_id = v_tenant_id;
  DELETE FROM cdp_customer_cohort_cac WHERE tenant_id = v_tenant_id;
  
  -- L2
  DELETE FROM cdp_order_items WHERE tenant_id = v_tenant_id;
  DELETE FROM cdp_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM cdp_customers WHERE tenant_id = v_tenant_id;
  DELETE FROM products WHERE tenant_id = v_tenant_id;
  
  -- L1.5
  DELETE FROM data_watermarks WHERE tenant_id = v_tenant_id;
  DELETE FROM ingestion_batches WHERE tenant_id = v_tenant_id;
  
  -- L1
  DELETE FROM connector_integrations WHERE tenant_id = v_tenant_id;
  DELETE FROM tenants WHERE id = v_tenant_id;
  
  RAISE NOTICE '✅ Cleaned up all test data for tenant %', v_tenant_id;
END $$;
