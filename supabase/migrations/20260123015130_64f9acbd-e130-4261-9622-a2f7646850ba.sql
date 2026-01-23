-- =====================================================
-- CDP Value Distribution Views (replaces useCDPData frontend calculations)
-- =====================================================

-- 1. Value Distribution Percentiles View
CREATE OR REPLACE VIEW v_cdp_value_distribution AS
WITH customer_metrics AS (
  SELECT 
    tenant_id,
    customer_phone,
    COUNT(*) AS order_count,
    SUM(CASE WHEN status NOT IN ('cancelled', 'returned') THEN COALESCE(total_amount, 0) ELSE 0 END) AS total_revenue,
    SUM(CASE WHEN status NOT IN ('cancelled', 'returned') THEN COALESCE(gross_profit, 0) ELSE 0 END) AS total_margin,
    AVG(CASE WHEN status NOT IN ('cancelled', 'returned') THEN COALESCE(total_amount, 0) ELSE NULL END) AS avg_order_value,
    COUNT(CASE WHEN status IN ('returned') THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS return_rate
  FROM external_orders
  WHERE customer_phone IS NOT NULL
    AND created_at >= NOW() - INTERVAL '365 days'
  GROUP BY tenant_id, customer_phone
),
percentiles AS (
  SELECT 
    tenant_id,
    'revenue' AS metric_name,
    PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY total_revenue) AS p10,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_revenue) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_revenue) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_revenue) AS p75,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY total_revenue) AS p90,
    MIN(total_revenue) AS min_val,
    MAX(total_revenue) AS max_val,
    AVG(total_revenue) AS mean_val
  FROM customer_metrics
  GROUP BY tenant_id
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'aov' AS metric_name,
    PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY avg_order_value) AS p10,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_order_value) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY avg_order_value) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_order_value) AS p75,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY avg_order_value) AS p90,
    MIN(avg_order_value) AS min_val,
    MAX(avg_order_value) AS max_val,
    AVG(avg_order_value) AS mean_val
  FROM customer_metrics
  GROUP BY tenant_id
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'frequency' AS metric_name,
    PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY order_count) AS p10,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY order_count) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY order_count) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY order_count) AS p75,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY order_count) AS p90,
    MIN(order_count) AS min_val,
    MAX(order_count) AS max_val,
    AVG(order_count) AS mean_val
  FROM customer_metrics
  GROUP BY tenant_id
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'margin' AS metric_name,
    PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS p10,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS p75,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS p90,
    MIN(CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS min_val,
    MAX(CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS max_val,
    AVG(CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS mean_val
  FROM customer_metrics
  GROUP BY tenant_id
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'return_rate' AS metric_name,
    PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY return_rate) AS p10,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY return_rate) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY return_rate) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY return_rate) AS p75,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY return_rate) AS p90,
    MIN(return_rate) AS min_val,
    MAX(return_rate) AS max_val,
    AVG(return_rate) AS mean_val
  FROM customer_metrics
  GROUP BY tenant_id
)
SELECT * FROM percentiles;

-- 2. Segment Summaries View
CREATE OR REPLACE VIEW v_cdp_segment_summaries AS
WITH customer_metrics AS (
  SELECT 
    tenant_id,
    customer_phone,
    COUNT(*) AS order_count,
    SUM(CASE WHEN status NOT IN ('cancelled', 'returned') THEN COALESCE(total_amount, 0) ELSE 0 END) AS total_revenue,
    SUM(CASE WHEN status NOT IN ('cancelled', 'returned') THEN COALESCE(gross_profit, 0) ELSE 0 END) AS total_margin,
    AVG(CASE WHEN status NOT IN ('cancelled', 'returned') THEN COALESCE(total_amount, 0) ELSE NULL END) AS avg_order_value
  FROM external_orders
  WHERE customer_phone IS NOT NULL
    AND created_at >= NOW() - INTERVAL '365 days'
  GROUP BY tenant_id, customer_phone
),
ranked AS (
  SELECT 
    *,
    NTILE(10) OVER (PARTITION BY tenant_id ORDER BY total_revenue DESC) AS decile
  FROM customer_metrics
),
segments AS (
  SELECT 
    tenant_id,
    CASE 
      WHEN decile = 1 THEN 'Top 10%'
      WHEN decile = 2 THEN 'Top 20%'
      WHEN decile <= 5 THEN 'Middle 50%'
      WHEN decile <= 8 THEN 'Lower 30%'
      ELSE 'Bottom 20%'
    END AS segment_name,
    COUNT(*) AS customer_count,
    SUM(total_revenue) AS segment_revenue,
    AVG(total_revenue) AS avg_revenue,
    AVG(CASE WHEN total_revenue > 0 THEN total_margin / total_revenue * 100 ELSE 0 END) AS avg_margin,
    AVG(order_count) AS avg_frequency
  FROM ranked
  GROUP BY tenant_id, 
    CASE 
      WHEN decile = 1 THEN 'Top 10%'
      WHEN decile = 2 THEN 'Top 20%'
      WHEN decile <= 5 THEN 'Middle 50%'
      WHEN decile <= 8 THEN 'Lower 30%'
      ELSE 'Bottom 20%'
    END
)
SELECT 
  s.tenant_id,
  s.segment_name AS name,
  s.customer_count,
  ROUND(s.customer_count::NUMERIC / NULLIF(SUM(s.customer_count) OVER (PARTITION BY s.tenant_id), 0) * 100, 2) AS percent_of_total,
  s.segment_revenue AS total_revenue,
  ROUND(s.avg_revenue, 0) AS avg_revenue,
  ROUND(s.avg_margin, 2) AS avg_margin,
  ROUND(s.avg_frequency, 2) AS avg_frequency,
  'stable' AS trend,
  0 AS trend_percent
