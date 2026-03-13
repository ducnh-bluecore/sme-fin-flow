
-- 1. Create covering index for FDP summary aggregation (enables index-only scan)
CREATE INDEX IF NOT EXISTS idx_cdp_orders_fdp_summary 
ON tenant_icondenim.cdp_orders (order_at) 
INCLUDE (net_revenue, cogs, platform_fee, commission_fee, payment_fee, service_fee, other_fees, shipping_fee, customer_id);

-- 2. Recreate RPC with longer timeout and optimized query
CREATE OR REPLACE FUNCTION public.get_fdp_period_summary(
  p_tenant_id uuid, 
  p_start_date text, 
  p_end_date text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_result JSONB;
  v_schema TEXT;
  v_unique_customers BIGINT;
BEGIN
  SELECT 'tenant_' || t.slug INTO v_schema
  FROM tenants t
  WHERE t.id = p_tenant_id AND t.schema_provisioned = true;

  IF v_schema IS NOT NULL THEN
    -- Step 1: Fast aggregation WITHOUT COUNT(DISTINCT)
    EXECUTE format(
      $q$
      SELECT jsonb_build_object(
        'totalOrders', COUNT(*),
        'totalRevenue', COALESCE(SUM(o.net_revenue), 0),
        'totalCogs', COALESCE(SUM(o.cogs), 0),
        'totalPlatformFees', COALESCE(SUM(
          COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + 
          COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.other_fees, 0)
        ), 0),
        'totalShippingFees', COALESCE(SUM(o.shipping_fee), 0),
        'grossProfit', COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0),
        'contributionMargin', COALESCE(SUM(o.net_revenue), 0) 
          - COALESCE(SUM(o.cogs), 0) 
          - COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.other_fees, 0)), 0)
          - COALESCE(SUM(o.shipping_fee), 0),
        'avgOrderValue', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(o.net_revenue), 0) / COUNT(*)::NUMERIC ELSE 0 END,
        'dataQuality', jsonb_build_object(
          'hasRealData', COUNT(*) > 0,
          'hasCogs', SUM(CASE WHEN o.cogs > 0 THEN 1 ELSE 0 END) > 0,
          'hasFees', SUM(CASE WHEN COALESCE(o.platform_fee, 0) + COALESCE(o.shipping_fee, 0) > 0 THEN 1 ELSE 0 END) > 0,
          'orderCount', COUNT(*)
        )
      )
      FROM %I.cdp_orders o
      WHERE o.order_at >= $1::timestamp
        AND o.order_at < ($2::date + 1)::timestamp
      $q$,
      v_schema
    ) INTO v_result USING p_start_date, p_end_date;

    -- Step 2: Separate COUNT(DISTINCT) - uses existing customer_id index
    EXECUTE format(
      $q$
      SELECT COUNT(DISTINCT customer_id) 
      FROM %I.cdp_orders 
      WHERE order_at >= $1::timestamp 
        AND order_at < ($2::date + 1)::timestamp
        AND customer_id IS NOT NULL
      $q$,
      v_schema
    ) INTO v_unique_customers USING p_start_date, p_end_date;

    v_result = v_result || jsonb_build_object('uniqueCustomers', COALESCE(v_unique_customers, 0));

  ELSE
    -- Public schema fallback
    SELECT jsonb_build_object(
      'totalOrders', COUNT(*),
      'totalRevenue', COALESCE(SUM(o.net_revenue), 0),
      'totalCogs', COALESCE(SUM(o.cogs), 0),
      'totalPlatformFees', COALESCE(SUM(
        COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + 
        COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.other_fees, 0)
      ), 0),
      'totalShippingFees', COALESCE(SUM(o.shipping_fee), 0),
      'grossProfit', COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0),
      'contributionMargin', COALESCE(SUM(o.net_revenue), 0) 
        - COALESCE(SUM(o.cogs), 0)
        - COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.other_fees, 0)), 0)
        - COALESCE(SUM(o.shipping_fee), 0),
      'uniqueCustomers', COUNT(DISTINCT o.customer_id),
      'avgOrderValue', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(o.net_revenue), 0) / COUNT(*)::NUMERIC ELSE 0 END,
      'dataQuality', jsonb_build_object(
        'hasRealData', COUNT(*) > 0,
        'hasCogs', SUM(CASE WHEN o.cogs > 0 THEN 1 ELSE 0 END) > 0,
        'hasFees', SUM(CASE WHEN COALESCE(o.platform_fee, 0) + COALESCE(o.shipping_fee, 0) > 0 THEN 1 ELSE 0 END) > 0,
        'orderCount', COUNT(*)
      )
    ) INTO v_result
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at >= p_start_date::timestamp
      AND o.order_at < (p_end_date::date + 1)::timestamp;
  END IF;

  RETURN COALESCE(v_result, jsonb_build_object(
    'totalOrders', 0, 'totalRevenue', 0, 'totalCogs', 0,
    'totalPlatformFees', 0, 'totalShippingFees', 0,
    'grossProfit', 0, 'contributionMargin', 0,
    'uniqueCustomers', 0, 'avgOrderValue', 0,
    'dataQuality', jsonb_build_object('hasRealData', false, 'hasCogs', false, 'hasFees', false, 'orderCount', 0)
  ));
END;
$function$;
