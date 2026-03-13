
CREATE OR REPLACE FUNCTION public.get_revenue_channel_daily(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  channel text,
  order_date date,
  total_gross_revenue numeric,
  total_net_revenue numeric,
  order_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_schema text;
  v_slug text;
  v_provisioned boolean;
BEGIN
  SELECT slug, schema_provisioned INTO v_slug, v_provisioned
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF v_provisioned = true AND v_slug IS NOT NULL THEN
    v_schema := 'tenant_' || v_slug;
    RETURN QUERY EXECUTE format(
      'SELECT 
        UPPER(TRIM(COALESCE(channel, ''UNKNOWN'')))::text AS channel,
        (order_at::date) AS order_date,
        SUM(COALESCE(gross_revenue, 0)) AS total_gross_revenue,
        SUM(COALESCE(net_revenue, 0)) AS total_net_revenue,
        COUNT(*)::bigint AS order_count
      FROM %I.cdp_orders
      WHERE order_at >= $1 AND order_at < ($2 + interval ''1 day'')
      GROUP BY 1, 2
      ORDER BY order_date DESC',
      v_schema
    ) USING p_start_date, p_end_date;
  ELSE
    RETURN QUERY
    SELECT 
      UPPER(TRIM(COALESCE(o.channel, 'UNKNOWN')))::text,
      (o.order_at::date),
      SUM(COALESCE(o.gross_revenue, 0)),
      SUM(COALESCE(o.net_revenue, 0)),
      COUNT(*)::bigint
    FROM public.cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at >= p_start_date
      AND o.order_at < (p_end_date + interval '1 day')
    GROUP BY 1, 2
    ORDER BY 2 DESC;
  END IF;
END;
$function$;
