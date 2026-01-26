
-- Fix regression: v_fdp_finance_summary và v_mdp_campaign_performance

-- 1. Fix FDP Finance Summary: Remove 90-day filter for all-time view
DROP VIEW IF EXISTS public.v_fdp_finance_summary CASCADE;

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
  -- SSOT: All-time data, no 90-day filter
  GROUP BY tenant_id
),
expense_metrics AS (
  SELECT 
    tenant_id,
    COALESCE(SUM(amount) FILTER (WHERE category = 'cogs'), 0) as expense_cogs,
    COALESCE(SUM(amount) FILTER (WHERE category = 'marketing'), 0) as marketing_expenses
  FROM expenses
  GROUP BY tenant_id
),
campaign_metrics AS (
  SELECT 
    tenant_id,
    COALESCE(SUM(actual_cost), 0) as campaign_spend
  FROM promotion_campaigns
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

-- 2. Fix MDP Campaign Performance: Use correct columns from promotion_campaigns
DROP VIEW IF EXISTS public.v_mdp_campaign_performance CASCADE;

CREATE VIEW public.v_mdp_campaign_performance AS
SELECT 
  pc.id as campaign_id,
  pc.tenant_id,
  pc.campaign_name,
  pc.channel,
  pc.campaign_type,
  pc.status,
  -- Spend columns (both names for compatibility)
  pc.actual_cost as spend,
  pc.actual_cost as total_spend,
  -- Orders
  COALESCE(pc.total_orders, 0) as orders,
  -- Revenue columns (both names for compatibility)
  COALESCE(pc.total_revenue, 0) as revenue,
  COALESCE(pc.total_revenue, 0) as total_revenue,
  -- Estimated metrics (placeholder zeros as table doesn't store these)
  0 as impressions_estimated,
  0 as clicks_estimated,
  0 as leads_estimated,
  -- Calculated metrics (will be 0 without clicks/impressions data)
  0.0 as ctr,
  0.0 as cpc,
  CASE WHEN COALESCE(pc.total_orders, 0) > 0 
    THEN ROUND((pc.actual_cost / pc.total_orders), 2) 
    ELSE 0 END as cpa,
  CASE WHEN pc.actual_cost > 0 
    THEN ROUND((COALESCE(pc.total_revenue, 0) / pc.actual_cost), 2) 
    ELSE 0 END as roas,
  0.0 as conversion_rate,
  -- Data quality flags
  true as impressions_is_estimated,
  true as clicks_is_estimated,
  true as leads_is_estimated,
  -- Date range
  pc.start_date,
  pc.end_date
FROM promotion_campaigns pc;

-- Verify both views work
SELECT 'FDP Check' as type, tenant_id, total_orders, net_revenue 
FROM v_fdp_finance_summary 
ORDER BY tenant_id 
LIMIT 3;

SELECT 'MDP Check' as type, tenant_id, COUNT(*) as campaigns, SUM(total_spend) as total_spend 
FROM v_mdp_campaign_performance 
GROUP BY tenant_id 
ORDER BY tenant_id;
