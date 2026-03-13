
-- Optimize get_fdp_period_summary: Replace COUNT(DISTINCT id) with COUNT(*) 
-- since each row in cdp_orders IS a distinct order already
CREATE OR REPLACE FUNCTION public.get_fdp_period_summary(p_tenant_id uuid, p_start_date text, p_end_date text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_schema TEXT;
BEGIN
  SELECT 'tenant_' || t.slug INTO v_schema
  FROM tenants t
  WHERE t.id = p_tenant_id AND t.schema_provisioned = true;

  IF v_schema IS NOT NULL THEN
    EXECUTE format(
      $q$
      SELECT jsonb_build_object(
        'totalOrders', COUNT(*),
        'totalRevenue', COALESCE(SUM(o.net_revenue), 0),
        'totalCogs', COALESCE(SUM(o.cogs), 0),
        'totalPlatformFees', COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.other_fees, 0)), 0),
        'totalShippingFees', COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0),
        'grossProfit', COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0),
        'contributionMargin', COALESCE(SUM(o.net_revenue), 0) 
          - COALESCE(SUM(o.cogs), 0) 
          - COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.other_fees, 0)), 0)
          - COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0),
        'uniqueCustomers', COUNT(DISTINCT o.customer_id),
        'avgOrderValue', CASE 
          WHEN COUNT(*) > 0 
          THEN COALESCE(SUM(o.net_revenue), 0) / COUNT(*)::NUMERIC
          ELSE 0 
        END,
        'dataQuality', jsonb_build_object(
          'hasRealData', COUNT(*) > 0,
          'hasCogs', COALESCE(SUM(CASE WHEN o.cogs > 0 THEN 1 ELSE 0 END), 0) > 0,
          'hasFees', COALESCE(SUM(CASE WHEN COALESCE(o.platform_fee, 0) + COALESCE(o.shipping_fee, 0) > 0 THEN 1 ELSE 0 END), 0) > 0,
          'orderCount', COUNT(*)
        )
      )
      FROM %I.cdp_orders o
      WHERE o.order_at >= $1::timestamp
        AND o.order_at < ($2::date + 1)::timestamp
      $q$,
      v_schema
    ) INTO v_result USING p_start_date, p_end_date;
  ELSE
    SELECT jsonb_build_object(
      'totalOrders', COUNT(*),
      'totalRevenue', COALESCE(SUM(o.net_revenue), 0),
      'totalCogs', COALESCE(SUM(o.cogs), 0),
      'totalPlatformFees', COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.other_fees, 0)), 0),
      'totalShippingFees', COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0),
      'grossProfit', COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0),
      'contributionMargin', COALESCE(SUM(o.net_revenue), 0) 
        - COALESCE(SUM(o.cogs), 0)
        - COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.other_fees, 0)), 0)
        - COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0),
      'uniqueCustomers', COUNT(DISTINCT o.customer_id),
      'avgOrderValue', CASE 
        WHEN COUNT(*) > 0 
        THEN COALESCE(SUM(o.net_revenue), 0) / COUNT(*)::NUMERIC
        ELSE 0 
      END,
      'dataQuality', jsonb_build_object(
        'hasRealData', COUNT(*) > 0,
        'hasCogs', COALESCE(SUM(CASE WHEN o.cogs > 0 THEN 1 ELSE 0 END), 0) > 0,
        'hasFees', COALESCE(SUM(CASE WHEN COALESCE(o.platform_fee, 0) + COALESCE(o.shipping_fee, 0) > 0 THEN 1 ELSE 0 END), 0) > 0,
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

-- Also update get_channel_performance to include all fee types
CREATE OR REPLACE FUNCTION public.get_channel_performance(p_tenant_id uuid, p_start_date text, p_end_date text)
RETURNS TABLE(channel text, order_count bigint, gross_revenue numeric, net_revenue numeric, total_fees numeric, cogs numeric, gross_margin numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_schema TEXT;
BEGIN
  SELECT 'tenant_' || t.slug INTO v_schema
  FROM tenants t
  WHERE t.id = p_tenant_id AND t.schema_provisioned = true;

  IF v_schema IS NOT NULL THEN
    RETURN QUERY EXECUTE format(
      $q$
      SELECT
        COALESCE(o.channel, 'OTHER')::TEXT AS channel,
        COUNT(*)::BIGINT AS order_count,
        COALESCE(SUM(o.gross_revenue), 0)::NUMERIC AS gross_revenue,
        COALESCE(SUM(o.net_revenue), 0)::NUMERIC AS net_revenue,
        COALESCE(SUM(
          COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + 
          COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + 
          COALESCE(o.shipping_fee, 0) + COALESCE(o.other_fees, 0)
        ), 0)::NUMERIC AS total_fees,
        COALESCE(SUM(o.cogs), 0)::NUMERIC AS cogs,
        (COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0) 
         - COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.shipping_fee, 0) + COALESCE(o.other_fees, 0)), 0)
        )::NUMERIC AS gross_margin
      FROM %I.cdp_orders o
      WHERE o.order_at >= $1::timestamp
        AND o.order_at < ($2::date + 1)::timestamp
      GROUP BY o.channel
      ORDER BY net_revenue DESC
      $q$,
      v_schema
    ) USING p_start_date, p_end_date;
  ELSE
    RETURN QUERY
    SELECT
      COALESCE(o.channel, 'OTHER')::TEXT,
      COUNT(*)::BIGINT,
      COALESCE(SUM(o.gross_revenue), 0)::NUMERIC,
      COALESCE(SUM(o.net_revenue), 0)::NUMERIC,
      COALESCE(SUM(
        COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + 
        COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + 
        COALESCE(o.shipping_fee, 0) + COALESCE(o.other_fees, 0)
      ), 0)::NUMERIC,
      COALESCE(SUM(o.cogs), 0)::NUMERIC,
      (COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0)
       - COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.commission_fee, 0) + COALESCE(o.payment_fee, 0) + COALESCE(o.service_fee, 0) + COALESCE(o.shipping_fee, 0) + COALESCE(o.other_fees, 0)), 0)
      )::NUMERIC
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at >= p_start_date::timestamp
      AND o.order_at < (p_end_date::date + 1)::timestamp
    GROUP BY o.channel
    ORDER BY 4 DESC;
  END IF;
END;
$function$;
