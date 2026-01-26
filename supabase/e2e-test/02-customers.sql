-- ============================================================================
-- E2E TEST SUITE - SCRIPT 02: CUSTOMERS (500 Unique Customers)
-- ============================================================================
-- Tạo 500 khách hàng với tiering theo giá trị:
--   - Platinum: 25 KH (5%) - first_order 01-03/2024, high frequency
--   - Gold: 75 KH (15%) - first_order 01-06/2024, medium-high frequency
--   - Silver: 150 KH (30%) - first_order 01-12/2024, medium frequency
--   - Bronze: 250 KH (50%) - first_order scattered, low frequency
--
-- EXPECTED VALUES:
--   - Total Customers: 500
--   - Active (last 90 days): ~200 (40%)
--   - At-risk (90-180 days): ~100 (20%)
--   - Dormant (>180 days): ~200 (40%)
-- ============================================================================

-- Xóa customers cũ của tenant test (nếu có)
DELETE FROM cdp_customers 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Insert 500 customers với tiering pattern
INSERT INTO cdp_customers (
  id, tenant_id, canonical_key, first_order_at, last_order_at, status, created_at
)
-- PLATINUM: 25 customers (IDs 1-25)
-- First order: Jan-Mar 2024, Last order: Dec 2025 - Jan 2026 (still active)
SELECT
  ('22222222-0001-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'platinum_customer_' || LPAD(n::text, 3, '0') as canonical_key,
  -- First order: scattered in Jan-Mar 2024
  ('2024-01-01'::date + (n * 3 || ' days')::interval)::timestamptz as first_order_at,
  -- Last order: Dec 2025 - Jan 2026 (still active)
  ('2025-12-01'::date + ((n % 56) || ' days')::interval)::timestamptz as last_order_at,
  'ACTIVE' as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 25) as n

UNION ALL

-- GOLD: 75 customers (IDs 26-100)
-- First order: Jan-Jun 2024, Last order: Oct-Jan 2026 (mostly active)
SELECT
  ('22222222-0002-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'gold_customer_' || LPAD(n::text, 3, '0') as canonical_key,
  -- First order: scattered Jan-Jun 2024
  ('2024-01-01'::date + ((n * 2) || ' days')::interval)::timestamptz as first_order_at,
  -- Last order: Oct 2025 - Jan 2026 (mostly active, some at-risk)
  ('2025-10-01'::date + ((n % 117) || ' days')::interval)::timestamptz as last_order_at,
  CASE WHEN n % 5 = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 75) as n

UNION ALL

-- SILVER: 150 customers (IDs 101-250)
-- First order: Jan-Dec 2024, Last order: scattered (mix of active/at-risk/dormant)
SELECT
  ('22222222-0003-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'silver_customer_' || LPAD(n::text, 3, '0') as canonical_key,
  -- First order: scattered throughout 2024
  ('2024-01-01'::date + ((n * 2) || ' days')::interval)::timestamptz as first_order_at,
  -- Last order: Aug 2025 - Jan 2026 (mix of statuses)
  CASE 
    WHEN n % 3 = 0 THEN ('2025-12-01'::date + ((n % 56) || ' days')::interval)::timestamptz  -- Active
    WHEN n % 3 = 1 THEN ('2025-09-01'::date + ((n % 60) || ' days')::interval)::timestamptz  -- At-risk
    ELSE ('2025-05-01'::date + ((n % 90) || ' days')::interval)::timestamptz  -- Dormant
  END as last_order_at,
  CASE WHEN n % 4 = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 150) as n

UNION ALL

-- BRONZE: 250 customers (IDs 251-500)
-- First order: scattered 2024-2026, Last order: heavily scattered (many dormant)
SELECT
  ('22222222-0004-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'bronze_customer_' || LPAD(n::text, 3, '0') as canonical_key,
  -- First order: scattered 2024-2025
  ('2024-01-01'::date + ((n * 3) || ' days')::interval)::timestamptz as first_order_at,
  -- Last order: heavily scattered (many dormant)
  CASE 
    WHEN n % 5 = 0 THEN ('2025-12-01'::date + ((n % 56) || ' days')::interval)::timestamptz  -- Active (20%)
    WHEN n % 5 = 1 THEN ('2025-09-01'::date + ((n % 60) || ' days')::interval)::timestamptz  -- At-risk (20%)
    ELSE ('2025-01-01'::date + ((n % 180) || ' days')::interval)::timestamptz  -- Dormant (60%)
  END as last_order_at,
  CASE WHEN n % 3 = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 250) as n;

-- Verification Query
SELECT 
  'CUSTOMERS VERIFICATION' as check_type,
  COUNT(*) as total_customers,
  COUNT(*) = 500 as count_ok,
  COUNT(*) FILTER (WHERE last_order_at >= '2025-10-28'::date) as active_90d,
  COUNT(*) FILTER (WHERE last_order_at >= '2025-07-29'::date AND last_order_at < '2025-10-28'::date) as at_risk_90_180d,
  COUNT(*) FILTER (WHERE last_order_at < '2025-07-29'::date) as dormant_180d_plus,
  jsonb_build_object(
    'platinum', COUNT(*) FILTER (WHERE canonical_key LIKE 'platinum%'),
    'gold', COUNT(*) FILTER (WHERE canonical_key LIKE 'gold%'),
    'silver', COUNT(*) FILTER (WHERE canonical_key LIKE 'silver%'),
    'bronze', COUNT(*) FILTER (WHERE canonical_key LIKE 'bronze%')
  ) as by_tier
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
