-- ============================================================================
-- E2E BIGQUERY SYNC TEST - SCRIPT 01: SETUP
-- ============================================================================
-- Architecture v1.4.2 - Test flow: BigQuery → L2 → L3 → L4
-- Tenant ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
-- ============================================================================

-- 1. Create industry assumption (required for tenant trigger)
INSERT INTO ltv_industry_assumptions (industry_code, industry_name, assumptions)
VALUES (
  'retail_general',
  'Retail General',
  '{"avg_annual_retention": 0.6, "avg_discount_rate": 0.1, "avg_contribution_margin": 0.3}'::jsonb
) ON CONFLICT (industry_code) DO NOTHING;

-- 2. Create test tenant
INSERT INTO tenants (id, name, slug, plan, is_active, settings, tier)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'E2E BigQuery Test',
  'e2e-bq-test',
  'pro',
  true,
  '{"currency": "VND", "timezone": "Asia/Ho_Chi_Minh", "e2e_test": true}'::jsonb,
  'smb'
) ON CONFLICT (id) DO UPDATE SET 
  name = 'E2E BigQuery Test',
  is_active = true;

-- 3. Create BigQuery config
INSERT INTO bigquery_configs (tenant_id, project_id, is_active)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'bluecore-dcp',
  true
) ON CONFLICT (tenant_id) DO UPDATE SET 
  is_active = true,
  project_id = 'bluecore-dcp';

-- 4. Create connector integration
INSERT INTO connector_integrations (id, tenant_id, connector_type, connector_name, shop_id, shop_name, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'bigquery',
  'BigQuery - Shopee',
  'shopee-bq-001',
  'Shopee BigQuery',
  'active'
) ON CONFLICT (id) DO UPDATE SET status = 'active';

-- 5. Create data model for sync
-- NOTE: Using olvboutique_shopee dataset (accessible by service account)
INSERT INTO bigquery_data_models (
  tenant_id, model_name, model_label, bigquery_dataset, bigquery_table,
  primary_key_field, timestamp_field, target_table, is_enabled, sync_frequency_hours
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'shopee_orders',
  'Shopee Orders',
  'olvboutique_shopee',
  'shopee_Orders',
  'order_sn',
  'create_time',
  'cdp_orders',
  true,
  1
)
ON CONFLICT DO NOTHING;

-- Verify setup
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.tier,
  bc.project_id as bq_project,
  bc.is_active as bq_active,
  ci.connector_type,
  ci.status as connector_status,
  bdm.model_name,
  bdm.bigquery_dataset || '.' || bdm.bigquery_table as bq_source,
  bdm.target_table
FROM tenants t
LEFT JOIN bigquery_configs bc ON bc.tenant_id = t.id
LEFT JOIN connector_integrations ci ON ci.tenant_id = t.id
LEFT JOIN bigquery_data_models bdm ON bdm.tenant_id = t.id
WHERE t.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
