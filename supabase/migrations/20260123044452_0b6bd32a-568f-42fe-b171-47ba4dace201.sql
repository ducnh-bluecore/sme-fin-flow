-- Drop and recreate views to fix data type mismatch and case sensitivity
DROP VIEW IF EXISTS public.v_cdp_research_stats CASCADE;
DROP VIEW IF EXISTS public.v_cdp_customer_research CASCADE;

-- Recreate v_cdp_customer_research with case-insensitive filter
CREATE VIEW public.v_cdp_customer_research AS
SELECT 
  c.id,
  c.tenant_id,
  'KH-' || LPAD(ROW_NUMBER() OVER (PARTITION BY c.tenant_id ORDER BY c.id)::TEXT, 6, '0') as anonymous_id,
  CASE 
    WHEN c.last_order_at >= NOW() - INTERVAL '30 days' THEN 'active'
    WHEN c.last_order_at >= NOW() - INTERVAL '90 days' THEN 'dormant'
    WHEN c.last_order_at >= NOW() - INTERVAL '180 days' THEN 'at_risk'
    ELSE 'new'
  END as behavior_status,
  COALESCE(m.net_revenue, 0) as total_spend,
  COALESCE(m.orders_count, 0) as order_count,
  c.last_order_at as last_purchase,
  COALESCE(m.inter_purchase_days, 30)::DOUBLE PRECISION as repurchase_cycle,
  COALESCE(m.aov, 0) as aov,
  CASE 
    WHEN m.net_revenue > 0 AND m.orders_count > 1 THEN 'up'
    WHEN m.return_rate > 20 THEN 'down'
    ELSE 'stable'
  END as trend,
  COALESCE(m.return_rate, 0) as return_rate,
  COALESCE(m.gross_margin, 0) as margin_contribution,
  c.created_at
FROM cdp_customers c
LEFT JOIN LATERAL (
  SELECT * FROM cdp_customer_metrics_rolling cmr 
  WHERE cmr.customer_id = c.id AND cmr.window_days = 365
  ORDER BY cmr.as_of_date DESC
  LIMIT 1
) m ON TRUE
WHERE UPPER(c.status) = 'ACTIVE';

-- Recreate v_cdp_research_stats with case-insensitive filter  
CREATE VIEW public.v_cdp_research_stats AS
SELECT
  c.tenant_id,
  COUNT(DISTINCT c.id) as customer_count,
  COALESCE(SUM(o.net_revenue), 0) as total_revenue,
  COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY o.net_revenue), 0) as median_aov,
  30::DOUBLE PRECISION as median_repurchase_cycle,
  0::DOUBLE PRECISION as avg_return_rate,
  0::DOUBLE PRECISION as promotion_dependency
FROM cdp_customers c
LEFT JOIN cdp_orders o ON o.customer_id = c.id
WHERE UPPER(c.status) = 'ACTIVE'
GROUP BY c.tenant_id;