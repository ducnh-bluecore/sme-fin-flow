-- ============================================================================
-- E2E TEST SUITE - SCRIPT 05: MASTER CUSTOMERS (L2 Master Model)
-- ============================================================================
-- Architecture: v1.4.2 Layer 2 - Master Model (SSOT)
-- Creates 500 customers with tiering:
--   - Platinum: 25 KH (5%) - first_order 01-03/2024, high frequency
--   - Gold: 75 KH (15%) - first_order 01-06/2024, medium-high frequency
--   - Silver: 150 KH (30%) - first_order 01-12/2024, medium frequency
--   - Bronze: 250 KH (50%) - first_order scattered, low frequency
--
-- EXPECTED VALUES:
--   - Total Customers: 500
--   - Active (last 90 days): ~350 (70%)
--   - At-risk (90-180 days): ~100 (20%)
--   - Dormant (>180 days): ~50 (10%)
-- ============================================================================

-- Clean existing data
DELETE FROM cdp_customers 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Insert 500 customers with tiering pattern
INSERT INTO cdp_customers (
  id, tenant_id, canonical_key, first_order_at, last_order_at, status, created_at
)
-- PLATINUM: 25 customers (IDs 1-25)
-- First order: Jan-Mar 2024, Last order: Dec 2026 - Jan 2027 (still active)
SELECT
  ('22222222-0001-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'platinum_customer_' || LPAD(n::text, 3, '0') as canonical_key,
  ('2024-01-01'::date + (n * 3 || ' days')::interval)::timestamptz as first_order_at,
  ('2026-12-01'::date + ((n % 56) || ' days')::interval)::timestamptz as last_order_at,
  'ACTIVE' as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 25) as n

UNION ALL

-- GOLD: 75 customers (IDs 26-100)
-- First order: Jan-Jun 2024, Last order: Oct-Jan 2027 (mostly active)
SELECT
  ('22222222-0002-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'gold_customer_' || LPAD(n::text, 3, '0') as canonical_key,
  ('2024-01-01'::date + ((n * 2) || ' days')::interval)::timestamptz as first_order_at,
  ('2026-10-01'::date + ((n % 117) || ' days')::interval)::timestamptz as last_order_at,
  CASE WHEN n % 5 = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 75) as n

UNION ALL

-- SILVER: 150 customers (IDs 101-250)
-- First order: Jan-Dec 2024, Last order: scattered (mix of statuses)
SELECT
  ('22222222-0003-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'silver_customer_' || LPAD(n::text, 3, '0') as canonical_key,
  ('2024-01-01'::date + ((n * 2) || ' days')::interval)::timestamptz as first_order_at,
  CASE 
    WHEN n % 3 = 0 THEN ('2026-12-01'::date + ((n % 56) || ' days')::interval)::timestamptz
    WHEN n % 3 = 1 THEN ('2026-09-01'::date + ((n % 60) || ' days')::interval)::timestamptz
    ELSE ('2026-05-01'::date + ((n % 90) || ' days')::interval)::timestamptz
  END as last_order_at,
  CASE WHEN n % 4 = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 150) as n

UNION ALL

-- BRONZE: 250 customers (IDs 251-500)
-- First order: scattered 2024-2026, Last order: heavily scattered
SELECT
  ('22222222-0004-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'bronze_customer_' || LPAD(n::text, 3, '0') as canonical_key,
  ('2024-01-01'::date + ((n * 3) || ' days')::interval)::timestamptz as first_order_at,
  CASE 
    WHEN n % 5 = 0 THEN ('2026-12-01'::date + ((n % 56) || ' days')::interval)::timestamptz
    WHEN n % 5 = 1 THEN ('2026-09-01'::date + ((n % 60) || ' days')::interval)::timestamptz
    ELSE ('2026-01-01'::date + ((n % 180) || ' days')::interval)::timestamptz
  END as last_order_at,
  CASE WHEN n % 3 = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 250) as n;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L2_MASTER: CUSTOMERS' as layer,
  COUNT(*) as total_customers,
  COUNT(*) = 500 as count_ok,
  COUNT(*) FILTER (WHERE last_order_at >= '2026-10-28'::date) as active_90d,
  COUNT(*) FILTER (WHERE last_order_at >= '2026-07-29'::date 
                     AND last_order_at < '2026-10-28'::date) as at_risk_90_180d,
  COUNT(*) FILTER (WHERE last_order_at < '2026-07-29'::date) as dormant_180d_plus
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  CASE 
    WHEN canonical_key LIKE 'platinum%' THEN 'platinum'
    WHEN canonical_key LIKE 'gold%' THEN 'gold'
    WHEN canonical_key LIKE 'silver%' THEN 'silver'
    ELSE 'bronze'
  END as tier,
  COUNT(*) as customer_count,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY 1
ORDER BY 
  CASE 1 
    WHEN 'platinum' THEN 1 
    WHEN 'gold' THEN 2 
    WHEN 'silver' THEN 3 
    ELSE 4 
  END;
