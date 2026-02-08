
-- ============================================
-- VIEWS FOR HOOK ARCHITECTURE COMPLIANCE
-- Hook → View → Table (no direct model queries)
-- ============================================

-- 1. v_revenue_channel_daily
CREATE OR REPLACE VIEW public.v_revenue_channel_daily
WITH (security_invoker = on) AS
SELECT 
  tenant_id, channel, order_at::date AS order_date,
  SUM(COALESCE(gross_revenue, 0)) AS total_gross_revenue,
  SUM(COALESCE(net_revenue, 0)) AS total_net_revenue,
  COUNT(*) AS order_count
FROM cdp_orders
GROUP BY tenant_id, channel, order_at::date;

-- 2. v_cdp_orders_stats
CREATE OR REPLACE VIEW public.v_cdp_orders_stats
WITH (security_invoker = on) AS
SELECT 
  tenant_id, COUNT(*) AS order_count,
  SUM(COALESCE(net_revenue, 0)) AS total_net_revenue,
  SUM(COALESCE(gross_revenue, 0)) AS total_gross_revenue,
  MIN(order_at) AS first_order_at, MAX(order_at) AS last_order_at
FROM cdp_orders
GROUP BY tenant_id;

-- 3. v_mdp_order_items_summary (correct column names)
CREATE OR REPLACE VIEW public.v_mdp_order_items_summary
WITH (security_invoker = on) AS
SELECT 
  tenant_id, order_id, sku, qty, unit_price,
  line_revenue, unit_cogs, line_cogs, line_margin
FROM cdp_order_items;

-- 4. v_cash_forecast_orders_weekly
CREATE OR REPLACE VIEW public.v_cash_forecast_orders_weekly
WITH (security_invoker = on) AS
SELECT 
  tenant_id, date_trunc('week', order_at)::date AS week_start,
  SUM(COALESCE(gross_revenue, 0)) AS weekly_revenue,
  COUNT(*) AS weekly_orders
FROM cdp_orders
GROUP BY tenant_id, date_trunc('week', order_at)::date;

-- 5. v_audience_customer_summary
CREATE OR REPLACE VIEW public.v_audience_customer_summary
WITH (security_invoker = on) AS
SELECT 
  tenant_id, customer_id, channel,
  COUNT(*) AS order_count,
  SUM(COALESCE(gross_revenue, 0)) AS total_revenue,
  SUM(COALESCE(net_revenue, 0)) AS total_net_revenue,
  SUM(COALESCE(cogs, 0)) AS total_cogs,
  SUM(COALESCE(gross_margin, 0)) AS total_margin,
  MIN(order_at) AS first_order_at, MAX(order_at) AS last_order_at,
  AVG(COALESCE(gross_revenue, 0)) AS avg_order_value
FROM cdp_orders
WHERE customer_id IS NOT NULL
GROUP BY tenant_id, customer_id, channel;

-- 6. v_variance_orders_monthly
CREATE OR REPLACE VIEW public.v_variance_orders_monthly
WITH (security_invoker = on) AS
SELECT 
  tenant_id, date_trunc('month', order_at)::date AS month_start,
  SUM(COALESCE(gross_revenue, 0)) AS monthly_revenue,
  SUM(COALESCE(net_revenue, 0)) AS monthly_net_revenue,
  COUNT(*) AS monthly_orders
FROM cdp_orders
GROUP BY tenant_id, date_trunc('month', order_at)::date;

-- 7. v_board_report_invoices
CREATE OR REPLACE VIEW public.v_board_report_invoices
WITH (security_invoker = on) AS
SELECT tenant_id, id, total_amount, paid_amount, status, issue_date, due_date, customer_id
FROM invoices;

-- 8. v_expenses_by_category_monthly
CREATE OR REPLACE VIEW public.v_expenses_by_category_monthly
WITH (security_invoker = on) AS
SELECT 
  tenant_id, category, is_recurring,
  date_trunc('month', expense_date)::date AS month_start,
  expense_date,
  SUM(amount) AS total_amount,
  COUNT(*) AS expense_count
FROM expenses
GROUP BY tenant_id, category, is_recurring, date_trunc('month', expense_date)::date, expense_date;

-- Indexes to support the views
CREATE INDEX IF NOT EXISTS idx_cdp_orders_tenant_order_at_channel 
ON cdp_orders (tenant_id, order_at, channel);

CREATE INDEX IF NOT EXISTS idx_cdp_orders_tenant_customer 
ON cdp_orders (tenant_id, customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date_category 
ON expenses (tenant_id, expense_date, category);

CREATE INDEX IF NOT EXISTS idx_cdp_order_items_tenant_order 
ON cdp_order_items (tenant_id, order_id);
