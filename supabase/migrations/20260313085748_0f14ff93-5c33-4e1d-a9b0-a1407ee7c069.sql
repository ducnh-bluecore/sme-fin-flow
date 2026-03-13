CREATE OR REPLACE FUNCTION public.get_channel_performance(
  p_tenant_id UUID,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE(
  channel TEXT,
  order_count BIGINT,
  gross_revenue NUMERIC,
  net_revenue NUMERIC,
  total_fees NUMERIC,
  cogs NUMERIC,
  gross_margin NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema TEXT;
BEGIN
  -- Get tenant schema
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
        COALESCE(SUM(o.total_fees), 0)::NUMERIC AS total_fees,
        COALESCE(SUM(o.cogs), 0)::NUMERIC AS cogs,
        (COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0))::NUMERIC AS gross_margin
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
      COALESCE(o.channel, 'OTHER')::TEXT AS channel,
      COUNT(*)::BIGINT AS order_count,
      COALESCE(SUM(o.gross_revenue), 0)::NUMERIC AS gross_revenue,
      COALESCE(SUM(o.net_revenue), 0)::NUMERIC AS net_revenue,
      COALESCE(SUM(o.total_fees), 0)::NUMERIC AS total_fees,
      COALESCE(SUM(o.cogs), 0)::NUMERIC AS cogs,
      (COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0))::NUMERIC AS gross_margin
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at >= p_start_date::timestamp
      AND o.order_at < (p_end_date::date + 1)::timestamp
    GROUP BY o.channel
    ORDER BY net_revenue DESC;
  END IF;
END;
$$;