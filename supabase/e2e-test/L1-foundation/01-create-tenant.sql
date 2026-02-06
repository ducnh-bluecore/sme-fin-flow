-- ============================================================================
-- E2E TEST SUITE - SCRIPT 01: CREATE TEST TENANT (L1 Foundation)
-- ============================================================================
-- Architecture: v1.4.2 Layer 1 - Foundation
-- Creates:
--   - 1 Tenant (E2E Test Company)
--   - 4 Connector Integrations (Shopee, Lazada, TikTok Shop, Website)
-- ============================================================================

-- Tenant ID used throughout all scripts
DO $$
DECLARE
  v_tenant_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_tenant_name TEXT := 'E2E Test Company';
BEGIN
  -- Check if tenant exists
  IF EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id) THEN
    RAISE NOTICE 'Tenant % already exists, skipping creation.', v_tenant_id;
  ELSE
    -- Create new tenant
    INSERT INTO tenants (id, name, slug, plan, is_active, settings)
    VALUES (
      v_tenant_id,
      v_tenant_name,
      'e2e-test-company',
      'pro',  -- Pro plan for full feature testing
      true,
      jsonb_build_object(
        'currency', 'VND',
        'timezone', 'Asia/Ho_Chi_Minh',
        'fiscal_year_start', 1,
        'e2e_test', true,
        'created_for', 'E2E Testing Suite v1.4.2',
        'test_period', '01/2024 - 01/2027',
        'architecture_version', 'v1.4.2'
      )
    );
    
    RAISE NOTICE 'Created tenant: % (%)', v_tenant_name, v_tenant_id;
  END IF;
END $$;

-- Create connector integrations (channel accounts)
INSERT INTO connector_integrations (
  id, tenant_id, connector_type, connector_name, 
  shop_id, shop_name, status, created_at
)
VALUES
  -- Shopee
  ('eeeeeeee-1111-1111-1111-111111111111', 
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
   'shopee', 'E2E Test Shopee', 
   'e2e-shopee-001', 'E2E Test Shopee', 
   'active', '2024-01-01'::timestamptz),
   
  -- Lazada
  ('eeeeeeee-2222-2222-2222-222222222222', 
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
   'lazada', 'E2E Test Lazada', 
   'e2e-lazada-001', 'E2E Test Lazada', 
   'active', '2024-01-01'::timestamptz),
   
  -- TikTok Shop
  ('eeeeeeee-3333-3333-3333-333333333333', 
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
   'tiktok_shop', 'E2E Test TikTok', 
   'e2e-tiktok-001', 'E2E Test TikTok', 
   'active', '2024-01-01'::timestamptz),
   
  -- Website (WooCommerce)
  ('eeeeeeee-4444-4444-4444-444444444444', 
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
   'woocommerce', 'E2E Test Website', 
   'e2e-web-001', 'E2E Test Website', 
   'active', '2024-01-01'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L1_FOUNDATION: TENANT CREATED' as status,
  id as tenant_id,
  name as tenant_name,
  slug,
  plan,
  settings->>'architecture_version' as architecture
FROM tenants
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'L1_FOUNDATION: CONNECTORS' as status,
  COUNT(*) as connector_count,
  jsonb_agg(connector_type ORDER BY connector_type) as connector_types
FROM connector_integrations
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
