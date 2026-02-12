
-- Step 1: Drop existing view
DROP VIEW IF EXISTS public.v_retail_concentration_risk;

-- Step 2: Create MATERIALIZED VIEW with accessory product filtering
CREATE MATERIALIZED VIEW public.v_retail_concentration_risk AS
WITH channel_stats AS (
  SELECT cdp_orders.tenant_id,
    COALESCE(cdp_orders.channel, 'Unknown') AS channel,
    sum(cdp_orders.net_revenue) AS revenue,
    100.0 * sum(cdp_orders.net_revenue) / NULLIF(sum(sum(cdp_orders.net_revenue)) OVER (PARTITION BY cdp_orders.tenant_id), 0) AS pct
  FROM cdp_orders
  WHERE cdp_orders.order_at > (CURRENT_DATE - '365 days'::interval) AND cdp_orders.net_revenue > 0
  GROUP BY cdp_orders.tenant_id, cdp_orders.channel
), category_stats AS (
  SELECT o.tenant_id,
    COALESCE(p.category, oi.category::character varying, 'Chưa phân loại'::character varying) AS category,
    sum(oi.line_revenue) AS revenue,
    100.0 * sum(oi.line_revenue) / NULLIF(sum(sum(oi.line_revenue)) OVER (PARTITION BY o.tenant_id), 0) AS pct
  FROM cdp_order_items oi
    JOIN cdp_orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.sku = p.sku::text AND oi.tenant_id = p.tenant_id
  WHERE o.order_at > (CURRENT_DATE - '365 days'::interval) 
    AND oi.line_revenue > 0
    AND (p.selling_price IS NULL OR p.selling_price > 0)
  GROUP BY o.tenant_id, COALESCE(p.category, oi.category::character varying, 'Chưa phân loại'::character varying)
), customer_stats AS (
  SELECT cdp_orders.tenant_id,
    cdp_orders.customer_id,
    sum(cdp_orders.net_revenue) AS revenue,
    count(*) AS order_count,
    100.0 * sum(cdp_orders.net_revenue) / NULLIF(sum(sum(cdp_orders.net_revenue)) OVER (PARTITION BY cdp_orders.tenant_id), 0) AS pct
  FROM cdp_orders
  WHERE cdp_orders.order_at > (CURRENT_DATE - '365 days'::interval) AND cdp_orders.net_revenue > 0
  GROUP BY cdp_orders.tenant_id, cdp_orders.customer_id
), sku_stats AS (
  SELECT o.tenant_id,
    oi.product_id,
    COALESCE(p.name, oi.product_name::character varying, oi.sku::character varying, ('SKU-' || left(oi.product_id, 8))::character varying) AS product_name,
    COALESCE(p.category, oi.category::character varying, 'Chưa phân loại'::character varying) AS category,
    sum(oi.line_margin) AS margin,
    100.0 * sum(oi.line_margin) / NULLIF(sum(sum(oi.line_margin)) OVER (PARTITION BY o.tenant_id), 0) AS pct
  FROM cdp_order_items oi
    JOIN cdp_orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.sku = p.sku::text AND oi.tenant_id = p.tenant_id
  WHERE o.order_at > (CURRENT_DATE - '365 days'::interval) 
    AND oi.line_margin > 0
    AND (p.selling_price IS NULL OR p.selling_price > 0)
  GROUP BY o.tenant_id, oi.product_id, p.name, oi.product_name, oi.sku, p.category, oi.category
), monthly_stats AS (
  SELECT cdp_orders.tenant_id,
    date_trunc('month', cdp_orders.order_at)::date AS month,
    sum(cdp_orders.net_revenue) AS revenue
  FROM cdp_orders
  WHERE cdp_orders.order_at > (CURRENT_DATE - '365 days'::interval) AND cdp_orders.net_revenue > 0
  GROUP BY cdp_orders.tenant_id, date_trunc('month', cdp_orders.order_at)
), seasonal_index AS (
  SELECT monthly_stats.tenant_id,
    monthly_stats.month,
    monthly_stats.revenue,
    COALESCE(monthly_stats.revenue / NULLIF(avg(monthly_stats.revenue) OVER (PARTITION BY monthly_stats.tenant_id), 0), 1) AS seasonality_index
  FROM monthly_stats
)
SELECT t.id AS tenant_id,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', x.channel, 'revenue', round(x.revenue, 0), 'pct', round(x.pct, 1)) ORDER BY x.revenue DESC), '[]'::jsonb)
   FROM (SELECT channel_stats.channel, channel_stats.revenue, channel_stats.pct
         FROM channel_stats WHERE channel_stats.tenant_id = t.id
         ORDER BY channel_stats.revenue DESC LIMIT 5) x) AS channel_concentration,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', x.category, 'revenue', round(x.revenue, 0), 'pct', round(x.pct, 1)) ORDER BY x.revenue DESC), '[]'::jsonb)
   FROM (SELECT category_stats.category, category_stats.revenue, category_stats.pct
         FROM category_stats WHERE category_stats.tenant_id = t.id
         ORDER BY category_stats.revenue DESC LIMIT 5) x) AS category_concentration,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', x.customer_id, 'revenue', round(x.revenue, 0), 'pct', round(x.pct, 2), 'orders', x.order_count) ORDER BY x.revenue DESC), '[]'::jsonb)
   FROM (SELECT customer_stats.customer_id, customer_stats.revenue, customer_stats.order_count, customer_stats.pct
         FROM customer_stats WHERE customer_stats.tenant_id = t.id
         ORDER BY customer_stats.revenue DESC LIMIT 10) x) AS customer_concentration,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', x.product_id, 'name', x.product_name, 'category', x.category, 'margin', round(x.margin, 0), 'pct', round(x.pct, 2)) ORDER BY x.margin DESC), '[]'::jsonb)
   FROM (SELECT sku_stats.product_id, sku_stats.product_name, sku_stats.category, sku_stats.margin, sku_stats.pct
         FROM sku_stats WHERE sku_stats.tenant_id = t.id
         ORDER BY sku_stats.margin DESC LIMIT 5) x) AS sku_concentration,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('month', to_char(seasonal_index.month::timestamp with time zone, 'YYYY-MM'), 'revenue', round(seasonal_index.revenue, 0), 'index', round(seasonal_index.seasonality_index, 2)) ORDER BY seasonal_index.month), '[]'::jsonb)
   FROM seasonal_index WHERE seasonal_index.tenant_id = t.id) AS seasonal_pattern,
  COALESCE((SELECT round(channel_stats.pct, 1) FROM channel_stats WHERE channel_stats.tenant_id = t.id ORDER BY channel_stats.revenue DESC LIMIT 1), 0) AS top1_channel_pct,
  COALESCE((SELECT round(category_stats.pct, 1) FROM category_stats WHERE category_stats.tenant_id = t.id ORDER BY category_stats.revenue DESC LIMIT 1), 0) AS top1_category_pct,
  COALESCE((SELECT round(sum(x.pct), 1) FROM (SELECT customer_stats.pct FROM customer_stats WHERE customer_stats.tenant_id = t.id ORDER BY customer_stats.revenue DESC LIMIT 10) x), 0) AS top10_customer_pct,
  COALESCE((SELECT round(sum(x.pct), 1) FROM (SELECT sku_stats.pct FROM sku_stats WHERE sku_stats.tenant_id = t.id ORDER BY sku_stats.margin DESC LIMIT 5) x), 0) AS top5_sku_margin_pct,
  COALESCE((SELECT round(max(seasonal_index.seasonality_index), 2) FROM seasonal_index WHERE seasonal_index.tenant_id = t.id), 1) AS max_seasonality_index
FROM tenants t
WHERE t.is_active = true;

-- Step 3: Create unique index for REFRESH CONCURRENTLY support
CREATE UNIQUE INDEX idx_v_retail_concentration_risk_tenant ON public.v_retail_concentration_risk (tenant_id);

-- Step 4: Refresh to populate data
REFRESH MATERIALIZED VIEW public.v_retail_concentration_risk;
