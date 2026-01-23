
-- Fix v_cdp_customer_audit to use ALL orders from cdp_orders (SSOT)
-- cdp_customers doesn't have internal_id, phone, email - generate them dynamically

DROP VIEW IF EXISTS public.v_cdp_customer_audit;

CREATE OR REPLACE VIEW public.v_cdp_customer_audit AS
SELECT 
  c.id,
  c.tenant_id,
  -- Generate internal_id from year and row number
  'CDP-KH-' || EXTRACT(YEAR FROM c.created_at)::text || '-' || 
    LPAD(ROW_NUMBER() OVER (PARTITION BY c.tenant_id ORDER BY c.created_at)::text, 5, '0') as internal_id,
  c.created_at,
  -- No phone/email in cdp_customers table
  NULL::text as anonymized_phone,
  NULL::text as anonymized_email,
  -- Merge confidence (placeholder)
  85 as merge_confidence,
  -- Source count from actual orders
  COALESCE((
    SELECT COUNT(DISTINCT o.channel)
    FROM cdp_orders o
    WHERE o.customer_id = c.id
      AND o.channel IS NOT NULL
  ), 0)::int as source_count,
  -- Merge status based on source count
  CASE 
    WHEN (SELECT COUNT(DISTINCT o.channel) FROM cdp_orders o WHERE o.customer_id = c.id AND o.channel IS NOT NULL) >= 2 THEN 'verified'
    WHEN (SELECT COUNT(DISTINCT o.channel) FROM cdp_orders o WHERE o.customer_id = c.id AND o.channel IS NOT NULL) = 1 THEN 'partial'
    ELSE 'conflict'
  END as merge_status,
  -- SSOT: Calculate from ALL cdp_orders, not rolling metrics
  COALESCE((SELECT SUM(o.net_revenue) FROM cdp_orders o WHERE o.customer_id = c.id), 0) as total_spend,
  COALESCE((SELECT COUNT(o.id) FROM cdp_orders o WHERE o.customer_id = c.id), 0)::int as order_count,
  -- AOV from all orders
  CASE 
    WHEN (SELECT COUNT(o.id) FROM cdp_orders o WHERE o.customer_id = c.id) > 0 THEN
      (SELECT SUM(o.net_revenue) FROM cdp_orders o WHERE o.customer_id = c.id) / 
      (SELECT COUNT(o.id) FROM cdp_orders o WHERE o.customer_id = c.id)
    ELSE 0
  END as aov,
  -- Days since last purchase from actual orders
  COALESCE(
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - (SELECT MAX(o.order_at) FROM cdp_orders o WHERE o.customer_id = c.id))),
    0
  )::int as days_since_last_purchase,
  -- RFM scores - calculate from actual data
  CASE 
    WHEN (SELECT EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o.order_at))) FROM cdp_orders o WHERE o.customer_id = c.id) <= 30 THEN 5
    WHEN (SELECT EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o.order_at))) FROM cdp_orders o WHERE o.customer_id = c.id) <= 60 THEN 4
    WHEN (SELECT EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o.order_at))) FROM cdp_orders o WHERE o.customer_id = c.id) <= 90 THEN 3
    WHEN (SELECT EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o.order_at))) FROM cdp_orders o WHERE o.customer_id = c.id) <= 180 THEN 2
    ELSE 1
  END as rfm_r,
  CASE 
    WHEN (SELECT COUNT(o.id) FROM cdp_orders o WHERE o.customer_id = c.id) >= 10 THEN 5
    WHEN (SELECT COUNT(o.id) FROM cdp_orders o WHERE o.customer_id = c.id) >= 6 THEN 4
    WHEN (SELECT COUNT(o.id) FROM cdp_orders o WHERE o.customer_id = c.id) >= 3 THEN 3
    WHEN (SELECT COUNT(o.id) FROM cdp_orders o WHERE o.customer_id = c.id) >= 2 THEN 2
    ELSE 1
  END as rfm_f,
  CASE 
    WHEN (SELECT SUM(o.net_revenue) FROM cdp_orders o WHERE o.customer_id = c.id) >= 10000000 THEN 5
    WHEN (SELECT SUM(o.net_revenue) FROM cdp_orders o WHERE o.customer_id = c.id) >= 5000000 THEN 4
    WHEN (SELECT SUM(o.net_revenue) FROM cdp_orders o WHERE o.customer_id = c.id) >= 2000000 THEN 3
    WHEN (SELECT SUM(o.net_revenue) FROM cdp_orders o WHERE o.customer_id = c.id) >= 500000 THEN 2
    ELSE 1
  END as rfm_m,
  -- CLV = total spend for now
  COALESCE((SELECT SUM(o.net_revenue) FROM cdp_orders o WHERE o.customer_id = c.id), 0) as clv
FROM public.cdp_customers c
WHERE UPPER(c.status) = 'ACTIVE';

-- Add comment explaining SSOT compliance
COMMENT ON VIEW public.v_cdp_customer_audit IS 'SSOT-compliant audit view. All metrics calculated directly from cdp_orders source table, not from windowed rolling metrics.';
