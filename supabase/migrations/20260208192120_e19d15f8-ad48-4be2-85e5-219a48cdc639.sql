
-- ============================================
-- BATCH 2: Views for remaining hook violations
-- ============================================

-- 1. v_pending_ar - Unpaid invoices for AR forecasting
CREATE OR REPLACE VIEW public.v_pending_ar AS
SELECT
  tenant_id,
  id,
  total_amount,
  COALESCE(paid_amount, 0) AS paid_amount,
  (total_amount - COALESCE(paid_amount, 0)) AS outstanding,
  status,
  due_date,
  customer_id,
  CASE
    WHEN due_date IS NULL THEN 'no_due_date'
    WHEN due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - due_date <= 30 THEN 'overdue_1_30'
    WHEN CURRENT_DATE - due_date <= 60 THEN 'overdue_31_60'
    WHEN CURRENT_DATE - due_date <= 90 THEN 'overdue_61_90'
    ELSE 'overdue_90_plus'
  END AS aging_bucket
FROM invoices
WHERE status NOT IN ('paid', 'cancelled')
  AND total_amount > 0;

-- 2. v_pending_ap - Unpaid bills for AP forecasting
CREATE OR REPLACE VIEW public.v_pending_ap AS
SELECT
  tenant_id,
  id,
  total_amount,
  COALESCE(paid_amount, 0) AS paid_amount,
  (total_amount - COALESCE(paid_amount, 0)) AS outstanding,
  status,
  due_date,
  CASE
    WHEN due_date IS NULL THEN 'no_due_date'
    WHEN due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - due_date <= 30 THEN 'overdue_1_30'
    WHEN CURRENT_DATE - due_date <= 60 THEN 'overdue_31_60'
    WHEN CURRENT_DATE - due_date <= 90 THEN 'overdue_61_90'
    ELSE 'overdue_90_plus'
  END AS aging_bucket
FROM bills
WHERE status NOT IN ('paid', 'cancelled')
  AND total_amount > 0;

-- 3. v_ar_aging_buckets - Pre-calculated AR aging for board reports
CREATE OR REPLACE VIEW public.v_ar_aging_buckets AS
SELECT
  tenant_id,
  aging_bucket,
  COUNT(*) AS invoice_count,
  SUM(outstanding) AS total_amount
FROM public.v_pending_ar
GROUP BY tenant_id, aging_bucket;

-- 4. v_expenses_weekly_by_category - Expenses by category and week
CREATE OR REPLACE VIEW public.v_expenses_weekly_by_category AS
SELECT
  tenant_id,
  date_trunc('week', expense_date::timestamp)::date AS week_start,
  COALESCE(category, 'other') AS category,
  COALESCE(is_recurring, false) AS is_recurring,
  SUM(amount) AS total_amount,
  COUNT(*) AS expense_count
FROM expenses
WHERE amount > 0
GROUP BY tenant_id, date_trunc('week', expense_date::timestamp)::date, COALESCE(category, 'other'), COALESCE(is_recurring, false);

-- 5. v_financial_monthly_summary - Monthly aggregated invoices + expenses + revenues
CREATE OR REPLACE VIEW public.v_financial_monthly_summary AS
SELECT
  tenant_id,
  period_month,
  COALESCE(inv_total, 0) AS invoice_revenue,
  COALESCE(inv_paid, 0) AS invoice_paid,
  COALESCE(inv_count, 0) AS invoice_count,
  COALESCE(inv_paid_count, 0) AS paid_invoice_count,
  COALESCE(inv_overdue_count, 0) AS overdue_invoice_count,
  COALESCE(exp_total, 0) AS total_expense,
  COALESCE(exp_cogs, 0) AS cogs,
  COALESCE(exp_salary, 0) AS salary_expense,
  COALESCE(exp_depreciation, 0) AS depreciation,
  COALESCE(exp_interest, 0) AS interest_expense,
  COALESCE(exp_marketing, 0) AS marketing_expense,
  COALESCE(exp_rent, 0) AS rent_expense,
  COALESCE(exp_count, 0) AS expense_count,
  COALESCE(rev_total, 0) AS other_revenue
