
-- ============================================================
-- CDP SSOT COMPLIANCE FIX (v2 - Fixed column names)
-- ============================================================
-- Problem: v_cdp_customer_research reads from cdp_customer_metrics_rolling
-- which contains windowed/stale data, causing metrics mismatch with Audit view.
-- 
-- Solution: Refactor to calculate ALL metrics from source table (cdp_orders)
-- Using only existing columns: net_revenue, gross_margin, discount_amount, cogs
-- ============================================================

DROP VIEW IF EXISTS public.v_cdp_customer_research CASCADE;

CREATE OR REPLACE VIEW public.v_cdp_customer_research AS
WITH customer_order_stats AS (
  -- Single CTE to aggregate all order data per customer (SSOT from cdp_orders)
  SELECT 
    o.customer_id,
    COUNT(o.id) AS order_count,
    SUM(o.net_revenue) AS total_spend,
    SUM(o.gross_margin) AS gross_margin,
    SUM(o.discount_amount) AS discount_amount,
    MAX(o.order_at) AS last_order_at,
    MIN(o.order_at) AS first_order_at,
    -- Calculate average inter-purchase days
    CASE 
      WHEN COUNT(o.id) > 1 THEN 
        EXTRACT(DAY FROM (MAX(o.order_at) - MIN(o.order_at))) / NULLIF(COUNT(o.id) - 1, 0)
      ELSE NULL
    END AS inter_purchase_days,
    -- Count discounted orders for dependency calculation
    COUNT(CASE WHEN COALESCE(o.discount_amount, 0) > 0 THEN 1 END) AS discounted_order_count
  FROM cdp_orders o
  GROUP BY o.customer_id
)
SELECT 
  c.id,
  c.tenant_id,
  -- Anonymous ID
  'KH-' || LPAD(ROW_NUMBER() OVER (PARTITION BY c.tenant_id ORDER BY c.id)::TEXT, 6, '0') AS anonymous_id,
  
  -- Behavior status from ACTUAL last order date (SSOT)
  CASE 
    WHEN cos.last_order_at >= NOW() - INTERVAL '30 days' THEN 'active'
    WHEN cos.last_order_at >= NOW() - INTERVAL '90 days' THEN 'dormant'
    WHEN cos.last_order_at >= NOW() - INTERVAL '180 days' THEN 'at_risk'
    ELSE 'new'
  END AS behavior_status,
  
  -- All metrics from SSOT (cdp_orders aggregation)
  COALESCE(cos.total_spend, 0) AS total_spend,
  COALESCE(cos.order_count, 0)::int AS order_count,
  cos.last_order_at AS last_purchase,
  COALESCE(cos.inter_purchase_days, 30)::double precision AS repurchase_cycle,
  
  -- AOV from SSOT
  CASE 
    WHEN COALESCE(cos.order_count, 0) > 0 THEN 
      COALESCE(cos.total_spend, 0) / cos.order_count
    ELSE 0
  END AS aov,
  
  -- Trend based on actual data (no refund data available, use order patterns)
  CASE 
    WHEN COALESCE(cos.total_spend, 0) > 0 AND COALESCE(cos.order_count, 0) > 1 THEN 'up'
    WHEN COALESCE(cos.order_count, 0) = 0 THEN 'down'
    ELSE 'stable'
  END AS trend,
  
  -- Return rate: Not available in cdp_orders, set to 0
  0::numeric AS return_rate,
  
  -- Margin contribution from SSOT
  COALESCE(cos.gross_margin, 0) AS margin_contribution,
  c.created_at

FROM cdp_customers c
LEFT JOIN customer_order_stats cos ON cos.customer_id = c.id
WHERE UPPER(c.status) = 'ACTIVE';

-- Add SSOT compliance comment
COMMENT ON VIEW public.v_cdp_customer_research IS 
'SSOT-compliant research view. ALL metrics calculated directly from cdp_orders source table via CTE aggregation. No dependency on windowed rolling metrics tables.';


