-- Drop view first to avoid column type mismatch error, then recreate
DROP VIEW IF EXISTS public.v_cdp_customer_audit;

-- 1. Recreate v_cdp_customer_audit with FALLBACK from cdp_orders when rolling metrics not available
CREATE VIEW public.v_cdp_customer_audit
WITH (security_invoker=on)
AS
WITH order_stats AS (
  SELECT
    customer_id,
    COUNT(*)::int AS orders_count,
    SUM(COALESCE(net_revenue,0))::numeric AS net_revenue,
    AVG(COALESCE(net_revenue,0))::numeric AS aov,
    SUM(COALESCE(gross_margin,0))::numeric AS gross_margin
  FROM public.cdp_orders
  GROUP BY customer_id
)
SELECT
  c.id,
  c.tenant_id,
  (('CDP-KH-' || to_char(c.created_at, 'YYYY')) || '-') || lpad(row_number() OVER (PARTITION BY c.tenant_id ORDER BY c.id)::text, 5, '0') AS internal_id,
  -- Identity fields from cdp_customer_identities (or fallback nulls)
  (
    SELECT (substring(ci.id_value, 1, 3) || '***' || substring(ci.id_value, length(ci.id_value) - 2, 3))
    FROM public.cdp_customer_identities ci
    WHERE ci.customer_id = c.id AND ci.id_type = 'phone'
    LIMIT 1
  ) AS anonymized_phone,
  (
    SELECT (
      (substring(ci.id_value, 1, 1) || '***' || substring(ci.id_value, POSITION('@' IN ci.id_value) - 1, 1))
      || '@' || split_part(ci.id_value, '@', 2)
    )
    FROM public.cdp_customer_identities ci
    WHERE ci.customer_id = c.id AND ci.id_type = 'email'
    LIMIT 1
  ) AS anonymized_email,
  -- Merge confidence fallback
  COALESCE((
    SELECT avg(ci.confidence)
    FROM public.cdp_customer_identities ci
    WHERE ci.customer_id = c.id
  ), 85)::integer AS merge_confidence,
  -- Source count with fallback to 1 (keep as bigint to avoid type mismatch)
  GREATEST(1::bigint, (
    SELECT count(DISTINCT ci.source_system)
    FROM public.cdp_customer_identities ci
    WHERE ci.customer_id = c.id
  )) AS source_count,
  'verified'::text AS merge_status,
  -- FALLBACK: Use rolling metrics if available, else use aggregated cdp_orders
  COALESCE(m.net_revenue, os.net_revenue, 0::numeric) AS total_spend,
  COALESCE(m.orders_count, os.orders_count, 0) AS order_count,
  COALESCE(m.aov, os.aov, 0::numeric) AS aov,
  EXTRACT(day FROM now() - c.last_order_at)::integer AS days_since_last_purchase,
  -- RFM scores based on available data
  CASE
    WHEN EXTRACT(day FROM now() - c.last_order_at) <= 30 THEN 5
    WHEN EXTRACT(day FROM now() - c.last_order_at) <= 60 THEN 4
    WHEN EXTRACT(day FROM now() - c.last_order_at) <= 90 THEN 3
    WHEN EXTRACT(day FROM now() - c.last_order_at) <= 180 THEN 2
    ELSE 1
  END AS rfm_r,
  CASE
    WHEN COALESCE(m.orders_count, os.orders_count, 0) >= 10 THEN 5
    WHEN COALESCE(m.orders_count, os.orders_count, 0) >= 6 THEN 4
    WHEN COALESCE(m.orders_count, os.orders_count, 0) >= 3 THEN 3
    WHEN COALESCE(m.orders_count, os.orders_count, 0) >= 2 THEN 2
    ELSE 1
  END AS rfm_f,
  CASE
    WHEN COALESCE(m.net_revenue, os.net_revenue, 0::numeric) >= 50000000 THEN 5
    WHEN COALESCE(m.net_revenue, os.net_revenue, 0::numeric) >= 20000000 THEN 4
    WHEN COALESCE(m.net_revenue, os.net_revenue, 0::numeric) >= 10000000 THEN 3
    WHEN COALESCE(m.net_revenue, os.net_revenue, 0::numeric) >= 5000000 THEN 2
    ELSE 1
  END AS rfm_m,
  COALESCE(m.net_revenue, os.net_revenue, 0::numeric) AS clv,
  c.created_at
FROM public.cdp_customers c
LEFT JOIN order_stats os ON os.customer_id = c.id
LEFT JOIN LATERAL (
  SELECT
    cmr.orders_count,
    cmr.net_revenue,
    cmr.aov
  FROM public.cdp_customer_metrics_rolling cmr
  WHERE cmr.customer_id = c.id AND cmr.window_days = 365
  ORDER BY cmr.as_of_date DESC
  LIMIT 1
) m ON true
WHERE c.status = 'ACTIVE';

GRANT SELECT ON public.v_cdp_customer_audit TO authenticated;

-- 2. Create helper function to populate cdp_customer_identities from cdp_orders buyer info
CREATE OR REPLACE FUNCTION public.cdp_populate_customer_identities(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert phone identities from orders (if buyer_phone exists)
  INSERT INTO public.cdp_customer_identities (tenant_id, customer_id, id_type, id_value, source_system, confidence)
  SELECT DISTINCT
    o.tenant_id,
    o.customer_id,
    'phone',
    o.buyer_phone,
    COALESCE(o.channel, 'unknown'),
    0.9
  FROM public.cdp_orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.buyer_phone IS NOT NULL
    AND o.buyer_phone != ''
    AND o.customer_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Insert email identities from orders (if buyer_email exists)
  INSERT INTO public.cdp_customer_identities (tenant_id, customer_id, id_type, id_value, source_system, confidence)
  SELECT DISTINCT
    o.tenant_id,
    o.customer_id,
    'email',
    o.buyer_email,
    COALESCE(o.channel, 'unknown'),
    0.9
  FROM public.cdp_orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.buyer_email IS NOT NULL
    AND o.buyer_email != ''
    AND o.customer_id IS NOT NULL
  ON CONFLICT DO NOTHING;
END;
$$;

-- 3. Create helper function to populate rolling metrics from cdp_orders
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
      last_order_at, is_repeat
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
      MAX(o.order_date),
      COUNT(o.id) > 1
    FROM public.cdp_customers c
    LEFT JOIN public.cdp_orders o ON o.customer_id = c.id
      AND o.order_date >= p_as_of_date - (v_window || ' days')::interval
      AND o.order_date <= p_as_of_date
    WHERE c.tenant_id = p_tenant_id
      AND c.status = 'ACTIVE'
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
      is_repeat = EXCLUDED.is_repeat;
  END LOOP;
END;
$$;