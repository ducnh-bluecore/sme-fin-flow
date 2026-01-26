-- ============================================================================
-- E2E TEST SUITE - SCRIPT 06: INVOICES (Linked to Orders)
-- ============================================================================
-- Tạo invoices từ cdp_orders với:
--   - customer_id = order.customer_id (từ customers, đã sync từ cdp_customers)
--   - issue_date = order_at (ngày hóa đơn = ngày đơn hàng)
--   - due_date: 30-60 ngày sau issue_date
--   - Status: 70% paid, 15% partial, 15% pending
--
-- EXPECTED VALUES:
--   - Total invoices: ~5,500 (1 per order with 10% sampling = ~550)
--   - Unique customers: ~300
--   - Top 3 concentration: ~3.4%
--   - Overdue: ~7% (invoices with pending/partial status and due_date < today)
-- ============================================================================

-- STEP 1: Sync customers table from cdp_customers
-- (This ensures FK constraint is satisfied)

DELETE FROM customers 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO customers (
  id, tenant_id, name, email, phone, status, external_customer_id, created_at, updated_at
)
SELECT
  c.id,
  c.tenant_id,
  -- Generate readable customer name based on tier
  CASE 
    WHEN c.canonical_key LIKE 'platinum%' THEN 'PLAT-' || LPAD((ROW_NUMBER() OVER (PARTITION BY c.canonical_key LIKE 'platinum%' ORDER BY c.id))::text, 4, '0')
    WHEN c.canonical_key LIKE 'gold%' THEN 'GOLD-' || LPAD((ROW_NUMBER() OVER (PARTITION BY c.canonical_key LIKE 'gold%' ORDER BY c.id))::text, 4, '0')
    WHEN c.canonical_key LIKE 'silver%' THEN 'SILV-' || LPAD((ROW_NUMBER() OVER (PARTITION BY c.canonical_key LIKE 'silver%' ORDER BY c.id))::text, 4, '0')
    ELSE 'BRON-' || LPAD((ROW_NUMBER() OVER (PARTITION BY c.canonical_key LIKE 'bronze%' ORDER BY c.id))::text, 4, '0')
  END as name,
  CASE 
    WHEN c.canonical_key LIKE 'platinum%' THEN 'PLAT-' || LPAD((ROW_NUMBER() OVER (PARTITION BY c.canonical_key LIKE 'platinum%' ORDER BY c.id))::text, 4, '0')
    WHEN c.canonical_key LIKE 'gold%' THEN 'GOLD-' || LPAD((ROW_NUMBER() OVER (PARTITION BY c.canonical_key LIKE 'gold%' ORDER BY c.id))::text, 4, '0')
    WHEN c.canonical_key LIKE 'silver%' THEN 'SILV-' || LPAD((ROW_NUMBER() OVER (PARTITION BY c.canonical_key LIKE 'silver%' ORDER BY c.id))::text, 4, '0')
    ELSE 'BRON-' || LPAD((ROW_NUMBER() OVER (PARTITION BY c.canonical_key LIKE 'bronze%' ORDER BY c.id))::text, 4, '0')
  END || '@example.com' as email,
  '09' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::text, 8, '0') as phone,
  CASE WHEN c.status = 'ACTIVE' THEN 'active' ELSE 'inactive' END as status,
  c.id::text as external_customer_id,
  c.created_at,
  c.created_at as updated_at
FROM cdp_customers c
WHERE c.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- STEP 2: Create invoices from cdp_orders

DELETE FROM invoices 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO invoices (
  id, tenant_id, customer_id, invoice_number, issue_date, due_date,
  subtotal, vat_amount, total_amount, status, paid_amount,
  created_at, updated_at
)
SELECT
  gen_random_uuid() as id,
  o.tenant_id,
  o.customer_id,
  'INV-' || TO_CHAR(o.order_at, 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY o.order_at)::text, 5, '0') as invoice_number,
  o.order_at::date as issue_date,
  -- Due date: 30-60 ngày sau issue_date
  (o.order_at::date + ((30 + (EXTRACT(EPOCH FROM o.order_at)::int % 31))::int || ' days')::interval)::date as due_date,
  o.net_revenue as subtotal,
  o.net_revenue * 0.1 as vat_amount,
  o.net_revenue * 1.1 as total_amount,
  -- Status: 70% paid, 15% partial, 15% pending
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY o.order_at) % 100 < 70 THEN 'paid'
    WHEN ROW_NUMBER() OVER (ORDER BY o.order_at) % 100 < 85 THEN 'partial'
    ELSE 'pending'
  END as status,
  -- Paid amount
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY o.order_at) % 100 < 70 THEN o.net_revenue * 1.1
    WHEN ROW_NUMBER() OVER (ORDER BY o.order_at) % 100 < 85 THEN o.net_revenue * 0.6
    ELSE 0
  END as paid_amount,
  o.order_at as created_at,
  o.order_at as updated_at
FROM cdp_orders o
WHERE o.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY o.order_at;

-- Verification Query
SELECT 
  'INVOICES VERIFICATION' as check_type,
  COUNT(*) as total_invoices,
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(*) FILTER (WHERE customer_id IS NOT NULL) as with_customer_id,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
  COUNT(*) FILTER (WHERE status = 'partial') as partial_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'paid') as overdue_count,
  ROUND(SUM(total_amount)::numeric, 0) as total_ar,
  ROUND(SUM(total_amount - paid_amount)::numeric, 0) as open_ar,
  MIN(issue_date) as first_invoice,
  MAX(issue_date) as last_invoice
FROM invoices
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Customer concentration check
WITH customer_totals AS (
  SELECT 
    customer_id,
    SUM(total_amount) as total_value
  FROM invoices
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY customer_id
),
ranked AS (
  SELECT 
    customer_id,
    total_value,
    SUM(total_value) OVER () as grand_total,
    ROW_NUMBER() OVER (ORDER BY total_value DESC) as rank
  FROM customer_totals
)
SELECT 
  'CONCENTRATION CHECK' as check_type,
  ROUND((SUM(total_value) FILTER (WHERE rank <= 3) / MAX(grand_total) * 100)::numeric, 1) as top3_percent,
  ROUND((SUM(total_value) FILTER (WHERE rank <= 5) / MAX(grand_total) * 100)::numeric, 1) as top5_percent,
  COUNT(*) as total_customers
FROM ranked;
