
-- Disable triggers for bulk insert
SET session_replication_role = replica;

-- SEED Invoices (1500 invoices từ orders delivered)
INSERT INTO invoices (
  tenant_id, invoice_number, issue_date, due_date, subtotal, vat_amount, 
  total_amount, paid_amount, status, created_at
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  'INV-' || LPAD(i::text, 6, '0'),
  ('2024-07-01'::date + (i * INTERVAL '4 hours'))::date,
  ('2024-07-01'::date + (i * INTERVAL '4 hours') + INTERVAL '30 days')::date,
  (300000 + (i % 500) * 1000 + (i * 50))::numeric(12,2),
  ((300000 + (i % 500) * 1000 + (i * 50)) * 0.1)::numeric(12,2),
  ((300000 + (i % 500) * 1000 + (i * 50)) * 1.1)::numeric(12,2),
  CASE (i % 10) 
    WHEN 9 THEN 0 
    WHEN 8 THEN ((300000 + (i % 500) * 1000 + (i * 50)) * 0.5)::numeric(12,2)
    ELSE ((300000 + (i % 500) * 1000 + (i * 50)) * 1.1)::numeric(12,2)
  END,
  CASE (i % 10) WHEN 9 THEN 'pending' WHEN 8 THEN 'partial' ELSE 'paid' END,
  '2024-07-01'::timestamp + (i * INTERVAL '4 hours')
FROM generate_series(1, 1500) AS i;

-- SEED Bills (500 bills từ suppliers)
INSERT INTO bills (
  tenant_id, bill_number, vendor_name, bill_date, due_date, 
  subtotal, vat_amount, total_amount, paid_amount, status, expense_category, created_at
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  'BILL-' || LPAD(i::text, 6, '0'),
  'Nhà cung cấp ' || (1 + (i % 20)),
  ('2024-07-01'::date + (i * INTERVAL '1 day'))::date,
  ('2024-07-01'::date + (i * INTERVAL '1 day') + INTERVAL '45 days')::date,
  (5000000 + (i % 100) * 50000)::numeric(12,2),
  ((5000000 + (i % 100) * 50000) * 0.1)::numeric(12,2),
  ((5000000 + (i % 100) * 50000) * 1.1)::numeric(12,2),
  CASE (i % 8) 
    WHEN 7 THEN 0 
    WHEN 6 THEN ((5000000 + (i % 100) * 50000) * 0.5)::numeric(12,2)
    ELSE ((5000000 + (i % 100) * 50000) * 1.1)::numeric(12,2)
  END,
  CASE (i % 8) WHEN 7 THEN 'pending' WHEN 6 THEN 'partial' ELSE 'paid' END,
  CASE (i % 5) WHEN 0 THEN 'cogs' WHEN 1 THEN 'logistics' WHEN 2 THEN 'marketing' WHEN 3 THEN 'rent' ELSE 'utilities' END,
  '2024-07-01'::timestamp + (i * INTERVAL '1 day')
FROM generate_series(1, 500) AS i;

SET session_replication_role = DEFAULT;
