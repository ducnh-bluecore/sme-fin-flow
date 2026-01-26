-- ============================================
-- PHASE 2: REDIRECT ALL VIEWS TO cdp_orders (SSOT)
-- Fixed: Use marketing_expenses instead of marketing_daily_spend
-- ============================================

-- 1. v_cdp_summary_stats - Redirect to cdp_orders
DROP VIEW IF EXISTS v_cdp_summary_stats CASCADE;

CREATE OR REPLACE VIEW v_cdp_summary_stats WITH (security_invoker = on) AS
WITH customer_metrics AS (
  SELECT 
    o.tenant_id,
    o.customer_id,
    COUNT(*) AS order_count,
    SUM(o.net_revenue) AS total_revenue,
    AVG(o.net_revenue) AS avg_order_value,
    MIN(o.order_at) AS first_order,
    MAX(o.order_at) AS last_order
  FROM cdp_orders o
  WHERE o.customer_id IS NOT NULL
    AND o.order_at >= NOW() - INTERVAL '365 days'
  GROUP BY o.tenant_id, o.customer_id
),
summary AS (
  SELECT
    tenant_id,
    COUNT(DISTINCT customer_id) AS total_customers,
    SUM(order_count) AS total_orders,
    SUM(total_revenue) AS total_revenue,
    AVG(avg_order_value) AS avg_order_value,
    AVG(order_count) AS avg_frequency,
    COUNT(DISTINCT customer_id) FILTER (WHERE order_count = 1) AS one_time_customers,
    COUNT(DISTINCT customer_id) FILTER (WHERE order_count > 1) AS repeat_customers
  FROM customer_metrics
  GROUP BY tenant_id
)
SELECT 
  tenant_id,
  total_customers,
  total_orders,
  total_revenue,
  avg_order_value,
  avg_frequency,
  one_time_customers,
  repeat_customers,
  CASE WHEN total_customers > 0 
    THEN ROUND(100.0 * repeat_customers / total_customers, 2) 
    ELSE 0 
  END AS repeat_rate
FROM summary;

-- 2. v_cdp_segment_summaries - Redirect to cdp_orders
DROP VIEW IF EXISTS v_cdp_segment_summaries CASCADE;

CREATE OR REPLACE VIEW v_cdp_segment_summaries WITH (security_invoker = on) AS
WITH customer_metrics AS (
  SELECT 
    o.tenant_id,
    o.customer_id,
    COUNT(*) AS order_count,
    SUM(o.net_revenue) AS total_revenue,
    SUM(o.gross_margin) AS total_margin,
    MAX(o.order_at) AS last_order
  FROM cdp_orders o
  WHERE o.customer_id IS NOT NULL
    AND o.order_at >= NOW() - INTERVAL '365 days'
  GROUP BY o.tenant_id, o.customer_id
),
segmented AS (
  SELECT
    cm.*,
    CASE 
      WHEN cm.total_revenue >= 10000000 AND cm.order_count >= 5 THEN 'VIP'
      WHEN cm.total_revenue >= 5000000 OR cm.order_count >= 3 THEN 'Loyal'
      WHEN cm.order_count = 1 THEN 'New'
      WHEN cm.last_order < NOW() - INTERVAL '90 days' THEN 'At Risk'
      ELSE 'Regular'
    END AS segment
  FROM customer_metrics cm
)
SELECT
  tenant_id,
  segment,
  COUNT(*) AS customer_count,
  SUM(total_revenue) AS segment_revenue,
  SUM(total_margin) AS segment_margin,
  AVG(total_revenue) AS avg_revenue_per_customer,
  AVG(order_count) AS avg_orders_per_customer
FROM segmented
GROUP BY tenant_id, segment;

-- 3. v_cdp_trend_insights - Redirect to cdp_orders
DROP VIEW IF EXISTS v_cdp_trend_insights CASCADE;

