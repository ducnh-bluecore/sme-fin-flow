-- ============================================
-- SSOT VIEWS FOR FDP, MDP, CHANNEL METRICS
-- All calculations happen in DB, hooks just fetch
-- ============================================

-- 1. FDP FINANCE VIEW - Replaces useFDPMetrics calculations
CREATE OR REPLACE VIEW public.v_fdp_finance_summary AS
WITH order_metrics AS (
  SELECT 
    tenant_id,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
    COUNT(*) FILTER (WHERE status = 'returned') as returned_orders,
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
    COALESCE(SUM(amount) FILTER (WHERE category = 'marketing'), 0) as marketing_expenses,
    COALESCE(SUM(amount) FILTER (WHERE category NOT IN ('cogs', 'marketing')), 0) as opex
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
  -- Revenue
  o.gross_revenue,
  o.platform_fees + o.commission_fees + o.payment_fees as total_platform_fees,
  o.return_amount as total_returns,
  o.gross_revenue - (o.platform_fees + o.commission_fees + o.payment_fees) - o.return_amount as net_revenue,
  -- Costs
  o.order_cogs + COALESCE(e.expense_cogs, 0) as total_cogs,
  o.shipping_fees,
  COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0) as total_marketing_spend,
  COALESCE(e.opex, 0) as total_opex,
  -- Profit
  o.gross_revenue - (o.platform_fees + o.commission_fees + o.payment_fees) - o.return_amount 
    - (o.order_cogs + COALESCE(e.expense_cogs, 0)) as gross_profit,
  ROUND(
    CASE WHEN o.gross_revenue > 0 THEN
      ((o.gross_revenue - (o.platform_fees + o.commission_fees + o.payment_fees) - o.return_amount 
        - (o.order_cogs + COALESCE(e.expense_cogs, 0))) / o.gross_revenue * 100)::numeric
    ELSE 0 END, 2
  ) as gross_margin_percent,
  -- Contribution Margin (Net Revenue - COGS - Shipping - Marketing)
  o.gross_revenue - (o.platform_fees + o.commission_fees + o.payment_fees) - o.return_amount 
    - (o.order_cogs + COALESCE(e.expense_cogs, 0)) - o.shipping_fees 
    - (COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0)) as contribution_margin,
  -- Orders
  o.delivered_orders,
  o.cancelled_orders,
  o.returned_orders,
  CASE WHEN o.delivered_orders > 0 THEN ROUND((o.gross_revenue / o.delivered_orders)::numeric, 2) ELSE 0 END as aov,
  -- Customers
  o.unique_customers,
  -- Marketing efficiency
  CASE WHEN (COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0)) > 0 
    THEN ROUND((o.gross_revenue / (COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0)))::numeric, 2)
    ELSE 0 END as roas,
  -- Data quality flags
  o.order_cogs > 0 as has_real_cogs,
  (o.platform_fees + o.commission_fees + o.payment_fees) > 0 as has_real_fees,
  (COALESCE(c.campaign_spend, 0) + COALESCE(e.marketing_expenses, 0)) > 0 as has_real_marketing,
  -- Timestamp
  NOW() as computed_at
FROM order_metrics o
LEFT JOIN expense_metrics e ON o.tenant_id = e.tenant_id
LEFT JOIN campaign_metrics c ON o.tenant_id = c.tenant_id;

