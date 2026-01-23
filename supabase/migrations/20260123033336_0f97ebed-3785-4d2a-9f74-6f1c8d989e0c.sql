-- Fix v_cdp_customer_audit to match cdp_customers.status check constraint (uses 'ACTIVE')
-- The previous view filtered on 'active' (lowercase) which returns 0 rows.

CREATE OR REPLACE VIEW public.v_cdp_customer_audit
WITH (security_invoker=on)
AS
SELECT
  c.id,
  c.tenant_id,
  (('CDP-KH-' || to_char(c.created_at, 'YYYY')) || '-') || lpad(row_number() OVER (PARTITION BY c.tenant_id ORDER BY c.id)::text, 5, '0') AS internal_id,
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
  COALESCE((
    SELECT avg(ci.confidence)
    FROM public.cdp_customer_identities ci
    WHERE ci.customer_id = c.id
  ), 85)::integer AS merge_confidence,
  (
    SELECT count(DISTINCT ci.source_system)
    FROM public.cdp_customer_identities ci
    WHERE ci.customer_id = c.id
  ) AS source_count,
  'verified'::text AS merge_status,
  COALESCE(m.net_revenue, 0::numeric) AS total_spend,
  COALESCE(m.orders_count, 0) AS order_count,
  COALESCE(m.aov, 0::numeric) AS aov,
  EXTRACT(day FROM now() - c.last_order_at)::integer AS days_since_last_purchase,
  CASE
    WHEN EXTRACT(day FROM now() - c.last_order_at) <= 30 THEN 5
    WHEN EXTRACT(day FROM now() - c.last_order_at) <= 60 THEN 4
    WHEN EXTRACT(day FROM now() - c.last_order_at) <= 90 THEN 3
    WHEN EXTRACT(day FROM now() - c.last_order_at) <= 180 THEN 2
    ELSE 1
  END AS rfm_r,
  CASE
    WHEN COALESCE(m.orders_count, 0) >= 10 THEN 5
    WHEN COALESCE(m.orders_count, 0) >= 6 THEN 4
    WHEN COALESCE(m.orders_count, 0) >= 3 THEN 3
    WHEN COALESCE(m.orders_count, 0) >= 2 THEN 2
    ELSE 1
  END AS rfm_f,
  CASE
    WHEN COALESCE(m.net_revenue, 0::numeric) >= 50000000 THEN 5
    WHEN COALESCE(m.net_revenue, 0::numeric) >= 20000000 THEN 4
    WHEN COALESCE(m.net_revenue, 0::numeric) >= 10000000 THEN 3
    WHEN COALESCE(m.net_revenue, 0::numeric) >= 5000000 THEN 2
    ELSE 1
  END AS rfm_m,
  COALESCE(m.net_revenue, 0::numeric) AS clv,
  c.created_at
FROM public.cdp_customers c
LEFT JOIN LATERAL (
  SELECT
    cmr.tenant_id,
    cmr.as_of_date,
    cmr.customer_id,
    cmr.window_days,
    cmr.orders_count,
    cmr.net_revenue,
    cmr.gross_margin,
    cmr.aov,
    cmr.refund_amount,
    cmr.return_rate,
    cmr.discount_share,
    cmr.discounted_order_share,
    cmr.bundle_order_share,
    cmr.cod_order_share,
    cmr.last_order_at,
    cmr.prev_order_at,
    cmr.inter_purchase_days,
    cmr.total_qty,
    cmr.total_item_revenue,
    cmr.is_repeat,
    cmr.gross_revenue,
    cmr.discount_amount,
    cmr.cogs
  FROM public.cdp_customer_metrics_rolling cmr
  WHERE cmr.customer_id = c.id AND cmr.window_days = 365
  ORDER BY cmr.as_of_date DESC
  LIMIT 1
) m ON true
WHERE c.status = 'ACTIVE';

-- Keep RLS behavior aligned with underlying tables
GRANT SELECT ON public.v_cdp_customer_audit TO authenticated;