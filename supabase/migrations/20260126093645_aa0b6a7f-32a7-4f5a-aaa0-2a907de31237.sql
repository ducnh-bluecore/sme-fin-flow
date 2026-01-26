
-- Rollback v_fdp_finance_summary to original 90-day restriction
DROP VIEW IF EXISTS public.v_fdp_finance_summary;

CREATE VIEW public.v_fdp_finance_summary AS
WITH order_metrics AS (
  SELECT 
    tenant_id,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) as gross_revenue,
    COALESCE(SUM(cost_of_goods) FILTER (WHERE status = 'delivered'), 0) as order_cogs,
    COALESCE(SUM(platform_fee) FILTER (WHERE status = 'delivered'), 0) as platform_fees,
    COALESCE(SUM(commission_fee) FILTER (WHERE status = 'delivered'), 0) as commission_fees,
    COALESCE(SUM(payment_fee) FILTER (WHERE status = 'delivered'), 0) as payment_fees,
    COALESCE(SUM(shipping_fee) FILTER (WHERE status = 'delivered'), 0) as shipping_fees,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'returned'), 0) as return_amount,
    COUNT(DISTINCT customer_name) FILTER (WHERE status = 'delivered') as unique_customers
  FROM external_orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY tenant_id
),
expense_metrics AS (
  SELECT 
    tenant_id,
    COALESCE(SUM(amount) FILTER (WHERE category = 'cogs'), 0) as expense_cogs,
    COALESCE(SUM(amount) FILTER (WHERE category = 'marketing'), 0) as marketing_expenses
  FROM expenses
  WHERE expense_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY tenant_id
),
campaign_metrics AS (
  SELECT 
    tenant_id,
    COALESCE(SUM(actual_cost), 0) as campaign_spend
  FROM promotion_campaigns
  WHERE start_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY tenant_id
)
SELECT 
  o.tenant_id,
  o.delivered_orders as total_orders,
  o.gross_revenue,
  o.gross_revenue - (o.platform_fees + o.commission_fees + o.payment_fees) - o.return_amount as net_revenue,
  o.order_cogs + COALESCE(e.expense_cogs, 0) as total_cogs,
  o.platform_fees + o.commission_fees + o.payment_fees as total_fees,
  o.gross_revenue - (o.platform_fees + o.commission_fees + o.payment_fees) - o.return_amount 
    - (o.order_cogs + COALESCE(e.expense_cogs, 0)) as gross_profit,
  o.unique_customers,
  COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0) as total_marketing_spend,
  o.gross_revenue - (o.platform_fees + o.commission_fees + o.payment_fees) - o.return_amount 
    - (o.order_cogs + COALESCE(e.expense_cogs, 0)) - o.shipping_fees 
    - (COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0)) as contribution_margin,
  ROUND(
    CASE WHEN o.gross_revenue > 0 THEN
      ((o.gross_revenue - (o.platform_fees + o.commission_fees + o.payment_fees) - o.return_amount 
        - (o.order_cogs + COALESCE(e.expense_cogs, 0)) - o.shipping_fees 
        - (COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0))) / o.gross_revenue * 100)::numeric
    ELSE 0 END, 2
  ) as contribution_margin_percent,
  CASE WHEN o.delivered_orders > 0 THEN ROUND((o.gross_revenue / o.delivered_orders)::numeric, 2) ELSE 0 END as avg_order_value,
  CASE WHEN o.unique_customers > 0 
    THEN ROUND(((COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0)) / o.unique_customers)::numeric, 2)
    ELSE 0 END as cac
FROM order_metrics o
LEFT JOIN expense_metrics e ON o.tenant_id = e.tenant_id
LEFT JOIN campaign_metrics c ON o.tenant_id = c.tenant_id;
