CREATE OR REPLACE FUNCTION public.get_fdp_period_summary(
  p_tenant_id UUID,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_schema TEXT;
BEGIN
  -- Get tenant schema for schema-aware query
  SELECT 'tenant_' || t.slug INTO v_schema
  FROM tenants t
  WHERE t.id = p_tenant_id AND t.schema_provisioned = true;

  IF v_schema IS NOT NULL THEN
    EXECUTE format(
      $q$
      SELECT jsonb_build_object(
        'totalOrders', COUNT(DISTINCT o.id),
        'totalRevenue', COALESCE(SUM(o.net_revenue), 0),
        'totalCogs', COALESCE(SUM(o.cogs), 0),
        'totalPlatformFees', COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.other_fees, 0)), 0),
        'totalShippingFees', COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0),
        'grossProfit', COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0),
        'contributionMargin', COALESCE(SUM(o.net_revenue), 0) 
          - COALESCE(SUM(o.cogs), 0) 
          - COALESCE(SUM(COALESCE(o.platform_fee, 0)), 0)
          - COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0) 
          - COALESCE(SUM(COALESCE(o.other_fees, 0)), 0),
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
      )
      FROM %I.cdp_orders o
      WHERE o.order_at >= $1::timestamp
        AND o.order_at < ($2::date + 1)::timestamp
      $q$,
      v_schema
    ) INTO v_result USING p_start_date, p_end_date;
  ELSE
    -- Fallback to public schema with tenant_id filter
    SELECT jsonb_build_object(
      'totalOrders', COUNT(DISTINCT o.id),
      'totalRevenue', COALESCE(SUM(o.net_revenue), 0),
      'totalCogs', COALESCE(SUM(o.cogs), 0),
      'totalPlatformFees', COALESCE(SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.other_fees, 0)), 0),
      'totalShippingFees', COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0),
      'grossProfit', COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0),
      'contributionMargin', COALESCE(SUM(o.net_revenue), 0) 
        - COALESCE(SUM(o.cogs), 0)
        - COALESCE(SUM(COALESCE(o.platform_fee, 0)), 0)
        - COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0) 
        - COALESCE(SUM(COALESCE(o.other_fees, 0)), 0),
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
  END IF;

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