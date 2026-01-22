-- Drop and recreate ar_aging view with customer info
DROP VIEW IF EXISTS public.ar_aging CASCADE;

CREATE VIEW public.ar_aging AS
SELECT 
  i.tenant_id,
  i.id AS invoice_id,
  i.invoice_number,
  i.customer_id,
  c.name AS customer_name,
  i.issue_date,
  i.due_date,
  i.total_amount,
  COALESCE(i.paid_amount, 0) AS paid_amount,
  i.total_amount - COALESCE(i.paid_amount, 0) AS balance_due,
  i.status,
  CASE 
    WHEN i.due_date >= CURRENT_DATE THEN 0
    ELSE CURRENT_DATE - i.due_date
  END AS days_overdue,
  CASE
    WHEN i.due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1-30 days'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31-60 days'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61-90 days'
    ELSE 'over 90 days'
  END AS aging_bucket
FROM invoices i
LEFT JOIN customers c ON c.id = i.customer_id
WHERE i.status NOT IN ('paid', 'cancelled')
  AND i.total_amount > COALESCE(i.paid_amount, 0);

-- Grant access
GRANT SELECT ON public.ar_aging TO authenticated;
GRANT SELECT ON public.ar_aging TO anon;