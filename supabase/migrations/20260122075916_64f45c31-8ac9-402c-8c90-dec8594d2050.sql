
-- Seed 1800 orders for 18 months (disable ALL triggers)
SET session_replication_role = replica;

INSERT INTO external_orders (
  tenant_id, integration_id, external_order_id, order_number, channel, order_date,
  customer_name, customer_phone, items, item_count, subtotal, total_amount,
  platform_fee, commission_fee, shipping_fee, cost_of_goods,
  net_revenue, net_profit, payment_method, payment_status, status, fulfillment_status, created_at
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  CASE (i % 4) WHEN 0 THEN 'aaaa0001-0001-0001-0001-000000000001'::uuid WHEN 1 THEN 'aaaa0002-0002-0002-0002-000000000002'::uuid WHEN 2 THEN 'aaaa0003-0003-0003-0003-000000000003'::uuid ELSE 'aaaa0004-0004-0004-0004-000000000004'::uuid END,
  'ORD-' || LPAD(i::text, 6, '0'),
  'SO-' || LPAD(i::text, 6, '0'),
  CASE (i % 4) WHEN 0 THEN 'shopee' WHEN 1 THEN 'lazada' WHEN 2 THEN 'tiktok' ELSE 'sapo' END,
  '2024-07-01'::timestamp + ((i - 1) * INTERVAL '4 hours'),
  'Khách hàng ' || (1 + (i % 200)),
  '09' || LPAD((1000000 + (i % 200))::text, 8, '0'),
  jsonb_build_array(jsonb_build_object('sku', 'SKU-' || LPAD((1 + (i % 50))::text, 4, '0'), 'quantity', (1 + (i % 3)))),
  (1 + (i % 3)),
  (300000 + (i % 500) * 1000 + (i * 50))::numeric(12,2),
  (350000 + (i % 500) * 1000 + (i * 50))::numeric(12,2),
  (15000 + (i % 100) * 100)::numeric(12,2),
  (25000 + (i % 100) * 150)::numeric(12,2),
  (20000 + (i % 100) * 100)::numeric(12,2),
  (150000 + (i % 300) * 500)::numeric(12,2),
  (280000 + (i % 400) * 800)::numeric(12,2),
  (60000 + (i % 200) * 200)::numeric(12,2),
  CASE (i % 3) WHEN 0 THEN 'COD' WHEN 1 THEN 'bank_transfer' ELSE 'ewallet' END,
  'paid',
  CASE (i % 20) WHEN 18 THEN 'cancelled'::order_status WHEN 19 THEN 'returned'::order_status ELSE 'delivered'::order_status END,
  CASE (i % 20) WHEN 18 THEN 'cancelled' WHEN 19 THEN 'returned' ELSE 'delivered' END,
  '2024-07-01'::timestamp + ((i - 1) * INTERVAL '4 hours')
FROM generate_series(1, 1800) AS i;

SET session_replication_role = DEFAULT;
