-- ============================================
-- DB-FIRST AGGREGATION FUNCTIONS
-- Fixing 1000-row limit issues in hooks
-- Drop existing views first to avoid column conflicts
-- ============================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_channel_performance CASCADE;
DROP VIEW IF EXISTS v_channel_daily_revenue CASCADE;
DROP VIEW IF EXISTS v_mdp_campaign_attribution CASCADE;
DROP VIEW IF EXISTS v_audience_rfm_summary CASCADE;
DROP VIEW IF EXISTS v_fdp_finance_summary CASCADE;

-- 1. Audit Log Stats RPC (for useAuditLogStats)
CREATE OR REPLACE FUNCTION get_audit_log_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_today INTEGER,
  unique_users INTEGER,
  critical_actions INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*)::INTEGER as total_today,
    COUNT(DISTINCT user_id)::INTEGER as unique_users,
    COUNT(*) FILTER (WHERE LOWER(action) IN ('delete', 'update'))::INTEGER as critical_actions
  FROM audit_logs
  WHERE created_at >= CURRENT_DATE
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
$$;

-- 2. Forecast Historical Stats RPC (for useForecastInputs)
CREATE OR REPLACE FUNCTION get_forecast_historical_stats(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE(
  total_credit NUMERIC,
  total_debit NUMERIC,
  unique_days INTEGER,
  avg_daily_inflow NUMERIC,
  avg_daily_outflow NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH txn_data AS (
    SELECT 
      SUM(CASE WHEN transaction_type = 'credit' THEN ABS(amount) ELSE 0 END) as total_credit,
      SUM(CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END) as total_debit,
      COUNT(DISTINCT transaction_date) as unique_days
    FROM bank_transactions
    WHERE tenant_id = p_tenant_id
      AND transaction_date >= CURRENT_DATE - p_days
  )
  SELECT 
    COALESCE(total_credit, 0) as total_credit,
    COALESCE(total_debit, 0) as total_debit,
    COALESCE(unique_days, 1)::INTEGER as unique_days,
    COALESCE(total_credit / NULLIF(unique_days, 0), 0) as avg_daily_inflow,
    COALESCE(total_debit / NULLIF(unique_days, 0), 0) as avg_daily_outflow
  FROM txn_data;
$$;

-- 3. Customer Channel Stats RPC (for useCDPAudit - whale customer protection)
CREATE OR REPLACE FUNCTION cdp_customer_channel_stats(
  p_customer_id UUID
)
RETURNS TABLE(
  channel TEXT,
  order_count INTEGER,
  total_value NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(channel, 'unknown') as channel,
    COUNT(*)::INTEGER as order_count,
    COALESCE(SUM(net_revenue), 0) as total_value
  FROM cdp_orders
  WHERE customer_id = p_customer_id
  GROUP BY COALESCE(channel, 'unknown');
$$;

-- 4. Channel Performance View (for useChannelAnalytics)
CREATE VIEW v_channel_performance AS
SELECT 
  tenant_id,
  channel,
  COUNT(*)::INTEGER as total_orders,
  COALESCE(SUM(total_amount), 0) as gross_revenue,
  COALESCE(SUM(seller_income), 0) as net_revenue,
  COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0)), 0) as total_fees,
  COALESCE(SUM(cost_of_goods), 0) as total_cogs,
  COALESCE(SUM(gross_profit), 0) as gross_profit,
  COALESCE(AVG(total_amount), 0) as avg_order_value,
  COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER as cancelled_orders,
  COUNT(*) FILTER (WHERE status = 'returned')::INTEGER as returned_orders
FROM external_orders
GROUP BY tenant_id, channel;

-- 5. Channel Daily Revenue View
CREATE VIEW v_channel_daily_revenue AS
SELECT 
  tenant_id,
  order_date::DATE as order_date,
  channel,
  COUNT(*)::INTEGER as order_count,
  COALESCE(SUM(total_amount), 0) as gross_revenue,
  COALESCE(SUM(seller_income), 0) as net_revenue,
  COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0)), 0) as platform_fees,
  COALESCE(SUM(gross_profit), 0) as profit
FROM external_orders
WHERE order_date IS NOT NULL
GROUP BY tenant_id, order_date::DATE, channel;

-- 6. MDP Campaign Attribution View (for useMDPSSOT)
CREATE VIEW v_mdp_campaign_attribution AS
WITH campaign_orders AS (
  SELECT 
    o.tenant_id,
    o.channel,
    COUNT(*)::INTEGER as order_count,
    COALESCE(SUM(o.total_amount), 0) as gross_revenue,
    COALESCE(SUM(o.seller_income), 0) as net_revenue,
    COALESCE(SUM(o.cost_of_goods), 0) as cogs,
    COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0)), 0) as platform_fees
  FROM external_orders o
  GROUP BY o.tenant_id, o.channel
),
campaign_spend AS (
  SELECT 
    tenant_id,
    SUM(COALESCE(actual_cost, 0)) as total_spend
  FROM promotion_campaigns
  GROUP BY tenant_id
)
SELECT 
  co.tenant_id,
  co.channel,
  co.order_count,
  co.gross_revenue,
  co.net_revenue,
  co.cogs,
  co.platform_fees,
  COALESCE(cs.total_spend, 0) as ad_spend,
  (co.net_revenue - co.cogs - co.platform_fees) as contribution_margin,
  CASE 
    WHEN co.net_revenue > 0 THEN ((co.net_revenue - co.cogs - co.platform_fees) / co.net_revenue * 100)
    ELSE 0 
  END as contribution_margin_percent
