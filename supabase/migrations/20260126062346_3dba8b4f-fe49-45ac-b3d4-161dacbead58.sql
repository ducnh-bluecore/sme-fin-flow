-- Fix get_fdp_period_summary to use cdp_orders (Layer 2 computed view)
-- Following DB-First Architecture: FDP reads from computed layer, not raw tables
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
  -- Query from cdp_orders (Layer 2 computed view) instead of raw external_orders
  SELECT jsonb_build_object(
    'totalOrders', COUNT(DISTINCT o.id),
    'totalRevenue', COALESCE(SUM(o.net_revenue), 0),
    'totalCogs', COALESCE(SUM(o.cogs), 0),
    'totalPlatformFees', 0, -- Fees are in Layer 0, not exposed in cdp_orders
    'totalShippingFees', 0,
    'grossProfit', COALESCE(SUM(o.gross_margin), 0),
    'contributionMargin', COALESCE(SUM(o.gross_margin), 0), -- CM = Gross Margin for now
    'uniqueCustomers', COUNT(DISTINCT o.customer_id),
    'avgOrderValue', CASE WHEN COUNT(DISTINCT o.id) > 0 
      THEN COALESCE(SUM(o.net_revenue), 0) / COUNT(DISTINCT o.id) 
      ELSE 0 END,
    'dataQuality', jsonb_build_object(
      'hasRealData', COUNT(DISTINCT o.id) > 0,
      'hasCogs', SUM(CASE WHEN o.cogs IS NOT NULL AND o.cogs > 0 THEN 1 ELSE 0 END) > 0,
      'hasFees', false,
      'orderCount', COUNT(DISTINCT o.id)
    )
  ) INTO v_result
  FROM cdp_orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.order_at::date >= p_start_date
    AND o.order_at::date <= p_end_date;
    
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_fdp_period_summary IS 
'FDP Period Summary - DB-First Architecture. Reads from cdp_orders (Layer 2) not raw tables.';