FROM (
  -- Invoice aggregation by month
  SELECT
    tenant_id,
    date_trunc('month', issue_date::timestamp)::date AS period_month,
    SUM(total_amount) AS inv_total,
    SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS inv_paid,
    COUNT(*) AS inv_count,
    COUNT(*) FILTER (WHERE status = 'paid') AS inv_paid_count,
    COUNT(*) FILTER (WHERE status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE) AS inv_overdue_count
  FROM invoices
  GROUP BY tenant_id, date_trunc('month', issue_date::timestamp)::date
) inv
FULL OUTER JOIN (
  -- Expense aggregation by month
  SELECT
    tenant_id,
    date_trunc('month', expense_date::timestamp)::date AS period_month,
    SUM(amount) AS exp_total,
    SUM(amount) FILTER (WHERE category = 'cogs') AS exp_cogs,
    SUM(amount) FILTER (WHERE category = 'salary') AS exp_salary,
    SUM(amount) FILTER (WHERE category = 'depreciation') AS exp_depreciation,
    SUM(amount) FILTER (WHERE category = 'interest') AS exp_interest,
    SUM(amount) FILTER (WHERE category = 'marketing') AS exp_marketing,
    SUM(amount) FILTER (WHERE category = 'rent') AS exp_rent,
    COUNT(*) AS exp_count
  FROM expenses
  GROUP BY tenant_id, date_trunc('month', expense_date::timestamp)::date
) exp USING (tenant_id, period_month)
FULL OUTER JOIN (
  -- Revenue aggregation by month
  SELECT
    tenant_id,
    date_trunc('month', start_date::timestamp)::date AS period_month,
    SUM(amount) AS rev_total
  FROM revenues
  GROUP BY tenant_id, date_trunc('month', start_date::timestamp)::date
) rev USING (tenant_id, period_month);

-- 6. v_cash_flow_monthly - Monthly bank transaction summary
CREATE OR REPLACE VIEW public.v_cash_flow_monthly AS
SELECT
  tenant_id,
  date_trunc('month', transaction_date::timestamp)::date AS period_month,
  SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) AS total_inflow,
  SUM(CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END) AS total_outflow,
  SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -ABS(amount) END) AS net_flow,
  COUNT(*) AS transaction_count
FROM bank_transactions
GROUP BY tenant_id, date_trunc('month', transaction_date::timestamp)::date;

-- 7. v_customer_order_items_detail - Order items with order info for customer detail
CREATE OR REPLACE VIEW public.v_customer_order_items_detail AS
SELECT
  oi.tenant_id,
  oi.id,
  oi.order_id,
  o.customer_id,
  o.order_at,
  o.channel,
  oi.product_id,
  oi.category,
  oi.qty,
  oi.unit_price,
  oi.line_revenue,
  oi.line_cogs,
  oi.line_margin
FROM cdp_order_items oi
INNER JOIN cdp_orders o ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
WHERE o.customer_id IS NOT NULL;

-- 8. v_invoice_key_metrics - Pre-aggregated invoice metrics for board reports
CREATE OR REPLACE VIEW public.v_invoice_key_metrics AS
SELECT
  i.tenant_id,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE i.status = 'paid') AS paid_count,
  COUNT(*) FILTER (WHERE i.status NOT IN ('paid', 'cancelled') AND i.due_date < CURRENT_DATE) AS overdue_count,
  SUM(i.total_amount) AS total_amount,
  SUM(CASE WHEN i.status NOT IN ('paid', 'cancelled') THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS total_ar,
  SUM(CASE WHEN i.status NOT IN ('paid', 'cancelled') AND i.due_date < CURRENT_DATE THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS overdue_ar,
  AVG(i.total_amount) AS avg_invoice_value
FROM invoices i
GROUP BY i.tenant_id;
