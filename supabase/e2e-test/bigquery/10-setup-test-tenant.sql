-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 10: SETUP TEST TENANT
-- ============================================================================
-- Architecture v1.4.2 - Full Master Model Test
-- Tenant ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
-- ============================================================================

-- 1. Create industry assumption (required for tenant trigger)
INSERT INTO ltv_industry_assumptions (industry_code, industry_name, assumptions)
VALUES (
  'fashion_retail',
  'Fashion Retail',
  '{"avg_annual_retention": 0.55, "avg_discount_rate": 0.12, "avg_contribution_margin": 0.35}'::jsonb
) ON CONFLICT (industry_code) DO NOTHING;

-- 2. Create test tenant
INSERT INTO tenants (id, name, slug, plan, is_active, settings, tier)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'E2E BigQuery Full Test - OLV Boutique',
  'e2e-olv-boutique',
  'enterprise',
  true,
  jsonb_build_object(
    'currency', 'VND',
    'timezone', 'Asia/Ho_Chi_Minh',
    'fiscal_year_start', 1,
    'e2e_test', true,
    'created_for', 'E2E Full Master Model Test v1.4.2',
    'test_period', '01/2025 - 01/2027',
    'architecture_version', 'v1.4.2',
    'industry', 'fashion_retail',
    'expected_records', jsonb_build_object(
      'customers', 350000,
      'products', 16700,
      'orders', 560000,
      'order_items', 1200000,
      'inventory', 3900000
    )
  ),
  'midmarket'
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true,
  settings = EXCLUDED.settings;

-- 3. Create BigQuery config
INSERT INTO bigquery_configs (tenant_id, project_id, is_active)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'bluecore-dcp',
  true
) ON CONFLICT (tenant_id) DO UPDATE SET 
  is_active = true,
  project_id = 'bluecore-dcp';

-- 4. Create connector integrations for all channels
INSERT INTO connector_integrations (id, tenant_id, connector_type, connector_name, shop_id, shop_name, status)
VALUES 
  -- BigQuery integration (main)
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'bigquery', 'BigQuery - OLV Boutique', 'bq-olv-001', 'OLV BigQuery', 'active'),
  
  -- Shopee
  ('22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'shopee', 'Shopee OLV', 'shopee-olv-001', 'OLV Shopee Store', 'active'),
  
  -- Lazada
  ('33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'lazada', 'Lazada OLV', 'lazada-olv-001', 'OLV Lazada Store', 'active'),
  
  -- TikTok Shop
  ('44444444-4444-4444-4444-444444444444',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'tiktok_shop', 'TikTok OLV', 'tiktok-olv-001', 'OLV TikTok Shop', 'active'),
  
  -- Tiki
  ('55555555-5555-5555-5555-555555555555',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'tiki', 'Tiki OLV', 'tiki-olv-001', 'OLV Tiki Store', 'active'),
  
  -- KiotViet (POS)
  ('66666666-6666-6666-6666-666666666666',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'kiotviet', 'KiotViet OLV', 'kov-olv-001', 'OLV KiotViet POS', 'active'),
  
  -- Haravan (Website)
  ('77777777-7777-7777-7777-777777777777',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'haravan', 'Haravan OLV', 'hrv-olv-001', 'OLV Haravan Website', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

-- 5. Create BigQuery data models for sync
INSERT INTO bigquery_data_models (
  tenant_id, model_name, model_label, bigquery_dataset, bigquery_table,
  primary_key_field, timestamp_field, target_table, is_enabled, sync_frequency_hours
) VALUES 
  -- Customer sources
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'kiotviet_customers', 'KiotViet Customers',
   'olvboutique_kiotviet', 'raw_kiotviet_Customers',
   'CusId', 'CreatedDate', 'cdp_customers', true, 6),
  
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'haravan_customers', 'Haravan Customers',
   'olvboutique_haravan', 'raw_hrv_Customers',
   'CusId', 'Created_at', 'cdp_customers', true, 6),
  
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'bcapp_members', 'BCApp Members',
   'olvboutique_bcapp', 'BCApp_MemberInfo',
   'id', 'CreatedAt', 'cdp_customers', true, 6),
  
  -- Product source
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'master_products', 'Master Products',
   'olvboutique_kiotviet', 'bdm_master_data_products',
   'ItemId', 'ModifiedDate', 'products', true, 24),
  
  -- Order sources
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'shopee_orders', 'Shopee Orders',
   'olvboutique_shopee', 'shopee_Orders',
   'order_sn', 'create_time', 'cdp_orders', true, 1),
  
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'lazada_orders', 'Lazada Orders',
   'olvboutique_lazada', 'lazada_Orders',
   'order_id', 'created_at', 'cdp_orders', true, 1),
  
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'tiktok_orders', 'TikTok Orders',
   'olvboutique_tiktokshop', 'tiktok_Orders',
   'id', 'create_time', 'cdp_orders', true, 1),
  
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'tiki_orders', 'Tiki Orders',
   'olvboutique_tiki', 'tiki_Orders',
   'code', 'created_at', 'cdp_orders', true, 1),
  
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'kiotviet_orders', 'KiotViet Orders',
   'olvboutique_kiotviet', 'raw_kiotviet_Orders',
   'Id', 'PurchaseDate', 'cdp_orders', true, 1),
  
  -- Inventory source
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'inventory_movements', 'Inventory Movements',
   'olvboutique_kiotviet', 'bdm_kov_xuat_nhap_ton',
   'id', 'NgayChungTu', 'inventory_movements', true, 4)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L1_FOUNDATION: TENANT CREATED' as status,
  t.id as tenant_id,
  t.name as tenant_name,
  t.tier,
  t.settings->>'architecture_version' as architecture,
  bc.project_id as bq_project,
  bc.is_active as bq_active
FROM tenants t
LEFT JOIN bigquery_configs bc ON bc.tenant_id = t.id
WHERE t.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'L1_FOUNDATION: CONNECTORS' as status,
  COUNT(*) as connector_count,
  jsonb_agg(jsonb_build_object('type', connector_type, 'name', connector_name)) as connectors
FROM connector_integrations
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'L10_BIGQUERY: DATA MODELS' as status,
  COUNT(*) as model_count,
  jsonb_agg(jsonb_build_object('model', model_name, 'source', bigquery_dataset || '.' || bigquery_table)) as models
FROM bigquery_data_models
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
