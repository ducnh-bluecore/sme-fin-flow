-- ============================================================================
-- FIX VIEWS: Add missing columns that frontend expects
-- ============================================================================

-- ============================================================================
-- 1. FIX: v_cdp_data_quality - add missing columns
-- ============================================================================
DROP VIEW IF EXISTS v_cdp_data_quality CASCADE;

CREATE OR REPLACE VIEW v_cdp_data_quality AS
SELECT 
  co.tenant_id,
  COUNT(DISTINCT co.id) as total_orders,
  COUNT(DISTINCT co.customer_id) as total_customers,
  COUNT(DISTINCT CASE WHEN co.customer_id IS NOT NULL THEN co.id END) as orders_with_identity,
  COUNT(DISTINCT CASE WHEN co.customer_id IS NULL THEN co.id END) as orders_missing_customer,
  COUNT(DISTINCT CASE WHEN co.net_revenue IS NULL OR co.net_revenue = 0 THEN co.id END) as orders_missing_revenue,
  COUNT(DISTINCT CASE WHEN co.cogs IS NULL THEN co.id END) as orders_missing_cogs,
  -- Identity coverage: % of orders with customer_id
  CASE 
    WHEN COUNT(DISTINCT co.id) = 0 THEN 0
    ELSE ROUND(
      (COUNT(DISTINCT CASE WHEN co.customer_id IS NOT NULL THEN co.id END)::numeric / 
       COUNT(DISTINCT co.id) * 100), 1
    )
  END as identity_coverage,
  -- COGS coverage: % of orders with valid COGS
  CASE 
    WHEN COUNT(DISTINCT co.id) = 0 THEN 0
    ELSE ROUND(
      (COUNT(DISTINCT CASE WHEN co.cogs IS NOT NULL AND co.cogs > 0 THEN co.id END)::numeric / 
       COUNT(DISTINCT co.id) * 100), 1
    )
  END as cogs_coverage,
  -- Days since last order
  COALESCE(
    EXTRACT(EPOCH FROM (NOW() - MAX(co.order_at)))::numeric / 86400, 
    999
  )::integer as days_since_last_order,
  -- Is data reliable
  CASE 
    WHEN COUNT(DISTINCT co.id) >= 100 
      AND COUNT(DISTINCT CASE WHEN co.customer_id IS NOT NULL THEN co.id END)::numeric / NULLIF(COUNT(DISTINCT co.id), 0) >= 0.5
    THEN true
    ELSE false
  END as is_reliable,
  -- Confidence level
  CASE 
    WHEN COUNT(DISTINCT co.id) >= 500 THEN 'high'
    WHEN COUNT(DISTINCT co.id) >= 100 THEN 'medium'
    ELSE 'low'
  END as confidence_level,
  -- Overall data quality score
  CASE 
    WHEN COUNT(DISTINCT co.id) = 0 THEN 0
    ELSE ROUND(
      (1.0 - (
        COALESCE(COUNT(DISTINCT CASE WHEN co.customer_id IS NULL THEN co.id END)::numeric / NULLIF(COUNT(DISTINCT co.id), 0), 0) * 0.3 +
        COALESCE(COUNT(DISTINCT CASE WHEN co.net_revenue IS NULL OR co.net_revenue = 0 THEN co.id END)::numeric / NULLIF(COUNT(DISTINCT co.id), 0), 0) * 0.4 +
        COALESCE(COUNT(DISTINCT CASE WHEN co.cogs IS NULL THEN co.id END)::numeric / NULLIF(COUNT(DISTINCT co.id), 0), 0) * 0.3
      )) * 100, 1
    )
  END as data_quality_score
FROM cdp_orders co
GROUP BY co.tenant_id;

COMMENT ON VIEW v_cdp_data_quality IS 
'CDP Data Quality - SSOT Compliant. Reads from cdp_orders (Layer 2). Includes identity_coverage, cogs_coverage, days_since_last_order.';

GRANT SELECT ON v_cdp_data_quality TO authenticated;
GRANT SELECT ON v_cdp_data_quality TO anon;

-- ============================================================================
-- 2. FIX: channel_performance_summary - add missing columns
-- ============================================================================
DROP VIEW IF EXISTS channel_performance_summary CASCADE;

CREATE OR REPLACE VIEW channel_performance_summary AS
SELECT 
  co.tenant_id,
  co.channel,
  co.channel as connector_name,
  'ecommerce' as connector_type,
  co.channel as shop_name,
  COUNT(DISTINCT co.id) as order_count,
  COUNT(DISTINCT co.id) as total_orders,
  SUM(co.gross_revenue) as gross_revenue,
  SUM(co.net_revenue) as total_revenue,
  SUM(co.net_revenue) as net_revenue,
  SUM(co.cogs) as total_cogs,
  0::numeric as total_fees,
  SUM(co.gross_margin) as gross_profit,
  CASE WHEN SUM(co.net_revenue) > 0 
    THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
    ELSE 0 
  END as margin_percent,
  AVG(co.net_revenue) as avg_order_value,
  COUNT(DISTINCT co.customer_id) as unique_customers,
  0::bigint as cancelled_orders,
  0::bigint as returned_orders
FROM cdp_orders co
GROUP BY co.tenant_id, co.channel;

COMMENT ON VIEW channel_performance_summary IS 
'Channel Performance - SSOT Compliant. Reads from cdp_orders (Layer 2). Includes legacy column aliases for backward compatibility.';

GRANT SELECT ON channel_performance_summary TO authenticated;
GRANT SELECT ON channel_performance_summary TO anon;

-- ============================================================================
-- 3. FIX: daily_channel_revenue - add missing columns
-- ============================================================================
DROP VIEW IF EXISTS daily_channel_revenue CASCADE;

CREATE OR REPLACE VIEW daily_channel_revenue AS
SELECT 
  co.tenant_id,
  DATE(co.order_at) as revenue_date,
  DATE(co.order_at) as order_date,
  co.channel,
  COUNT(DISTINCT co.id) as order_count,
  SUM(co.gross_revenue) as gross_revenue,
  SUM(co.net_revenue) as revenue,
  SUM(co.net_revenue) as net_revenue,
  SUM(co.cogs) as cogs,
  0::numeric as platform_fees,
  SUM(co.gross_margin) as gross_profit,
  SUM(co.gross_margin) as profit
FROM cdp_orders co
GROUP BY co.tenant_id, DATE(co.order_at), co.channel;

COMMENT ON VIEW daily_channel_revenue IS 
'Daily Channel Revenue - SSOT Compliant. Reads from cdp_orders (Layer 2). Includes legacy column aliases.';

GRANT SELECT ON daily_channel_revenue TO authenticated;
GRANT SELECT ON daily_channel_revenue TO anon;