-- 2. MDP CAMPAIGN PERFORMANCE VIEW - Replaces useMDPData.marketingPerformance calculations
CREATE OR REPLACE VIEW public.v_mdp_campaign_performance AS
SELECT 
  pc.id as campaign_id,
  pc.tenant_id,
  pc.campaign_name,
  pc.channel,
  pc.campaign_type,
  pc.status,
  COALESCE(pc.actual_cost, 0) as spend,
  COALESCE(pc.total_orders, 0) as orders,
  COALESCE(pc.total_revenue, 0) as revenue,
  -- Estimated metrics (marked as estimated)
  FLOOR(COALESCE(pc.actual_cost, 0) / 5) as impressions_estimated,
  FLOOR(COALESCE(pc.actual_cost, 0) / 5 * 0.02) as clicks_estimated,
  FLOOR(COALESCE(pc.actual_cost, 0) / 5 * 0.02 * 0.1) as leads_estimated,
  -- Calculated metrics
  CASE WHEN FLOOR(COALESCE(pc.actual_cost, 0) / 5) > 0 
    THEN ROUND((FLOOR(COALESCE(pc.actual_cost, 0) / 5 * 0.02) / FLOOR(COALESCE(pc.actual_cost, 0) / 5) * 100)::numeric, 2)
    ELSE 0 END as ctr,
  CASE WHEN FLOOR(COALESCE(pc.actual_cost, 0) / 5 * 0.02) > 0 
    THEN ROUND((COALESCE(pc.actual_cost, 0) / FLOOR(COALESCE(pc.actual_cost, 0) / 5 * 0.02))::numeric, 2)
    ELSE 0 END as cpc,
  CASE WHEN COALESCE(pc.total_orders, 0) > 0 
    THEN ROUND((COALESCE(pc.actual_cost, 0) / pc.total_orders)::numeric, 2)
    ELSE 0 END as cpa,
  CASE WHEN COALESCE(pc.actual_cost, 0) > 0 
    THEN ROUND((COALESCE(pc.total_revenue, 0) / pc.actual_cost)::numeric, 2)
    ELSE 0 END as roas,
  CASE WHEN FLOOR(COALESCE(pc.actual_cost, 0) / 5 * 0.02) > 0 
    THEN ROUND((COALESCE(pc.total_orders, 0) / FLOOR(COALESCE(pc.actual_cost, 0) / 5 * 0.02) * 100)::numeric, 2)
    ELSE 0 END as conversion_rate,
  -- Data quality
  TRUE as impressions_is_estimated,
  TRUE as clicks_is_estimated,
  TRUE as leads_is_estimated,
  pc.start_date,
  pc.end_date
FROM promotion_campaigns pc
WHERE pc.start_date >= CURRENT_DATE - INTERVAL '90 days';

-- 3. MDP FUNNEL VIEW - Replaces useMDPData.funnelData calculations
CREATE OR REPLACE VIEW public.v_mdp_funnel_summary AS
WITH campaign_totals AS (
  SELECT 
    tenant_id,
    SUM(FLOOR(COALESCE(actual_cost, 0) / 5)) as total_impressions,
    SUM(FLOOR(COALESCE(actual_cost, 0) / 5 * 0.02)) as total_clicks,
    SUM(FLOOR(COALESCE(actual_cost, 0) / 5 * 0.02 * 0.1)) as total_leads,
    SUM(COALESCE(total_orders, 0)) as total_orders
  FROM promotion_campaigns
  WHERE start_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY tenant_id
)
SELECT 
  tenant_id,
  total_impressions as impressions,
  total_clicks as clicks,
  total_leads as leads,
  total_orders as orders,
  -- Conversion rates
  100.0 as impressions_cvr,
  CASE WHEN total_impressions > 0 THEN ROUND((total_clicks::numeric / total_impressions * 100), 2) ELSE 0 END as clicks_cvr,
  CASE WHEN total_clicks > 0 THEN ROUND((total_leads::numeric / total_clicks * 100), 2) ELSE 0 END as leads_cvr,
  CASE WHEN total_leads > 0 THEN ROUND((total_orders::numeric / total_leads * 100), 2) ELSE 0 END as orders_cvr,
  -- Drop rates
  0.0 as impressions_drop,
  CASE WHEN total_impressions > 0 THEN ROUND(((total_impressions - total_clicks)::numeric / total_impressions * 100), 2) ELSE 0 END as clicks_drop,
  CASE WHEN total_clicks > 0 THEN ROUND(((total_clicks - total_leads)::numeric / total_clicks * 100), 2) ELSE 0 END as leads_drop,
  CASE WHEN total_leads > 0 THEN ROUND(((total_leads - total_orders)::numeric / total_leads * 100), 2) ELSE 0 END as orders_drop,
  -- Data quality
  TRUE as is_estimated
FROM campaign_totals;

