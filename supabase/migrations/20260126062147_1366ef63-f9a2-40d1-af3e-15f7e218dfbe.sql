-- Fix get_fdp_period_summary RPC to use correct column names
CREATE OR REPLACE FUNCTION public.get_fdp_period_summary(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalOrders', COUNT(DISTINCT eo.id),
    'totalRevenue', COALESCE(SUM(eo.total_amount), 0),
    'totalCogs', COALESCE(SUM(eoi_agg.total_cogs), 0),
    'totalPlatformFees', COALESCE(SUM(
      COALESCE(eo.platform_fee, 0) + 
      COALESCE(eo.commission_fee, 0) + 
      COALESCE(eo.payment_fee, 0)
    ), 0),
    'totalShippingFees', COALESCE(SUM(eo.shipping_fee), 0),
    'grossProfit', COALESCE(SUM(eo.total_amount), 0) - COALESCE(SUM(eoi_agg.total_cogs), 0),
    'contributionMargin', COALESCE(SUM(eo.total_amount), 0) - 
      COALESCE(SUM(eoi_agg.total_cogs), 0) - 
      COALESCE(SUM(COALESCE(eo.platform_fee, 0) + COALESCE(eo.commission_fee, 0) + COALESCE(eo.payment_fee, 0) + COALESCE(eo.shipping_fee, 0)), 0),
    'uniqueCustomers', COUNT(DISTINCT eo.buyer_id),
    'avgOrderValue', CASE WHEN COUNT(DISTINCT eo.id) > 0 
      THEN COALESCE(SUM(eo.total_amount), 0) / COUNT(DISTINCT eo.id) 
      ELSE 0 END,
    'dataQuality', jsonb_build_object(
      'hasRealData', COUNT(DISTINCT eo.id) > 0,
      'hasCogs', SUM(CASE WHEN eoi_agg.total_cogs IS NOT NULL AND eoi_agg.total_cogs > 0 THEN 1 ELSE 0 END) > 0,
      'hasFees', SUM(CASE WHEN eo.platform_fee IS NOT NULL OR eo.commission_fee IS NOT NULL THEN 1 ELSE 0 END) > 0,
      'orderCount', COUNT(DISTINCT eo.id)
    )
  ) INTO v_result
  FROM external_orders eo
  LEFT JOIN (
    SELECT external_order_id, SUM(total_cogs) as total_cogs
    FROM external_order_items
    WHERE tenant_id = p_tenant_id
    GROUP BY external_order_id
  ) eoi_agg ON eoi_agg.external_order_id = eo.id
  WHERE eo.tenant_id = p_tenant_id
    AND eo.order_date >= p_start_date
    AND eo.order_date <= p_end_date;
    
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;