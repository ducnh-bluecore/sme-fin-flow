-- ============================================================================
-- E2E TEST SUITE - SCRIPT 06: MASTER ORDERS (L2 Master Model)
-- ============================================================================
-- Architecture: v1.4.2 Layer 2 - Master Model (SSOT)
-- Creates 5,500 orders distributed across 25+ months
--
-- TIME DISTRIBUTION:
--   - Startup (01-03/2024): 100/month = 300
--   - Growth (04-06/2024): 150/month = 450  
--   - Stable (07-09/2024): 200/month = 600
--   - Peak 2024 (10-12/2024): 300/month = 900
--   - Stable 2025 (01-09/2025): 220/month = 1,980
--   - Peak 2025 (10-12/2025): 350/month = 1,050
--   - Jan 2026 (01-26/01/2026): 220
--   TOTAL: 5,500
--
-- CHANNEL DISTRIBUTION:
--   - Shopee: 40% (2,200 orders), AOV 380K, Fee 6%
--   - Lazada: 25% (1,375 orders), AOV 420K, Fee 5%
--   - TikTok: 20% (1,100 orders), AOV 320K, Fee 4%
--   - Website: 15% (825 orders), AOV 550K, Fee 0%
--
-- EXPECTED VALUES:
--   - Gross Revenue: ~₫2.7B VND
--   - Net Revenue: ~₫2.35B VND
--   - COGS: ~53%
-- ============================================================================

-- Clean existing data
DELETE FROM cdp_orders 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Create temp table for order distribution
CREATE TEMP TABLE IF NOT EXISTS order_distribution (
  month_start date,
  orders_count int,
  month_label text
);

TRUNCATE order_distribution;

INSERT INTO order_distribution (month_start, orders_count, month_label) VALUES
-- Startup (01-03/2024): 100/month
('2024-01-01', 100, 'Startup'),
('2024-02-01', 100, 'Startup'),
('2024-03-01', 100, 'Startup'),
-- Growth (04-06/2024): 150/month
('2024-04-01', 150, 'Growth'),
('2024-05-01', 150, 'Growth'),
('2024-06-01', 150, 'Growth'),
-- Stable (07-09/2024): 200/month
('2024-07-01', 200, 'Stable'),
('2024-08-01', 200, 'Stable'),
('2024-09-01', 200, 'Stable'),
-- Peak 2024 (10-12/2024): 300/month
('2024-10-01', 300, 'Peak2024'),
('2024-11-01', 300, 'Peak2024'),
('2024-12-01', 300, 'Peak2024'),
-- Stable 2025 (01-09/2025): 220/month
('2025-01-01', 220, 'Stable2025'),
('2025-02-01', 220, 'Stable2025'),
('2025-03-01', 220, 'Stable2025'),
('2025-04-01', 220, 'Stable2025'),
('2025-05-01', 220, 'Stable2025'),
('2025-06-01', 220, 'Stable2025'),
('2025-07-01', 220, 'Stable2025'),
('2025-08-01', 220, 'Stable2025'),
('2025-09-01', 220, 'Stable2025'),
-- Peak 2025 (10-12/2025): 350/month
('2025-10-01', 350, 'Peak2025'),
('2025-11-01', 350, 'Peak2025'),
('2025-12-01', 350, 'Peak2025'),
-- Jan 2026: 220
('2026-01-01', 220, 'Jan2026');

