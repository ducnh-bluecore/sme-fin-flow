DROP FUNCTION IF EXISTS public.get_channel_pl_computed(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_channel_pl_computed(p_tenant_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(channel text, total_revenue numeric, total_fees numeric, total_cogs numeric, gross_profit numeric, operating_profit numeric, order_count numeric, avg_order_value numeric, gross_margin numeric, operating_margin numeric, revenue_share numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grand_total_revenue NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(ch.gross_revenue), 0)
  INTO v_grand_total_revenue
  FROM v_channel_pl_summary ch
  WHERE ch.tenant_id = p_tenant_id
    AND ch.period >= p_start_date
    AND ch.period < (p_end_date + INTERVAL '1 day');

  RETURN QUERY
  WITH raw AS (
    SELECT
      UPPER(TRIM(COALESCE(
        CASE
          WHEN UPPER(TRIM(ch.channel)) IN ('TIKTOKSHOP','TIKTOK SHOP') THEN 'TIKTOK'
          ELSE ch.channel
        END, 'UNKNOWN'))) AS ch_name,
      COALESCE(ch.gross_revenue, 0) AS revenue,
      COALESCE(ch.cogs, 0) AS cogs,
      COALESCE(ch.gross_revenue, 0) - COALESCE(ch.net_revenue, 0) AS fees,
      COALESCE(ch.order_count, 0) AS orders
    FROM v_channel_pl_summary ch
    WHERE ch.tenant_id = p_tenant_id
      AND ch.period >= p_start_date
      AND ch.period < (p_end_date + INTERVAL '1 day')
  ),
  agg AS (
    SELECT
      r.ch_name,
      SUM(r.revenue) AS total_rev,
      SUM(r.fees) AS total_f,
      SUM(r.cogs) AS total_c,
      SUM(r.orders) AS total_o
    FROM raw r
    GROUP BY r.ch_name
  ),
  with_cogs_ratio AS (
    SELECT
      CASE WHEN SUM(CASE WHEN total_c > 0 THEN total_rev ELSE 0 END) > 0
           THEN SUM(CASE WHEN total_c > 0 THEN total_c ELSE 0 END)::NUMERIC / SUM(CASE WHEN total_c > 0 THEN total_rev ELSE 0 END)
           ELSE 0 END AS overall_cogs_ratio
    FROM agg
  )
  SELECT
    a.ch_name::TEXT,
    a.total_rev,
    a.total_f,
    CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
         THEN a.total_rev * wcr.overall_cogs_ratio
         ELSE a.total_c END AS effective_cogs,
    a.total_rev - (CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
                        THEN a.total_rev * wcr.overall_cogs_ratio
                        ELSE a.total_c END) AS gp,
    a.total_rev - (CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
                        THEN a.total_rev * wcr.overall_cogs_ratio
                        ELSE a.total_c END) - a.total_f AS op,
    a.total_o,
    CASE WHEN a.total_o > 0 THEN a.total_rev / a.total_o ELSE 0 END,
    CASE WHEN a.total_rev > 0
         THEN ((a.total_rev - (CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
                                    THEN a.total_rev * wcr.overall_cogs_ratio
                                    ELSE a.total_c END)) / a.total_rev) * 100
         ELSE 0 END,
    CASE WHEN a.total_rev > 0
         THEN ((a.total_rev - (CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
                                    THEN a.total_rev * wcr.overall_cogs_ratio
                                    ELSE a.total_c END) - a.total_f) / a.total_rev) * 100
         ELSE 0 END,
    CASE WHEN v_grand_total_revenue > 0 THEN (a.total_rev / v_grand_total_revenue) * 100 ELSE 0 END
  FROM agg a
  CROSS JOIN with_cogs_ratio wcr
  ORDER BY a.total_rev DESC;
END;
$function$;