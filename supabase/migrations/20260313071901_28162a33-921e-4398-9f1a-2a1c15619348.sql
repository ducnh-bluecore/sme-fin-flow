
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
BEGIN
  -- Get tenant schema
  SELECT schema_name INTO v_schema
  FROM public.tenants
  WHERE id = p_tenant_id AND schema_provisioned = true;

  IF v_schema IS NOT NULL THEN
    -- Use tenant schema
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
    -- Fallback to public with tenant filter
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