FROM segments s;

-- 3. Summary Stats View
CREATE OR REPLACE VIEW v_cdp_summary_stats AS
WITH customer_metrics AS (
  SELECT 
    tenant_id,
    customer_phone,
    COUNT(*) AS order_count,
    SUM(CASE WHEN status NOT IN ('cancelled', 'returned') THEN COALESCE(total_amount, 0) ELSE 0 END) AS total_revenue
  FROM external_orders
  WHERE customer_phone IS NOT NULL
    AND created_at >= NOW() - INTERVAL '365 days'
  GROUP BY tenant_id, customer_phone
),
ranked AS (
  SELECT 
    *,
    NTILE(5) OVER (PARTITION BY tenant_id ORDER BY total_revenue DESC) AS quintile
  FROM customer_metrics
),
stats AS (
  SELECT 
    tenant_id,
    COUNT(*) AS total_customers,
    SUM(total_revenue) AS total_revenue,
    AVG(total_revenue) AS avg_customer_value,
    AVG(total_revenue / NULLIF(order_count, 0)) AS avg_order_value,
    AVG(order_count) AS avg_frequency,
    SUM(CASE WHEN quintile = 1 THEN total_revenue ELSE 0 END) AS top20_revenue
  FROM ranked
  GROUP BY tenant_id
)
SELECT 
  tenant_id,
  total_customers,
  total_revenue,
  ROUND(avg_customer_value, 0) AS avg_customer_value,
  ROUND(avg_order_value, 0) AS avg_order_value,
  ROUND(avg_frequency, 2) AS avg_frequency,
  top20_revenue,
  ROUND(top20_revenue / NULLIF(total_revenue, 0) * 100, 1) AS top20_percent
FROM stats;

-- 4. Data Quality Metrics View (use gross_profit instead of unit_cost)
CREATE OR REPLACE VIEW v_cdp_data_quality AS
WITH order_stats AS (
  SELECT 
    tenant_id,
    COUNT(*) AS total_orders,
    COUNT(customer_phone) AS orders_with_identity,
    COUNT(CASE WHEN gross_profit IS NOT NULL THEN 1 END) AS orders_with_cogs,
    MAX(created_at) AS latest_order
  FROM external_orders
  WHERE created_at >= NOW() - INTERVAL '365 days'
  GROUP BY tenant_id
)
SELECT 
  tenant_id,
  total_orders,
  orders_with_identity AS matched_orders,
  ROUND(orders_with_identity::NUMERIC / NULLIF(total_orders, 0) * 100, 1) AS identity_coverage,
  ROUND(orders_with_cogs::NUMERIC / NULLIF(total_orders, 0) * 100, 1) AS cogs_coverage,
  EXTRACT(EPOCH FROM (NOW() - latest_order)) / 3600 AS freshness_hours,
  (orders_with_identity::NUMERIC / NULLIF(total_orders, 0) >= 0.8 
   AND orders_with_cogs::NUMERIC / NULLIF(total_orders, 0) >= 0.7) AS is_reliable
FROM order_stats;

-- 5. Trend Insights View (replaces useCDPTrendInsights)
CREATE OR REPLACE VIEW v_cdp_trend_insights AS
WITH current_period AS (
  SELECT 
    tenant_id,
    customer_phone,
    AVG(CASE WHEN status NOT IN ('cancelled', 'returned') THEN total_amount ELSE NULL END) AS avg_aov,
    COUNT(*) AS order_count
  FROM external_orders
  WHERE customer_phone IS NOT NULL
    AND created_at >= NOW() - INTERVAL '60 days'
  GROUP BY tenant_id, customer_phone
),
base_period AS (
  SELECT 
    tenant_id,
    customer_phone,
    AVG(CASE WHEN status NOT IN ('cancelled', 'returned') THEN total_amount ELSE NULL END) AS avg_aov,
    COUNT(*) AS order_count
  FROM external_orders
  WHERE customer_phone IS NOT NULL
    AND created_at >= NOW() - INTERVAL '120 days'
    AND created_at < NOW() - INTERVAL '60 days'
  GROUP BY tenant_id, customer_phone
),
aggregated AS (
  SELECT 
    COALESCE(c.tenant_id, b.tenant_id) AS tenant_id,
    AVG(c.avg_aov) AS current_aov,
    AVG(b.avg_aov) AS base_aov,
    AVG(c.order_count) AS current_freq,
    AVG(b.order_count) AS base_freq,
    COUNT(DISTINCT c.customer_phone) AS current_customers,
    COUNT(DISTINCT b.customer_phone) AS base_customers
  FROM current_period c
  FULL OUTER JOIN base_period b ON c.tenant_id = b.tenant_id AND c.customer_phone = b.customer_phone
  GROUP BY COALESCE(c.tenant_id, b.tenant_id)
)
SELECT 
  tenant_id,
  -- SPEND_DECLINE detection
  CASE WHEN base_aov > 0 AND ((current_aov - base_aov) / base_aov * 100) < -10 THEN TRUE ELSE FALSE END AS spend_decline_triggered,
  ROUND(CASE WHEN base_aov > 0 THEN ((current_aov - base_aov) / base_aov * 100) ELSE 0 END, 2) AS aov_change_percent,
  ROUND(current_aov, 0) AS current_aov,
  ROUND(base_aov, 0) AS base_aov,
  -- VELOCITY_SLOW detection  
  CASE WHEN base_freq > 0 AND ((current_freq - base_freq) / base_freq * 100) < -20 THEN TRUE ELSE FALSE END AS velocity_slow_triggered,
  ROUND(CASE WHEN base_freq > 0 THEN ((current_freq - base_freq) / base_freq * 100) ELSE 0 END, 2) AS freq_change_percent,
  current_customers,
  base_customers
FROM aggregated;