CREATE OR REPLACE VIEW v_cdp_trend_insights WITH (security_invoker = on) AS
WITH current_period AS (
  SELECT 
    tenant_id,
    customer_id,
    AVG(net_revenue) AS avg_aov,
    COUNT(*) AS order_count
  FROM cdp_orders
  WHERE customer_id IS NOT NULL
    AND order_at >= NOW() - INTERVAL '30 days'
  GROUP BY tenant_id, customer_id
),
previous_period AS (
  SELECT 
    tenant_id,
    customer_id,
    AVG(net_revenue) AS avg_aov,
    COUNT(*) AS order_count
  FROM cdp_orders
  WHERE customer_id IS NOT NULL
    AND order_at >= NOW() - INTERVAL '60 days'
    AND order_at < NOW() - INTERVAL '30 days'
  GROUP BY tenant_id, customer_id
)
SELECT
  COALESCE(c.tenant_id, p.tenant_id) AS tenant_id,
  COALESCE(c.customer_id, p.customer_id) AS customer_id,
  c.avg_aov AS current_aov,
  p.avg_aov AS previous_aov,
  CASE 
    WHEN p.avg_aov > 0 THEN ROUND(100.0 * (c.avg_aov - p.avg_aov) / p.avg_aov, 2)
    ELSE NULL
  END AS aov_change_percent,
  c.order_count AS current_orders,
  p.order_count AS previous_orders,
  CASE
    WHEN c.avg_aov > p.avg_aov * 1.2 THEN 'UPGRADING'
    WHEN c.avg_aov < p.avg_aov * 0.8 THEN 'DOWNGRADING'
    WHEN c.customer_id IS NULL AND p.customer_id IS NOT NULL THEN 'CHURNING'
    WHEN c.customer_id IS NOT NULL AND p.customer_id IS NULL THEN 'NEW'
    ELSE 'STABLE'
  END AS trend_type
FROM current_period c
FULL OUTER JOIN previous_period p 
  ON c.tenant_id = p.tenant_id AND c.customer_id = p.customer_id;

-- 4. v_cdp_value_distribution - Redirect to cdp_orders
DROP VIEW IF EXISTS v_cdp_value_distribution CASCADE;

CREATE OR REPLACE VIEW v_cdp_value_distribution WITH (security_invoker = on) AS
WITH customer_metrics AS (
  SELECT 
    tenant_id,
    customer_id,
    SUM(net_revenue) AS total_revenue,
    AVG(net_revenue) AS avg_order_value,
    COUNT(*) AS order_count
  FROM cdp_orders
  WHERE customer_id IS NOT NULL
    AND order_at >= NOW() - INTERVAL '365 days'
  GROUP BY tenant_id, customer_id
),
percentiles AS (
  SELECT 
    tenant_id,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_revenue) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_revenue) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_revenue) AS p75,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY total_revenue) AS p90,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_revenue) AS p95
  FROM customer_metrics
  GROUP BY tenant_id
)
SELECT 
  cm.tenant_id,
  cm.customer_id,
  cm.total_revenue,
  cm.avg_order_value,
  cm.order_count,
  p.p25, p.p50, p.p75, p.p90, p.p95,
  CASE 
    WHEN cm.total_revenue >= p.p95 THEN 'Top 5%'
    WHEN cm.total_revenue >= p.p90 THEN 'Top 10%'
    WHEN cm.total_revenue >= p.p75 THEN 'Top 25%'
    WHEN cm.total_revenue >= p.p50 THEN 'Above Median'
    ELSE 'Below Median'
  END AS value_tier
FROM customer_metrics cm
JOIN percentiles p ON cm.tenant_id = p.tenant_id;

-- 5. v_channel_daily_revenue - Redirect to cdp_orders
DROP VIEW IF EXISTS v_channel_daily_revenue CASCADE;

