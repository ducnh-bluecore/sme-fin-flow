-- ============================================================================
-- E2E TEST SUITE - SCRIPT 04: MASTER PRODUCTS (L2 Master Model)
-- ============================================================================
-- Architecture: v1.4.2 Layer 2 - Master Model (SSOT)
-- Creates 100 products with 5 categories and fixed pricing/COGS
--
-- Category Distribution:
--   - Áo (AO): 30 SKUs, Price 250K-450K, COGS 52-58%
--   - Quần (QU): 25 SKUs, Price 350K-550K, COGS 48-52%
--   - Váy (VA): 20 SKUs, Price 450K-650K, COGS 45-50%
--   - Phụ kiện (PK): 15 SKUs, Price 100K-200K, COGS 58-65%
--   - Giày dép (GD): 10 SKUs, Price 550K-750K, COGS 50-55%
--
-- EXPECTED VALUES:
--   - Total Products: 100
--   - Average COGS%: ~53%
--   - Average Price: ~400,000 VND
-- ============================================================================

-- Clean existing data
DELETE FROM products 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Insert 100 products with fixed patterns
INSERT INTO products (
  id, tenant_id, code, name, description, unit, unit_price, cost_price, 
  category, status, created_at
)
-- ÁO: 30 SKUs (SKU-AO-001 to SKU-AO-030)
SELECT
  ('11111111-0001-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'SKU-AO-' || LPAD(n::text, 3, '0') as code,
  'Áo thun style ' || n as name,
  'Áo thun cotton cao cấp - Style ' || n as description,
  'cái' as unit,
  (250000 + (n - 1) * 6897)::numeric as unit_price,
  ((250000 + (n - 1) * 6897) * (0.52 + (n - 1) * 0.002))::numeric as cost_price,
  'Áo' as category,
  'active' as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 30) as n

UNION ALL

-- QUẦN: 25 SKUs (SKU-QU-001 to SKU-QU-025)
SELECT
  ('11111111-0002-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'SKU-QU-' || LPAD(n::text, 3, '0') as code,
  'Quần jean style ' || n as name,
  'Quần jean cao cấp - Style ' || n as description,
  'cái' as unit,
  (350000 + (n - 1) * 8333)::numeric as unit_price,
  ((350000 + (n - 1) * 8333) * (0.48 + (n - 1) * 0.00167))::numeric as cost_price,
  'Quần' as category,
  'active' as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 25) as n

UNION ALL

-- VÁY: 20 SKUs (SKU-VA-001 to SKU-VA-020)
SELECT
  ('11111111-0003-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'SKU-VA-' || LPAD(n::text, 3, '0') as code,
  'Váy đầm style ' || n as name,
  'Váy đầm cao cấp - Style ' || n as description,
  'cái' as unit,
  (450000 + (n - 1) * 10526)::numeric as unit_price,
  ((450000 + (n - 1) * 10526) * (0.45 + (n - 1) * 0.00263))::numeric as cost_price,
  'Váy' as category,
  'active' as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 20) as n

UNION ALL

-- PHỤ KIỆN: 15 SKUs (SKU-PK-001 to SKU-PK-015)
SELECT
  ('11111111-0004-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'SKU-PK-' || LPAD(n::text, 3, '0') as code,
  'Phụ kiện style ' || n as name,
  'Phụ kiện thời trang - Style ' || n as description,
  'cái' as unit,
  (100000 + (n - 1) * 7143)::numeric as unit_price,
  ((100000 + (n - 1) * 7143) * (0.58 + (n - 1) * 0.005))::numeric as cost_price,
  'Phụ kiện' as category,
  'active' as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 15) as n

UNION ALL

-- GIÀY DÉP: 10 SKUs (SKU-GD-001 to SKU-GD-010)
SELECT
  ('11111111-0005-0000-0000-' || LPAD(n::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'SKU-GD-' || LPAD(n::text, 3, '0') as code,
  'Giày dép style ' || n as name,
  'Giày dép cao cấp - Style ' || n as description,
  'đôi' as unit,
  (550000 + (n - 1) * 22222)::numeric as unit_price,
  ((550000 + (n - 1) * 22222) * (0.50 + (n - 1) * 0.00556))::numeric as cost_price,
  'Giày dép' as category,
  'active' as status,
  '2024-01-01'::timestamptz as created_at
FROM generate_series(1, 10) as n;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L2_MASTER: PRODUCTS' as layer,
  COUNT(*) as total_products,
  COUNT(*) = 100 as count_ok,
  ROUND(AVG(cost_price / NULLIF(unit_price, 0) * 100), 1) as avg_cogs_percent,
  ROUND(AVG(unit_price), 0) as avg_price
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  category,
  COUNT(*) as product_count,
  ROUND(AVG(unit_price), 0) as avg_price,
  ROUND(AVG(cost_price / NULLIF(unit_price, 0) * 100), 1) as avg_cogs_pct
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY category
ORDER BY product_count DESC;
