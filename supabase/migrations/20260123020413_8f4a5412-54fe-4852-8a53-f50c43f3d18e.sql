-- Only consolidate data quality views (the population views already exist and work)
DROP VIEW IF EXISTS v_cdp_data_confidence_latest CASCADE;

-- Recreate v_cdp_data_quality as single source of truth for data quality
DROP VIEW IF EXISTS v_cdp_data_quality CASCADE;

CREATE OR REPLACE VIEW v_cdp_data_quality AS
WITH order_stats AS (
  SELECT 
    tenant_id,
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN customer_phone IS NOT NULL OR customer_name IS NOT NULL THEN 1 END) AS orders_with_identity,
    COUNT(CASE WHEN cost_of_goods IS NOT NULL AND cost_of_goods > 0 THEN 1 END) AS orders_with_cogs,
    MAX(order_date) AS last_order_date,
    MIN(order_date) AS first_order_date
  FROM external_orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id
)
SELECT 
  os.tenant_id,
  os.total_orders,
  os.orders_with_identity,
  os.orders_with_cogs,
  CASE WHEN os.total_orders > 0 
    THEN ROUND((os.orders_with_identity::numeric / os.total_orders * 100), 1)
    ELSE 0 
  END AS identity_coverage,
  CASE WHEN os.total_orders > 0 
    THEN ROUND((os.orders_with_cogs::numeric / os.total_orders * 100), 1)
    ELSE 0 
  END AS cogs_coverage,
  os.last_order_date,
  os.first_order_date,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - os.last_order_date::timestamp) AS days_since_last_order,
  CASE 
    WHEN os.total_orders > 0 
      AND (os.orders_with_identity::numeric / os.total_orders) >= 0.8
      AND (os.orders_with_cogs::numeric / os.total_orders) >= 0.7
    THEN TRUE
    ELSE FALSE
  END AS is_reliable,
  CASE 
    WHEN os.total_orders > 0 
      AND (os.orders_with_identity::numeric / os.total_orders) >= 0.9
      AND (os.orders_with_cogs::numeric / os.total_orders) >= 0.85
    THEN 'high'
    WHEN os.total_orders > 0 
      AND (os.orders_with_identity::numeric / os.total_orders) >= 0.7
      AND (os.orders_with_cogs::numeric / os.total_orders) >= 0.6
    THEN 'medium'
    ELSE 'low'
  END AS confidence_level,
  CURRENT_TIMESTAMP AS computed_at
FROM order_stats os;