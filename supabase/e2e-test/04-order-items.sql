-- ============================================================================
-- E2E TEST SUITE - SCRIPT 04: ORDER ITEMS (~12,000 Items)
-- ============================================================================
-- Tạo order items cho 5,500 đơn hàng
-- Average: 2.2 items/order = ~12,100 items
--
-- PRODUCT DISTRIBUTION (weighted):
--   - Áo: 35% (most popular)
--   - Quần: 25%
--   - Váy: 18%
--   - Phụ kiện: 15%
--   - Giày dép: 7%
--
-- EXPECTED VALUES:
--   - Total Items: ~12,000
--   - Total Line Revenue: matches cdp_orders.net_revenue
--   - Total Line COGS: matches cdp_orders.cogs
-- ============================================================================

-- Xóa order items cũ của tenant test (nếu có)
DELETE FROM cdp_order_items 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Generate order items (2-3 items per order)
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
items_with_products AS (
  SELECT
    order_id,
    order_seq,
    item_num,
    total_items,
    net_revenue,
    cogs,
    gross_margin,
    -- Product assignment based on category distribution
    CASE 
      -- 35% Áo
      WHEN (order_seq + item_num) % 100 < 35 THEN 
        jsonb_build_object(
          'sku', 'SKU-AO-' || LPAD((((order_seq + item_num) % 30) + 1)::text, 3, '0'),
          'category', 'Áo',
          'cogs_pct', 0.55
        )
      -- 25% Quần
      WHEN (order_seq + item_num) % 100 < 60 THEN 
        jsonb_build_object(
          'sku', 'SKU-QU-' || LPAD((((order_seq + item_num) % 25) + 1)::text, 3, '0'),
          'category', 'Quần',
          'cogs_pct', 0.50
        )
      -- 18% Váy
      WHEN (order_seq + item_num) % 100 < 78 THEN 
        jsonb_build_object(
          'sku', 'SKU-VA-' || LPAD((((order_seq + item_num) % 20) + 1)::text, 3, '0'),
          'category', 'Váy',
          'cogs_pct', 0.48
        )
      -- 15% Phụ kiện
      WHEN (order_seq + item_num) % 100 < 93 THEN 
        jsonb_build_object(
          'sku', 'SKU-PK-' || LPAD((((order_seq + item_num) % 15) + 1)::text, 3, '0'),
          'category', 'Phụ kiện',
          'cogs_pct', 0.62
        )
      -- 7% Giày dép
      ELSE 
        jsonb_build_object(
          'sku', 'SKU-GD-' || LPAD((((order_seq + item_num) % 10) + 1)::text, 3, '0'),
          'category', 'Giày dép',
          'cogs_pct', 0.52
        )
    END as product_info
  FROM items_per_order
)
SELECT
  ('44444444-' || LPAD((order_seq / 10000)::text, 4, '0') || '-' || 
   LPAD(((order_seq / 100) % 100)::text, 4, '0') || '-' ||
   LPAD(item_num::text, 4, '0') || '-' || 
   LPAD((order_seq % 10000)::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  order_id,
  product_info->>'sku' as product_id,
  product_info->>'category' as category,
  -- Quantity: 1-2 items (80% get qty=1, 20% get qty=2)
  CASE WHEN order_seq % 5 = 0 THEN 2 ELSE 1 END as qty,
  -- Unit price: proportional to order net revenue / total items
  ROUND((net_revenue / total_items / CASE WHEN order_seq % 5 = 0 THEN 2 ELSE 1 END)::numeric, 0) as unit_price,
  -- Line revenue: portion of order net revenue
  ROUND((net_revenue / total_items)::numeric, 0) as line_revenue,
  -- Line COGS: portion of order cogs
  ROUND((cogs / total_items)::numeric, 0) as line_cogs,
  -- Line margin: portion of order gross margin
  ROUND((gross_margin / total_items)::numeric, 0) as line_margin
FROM items_with_products;

-- Verification Query
SELECT 
  'ORDER ITEMS VERIFICATION' as check_type,
  COUNT(*) as total_items,
  COUNT(DISTINCT order_id) as unique_orders,
  ROUND(COUNT(*)::numeric / COUNT(DISTINCT order_id), 2) as avg_items_per_order,
  SUM(line_revenue) as total_line_revenue,
  SUM(line_cogs) as total_line_cogs,
  SUM(line_margin) as total_line_margin,
  jsonb_build_object(
    'Áo', COUNT(*) FILTER (WHERE category = 'Áo'),
    'Quần', COUNT(*) FILTER (WHERE category = 'Quần'),
    'Váy', COUNT(*) FILTER (WHERE category = 'Váy'),
    'Phụ kiện', COUNT(*) FILTER (WHERE category = 'Phụ kiện'),
    'Giày dép', COUNT(*) FILTER (WHERE category = 'Giày dép')
  ) as by_category
FROM cdp_order_items
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Cross-check với orders
SELECT
  'ITEMS vs ORDERS RECONCILIATION' as check_type,
  o.total_net_revenue as orders_net_revenue,
  i.total_line_revenue as items_line_revenue,
  o.total_cogs as orders_cogs,
  i.total_line_cogs as items_line_cogs,
  ABS(o.total_net_revenue - i.total_line_revenue) < 10000 as revenue_matches,
  ABS(o.total_cogs - i.total_line_cogs) < 10000 as cogs_matches
FROM (
  SELECT SUM(net_revenue) as total_net_revenue, SUM(cogs) as total_cogs
  FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
) o
CROSS JOIN (
  SELECT SUM(line_revenue) as total_line_revenue, SUM(line_cogs) as total_line_cogs
  FROM cdp_order_items WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
) i;
