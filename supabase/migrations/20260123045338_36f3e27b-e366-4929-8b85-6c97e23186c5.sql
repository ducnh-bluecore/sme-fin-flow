-- Update cdp_populate_rolling_metrics to calculate inter_purchase_days
CREATE OR REPLACE FUNCTION public.cdp_populate_rolling_metrics(p_tenant_id uuid, p_as_of_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window int;
BEGIN
  -- Populate for standard windows: 30, 60, 90, 365 days
  FOREACH v_window IN ARRAY ARRAY[30, 60, 90, 365]
  LOOP
    INSERT INTO public.cdp_customer_metrics_rolling (
      tenant_id, as_of_date, customer_id, window_days,
      orders_count, net_revenue, gross_margin, aov,
      gross_revenue, discount_amount, cogs,
      last_order_at, is_repeat, inter_purchase_days
    )
    SELECT
      c.tenant_id,
      p_as_of_date,
      c.id,
      v_window,
      COUNT(o.id)::int,
      COALESCE(SUM(o.net_revenue), 0),
      COALESCE(SUM(o.gross_margin), 0),
      CASE WHEN COUNT(o.id) > 0 THEN SUM(o.net_revenue) / COUNT(o.id) ELSE 0 END,
      COALESCE(SUM(o.gross_revenue), 0),
      COALESCE(SUM(o.discount_amount), 0),
      COALESCE(SUM(o.cogs), 0),
      MAX(o.order_at),
      COUNT(o.id) > 1,
      -- Calculate inter_purchase_days as average gap between orders
      CASE 
        WHEN COUNT(o.id) > 1 THEN 
          EXTRACT(DAY FROM (MAX(o.order_at) - MIN(o.order_at))) / NULLIF(COUNT(o.id) - 1, 0)
        ELSE NULL
      END
    FROM public.cdp_customers c
    LEFT JOIN public.cdp_orders o ON o.customer_id = c.id
      AND o.order_at >= p_as_of_date - (v_window || ' days')::interval
      AND o.order_at <= p_as_of_date
    WHERE c.tenant_id = p_tenant_id
      AND UPPER(c.status) = 'ACTIVE'
    GROUP BY c.tenant_id, c.id
    ON CONFLICT (tenant_id, as_of_date, customer_id, window_days)
    DO UPDATE SET
      orders_count = EXCLUDED.orders_count,
      net_revenue = EXCLUDED.net_revenue,
      gross_margin = EXCLUDED.gross_margin,
      aov = EXCLUDED.aov,
      gross_revenue = EXCLUDED.gross_revenue,
      discount_amount = EXCLUDED.discount_amount,
      cogs = EXCLUDED.cogs,
      last_order_at = EXCLUDED.last_order_at,
      is_repeat = EXCLUDED.is_repeat,
      inter_purchase_days = EXCLUDED.inter_purchase_days;
  END LOOP;
END;
$$;