-- ============================================================
-- Also fix v_cdp_research_stats for consistency
-- ============================================================
DROP VIEW IF EXISTS public.v_cdp_research_stats CASCADE;

CREATE OR REPLACE VIEW public.v_cdp_research_stats AS
WITH order_stats AS (
  SELECT 
    c.tenant_id,
    c.id as customer_id,
    COALESCE(SUM(o.net_revenue), 0) as total_spend,
    COALESCE(COUNT(o.id), 0) as order_count,
    CASE 
      WHEN COUNT(o.id) > 0 THEN SUM(o.net_revenue) / COUNT(o.id)
      ELSE 0
    END as aov,
    CASE 
      WHEN COUNT(o.id) > 1 THEN 
        EXTRACT(DAY FROM (MAX(o.order_at) - MIN(o.order_at))) / NULLIF(COUNT(o.id) - 1, 0)
      ELSE NULL
    END AS inter_purchase_days,
    -- Discount dependency from available data
    CASE 
      WHEN COUNT(o.id) > 0 THEN 
        (COUNT(CASE WHEN COALESCE(o.discount_amount, 0) > 0 THEN 1 END)::numeric / COUNT(o.id)) * 100
      ELSE 0
    END AS discount_order_share
  FROM cdp_customers c
  LEFT JOIN cdp_orders o ON o.customer_id = c.id
  WHERE UPPER(c.status) = 'ACTIVE'
  GROUP BY c.tenant_id, c.id
)
SELECT 
  tenant_id,
  COUNT(customer_id) AS customer_count,
  SUM(total_spend) AS total_revenue,
  -- Median AOV (using percentile)
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aov) AS median_aov,
  -- Median repurchase cycle
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY inter_purchase_days) FILTER (WHERE inter_purchase_days IS NOT NULL) AS median_repurchase_cycle,
  -- Average return rate (not available, use 0)
  0::numeric AS avg_return_rate,
  -- Promotion dependency (% of orders with discount)
  AVG(discount_order_share) AS promotion_dependency
FROM order_stats
GROUP BY tenant_id;

COMMENT ON VIEW public.v_cdp_research_stats IS 
'SSOT-compliant research statistics. Aggregates directly from cdp_orders, calculates medians using PERCENTILE_CONT.';


-- ============================================================
-- Fix v_cdp_overview_stats for SSOT compliance
-- ============================================================
DROP VIEW IF EXISTS public.v_cdp_overview_stats CASCADE;

CREATE OR REPLACE VIEW public.v_cdp_overview_stats AS
WITH customer_metrics AS (
  SELECT 
    c.tenant_id,
    c.id as customer_id,
    COALESCE(SUM(o.net_revenue), 0) as lifetime_value,
    COALESCE(COUNT(o.id), 0) as order_count,
    MAX(o.order_at) as last_order_at
  FROM cdp_customers c
  LEFT JOIN cdp_orders o ON o.customer_id = c.id
  WHERE UPPER(c.status) = 'ACTIVE'
  GROUP BY c.tenant_id, c.id
)
SELECT 
  tenant_id,
  COUNT(customer_id) AS total_customers,
  COUNT(CASE WHEN order_count > 0 THEN 1 END) AS customers_with_orders,
  SUM(lifetime_value) AS total_revenue,
  AVG(CASE WHEN order_count > 0 THEN lifetime_value END) AS avg_ltv,
  -- Active customers (ordered in last 30 days)
  COUNT(CASE WHEN last_order_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS active_30d,
  -- At-risk customers (no order in 90-180 days)
  COUNT(CASE WHEN last_order_at < NOW() - INTERVAL '90 days' AND last_order_at >= NOW() - INTERVAL '180 days' THEN 1 END) AS at_risk_count,
  -- Dormant customers (no order in 180+ days)
  COUNT(CASE WHEN last_order_at < NOW() - INTERVAL '180 days' THEN 1 END) AS dormant_count
FROM customer_metrics
GROUP BY tenant_id;

COMMENT ON VIEW public.v_cdp_overview_stats IS 
'SSOT-compliant overview statistics. All metrics from cdp_orders source.';