CREATE OR REPLACE VIEW v_channel_daily_revenue WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  UPPER(COALESCE(channel, 'UNKNOWN')) AS channel,
  DATE(order_at) AS revenue_date,
  COUNT(*) AS order_count,
  SUM(gross_revenue) AS gross_revenue,
  SUM(net_revenue) AS net_revenue,
  SUM(cogs) AS cogs,
  SUM(gross_margin) AS gross_margin,
  AVG(net_revenue) AS avg_order_value
FROM cdp_orders
WHERE order_at >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY tenant_id, UPPER(COALESCE(channel, 'UNKNOWN')), DATE(order_at);

-- 6. v_channel_performance - Redirect to cdp_orders
DROP VIEW IF EXISTS v_channel_performance CASCADE;

CREATE OR REPLACE VIEW v_channel_performance WITH (security_invoker = on) AS
WITH channel_metrics AS (
  SELECT 
    tenant_id,
    UPPER(COALESCE(channel, 'UNKNOWN')) AS channel,
    DATE_TRUNC('month', order_at) AS month,
    COUNT(*) AS order_count,
    COUNT(DISTINCT customer_id) AS unique_customers,
    SUM(gross_revenue) AS gross_revenue,
    SUM(net_revenue) AS net_revenue,
    SUM(cogs) AS cogs,
    SUM(gross_margin) AS gross_margin
  FROM cdp_orders
  WHERE order_at >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id, UPPER(COALESCE(channel, 'UNKNOWN')), DATE_TRUNC('month', order_at)
)
SELECT 
  tenant_id,
  channel,
  month,
  order_count,
  unique_customers,
  gross_revenue,
  net_revenue,
  cogs,
  gross_margin,
  CASE WHEN gross_revenue > 0 
    THEN ROUND(100.0 * gross_margin / gross_revenue, 2) 
    ELSE 0 
  END AS margin_percent
FROM channel_metrics;

-- 7. v_channel_pl_summary - Redirect to cdp_orders (use marketing_expenses)
DROP VIEW IF EXISTS v_channel_pl_summary CASCADE;

CREATE OR REPLACE VIEW v_channel_pl_summary WITH (security_invoker = on) AS
WITH channel_orders AS (
  SELECT 
    tenant_id,
    UPPER(COALESCE(channel, 'UNKNOWN')) AS channel,
    DATE_TRUNC('month', order_at::date) AS period,
    COUNT(*) AS order_count,
    COUNT(DISTINCT customer_id) AS unique_customers,
    SUM(gross_revenue) AS gross_revenue,
    SUM(net_revenue) AS net_revenue,
    SUM(cogs) AS cogs,
    SUM(gross_margin) AS gross_margin
  FROM cdp_orders
  WHERE order_at >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id, UPPER(COALESCE(channel, 'UNKNOWN')), DATE_TRUNC('month', order_at::date)
),
marketing AS (
  SELECT 
    tenant_id,
    UPPER(COALESCE(channel, 'UNKNOWN')) AS channel,
    DATE_TRUNC('month', expense_date::date) AS period,
    SUM(COALESCE(amount, 0)) AS marketing_spend
  FROM marketing_expenses
  WHERE expense_date >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id, UPPER(COALESCE(channel, 'UNKNOWN')), DATE_TRUNC('month', expense_date::date)
)
SELECT 
  co.tenant_id,
  co.channel,
  co.period,
  co.order_count,
  co.unique_customers,
  co.gross_revenue,
  co.net_revenue,
  co.cogs,
  co.gross_margin,
  COALESCE(m.marketing_spend, 0) AS marketing_spend,
  co.gross_margin - COALESCE(m.marketing_spend, 0) AS contribution_margin,
  CASE WHEN co.net_revenue > 0 
    THEN ROUND(100.0 * (co.gross_margin - COALESCE(m.marketing_spend, 0)) / co.net_revenue, 2) 
    ELSE 0 
  END AS cm_percent,
  CASE WHEN COALESCE(m.marketing_spend, 0) > 0 
    THEN ROUND(co.net_revenue / m.marketing_spend, 2) 
    ELSE NULL 
  END AS roas
