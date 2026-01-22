-- Step 1: Update invoices to link with random customers
-- First, create a temp mapping of invoice_id to customer_id
WITH customer_list AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM customers
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
),
invoice_list AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM invoices
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND customer_id IS NULL
),
mapping AS (
  SELECT 
    i.id as invoice_id,
    c.id as customer_id
  FROM invoice_list i
  JOIN customer_list c ON ((i.rn - 1) % (SELECT COUNT(*) FROM customer_list) + 1) = c.rn
)
UPDATE invoices
SET customer_id = m.customer_id
FROM mapping m
WHERE invoices.id = m.invoice_id;

-- Step 2: Create view for customer AR summary (precomputed, no client calculations)
CREATE OR REPLACE VIEW public.v_customer_ar_summary AS
SELECT 
  c.id,
  c.tenant_id,
  c.name,
  c.email,
  c.phone,
  c.payment_terms,
  -- Total AR: unpaid invoice balance
  COALESCE(SUM(
    CASE WHEN i.status NOT IN ('paid', 'cancelled') 
    THEN i.total_amount - COALESCE(i.paid_amount, 0) 
    ELSE 0 END
  ), 0) AS total_ar,
  -- Overdue AR: past due date and unpaid
  COALESCE(SUM(
    CASE WHEN i.status NOT IN ('paid', 'cancelled') AND i.due_date < CURRENT_DATE
    THEN i.total_amount - COALESCE(i.paid_amount, 0) 
    ELSE 0 END
  ), 0) AS overdue_ar,
  -- Invoice counts
  COUNT(i.id) FILTER (WHERE i.status NOT IN ('paid', 'cancelled')) AS open_invoice_count,
  COUNT(i.id) FILTER (WHERE i.status NOT IN ('paid', 'cancelled') AND i.due_date < CURRENT_DATE) AS overdue_invoice_count,
  COUNT(i.id) AS total_invoice_count,
  -- Average payment days (from paid invoices)
  COALESCE(
    AVG(
      CASE WHEN i.status = 'paid' AND i.paid_amount >= i.total_amount
      THEN EXTRACT(DAY FROM (COALESCE(i.updated_at, i.issue_date) - i.issue_date))
      ELSE NULL END
    )::INTEGER,
    c.payment_terms
  ) AS avg_payment_days,
  -- Latest invoice date
  MAX(i.issue_date) AS last_invoice_date
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id AND i.tenant_id = c.tenant_id
GROUP BY c.id, c.tenant_id, c.name, c.email, c.phone, c.payment_terms;

-- Grant access
GRANT SELECT ON public.v_customer_ar_summary TO authenticated;
GRANT SELECT ON public.v_customer_ar_summary TO anon;