-- Generate all orders
INSERT INTO cdp_orders (
  id, tenant_id, order_key, customer_id, order_at, channel, 
  gross_revenue, discount_amount, net_revenue, cogs, gross_margin,
  is_discounted, created_at
)
WITH order_numbers AS (
  SELECT 
    ROW_NUMBER() OVER () as order_seq,
    d.month_start,
    d.orders_count,
    generate_series(1, d.orders_count) as order_in_month
  FROM order_distribution d
),
orders_raw AS (
  SELECT
    order_seq,
    month_start,
    order_in_month,
    (month_start + ((order_in_month * 1.3)::int || ' days')::interval + 
     ((order_in_month * 7) % 24 || ' hours')::interval)::timestamptz as order_at,
    -- Channel distribution: 40% Shopee, 25% Lazada, 20% TikTok, 15% Website
    CASE 
      WHEN order_seq % 20 < 8 THEN 'Shopee'
      WHEN order_seq % 20 < 13 THEN 'Lazada'
      WHEN order_seq % 20 < 17 THEN 'TikTok Shop'
      ELSE 'Website'
    END as channel,
    -- Customer assignment based on tier behavior
    CASE
      WHEN order_seq % 11 = 0 THEN 
        ('22222222-0001-0000-0000-' || LPAD(((order_seq % 25) + 1)::text, 12, '0'))::uuid
      WHEN order_seq % 5 = 0 THEN 
        ('22222222-0002-0000-0000-' || LPAD(((order_seq % 75) + 1)::text, 12, '0'))::uuid
      WHEN order_seq % 4 = 0 THEN 
        ('22222222-0003-0000-0000-' || LPAD(((order_seq % 150) + 1)::text, 12, '0'))::uuid
      ELSE 
        ('22222222-0004-0000-0000-' || LPAD(((order_seq % 250) + 1)::text, 12, '0'))::uuid
    END as customer_id
  FROM order_numbers
)
SELECT
  ('33333333-' || LPAD((order_seq / 10000)::text, 4, '0') || '-' || 
   LPAD(((order_seq / 100) % 100)::text, 4, '0') || '-0000-' || 
   LPAD((order_seq % 10000)::text, 12, '0'))::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'ORD-' || TO_CHAR(order_at, 'YYYYMM') || '-' || LPAD(order_seq::text, 6, '0') as order_key,
  customer_id,
  LEAST(order_at, '2027-01-26 23:59:59'::timestamptz) as order_at,
  channel,
  -- Gross revenue based on channel AOV
  CASE channel
    WHEN 'Shopee' THEN 380000 + (order_seq % 100) * 1000 - 50000
    WHEN 'Lazada' THEN 420000 + (order_seq % 100) * 1200 - 60000
    WHEN 'TikTok Shop' THEN 320000 + (order_seq % 100) * 800 - 40000
    ELSE 550000 + (order_seq % 100) * 1500 - 75000
  END as gross_revenue,
  -- Discount: 5-15%
  CASE channel
    WHEN 'Shopee' THEN (380000 + (order_seq % 100) * 1000 - 50000) * (0.05 + (order_seq % 10) * 0.01)
    WHEN 'Lazada' THEN (420000 + (order_seq % 100) * 1200 - 60000) * (0.05 + (order_seq % 10) * 0.01)
    WHEN 'TikTok Shop' THEN (320000 + (order_seq % 100) * 800 - 40000) * (0.05 + (order_seq % 10) * 0.01)
    ELSE (550000 + (order_seq % 100) * 1500 - 75000) * (0.03 + (order_seq % 10) * 0.005)
  END as discount_amount,
  -- Net revenue = Gross - Discount
  CASE channel
    WHEN 'Shopee' THEN (380000 + (order_seq % 100) * 1000 - 50000) * (0.95 - (order_seq % 10) * 0.01)
    WHEN 'Lazada' THEN (420000 + (order_seq % 100) * 1200 - 60000) * (0.95 - (order_seq % 10) * 0.01)
    WHEN 'TikTok Shop' THEN (320000 + (order_seq % 100) * 800 - 40000) * (0.95 - (order_seq % 10) * 0.01)
    ELSE (550000 + (order_seq % 100) * 1500 - 75000) * (0.97 - (order_seq % 10) * 0.005)
  END as net_revenue,
  -- COGS: ~53% of net revenue
  CASE channel
    WHEN 'Shopee' THEN (380000 + (order_seq % 100) * 1000 - 50000) * (0.95 - (order_seq % 10) * 0.01) * 0.53
    WHEN 'Lazada' THEN (420000 + (order_seq % 100) * 1200 - 60000) * (0.95 - (order_seq % 10) * 0.01) * 0.53
    WHEN 'TikTok Shop' THEN (320000 + (order_seq % 100) * 800 - 40000) * (0.95 - (order_seq % 10) * 0.01) * 0.53
    ELSE (550000 + (order_seq % 100) * 1500 - 75000) * (0.97 - (order_seq % 10) * 0.005) * 0.53
  END as cogs,
  -- Gross margin: Net - COGS - Platform Fee
  CASE channel
    WHEN 'Shopee' THEN 
      (380000 + (order_seq % 100) * 1000 - 50000) * (0.95 - (order_seq % 10) * 0.01) * (1 - 0.53 - 0.06)
    WHEN 'Lazada' THEN 
      (420000 + (order_seq % 100) * 1200 - 60000) * (0.95 - (order_seq % 10) * 0.01) * (1 - 0.53 - 0.05)
    WHEN 'TikTok Shop' THEN 
      (320000 + (order_seq % 100) * 800 - 40000) * (0.95 - (order_seq % 10) * 0.01) * (1 - 0.53 - 0.04)
    ELSE 
      (550000 + (order_seq % 100) * 1500 - 75000) * (0.97 - (order_seq % 10) * 0.005) * (1 - 0.53 - 0)
  END as gross_margin,
  (order_seq % 10 > 0) as is_discounted,
  order_at as created_at
FROM orders_raw
WHERE order_at <= '2027-01-26 23:59:59'::timestamptz;

-- Drop temp table
DROP TABLE IF EXISTS order_distribution;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L2_MASTER: ORDERS' as layer,
  COUNT(*) as total_orders,
  SUM(gross_revenue) as total_gross_revenue,
  SUM(net_revenue) as total_net_revenue,
  SUM(cogs) as total_cogs,
  ROUND(SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100, 1) as cogs_percent,
  MIN(order_at)::date as first_order,
  MAX(order_at)::date as last_order
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  channel,
  COUNT(*) as order_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') * 100, 1) as pct,
  ROUND(AVG(net_revenue), 0) as avg_order_value
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY channel
ORDER BY order_count DESC;
