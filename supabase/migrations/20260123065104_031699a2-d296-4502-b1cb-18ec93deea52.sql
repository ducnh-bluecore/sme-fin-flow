-- Update v_cdp_equity_evidence to include customer_id for navigation
DROP VIEW IF EXISTS public.v_cdp_equity_evidence;

CREATE OR REPLACE VIEW public.v_cdp_equity_evidence AS
WITH customer_stats AS (
  SELECT 
    eo.tenant_id,
    eo.customer_id,
    COUNT(*) AS purchase_count,
    SUM(COALESCE(eo.net_revenue, 0)) AS total_revenue,
    MAX(eo.order_at) AS last_purchase,
    CASE 
      WHEN MAX(eo.order_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 'normal'
      WHEN MAX(eo.order_at) >= CURRENT_DATE - INTERVAL '90 days' THEN 'at_risk'
      ELSE 'inactive'
    END AS behavior_status,
    ROUND(SUM(COALESCE(eo.net_revenue, 0)) * 2.5) AS estimated_ltv
  FROM cdp_orders eo
  WHERE eo.customer_id IS NOT NULL
  GROUP BY eo.tenant_id, eo.customer_id
)
SELECT 
  cs.tenant_id,
  cs.customer_id,
  'KH-****' || RIGHT(cs.customer_id::text, 4) AS anonymized_id,
  CASE 
    WHEN cs.total_revenue >= (SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_revenue) FROM customer_stats WHERE tenant_id = cs.tenant_id) THEN 'TOP10'
    WHEN cs.total_revenue >= (SELECT PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY total_revenue) FROM customer_stats WHERE tenant_id = cs.tenant_id) THEN 'TOP20'
    WHEN cs.total_revenue >= (SELECT PERCENTILE_CONT(0.7) WITHIN GROUP (ORDER BY total_revenue) FROM customer_stats WHERE tenant_id = cs.tenant_id) THEN 'TOP30'
    ELSE 'Trung bình'
  END AS segment,
  cs.estimated_ltv,
  cs.behavior_status::text,
  cs.last_purchase,
  cs.purchase_count,
  95 AS data_confidence
FROM customer_stats cs
ORDER BY cs.total_revenue DESC
LIMIT 20;