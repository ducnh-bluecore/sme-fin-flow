
SET session_replication_role = replica;

-- SEED Bank Transactions (1000 giao dịch)
INSERT INTO bank_transactions (
  tenant_id, bank_account_id, transaction_date, description, amount, 
  transaction_type, reference, match_status, created_at
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  '548174d2-e6d1-4970-a359-d05199390a89',
  ('2024-07-01'::date + (i * INTERVAL '6 hours'))::date,
  CASE (i % 4) 
    WHEN 0 THEN 'Thu tiền khách hàng - INV-' || LPAD((i % 1500 + 1)::text, 6, '0')
    WHEN 1 THEN 'Thanh toán NCC - BILL-' || LPAD((i % 500 + 1)::text, 6, '0')
    WHEN 2 THEN 'Chi phí vận hành tháng'
    ELSE 'Thanh toán lương nhân viên'
  END,
  CASE (i % 4) 
    WHEN 0 THEN (350000 + (i % 500) * 1100)::numeric(12,2)
    WHEN 1 THEN -(5500000 + (i % 100) * 55000)::numeric(12,2)
    WHEN 2 THEN -(15000000 + (i % 50) * 100000)::numeric(12,2)
    ELSE -(45000000 + (i % 30) * 500000)::numeric(12,2)
  END,
  CASE (i % 4) WHEN 0 THEN 'credit' ELSE 'debit' END,
  'REF-' || LPAD(i::text, 8, '0'),
  CASE (i % 5) WHEN 4 THEN 'pending' ELSE 'matched' END,
  '2024-07-01'::timestamp + (i * INTERVAL '6 hours')
FROM generate_series(1, 1000) AS i;

-- SEED Expenses (800 chi phí)
INSERT INTO expenses (
  tenant_id, expense_date, category, subcategory, description, amount, 
  vendor_name, payment_method, is_recurring, created_at, updated_at
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  ('2024-07-01'::date + (i * INTERVAL '8 hours'))::date,
  (ARRAY['cogs', 'salary', 'rent', 'utilities', 'marketing', 'logistics', 'other'])[1 + (i % 7)]::expense_category,
  CASE (i % 7)
    WHEN 0 THEN 'Nguyên vật liệu'
    WHEN 1 THEN 'Lương nhân viên'
    WHEN 2 THEN 'Thuê mặt bằng'
    WHEN 3 THEN 'Điện nước'
    WHEN 4 THEN 'Quảng cáo online'
    WHEN 5 THEN 'Vận chuyển'
    ELSE 'Chi phí khác'
  END,
  'Chi phí ' || CASE (i % 7)
    WHEN 0 THEN 'mua hàng tháng ' || (1 + ((i / 100) % 18))
    WHEN 1 THEN 'lương T' || (1 + ((i / 100) % 18))
    WHEN 2 THEN 'thuê văn phòng T' || (1 + ((i / 100) % 18))
    WHEN 3 THEN 'điện nước T' || (1 + ((i / 100) % 18))
    WHEN 4 THEN 'marketing T' || (1 + ((i / 100) % 18))
    WHEN 5 THEN 'vận chuyển T' || (1 + ((i / 100) % 18))
    ELSE 'khác T' || (1 + ((i / 100) % 18))
  END,
  CASE (i % 7)
    WHEN 0 THEN (50000000 + (i % 100) * 500000)::numeric(12,2)
    WHEN 1 THEN (80000000 + (i % 50) * 200000)::numeric(12,2)
    WHEN 2 THEN (25000000 + (i % 20) * 100000)::numeric(12,2)
    WHEN 3 THEN (5000000 + (i % 30) * 50000)::numeric(12,2)
    WHEN 4 THEN (30000000 + (i % 80) * 300000)::numeric(12,2)
    WHEN 5 THEN (15000000 + (i % 60) * 150000)::numeric(12,2)
    ELSE (3000000 + (i % 40) * 30000)::numeric(12,2)
  END,
  'Vendor ' || (1 + (i % 30)),
  CASE (i % 3) WHEN 0 THEN 'bank_transfer' WHEN 1 THEN 'cash' ELSE 'card' END,
  CASE (i % 7) WHEN 1 THEN true WHEN 2 THEN true WHEN 3 THEN true ELSE false END,
  '2024-07-01'::timestamp + (i * INTERVAL '8 hours'),
  NOW()
FROM generate_series(1, 800) AS i;

SET session_replication_role = DEFAULT;
