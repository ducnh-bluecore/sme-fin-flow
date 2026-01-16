
-- View: Daily aggregated metrics for FDP calculations
CREATE OR REPLACE VIEW public.fdp_daily_metrics AS
SELECT 
  tenant_id,
  DATE(order_date) as metric_date,
  channel,
  COUNT(*) as order_count,
  COUNT(DISTINCT customer_name) as unique_customers,
  SUM(total_amount) as total_revenue,
  SUM(COALESCE(cost_of_goods, 0)) as total_cogs,
  SUM(COALESCE(platform_fee, 0)) as total_platform_fee,
  SUM(COALESCE(commission_fee, 0)) as total_commission_fee,
  SUM(COALESCE(payment_fee, 0)) as total_payment_fee,
  SUM(COALESCE(shipping_fee, 0)) as total_shipping_fee,
  SUM(total_amount) - SUM(COALESCE(cost_of_goods, 0)) - SUM(COALESCE(platform_fee, 0)) - SUM(COALESCE(commission_fee, 0)) - SUM(COALESCE(payment_fee, 0)) - SUM(COALESCE(shipping_fee, 0)) as contribution_margin
FROM external_orders
WHERE status NOT IN ('cancelled', 'returned')
GROUP BY tenant_id, DATE(order_date), channel;

-- View: Monthly aggregated metrics
CREATE OR REPLACE VIEW public.fdp_monthly_metrics AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', order_date)::date as metric_month,
  channel,
  COUNT(*) as order_count,
  COUNT(DISTINCT customer_name) as unique_customers,
  SUM(total_amount) as total_revenue,
  SUM(COALESCE(cost_of_goods, 0)) as total_cogs,
  SUM(COALESCE(platform_fee, 0)) as total_platform_fee,
  SUM(COALESCE(commission_fee, 0)) as total_commission_fee,
  SUM(COALESCE(payment_fee, 0)) as total_payment_fee,
  SUM(COALESCE(shipping_fee, 0)) as total_shipping_fee,
  SUM(total_amount) - SUM(COALESCE(cost_of_goods, 0)) - SUM(COALESCE(platform_fee, 0)) - SUM(COALESCE(commission_fee, 0)) - SUM(COALESCE(payment_fee, 0)) - SUM(COALESCE(shipping_fee, 0)) as contribution_margin
FROM external_orders
WHERE status NOT IN ('cancelled', 'returned')
GROUP BY tenant_id, DATE_TRUNC('month', order_date), channel;

-- View: Channel summary (all-time by channel)
CREATE OR REPLACE VIEW public.fdp_channel_summary AS
SELECT 
  tenant_id,
  channel,
  COUNT(*) as order_count,
  COUNT(DISTINCT customer_name) as unique_customers,
  SUM(total_amount) as total_revenue,
  SUM(COALESCE(cost_of_goods, 0)) as total_cogs,
  SUM(COALESCE(platform_fee, 0)) as total_platform_fee,
  SUM(COALESCE(commission_fee, 0)) as total_commission_fee,
  SUM(COALESCE(payment_fee, 0)) as total_payment_fee,
  SUM(COALESCE(shipping_fee, 0)) as total_shipping_fee,
  SUM(total_amount) - SUM(COALESCE(cost_of_goods, 0)) - SUM(COALESCE(platform_fee, 0)) - SUM(COALESCE(commission_fee, 0)) - SUM(COALESCE(payment_fee, 0)) - SUM(COALESCE(shipping_fee, 0)) as contribution_margin,
  AVG(total_amount) as avg_order_value
FROM external_orders
WHERE status NOT IN ('cancelled', 'returned')
GROUP BY tenant_id, channel;

-- View: SKU-level profitability summary
CREATE OR REPLACE VIEW public.fdp_sku_summary AS
SELECT 
  oi.tenant_id,
  oi.sku,
  oi.product_name,
  COUNT(DISTINCT oi.external_order_id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.total_amount) as total_revenue,
  SUM(COALESCE(oi.total_cogs, 0)) as total_cogs,
  SUM(COALESCE(oi.gross_profit, 0)) as gross_profit,
  CASE WHEN SUM(oi.total_amount) > 0 
    THEN SUM(COALESCE(oi.gross_profit, 0)) / SUM(oi.total_amount) * 100 
    ELSE 0 
  END as margin_percent
FROM external_order_items oi
WHERE oi.is_returned = false OR oi.is_returned IS NULL
GROUP BY oi.tenant_id, oi.sku, oi.product_name;

-- View: Expense summary by category and month
CREATE OR REPLACE VIEW public.fdp_expense_summary AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', expense_date)::date as expense_month,
  category,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM expenses
GROUP BY tenant_id, DATE_TRUNC('month', expense_date), category;

-- View: Invoice collection summary (using issue_date)
CREATE OR REPLACE VIEW public.fdp_invoice_summary AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', issue_date)::date as invoice_month,
  status,
  COUNT(*) as invoice_count,
  SUM(total_amount) as total_amount,
  SUM(paid_amount) as total_paid,
  SUM(total_amount - COALESCE(paid_amount, 0)) as outstanding_amount
FROM invoices
GROUP BY tenant_id, DATE_TRUNC('month', issue_date), status;

-- Grant access to authenticated users
GRANT SELECT ON public.fdp_daily_metrics TO authenticated;
GRANT SELECT ON public.fdp_monthly_metrics TO authenticated;
GRANT SELECT ON public.fdp_channel_summary TO authenticated;
GRANT SELECT ON public.fdp_sku_summary TO authenticated;
GRANT SELECT ON public.fdp_expense_summary TO authenticated;
GRANT SELECT ON public.fdp_invoice_summary TO authenticated;