FROM channel_orders co
LEFT JOIN marketing m 
  ON co.tenant_id = m.tenant_id 
  AND co.channel = m.channel 
  AND co.period = m.period;

-- 8. v_mdp_campaign_attribution - Redirect to cdp_orders (use marketing_expenses)
DROP VIEW IF EXISTS v_mdp_campaign_attribution CASCADE;

CREATE OR REPLACE VIEW v_mdp_campaign_attribution WITH (security_invoker = on) AS
WITH campaign_orders AS (
  SELECT 
    o.tenant_id,
    UPPER(COALESCE(o.channel, 'UNKNOWN')) AS channel,
    DATE_TRUNC('month', o.order_at) AS period,
    COUNT(*) AS attributed_orders,
    COUNT(DISTINCT o.customer_id) AS attributed_customers,
    SUM(o.net_revenue) AS attributed_revenue,
    SUM(o.gross_margin) AS attributed_margin
  FROM cdp_orders o
  WHERE o.order_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY o.tenant_id, UPPER(COALESCE(o.channel, 'UNKNOWN')), DATE_TRUNC('month', o.order_at)
),
spend AS (
  SELECT 
    tenant_id,
    UPPER(COALESCE(channel, 'UNKNOWN')) AS channel,
    DATE_TRUNC('month', expense_date) AS period,
    SUM(amount) AS total_spend,
    SUM(impressions) AS total_impressions,
    SUM(clicks) AS total_clicks
  FROM marketing_expenses
  WHERE expense_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY tenant_id, UPPER(COALESCE(channel, 'UNKNOWN')), DATE_TRUNC('month', expense_date)
)
SELECT 
  co.tenant_id,
  co.channel,
  co.period,
  co.attributed_orders,
  co.attributed_customers,
  co.attributed_revenue,
  co.attributed_margin,
  COALESCE(s.total_spend, 0) AS spend,
  COALESCE(s.total_impressions, 0) AS impressions,
  COALESCE(s.total_clicks, 0) AS clicks,
  CASE WHEN COALESCE(s.total_spend, 0) > 0 
    THEN ROUND(co.attributed_revenue / s.total_spend, 2) 
    ELSE NULL 
  END AS roas,
  CASE WHEN COALESCE(s.total_spend, 0) > 0 
    THEN ROUND(co.attributed_margin / s.total_spend, 2) 
    ELSE NULL 
  END AS profit_roas,
  CASE WHEN co.attributed_orders > 0 
    THEN ROUND(COALESCE(s.total_spend, 0) / co.attributed_orders, 2) 
    ELSE NULL 
  END AS cac
FROM campaign_orders co
LEFT JOIN spend s 
  ON co.tenant_id = s.tenant_id 
  AND co.channel = s.channel 
  AND co.period = s.period;

-- Add documentation comments
COMMENT ON VIEW v_cdp_summary_stats IS 'SSOT: Customer summary stats from cdp_orders (Layer 1)';
COMMENT ON VIEW v_cdp_segment_summaries IS 'SSOT: Segment summaries from cdp_orders (Layer 1)';
COMMENT ON VIEW v_cdp_trend_insights IS 'SSOT: Customer trend analysis from cdp_orders (Layer 1)';
COMMENT ON VIEW v_cdp_value_distribution IS 'SSOT: Customer value distribution from cdp_orders (Layer 1)';
COMMENT ON VIEW v_channel_daily_revenue IS 'SSOT: Daily channel revenue from cdp_orders (Layer 1)';
COMMENT ON VIEW v_channel_performance IS 'SSOT: Channel performance metrics from cdp_orders (Layer 1)';
COMMENT ON VIEW v_channel_pl_summary IS 'SSOT: Channel P&L aligned with FDP from cdp_orders (Layer 1)';
COMMENT ON VIEW v_mdp_campaign_attribution IS 'SSOT: Campaign attribution from cdp_orders (Layer 1)';