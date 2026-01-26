
-- Fix v_fdp_finance_summary to query cdp_orders instead of external_orders
DROP VIEW IF EXISTS public.v_fdp_finance_summary;

CREATE VIEW public.v_fdp_finance_summary AS
WITH order_metrics AS (
  SELECT 
    tenant_id,
    COUNT(*) as delivered_orders,
    COALESCE(SUM(gross_revenue), 0) as gross_revenue,
    COALESCE(SUM(net_revenue), 0) as net_revenue,
    COALESCE(SUM(cogs), 0) as order_cogs,
    COALESCE(SUM(discount_amount), 0) as total_discounts,
    COUNT(DISTINCT customer_id) as unique_customers
  FROM cdp_orders
  WHERE order_at >= CURRENT_DATE - INTERVAL '90 days'
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
  o.net_revenue,
  o.order_cogs + COALESCE(e.expense_cogs, 0) as total_cogs,
  o.total_discounts as total_fees,
  o.net_revenue - (o.order_cogs + COALESCE(e.expense_cogs, 0)) as gross_profit,
  o.unique_customers,
  COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0) as total_marketing_spend,
  o.net_revenue - (o.order_cogs + COALESCE(e.expense_cogs, 0)) 
    - (COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0)) as contribution_margin,
  ROUND(
    CASE WHEN o.gross_revenue > 0 THEN
      ((o.net_revenue - (o.order_cogs + COALESCE(e.expense_cogs, 0)) 
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
