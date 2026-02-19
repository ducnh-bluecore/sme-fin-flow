-- Update v_mdp_campaign_attribution to include discount data from cdp_orders
-- This enables MDP Promotions page to show Net Revenue = Gross - Discount

DROP VIEW IF EXISTS v_mdp_campaign_attribution CASCADE;

CREATE OR REPLACE VIEW v_mdp_campaign_attribution WITH (security_invoker = on) AS
WITH campaign_orders AS (
  SELECT 
    o.tenant_id,
    UPPER(COALESCE(o.channel, 'UNKNOWN')) AS channel,
    DATE_TRUNC('month', o.order_at) AS period,
    COUNT(*) AS attributed_orders,
    COUNT(DISTINCT o.customer_id) AS attributed_customers,
    SUM(o.gross_revenue) AS attributed_gross_revenue,
    SUM(COALESCE(o.discount_amount, 0) + COALESCE(o.voucher_discount, 0)) AS total_discount,
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
  co.attributed_gross_revenue,
  co.total_discount,
  co.attributed_revenue,
  co.attributed_margin,
  -- Efficiency ratio: Net Revenue per 1 VND discount
  CASE WHEN co.total_discount > 0 
    THEN ROUND(co.attributed_revenue / co.total_discount, 4)
    ELSE NULL 
  END AS discount_efficiency,
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

COMMENT ON VIEW v_mdp_campaign_attribution IS 'SSOT: Campaign attribution with discount data from cdp_orders (Layer 1). Includes gross_revenue, total_discount, net_revenue, discount_efficiency per channel/period.';