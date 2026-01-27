-- Fix v_retail_concentration_risk: handle both UUID and non-UUID product_ids

CREATE OR REPLACE VIEW v_retail_concentration_risk AS
WITH channel_stats AS (
  SELECT 
    tenant_id,
    COALESCE(channel, 'Unknown') as channel,
    SUM(net_revenue) as revenue,
    100.0 * SUM(net_revenue) / NULLIF(SUM(SUM(net_revenue)) OVER (PARTITION BY tenant_id), 0) as pct
  FROM cdp_orders
  WHERE order_at > CURRENT_DATE - INTERVAL '365 days'
    AND net_revenue > 0
  GROUP BY tenant_id, channel
),
category_stats AS (
  SELECT 
    o.tenant_id,
    COALESCE(oi.category, 'Chưa phân loại') as category,
    SUM(oi.line_revenue) as revenue,
    100.0 * SUM(oi.line_revenue) / NULLIF(SUM(SUM(oi.line_revenue)) OVER (PARTITION BY o.tenant_id), 0) as pct
  FROM cdp_order_items oi
  JOIN cdp_orders o ON oi.order_id = o.id
  WHERE o.order_at > CURRENT_DATE - INTERVAL '365 days'
    AND oi.line_revenue > 0
  GROUP BY o.tenant_id, oi.category
),
customer_stats AS (
  SELECT 
    tenant_id,
    customer_id,
    SUM(net_revenue) as revenue,
    COUNT(*) as order_count,
    100.0 * SUM(net_revenue) / NULLIF(SUM(SUM(net_revenue)) OVER (PARTITION BY tenant_id), 0) as pct
  FROM cdp_orders
  WHERE order_at > CURRENT_DATE - INTERVAL '365 days'
    AND net_revenue > 0
  GROUP BY tenant_id, customer_id
),
sku_stats AS (
  SELECT 
    o.tenant_id,
    oi.product_id,
    -- Join products using TEXT comparison to handle both UUID and non-UUID product_ids
    COALESCE(p.name, 'SKU-' || LEFT(oi.product_id::text, 8)) as product_name,
    COALESCE(oi.category, 'Chưa phân loại') as category,
    SUM(oi.line_margin) as margin,
    100.0 * SUM(oi.line_margin) / NULLIF(SUM(SUM(oi.line_margin)) OVER (PARTITION BY o.tenant_id), 0) as pct
  FROM cdp_order_items oi
  JOIN cdp_orders o ON oi.order_id = o.id
  LEFT JOIN products p ON oi.product_id::text = p.id::text  -- TEXT comparison instead of UUID cast
  WHERE o.order_at > CURRENT_DATE - INTERVAL '365 days'
    AND oi.line_margin > 0
  GROUP BY o.tenant_id, oi.product_id, p.name, oi.category
),
monthly_stats AS (
  SELECT 
    tenant_id,
    DATE_TRUNC('month', order_at)::date as month,
    SUM(net_revenue) as revenue
  FROM cdp_orders
  WHERE order_at > CURRENT_DATE - INTERVAL '365 days'
    AND net_revenue > 0
  GROUP BY tenant_id, DATE_TRUNC('month', order_at)
),
seasonal_index AS (
  SELECT 
    tenant_id,
    month,
    revenue,
    COALESCE(revenue / NULLIF(AVG(revenue) OVER (PARTITION BY tenant_id), 0), 1) as seasonality_index
  FROM monthly_stats
)
SELECT 
  t.id as tenant_id,
  
  -- 1. Channel concentration (top 5)
  (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', channel, 
    'revenue', ROUND(revenue::numeric, 0), 
    'pct', ROUND(pct::numeric, 1)
  ) ORDER BY revenue DESC), '[]'::jsonb)
   FROM (SELECT * FROM channel_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 5) x) as channel_concentration,
  
  -- 2. Category concentration (top 5)
  (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', category, 
    'revenue', ROUND(revenue::numeric, 0), 
    'pct', ROUND(pct::numeric, 1)
  ) ORDER BY revenue DESC), '[]'::jsonb)
   FROM (SELECT * FROM category_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 5) x) as category_concentration,
   
  -- 3. Customer concentration (top 10)
  (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', customer_id, 
    'revenue', ROUND(revenue::numeric, 0), 
    'pct', ROUND(pct::numeric, 2), 
    'orders', order_count
  ) ORDER BY revenue DESC), '[]'::jsonb)
   FROM (SELECT * FROM customer_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 10) x) as customer_concentration,
   
  -- 4. SKU concentration (top 5 by margin)
  (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', product_id, 
    'name', product_name, 
    'category', category, 
    'margin', ROUND(margin::numeric, 0), 
    'pct', ROUND(pct::numeric, 2)
  ) ORDER BY margin DESC), '[]'::jsonb)
   FROM (SELECT * FROM sku_stats WHERE tenant_id = t.id ORDER BY margin DESC LIMIT 5) x) as sku_concentration,
   
  -- 5. Seasonal pattern (12 months)
  (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month', TO_CHAR(month, 'YYYY-MM'), 
    'revenue', ROUND(revenue::numeric, 0), 
    'index', ROUND(seasonality_index::numeric, 2)
  ) ORDER BY month), '[]'::jsonb)
   FROM seasonal_index WHERE tenant_id = t.id) as seasonal_pattern,
   
  -- Summary metrics
  COALESCE((SELECT ROUND(pct::numeric, 1) FROM channel_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 1), 0) as top1_channel_pct,
  COALESCE((SELECT ROUND(pct::numeric, 1) FROM category_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 1), 0) as top1_category_pct,
  COALESCE((SELECT ROUND(SUM(pct)::numeric, 1) FROM (SELECT pct FROM customer_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 10) x), 0) as top10_customer_pct,
  COALESCE((SELECT ROUND(SUM(pct)::numeric, 1) FROM (SELECT pct FROM sku_stats WHERE tenant_id = t.id ORDER BY margin DESC LIMIT 5) x), 0) as top5_sku_margin_pct,
  COALESCE((SELECT ROUND(MAX(seasonality_index)::numeric, 2) FROM seasonal_index WHERE tenant_id = t.id), 1) as max_seasonality_index
  
FROM tenants t
WHERE t.is_active = true;