FROM campaign_orders co
LEFT JOIN campaign_spend cs ON co.tenant_id = cs.tenant_id;

-- 7. Audience RFM Stats View (for useAudienceData)
CREATE VIEW v_audience_rfm_summary AS
WITH customer_metrics AS (
  SELECT 
    o.tenant_id,
    o.customer_id,
    COUNT(*)::INTEGER as order_count,
    COALESCE(SUM(o.net_revenue), 0) as total_revenue,
    COALESCE(AVG(o.net_revenue), 0) as avg_order_value,
    MAX(o.order_at) as last_order_at,
    MIN(o.order_at) as first_order_at,
    EXTRACT(DAY FROM NOW() - MAX(o.order_at))::INTEGER as recency_days
  FROM cdp_orders o
  GROUP BY o.tenant_id, o.customer_id
),
rfm_scores AS (
  SELECT 
    tenant_id,
    customer_id,
    order_count,
    total_revenue,
    avg_order_value,
    recency_days,
    NTILE(5) OVER (PARTITION BY tenant_id ORDER BY recency_days ASC) as r_score,
    NTILE(5) OVER (PARTITION BY tenant_id ORDER BY order_count DESC) as f_score,
    NTILE(5) OVER (PARTITION BY tenant_id ORDER BY total_revenue DESC) as m_score
  FROM customer_metrics
)
SELECT 
  tenant_id,
  COUNT(*)::INTEGER as total_customers,
  COUNT(*) FILTER (WHERE r_score >= 4 AND f_score >= 4 AND m_score >= 4)::INTEGER as champions,
  COUNT(*) FILTER (WHERE r_score >= 4 AND f_score >= 3)::INTEGER as loyal,
  COUNT(*) FILTER (WHERE r_score >= 4 AND f_score <= 2)::INTEGER as new_customers,
  COUNT(*) FILTER (WHERE r_score <= 2 AND f_score >= 3)::INTEGER as at_risk,
  COUNT(*) FILTER (WHERE r_score <= 2 AND f_score <= 2)::INTEGER as hibernating,
  COALESCE(AVG(total_revenue), 0) as avg_ltv,
  COALESCE(AVG(avg_order_value), 0) as avg_aov,
  COALESCE(AVG(order_count), 0) as avg_frequency,
  COALESCE(AVG(recency_days), 0) as avg_recency_days
FROM rfm_scores
GROUP BY tenant_id;

-- 8. FDP Finance Summary View (consolidated metrics)
CREATE VIEW v_fdp_finance_summary AS
WITH order_metrics AS (
  SELECT 
    tenant_id,
    COUNT(*)::INTEGER as total_orders,
    COALESCE(SUM(total_amount), 0) as gross_revenue,
    COALESCE(SUM(seller_income), 0) as net_revenue,
    COALESCE(SUM(cost_of_goods), 0) as total_cogs,
    COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0)), 0) as total_fees,
    COALESCE(SUM(gross_profit), 0) as gross_profit,
    COUNT(DISTINCT buyer_id)::INTEGER as unique_customers
  FROM external_orders
  WHERE status NOT IN ('cancelled', 'returned')
  GROUP BY tenant_id
),
marketing_spend AS (
  SELECT 
    tenant_id,
    COALESCE(SUM(actual_cost), 0) as total_marketing
  FROM promotion_campaigns
  GROUP BY tenant_id
)
SELECT 
  om.tenant_id,
  om.total_orders,
  om.gross_revenue,
  om.net_revenue,
  om.total_cogs,
  om.total_fees,
  om.gross_profit,
  om.unique_customers,
  COALESCE(ms.total_marketing, 0) as total_marketing_spend,
  (om.gross_profit - COALESCE(ms.total_marketing, 0)) as contribution_margin,
  CASE 
    WHEN om.net_revenue > 0 THEN ((om.gross_profit - COALESCE(ms.total_marketing, 0)) / om.net_revenue * 100)
    ELSE 0 
  END as contribution_margin_percent,
  CASE 
    WHEN om.total_orders > 0 THEN om.net_revenue / om.total_orders
    ELSE 0 
  END as avg_order_value,
  CASE 
    WHEN om.unique_customers > 0 THEN COALESCE(ms.total_marketing, 0) / om.unique_customers
    ELSE 0 
  END as cac
FROM order_metrics om
LEFT JOIN marketing_spend ms ON om.tenant_id = ms.tenant_id;