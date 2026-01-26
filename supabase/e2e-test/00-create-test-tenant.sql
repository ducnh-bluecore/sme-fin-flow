-- ============================================================================
-- E2E TEST SUITE - SCRIPT 00: CREATE TEST TENANT
-- ============================================================================
-- Tạo tenant trắng hoàn toàn mới để test hệ thống từ đầu đến cuối
-- Tenant ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee (dễ nhớ cho testing)
-- ============================================================================

-- Tenant ID dùng xuyên suốt
DO $$
DECLARE
  v_tenant_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_tenant_name TEXT := 'E2E Test Company';
BEGIN
  -- Kiểm tra tenant đã tồn tại chưa
  IF EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id) THEN
    RAISE NOTICE 'Tenant % đã tồn tại, bỏ qua tạo mới.', v_tenant_id;
  ELSE
    -- Tạo tenant mới
    INSERT INTO tenants (id, name, slug, plan, is_active, settings)
    VALUES (
      v_tenant_id,
      v_tenant_name,
      'e2e-test-company',
      'pro',  -- Pro plan để test đầy đủ features
      true,
      jsonb_build_object(
        'currency', 'VND',
        'timezone', 'Asia/Ho_Chi_Minh',
        'fiscal_year_start', 1,
        'e2e_test', true,
        'created_for', 'E2E Testing Suite',
        'test_period', '01/2024 - 26/01/2026'
      )
    );
    
    RAISE NOTICE 'Đã tạo tenant: % (%)', v_tenant_name, v_tenant_id;
  END IF;
END $$;

-- Tạo connector integrations cần thiết cho test data (với đúng schema)
INSERT INTO connector_integrations (id, tenant_id, connector_type, connector_name, shop_id, shop_name, status, created_at)
VALUES
  ('eeeeeeee-1111-1111-1111-111111111111', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
   'shopee', 'E2E Test Shopee', 'e2e-shopee-001', 'E2E Test Shopee', 'active', '2024-01-01'::timestamptz),
  ('eeeeeeee-2222-2222-2222-222222222222', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
   'lazada', 'E2E Test Lazada', 'e2e-lazada-001', 'E2E Test Lazada', 'active', '2024-01-01'::timestamptz),
  ('eeeeeeee-3333-3333-3333-333333333333', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
   'tiktok_shop', 'E2E Test TikTok', 'e2e-tiktok-001', 'E2E Test TikTok', 'active', '2024-01-01'::timestamptz),
  ('eeeeeeee-4444-4444-4444-444444444444', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
   'woocommerce', 'E2E Test Website', 'e2e-web-001', 'E2E Test Website', 'active', '2024-01-01'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- Thông báo kết quả
SELECT 
  'E2E Test Tenant Created' as status,
  id as tenant_id,
  name as tenant_name,
  slug,
  plan,
  settings->>'test_period' as test_period
FROM tenants
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