-- 4. CHANNEL PL VIEW - Replaces useChannelPL calculations
CREATE OR REPLACE VIEW public.v_channel_pl_summary AS
WITH channel_orders AS (
  SELECT 
    tenant_id,
    UPPER(COALESCE(channel, 'UNKNOWN')) as channel,
    DATE_TRUNC('month', order_date::date) as period,
    COUNT(*) FILTER (WHERE status IN ('delivered', 'confirmed')) as order_count,
    COUNT(*) FILTER (WHERE status IN ('cancelled', 'returned')) as cancelled_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status IN ('delivered', 'confirmed')), 0) as gross_revenue,
    COALESCE(SUM(platform_fee) FILTER (WHERE status IN ('delivered', 'confirmed')), 0) as platform_fee,
    COALESCE(SUM(commission_fee) FILTER (WHERE status IN ('delivered', 'confirmed')), 0) as commission_fee,
    COALESCE(SUM(payment_fee) FILTER (WHERE status IN ('delivered', 'confirmed')), 0) as payment_fee,
    COALESCE(SUM(shipping_fee) FILTER (WHERE status IN ('delivered', 'confirmed')), 0) as shipping_fee,
    COALESCE(SUM(cost_of_goods) FILTER (WHERE status IN ('delivered', 'confirmed')), 0) as cogs,
    COALESCE(SUM(seller_income) FILTER (WHERE status IN ('delivered', 'confirmed')), 0) as net_revenue
  FROM external_orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id, UPPER(COALESCE(channel, 'UNKNOWN')), DATE_TRUNC('month', order_date::date)
)
SELECT 
  tenant_id,
  channel,
  period,
  order_count,
  cancelled_count,
  gross_revenue,
  platform_fee,
  commission_fee,
  payment_fee,
  shipping_fee,
  platform_fee + commission_fee + payment_fee + shipping_fee as total_fees,
  cogs,
  net_revenue,
  gross_revenue - (platform_fee + commission_fee + payment_fee + shipping_fee) - cogs as gross_profit,
  CASE WHEN gross_revenue > 0 
    THEN ROUND(((gross_revenue - (platform_fee + commission_fee + payment_fee + shipping_fee) - cogs) / gross_revenue * 100)::numeric, 2)
    ELSE 0 END as margin_percent,
  CASE WHEN order_count > 0 
    THEN ROUND((gross_revenue / order_count)::numeric, 2)
    ELSE 0 END as avg_order_value,
  CASE WHEN (order_count + cancelled_count) > 0 
    THEN ROUND((cancelled_count::numeric / (order_count + cancelled_count) * 100), 2)
    ELSE 0 END as return_rate
FROM channel_orders;

-- 5. MDP SUMMARY VIEW - Replaces useMDPData.marketingModeSummary
CREATE OR REPLACE VIEW public.v_mdp_mode_summary AS
WITH campaign_agg AS (
  SELECT 
    tenant_id,
    COUNT(*) FILTER (WHERE status = 'active') as active_campaigns,
    COALESCE(SUM(actual_cost), 0) as total_spend,
    COALESCE(SUM(total_orders), 0) as total_orders,
    COALESCE(SUM(total_revenue), 0) as total_revenue,
    SUM(FLOOR(COALESCE(actual_cost, 0) / 5 * 0.02 * 0.1)) as total_leads
  FROM promotion_campaigns
  WHERE start_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY tenant_id
)
SELECT 
  tenant_id,
  total_spend,
  total_leads,
  total_orders,
  total_revenue,
  CASE WHEN total_orders > 0 THEN ROUND((total_spend / total_orders)::numeric, 2) ELSE 0 END as overall_cpa,
  CASE WHEN total_spend > 0 THEN ROUND((total_revenue / total_spend)::numeric, 2) ELSE 0 END as overall_roas,
  2.0 as overall_ctr, -- Fixed estimate
  CASE WHEN total_leads > 0 THEN ROUND((total_orders::numeric / total_leads * 100), 2) ELSE 0 END as overall_conversion,
  active_campaigns,
  0 as execution_alerts_count -- Alerts from decision_cards, not calculated here
FROM campaign_agg;

-- Grant access
GRANT SELECT ON public.v_fdp_finance_summary TO authenticated, anon;
GRANT SELECT ON public.v_mdp_campaign_performance TO authenticated, anon;
GRANT SELECT ON public.v_mdp_funnel_summary TO authenticated, anon;
GRANT SELECT ON public.v_channel_pl_summary TO authenticated, anon;
GRANT SELECT ON public.v_mdp_mode_summary TO authenticated, anon;