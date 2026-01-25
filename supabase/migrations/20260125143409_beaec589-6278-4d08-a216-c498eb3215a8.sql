
-- Fix v_cdp_ltv_by_cohort to use cdp_orders with correct column names (order_at)
CREATE OR REPLACE VIEW public.v_cdp_ltv_by_cohort AS
WITH customer_cohorts AS (
  SELECT 
    c.tenant_id,
    c.id AS customer_id,
    date_trunc('month', min(o.order_at))::date AS cohort_month,
    count(DISTINCT o.id) AS order_count,
    sum(o.net_revenue) AS total_revenue,
    sum(COALESCE(o.gross_margin, o.net_revenue * 0.30)) AS total_profit,
    max(o.order_at) AS last_order
  FROM cdp_customers c
  JOIN cdp_orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id
  GROUP BY c.tenant_id, c.id
),
cohort_summary AS (
  SELECT 
    tenant_id,
    cohort_month,
    count(*) AS cohort_size,
    avg(total_revenue) AS avg_revenue,
    avg(total_profit) AS avg_profit,
    avg(order_count) AS avg_orders,
    count(*) FILTER (WHERE last_order >= cohort_month + interval '3 months')::numeric * 100.0 / NULLIF(count(*), 0) AS retention_3m,
    count(*) FILTER (WHERE last_order >= cohort_month + interval '6 months')::numeric * 100.0 / NULLIF(count(*), 0) AS retention_6m,
    count(*) FILTER (WHERE last_order >= cohort_month + interval '1 year')::numeric * 100.0 / NULLIF(count(*), 0) AS retention_12m
  FROM customer_cohorts
  GROUP BY tenant_id, cohort_month
),
cohort_with_trend AS (
  SELECT 
    cs.*,
    lag(cs.avg_profit) OVER (PARTITION BY cs.tenant_id ORDER BY cs.cohort_month) AS prev_cohort_profit
  FROM cohort_summary cs
)
SELECT 
  tenant_id,
  cohort_month,
  cohort_size::integer,
  round(avg_revenue, 0) AS avg_revenue,
  round(avg_profit, 0) AS avg_profit,
  round(avg_orders, 1) AS avg_orders,
  round(avg_profit * 4 * COALESCE(retention_3m, 50) / 100, 0) AS estimated_ltv_12m,
  round(avg_profit * 8 * COALESCE(retention_6m, 40) / 100, 0) AS estimated_ltv_24m,
  round(COALESCE(retention_3m, 0), 1) AS retention_rate_3m,
  round(COALESCE(retention_6m, 0), 1) AS retention_rate_6m,
  round(COALESCE(retention_12m, 0), 1) AS retention_rate_12m,
  CASE 
    WHEN prev_cohort_profit > 0 THEN round((avg_profit - prev_cohort_profit) / prev_cohort_profit * 100, 1)
    ELSE 0
  END AS ltv_trend_vs_prev,
  CASE 
    WHEN COALESCE(retention_3m, 0) >= 60 AND avg_orders >= 2 THEN 'high'
    WHEN COALESCE(retention_3m, 0) >= 40 AND avg_orders >= 1.5 THEN 'medium'
    ELSE 'low'
  END AS quality_score
FROM cohort_with_trend
WHERE cohort_month IS NOT NULL
ORDER BY cohort_month DESC;

-- Fix v_cdp_ltv_by_source: get source from first order's channel
CREATE OR REPLACE VIEW public.v_cdp_ltv_by_source AS
WITH first_order_channel AS (
  SELECT DISTINCT ON (customer_id, tenant_id)
    customer_id,
    tenant_id,
    COALESCE(channel, 'Unknown') AS acquisition_source
  FROM cdp_orders
  ORDER BY customer_id, tenant_id, order_at ASC
),
customer_source AS (
  SELECT 
    c.tenant_id,
    c.id AS customer_id,
    COALESCE(fc.acquisition_source, 'Unknown') AS acquisition_source,
    count(DISTINCT o.id) AS order_count,
    sum(o.net_revenue) AS total_revenue,
    sum(COALESCE(o.gross_margin, o.net_revenue * 0.30)) AS total_profit
  FROM cdp_customers c
  LEFT JOIN first_order_channel fc ON fc.customer_id = c.id AND fc.tenant_id = c.tenant_id
  LEFT JOIN cdp_orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id
  GROUP BY c.tenant_id, c.id, fc.acquisition_source
),
source_summary AS (
  SELECT 
    tenant_id,
    acquisition_source,
    count(*) AS customer_count,
    avg(total_revenue) AS avg_revenue,
    avg(total_profit) AS avg_profit,
    avg(order_count) AS avg_orders,
    avg(total_profit) * 4 AS avg_ltv_12m,
    avg(total_profit) * 8 AS avg_ltv_24m
  FROM customer_source
  GROUP BY tenant_id, acquisition_source
)
SELECT 
  tenant_id,
  acquisition_source,
  customer_count::integer,
  round(COALESCE(avg_revenue, 0), 0) AS avg_revenue,
  round(COALESCE(avg_profit, 0), 0) AS avg_profit,
  round(COALESCE(avg_orders, 0), 1) AS avg_orders,
  round(COALESCE(avg_ltv_12m, 0), 0) AS avg_ltv_12m,
  round(COALESCE(avg_ltv_24m, 0), 0) AS avg_ltv_24m,
  0::numeric AS estimated_cac,
  NULL::numeric AS ltv_cac_ratio,
  NULL::numeric AS payback_months
FROM source_summary
ORDER BY avg_ltv_24m DESC NULLS LAST;
