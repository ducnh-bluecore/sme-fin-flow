-- Fix v_cdp_customer_audit view with correct cdp_customers schema
-- Also fix days_since_last_purchase to handle future order dates

DROP VIEW IF EXISTS v_cdp_customer_audit;

CREATE OR REPLACE VIEW v_cdp_customer_audit AS
WITH order_stats AS (
  SELECT 
    customer_id,
    SUM(net_revenue) as net_revenue,
    COUNT(*) as orders_count,
    CASE WHEN COUNT(*) > 0 THEN SUM(net_revenue) / COUNT(*) ELSE 0 END as aov,
    MAX(order_at) as last_order_at
  FROM cdp_orders
  GROUP BY customer_id
)
SELECT 
  c.id,
  c.tenant_id,
  -- Generate internal_id from canonical_key or id
  COALESCE('CDP-KH-' || LEFT(c.id::text, 8), c.canonical_key) as internal_id,
  c.created_at,
  -- Anonymized fields - derive from canonical_key if possible
  NULL::text as anonymized_phone,
  NULL::text as anonymized_email,
  -- Merge confidence - default values since not in actual schema
  85 as merge_confidence,
  1 as source_count,
  'verified'::text as merge_status,
  -- Use order_stats for SSOT
  COALESCE(os.net_revenue, 0) as total_spend,
  COALESCE(os.orders_count, 0)::int as order_count,
  COALESCE(os.aov, 0) as aov,
  -- Days since last purchase - FIXED to handle future dates with GREATEST(0, ...)
  GREATEST(0, COALESCE(
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - os.last_order_at)),
    0
  ))::int as days_since_last_purchase,
  -- RFM scores - also handle future dates
  CASE 
    WHEN os.last_order_at IS NULL THEN 1
    WHEN os.last_order_at >= CURRENT_TIMESTAMP THEN 5  -- Future date = very recent
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - os.last_order_at)) <= 30 THEN 5
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - os.last_order_at)) <= 60 THEN 4
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - os.last_order_at)) <= 90 THEN 3
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - os.last_order_at)) <= 180 THEN 2
    ELSE 1
  END as rfm_r,
  CASE 
    WHEN COALESCE(os.orders_count, 0) >= 10 THEN 5
    WHEN COALESCE(os.orders_count, 0) >= 5 THEN 4
    WHEN COALESCE(os.orders_count, 0) >= 3 THEN 3
    WHEN COALESCE(os.orders_count, 0) >= 2 THEN 2
    ELSE 1
  END as rfm_f,
  CASE 
    WHEN COALESCE(os.net_revenue, 0) >= 10000000 THEN 5
    WHEN COALESCE(os.net_revenue, 0) >= 5000000 THEN 4
    WHEN COALESCE(os.net_revenue, 0) >= 2000000 THEN 3
    WHEN COALESCE(os.net_revenue, 0) >= 500000 THEN 2
    ELSE 1
  END as rfm_m,
  COALESCE(os.net_revenue, 0) as clv
FROM cdp_customers c
LEFT JOIN order_stats os ON os.customer_id = c.id;