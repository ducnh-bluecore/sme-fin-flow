-- ============================================================================
-- E2E TEST SUITE - SCRIPT 07: MASTER ORDER ITEMS (L2 Master Model)
-- ============================================================================
-- Architecture: v1.4.2 Layer 2 - Master Model (SSOT)
-- Creates ~12,100 order items (2.2 items/order average)
--
-- PRODUCT DISTRIBUTION (weighted):
--   - Áo: 35% (most popular)
--   - Quần: 25%
--   - Váy: 18%
--   - Phụ kiện: 15%
--   - Giày dép: 7%
--
-- EXPECTED VALUES:
--   - Total Items: ~12,100
--   - Avg Items/Order: 2.2
--   - Line Revenue matches Order Revenue
-- ============================================================================

-- Clean existing data
DELETE FROM cdp_order_items 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Generate order items with proper product references
INSERT INTO cdp_order_items (
  id, tenant_id, order_id, product_id, category, qty, unit_price, 
  line_revenue, line_cogs, line_margin
)
WITH order_base AS (
  SELECT 
    id as order_id,
    net_revenue,
    cogs,
    gross_margin,
    ROW_NUMBER() OVER (ORDER BY order_at) as order_seq
  FROM cdp_orders
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
),
items_per_order AS (
  SELECT 
    order_id,
    net_revenue,
    cogs,
    gross_margin,
    order_seq,
    -- 2-3 items per order (60% get 2 items, 40% get 3 items)
    generate_series(1, CASE WHEN order_seq % 5 < 3 THEN 2 ELSE 3 END) as item_num,
    CASE WHEN order_seq % 5 < 3 THEN 2 ELSE 3 END as total_items
  FROM order_base
),
product_lookup AS (
  SELECT 
    id as product_uuid,
    code as sku,
    category,
    CASE 
      WHEN category = 'Áo' THEN 0.55
      WHEN category = 'Quần' THEN 0.50
      WHEN category = 'Váy' THEN 0.48
      WHEN category = 'Phụ kiện' THEN 0.62
      WHEN category = 'Giày dép' THEN 0.52
      ELSE 0.55
    END as cogs_pct
  FROM products
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
),
items_with_sku AS (
  SELECT
    order_id,
    order_seq,
    item_num,
    total_items,
    net_revenue,
    cogs,
    gross_margin,
    -- Generate SKU based on category distribution
    CASE 
      WHEN (order_seq + item_num) % 100 < 35 THEN 
        'SKU-AO-' || LPAD((((order_seq + item_num) % 30) + 1)::text, 3, '0')
      WHEN (order_seq + item_num) % 100 < 60 THEN 
        'SKU-QU-' || LPAD((((order_seq + item_num) % 25) + 1)::text, 3, '0')
      WHEN (order_seq + item_num) % 100 < 78 THEN 
        'SKU-VA-' || LPAD((((order_seq + item_num) % 20) + 1)::text, 3, '0')
      WHEN (order_seq + item_num) % 100 < 93 THEN 
        'SKU-PK-' || LPAD((((order_seq + item_num) % 15) + 1)::text, 3, '0')
      ELSE 
        'SKU-GD-' || LPAD((((order_seq + item_num) % 10) + 1)::text, 3, '0')
    END as generated_sku
  FROM items_per_order
),
items_with_products AS (
  SELECT
    i.*,
    p.product_uuid,
    p.category,
    p.cogs_pct
  FROM items_with_sku i
  LEFT JOIN product_lookup p ON p.sku = i.generated_sku
)
SELECT
  ('44444444-' || LPAD((order_seq / 10000)::text, 4, '0') || '-' || 
   LPAD(((order_seq / 100) % 100)::text, 4, '0') || '-' ||
   LPAD(item_num::text, 4, '0') || '-' || 
   LPAD((order_seq % 10000)::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  order_id,
  COALESCE(product_uuid::text, generated_sku) as product_id,
  category,
  CASE WHEN order_seq % 5 = 0 THEN 2 ELSE 1 END as qty,
  ROUND((net_revenue / total_items / CASE WHEN order_seq % 5 = 0 THEN 2 ELSE 1 END)::numeric, 0) as unit_price,
  ROUND((net_revenue / total_items)::numeric, 0) as line_revenue,
  ROUND((cogs / total_items)::numeric, 0) as line_cogs,
  ROUND((gross_margin / total_items)::numeric, 0) as line_margin
FROM items_with_products;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L2_MASTER: ORDER_ITEMS' as layer,
  COUNT(*) as total_items,
  COUNT(DISTINCT order_id) as unique_orders,
  ROUND(COUNT(*)::numeric / COUNT(DISTINCT order_id), 2) as avg_items_per_order,
  SUM(line_revenue) as total_line_revenue,
  SUM(line_cogs) as total_line_cogs
FROM cdp_order_items
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  category,
  COUNT(*) as item_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM cdp_order_items WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') * 100, 1) as pct,
  ROUND(AVG(unit_price), 0) as avg_unit_price
FROM cdp_order_items
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY category
ORDER BY item_count DESC;

-- Cross-check with orders
SELECT
  'L2_MASTER: ITEMS vs ORDERS RECONCILIATION' as check_type,
  o.total_net_revenue as orders_revenue,
  i.total_line_revenue as items_revenue,
  ABS(o.total_net_revenue - i.total_line_revenue) < 10000 as revenue_matches
FROM (
  SELECT SUM(net_revenue) as total_net_revenue
  FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
) o
CROSS JOIN (
  SELECT SUM(line_revenue) as total_line_revenue
  FROM cdp_order_items WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
) i;
