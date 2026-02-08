
-- View 3: v_all_revenue_summary (fix: cast enum source to text)
CREATE OR REPLACE VIEW public.v_all_revenue_summary
WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  'ecommerce' AS source,
  COALESCE(channel, 'unknown') AS channel,
  COUNT(*)::integer AS total_orders,
  COALESCE(SUM(gross_revenue), 0) AS gross_revenue,
  COALESCE(SUM(net_revenue), 0) AS net_revenue,
  COALESCE(SUM(cogs), 0) AS cogs,
  COALESCE(SUM(gross_margin), 0) AS gross_profit,
  CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(gross_revenue), 0) / COUNT(*) ELSE 0 END AS avg_order_value
FROM cdp_orders
GROUP BY tenant_id, channel

UNION ALL

SELECT 
  tenant_id,
  'invoice' AS source,
  COALESCE(status, 'unknown') AS channel,
  COUNT(*)::integer AS total_orders,
  COALESCE(SUM(total_amount), 0) AS gross_revenue,
  COALESCE(SUM(paid_amount), 0) AS net_revenue,
  0 AS cogs,
  COALESCE(SUM(paid_amount), 0) AS gross_profit,
  CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_amount), 0) / COUNT(*) ELSE 0 END AS avg_order_value
FROM invoices
WHERE status IN ('sent', 'paid', 'partial')
GROUP BY tenant_id, status

UNION ALL

SELECT 
  tenant_id,
  'revenue' AS source,
  source::text AS channel,
  COUNT(*)::integer AS total_orders,
  COALESCE(SUM(amount), 0) AS gross_revenue,
  COALESCE(SUM(amount), 0) AS net_revenue,
  0 AS cogs,
  COALESCE(SUM(amount), 0) AS gross_profit,
  CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(amount), 0) / COUNT(*) ELSE 0 END AS avg_order_value
FROM revenues
WHERE is_active = true
GROUP BY tenant_id, source;

-- View 4: v_forecast_order_stats
CREATE OR REPLACE VIEW public.v_forecast_order_stats
WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  COUNT(*)::integer AS total_orders,
  COALESCE(SUM(net_revenue), 0) AS total_net_revenue,
  CASE 
    WHEN (MAX(order_at::date) - MIN(order_at::date)) > 0 
    THEN COALESCE(SUM(net_revenue), 0) / (MAX(order_at::date) - MIN(order_at::date))
    ELSE 0 
  END AS avg_daily_revenue,
  MIN(order_at) AS min_date,
  MAX(order_at) AS max_date,
  COALESCE(SUM(CASE WHEN order_at >= (CURRENT_DATE - INTERVAL '14 days') THEN net_revenue ELSE 0 END), 0) AS pending_settlements
FROM cdp_orders
GROUP BY tenant_id;
