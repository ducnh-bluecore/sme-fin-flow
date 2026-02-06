-- ============================================================================
-- E2E TEST SUITE - SCRIPT 02: ORGANIZATIONS (L1 Foundation)
-- ============================================================================
-- Architecture: v1.4.2 Layer 1 - Foundation
-- Creates:
--   - 1 Organization (OLV Boutique)
--   - 3 Organization Members (owner, admin, analyst)
--   - 4 Channel Accounts (mapped to connector integrations)
-- ============================================================================

-- Clean existing data
DELETE FROM organization_members 
WHERE organization_id IN (
  SELECT id FROM organizations 
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
);

DELETE FROM organizations 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- CREATE ORGANIZATION
-- ============================================================================
INSERT INTO organizations (
  id, tenant_id, name, slug, settings, created_at
)
VALUES (
  'bbbbbbbb-1111-1111-1111-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'OLV Boutique',
  'olv-boutique',
  jsonb_build_object(
    'industry', 'fashion_retail',
    'currency', 'VND',
    'timezone', 'Asia/Ho_Chi_Minh',
    'fiscal_year_start', 1,
    'e2e_test', true
  ),
  '2024-01-01'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- ============================================================================
-- CREATE ORGANIZATION MEMBERS
-- ============================================================================
INSERT INTO organization_members (
  id, organization_id, user_id, role, permissions, status, created_at
)
VALUES
  -- Owner
  ('cccccccc-0001-0001-0001-000000000001',
   'bbbbbbbb-1111-1111-1111-111111111111',
   'dddddddd-0001-0001-0001-000000000001',  -- Placeholder user_id
   'owner',
   jsonb_build_object(
     'full_access', true,
     'can_manage_members', true,
     'can_manage_billing', true,
     'can_export_data', true
   ),
   'active',
   '2024-01-01'::timestamptz),
   
  -- Admin
  ('cccccccc-0001-0001-0001-000000000002',
   'bbbbbbbb-1111-1111-1111-111111111111',
   'dddddddd-0001-0001-0001-000000000002',
   'admin',
   jsonb_build_object(
     'full_access', false,
     'can_manage_members', true,
     'can_manage_billing', false,
     'can_export_data', true
   ),
   'active',
   '2024-01-01'::timestamptz),
   
  -- Analyst
  ('cccccccc-0001-0001-0001-000000000003',
   'bbbbbbbb-1111-1111-1111-111111111111',
   'dddddddd-0001-0001-0001-000000000003',
   'analyst',
   jsonb_build_object(
     'full_access', false,
     'can_manage_members', false,
     'can_manage_billing', false,
     'can_export_data', true,
     'read_only', false
   ),
   'active',
   '2024-01-01'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions;

-- ============================================================================
-- CREATE CHANNEL ACCOUNTS (link to connector_integrations)
-- ============================================================================
-- Check if channel_accounts table exists, create entries if so
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_accounts') THEN
    DELETE FROM channel_accounts 
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    INSERT INTO channel_accounts (
      id, tenant_id, organization_id, connector_integration_id,
      channel_name, channel_type, status, settings, created_at
    )
    VALUES
      -- Shopee
      ('ffffffff-0001-0001-0001-000000000001',
       'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
       'bbbbbbbb-1111-1111-1111-111111111111',
       'eeeeeeee-1111-1111-1111-111111111111',
       'Shopee Store', 'marketplace', 'active',
       jsonb_build_object('fee_percent', 6, 'sync_frequency', 'hourly'),
       '2024-01-01'::timestamptz),
       
      -- Lazada
      ('ffffffff-0001-0001-0001-000000000002',
       'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
       'bbbbbbbb-1111-1111-1111-111111111111',
       'eeeeeeee-2222-2222-2222-222222222222',
       'Lazada Store', 'marketplace', 'active',
       jsonb_build_object('fee_percent', 5, 'sync_frequency', 'hourly'),
       '2024-01-01'::timestamptz),
       
      -- TikTok Shop
      ('ffffffff-0001-0001-0001-000000000003',
       'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
       'bbbbbbbb-1111-1111-1111-111111111111',
       'eeeeeeee-3333-3333-3333-333333333333',
       'TikTok Shop', 'social_commerce', 'active',
       jsonb_build_object('fee_percent', 4, 'sync_frequency', 'hourly'),
       '2024-01-01'::timestamptz),
       
      -- Website
      ('ffffffff-0001-0001-0001-000000000004',
       'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
       'bbbbbbbb-1111-1111-1111-111111111111',
       'eeeeeeee-4444-4444-4444-444444444444',
       'Official Website', 'website', 'active',
       jsonb_build_object('fee_percent', 0, 'sync_frequency', 'realtime'),
       '2024-01-01'::timestamptz)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created 4 channel accounts';
  ELSE
    RAISE NOTICE 'channel_accounts table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L1_FOUNDATION: ORGANIZATION' as layer,
  o.name as org_name,
  o.slug as org_slug,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as member_count,
  o.settings->>'industry' as industry
FROM organizations o
WHERE o.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'L1_FOUNDATION: MEMBERS' as layer,
  role,
  status,
  permissions->>'full_access' as full_access
FROM organization_members
WHERE organization_id = 'bbbbbbbb-1111-1111-1111-111111111111'
ORDER BY 
  CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END;
