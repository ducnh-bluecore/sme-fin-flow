
-- ============================================
-- FIX FDP QUERY TIMEOUTS
-- 1. Add composite index for SKU-based joins
-- 2. Rewrite get_sku_profitability_by_date_range (eliminate p.id::text cast)
-- 3. Rewrite fdp_sku_summary view (eliminate product_id::uuid cast)
-- 4. Increase statement timeout for get_fdp_period_summary
-- ============================================

-- 1. Index for cdp_order_items SKU lookup (composite with tenant)
CREATE INDEX IF NOT EXISTS idx_cdp_order_items_tenant_sku 
ON cdp_order_items(tenant_id, sku);

-- 2. Rewrite get_sku_profitability_by_date_range - use SKU join instead of id::text cast
CREATE OR REPLACE FUNCTION get_sku_profitability_by_date_range(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  sku TEXT,
  product_name TEXT,
  channel TEXT,
  order_count BIGINT,
  total_quantity NUMERIC,
  total_revenue NUMERIC,
  total_cogs NUMERIC,
  gross_profit NUMERIC,
  margin_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(coi.sku, coi.product_id, 'Unknown')::text AS sku,
    COALESCE(p.name, 'Unknown')::text AS product_name,
    COALESCE(co.channel, 'Unknown')::text AS channel,
    COUNT(DISTINCT coi.order_id) AS order_count,
    COALESCE(SUM(coi.qty), 0)::numeric AS total_quantity,
    COALESCE(SUM(coi.line_revenue), 0)::numeric AS total_revenue,
    COALESCE(SUM(coi.line_cogs), 0)::numeric AS total_cogs,
    COALESCE(SUM(coi.line_revenue) - SUM(coi.line_cogs), 0)::numeric AS gross_profit,
    CASE 
      WHEN COALESCE(SUM(coi.line_revenue), 0) > 0 
      THEN ROUND(((SUM(coi.line_revenue) - SUM(coi.line_cogs)) / SUM(coi.line_revenue) * 100)::numeric, 2)
      ELSE 0
    END AS margin_percent
  FROM cdp_order_items coi
  INNER JOIN cdp_orders co 
    ON co.id = coi.order_id AND co.tenant_id = coi.tenant_id
  LEFT JOIN products p 
    ON p.tenant_id = coi.tenant_id AND p.sku = coi.sku  -- SKU join, no type cast!
  WHERE coi.tenant_id = p_tenant_id
    AND co.order_at >= p_start_date::timestamp
    AND co.order_at < (p_end_date + 1)::timestamp
  GROUP BY 
    COALESCE(coi.sku, coi.product_id, 'Unknown'),
    COALESCE(p.name, 'Unknown'),
    COALESCE(co.channel, 'Unknown')
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$;

-- 3. Rewrite fdp_sku_summary view - use SKU join instead of product_id::uuid cast
CREATE OR REPLACE VIEW fdp_sku_summary AS
SELECT 
  coi.tenant_id,
  COALESCE(p.sku, coi.sku, coi.product_id::varchar) AS sku,
  COALESCE(p.name, ('Product ' || coi.product_id)::varchar) AS product_name,
  coi.category,
  COUNT(DISTINCT coi.order_id) AS order_count,
  SUM(coi.qty) AS total_quantity,
  SUM(coi.line_revenue) AS total_revenue,
  SUM(coi.line_cogs) AS total_cogs,
  SUM(coi.line_margin) AS gross_profit,
  CASE 
    WHEN SUM(coi.line_revenue) > 0 
    THEN ROUND(SUM(coi.line_margin) / SUM(coi.line_revenue) * 100, 2)
    ELSE 0
  END AS margin_percent,
  CASE 
    WHEN SUM(coi.qty) > 0 THEN ROUND(SUM(coi.line_revenue) / SUM(coi.qty)::numeric, 0)
    ELSE 0
  END AS avg_unit_price,
  CASE 
    WHEN SUM(coi.qty) > 0 THEN ROUND(SUM(coi.line_cogs) / SUM(coi.qty)::numeric, 0)
    ELSE 0
  END AS avg_unit_cogs
FROM cdp_order_items coi
LEFT JOIN products p 
  ON p.tenant_id = coi.tenant_id AND p.sku = coi.sku  -- SKU join, no type cast!
GROUP BY coi.tenant_id, 
  COALESCE(p.sku, coi.sku, coi.product_id::varchar),
  COALESCE(p.name, ('Product ' || coi.product_id)::varchar),
  coi.category;

-- 4. Increase statement timeout for get_fdp_period_summary
CREATE OR REPLACE FUNCTION get_fdp_period_summary(
  p_tenant_id UUID,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalOrders', COUNT(DISTINCT o.id),
    'totalRevenue', COALESCE(SUM(o.net_revenue), 0),
    'totalCogs', COALESCE(SUM(o.cogs), 0),
    'totalPlatformFees', COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.other_fees, 0)), 0),
    'totalShippingFees', COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0),
    'grossProfit', COALESCE(SUM(o.gross_margin), 0),
    'contributionMargin', COALESCE(SUM(
      COALESCE(o.gross_margin, 0) 
      - COALESCE(o.platform_fee, 0) 
      - COALESCE(o.shipping_fee, 0) 
      - COALESCE(o.other_fees, 0)
    ), 0),
    'uniqueCustomers', COUNT(DISTINCT o.customer_id),
    'avgOrderValue', CASE 
      WHEN COUNT(DISTINCT o.id) > 0 
      THEN COALESCE(SUM(o.net_revenue), 0) / COUNT(DISTINCT o.id)::NUMERIC
      ELSE 0 
    END,
    'dataQuality', jsonb_build_object(
      'hasRealData', COUNT(DISTINCT o.id) > 0,
      'hasCogs', SUM(CASE WHEN COALESCE(o.cogs, 0) > 0 THEN 1 ELSE 0 END) > 0,
      'hasFees', SUM(CASE WHEN COALESCE(o.platform_fee, 0) + COALESCE(o.shipping_fee, 0) > 0 THEN 1 ELSE 0 END) > 0,
      'orderCount', COUNT(DISTINCT o.id)
    )
  ) INTO v_result
  FROM cdp_orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.order_at >= p_start_date::timestamp
    AND o.order_at < (p_end_date::date + 1)::timestamp;
    
  RETURN COALESCE(v_result, jsonb_build_object(
    'totalOrders', 0,
    'totalRevenue', 0,
    'totalCogs', 0,
    'totalPlatformFees', 0,
    'totalShippingFees', 0,
    'grossProfit', 0,
    'contributionMargin', 0,
    'uniqueCustomers', 0,
    'avgOrderValue', 0,
    'dataQuality', jsonb_build_object(
      'hasRealData', false,
      'hasCogs', false,
      'hasFees', false,
      'orderCount', 0
    )
  ));
END;
$$;
