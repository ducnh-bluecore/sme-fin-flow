
SET session_replication_role = replica;

-- SEED Inventory Items (bỏ generated column total_value)
INSERT INTO inventory_items (
  tenant_id, sku, product_name, category, quantity, unit_cost,
  received_date, warehouse_location, last_sold_date, reorder_point, status, notes
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  'SKU-' || LPAD(i::text, 4, '0'),
  CASE (i % 10)
    WHEN 0 THEN 'Áo thun nam' WHEN 1 THEN 'Quần jean nữ' WHEN 2 THEN 'Giày sneaker'
    WHEN 3 THEN 'Túi xách da' WHEN 4 THEN 'Váy đầm nữ' WHEN 5 THEN 'Áo khoác nam'
    WHEN 6 THEN 'Phụ kiện' WHEN 7 THEN 'Đồ trẻ em' WHEN 8 THEN 'Mỹ phẩm' ELSE 'Nước hoa'
  END || ' - Mẫu ' || i,
  CASE (i % 5) WHEN 0 THEN 'Thời trang nam' WHEN 1 THEN 'Thời trang nữ' WHEN 2 THEN 'Giày dép' WHEN 3 THEN 'Túi ví' ELSE 'Làm đẹp' END,
  (20 + (i % 150))::int,
  (150000 + (i * 5000))::numeric(12,2),
  CASE 
    WHEN i <= 100 THEN (NOW() - INTERVAL '15 days')::date
    WHEN i <= 180 THEN (NOW() - INTERVAL '45 days')::date
    WHEN i <= 240 THEN (NOW() - INTERVAL '75 days')::date
    ELSE (NOW() - INTERVAL '120 days')::date
  END,
  'WH-' || (1 + (i % 3)),
  CASE 
    WHEN i <= 100 THEN (NOW() - INTERVAL '5 days')::date
    WHEN i <= 180 THEN (NOW() - INTERVAL '30 days')::date
    WHEN i <= 240 THEN (NOW() - INTERVAL '60 days')::date
    ELSE (NOW() - INTERVAL '100 days')::date
  END,
  (10 + (i % 30))::int,
  CASE WHEN i > 240 THEN 'slow_moving' ELSE 'active' END,
  'Imported batch ' || i
FROM generate_series(1, 300) AS i;

-- SEED Finance Monthly Summary (18 months)
INSERT INTO finance_monthly_summary (
  tenant_id, year_month, month_start, month_end,
  net_revenue, gross_profit, gross_margin_percent, contribution_margin, ebitda,
  cogs, marketing_spend, operating_expenses, 
  cash_inflows, cash_outflows, net_cash_flow, closing_cash,
  ar_balance, ap_balance, inventory_balance,
  dso, dpo, dio, ccc,
  order_count, customer_count, avg_order_value, roas, cac,
  computed_at
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  TO_CHAR('2024-07-01'::date + (i * INTERVAL '1 month'), 'YYYY-MM'),
  ('2024-07-01'::date + (i * INTERVAL '1 month'))::date,
  (('2024-07-01'::date + ((i+1) * INTERVAL '1 month')) - INTERVAL '1 day')::date,
  -- Revenue grows 3% monthly
  (500000000 * POWER(1.03, i))::numeric(15,2),
  (175000000 * POWER(1.03, i))::numeric(15,2),
  35.0,
  (125000000 * POWER(1.03, i))::numeric(15,2),
  (100000000 * POWER(1.03, i))::numeric(15,2),
  (325000000 * POWER(1.02, i))::numeric(15,2),
  (50000000 * POWER(1.05, i))::numeric(15,2),
  (200000000 * POWER(1.02, i))::numeric(15,2),
  (480000000 * POWER(1.03, i))::numeric(15,2),
  (400000000 * POWER(1.02, i))::numeric(15,2),
  (80000000 * POWER(1.03, i))::numeric(15,2),
  (200000000 + (80000000 * i))::numeric(15,2),
  (150000000 * POWER(1.02, i))::numeric(15,2),
  (120000000 * POWER(1.02, i))::numeric(15,2),
  (250000000 * POWER(1.01, i))::numeric(15,2),
  (25 - (i * 0.3))::numeric(5,1),
  (35 + (i * 0.2))::numeric(5,1),
  (45 - (i * 0.2))::numeric(5,1),
  (35 - (i * 0.5))::numeric(5,1),
  (100 + (i * 5))::int,
  (80 + (i * 3))::int,
  (350000 + (i * 5000))::numeric(12,2),
  (3.5 + (i * 0.1))::numeric(4,2),
  (150000 - (i * 2000))::numeric(12,2),
  NOW()
FROM generate_series(0, 17) AS i;

SET session_replication_role = DEFAULT;
