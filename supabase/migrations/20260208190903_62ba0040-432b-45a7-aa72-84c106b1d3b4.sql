
-- Fix get_fdp_period_summary: Remove ::date cast to use index properly
CREATE OR REPLACE FUNCTION public.get_fdp_period_summary(p_tenant_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    AND o.order_at < (p_end_date + 1)::timestamp;
    
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
$function$;

-- Also fix fdp_sku_summary view to add tenant_id filter support via WHERE clause
-- The view itself scans all data - add a materialized index on cdp_order_items
CREATE INDEX IF NOT EXISTS idx_cdp_order_items_tenant_product 
ON cdp_order_items (tenant_id, product_id);

-- Add composite index for v_channel_performance queries  
CREATE INDEX IF NOT EXISTS idx_cdp_orders_tenant_channel
ON cdp_orders (tenant_id, channel);
