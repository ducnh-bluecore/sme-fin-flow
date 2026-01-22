
-- =====================================================
-- CDP Pipeline Functions - Refined v2
-- Drop old functions first (return type changed)
-- =====================================================

DROP FUNCTION IF EXISTS cdp_build_customer_metrics_daily(uuid, date);
DROP FUNCTION IF EXISTS cdp_build_customer_metrics_rolling(uuid, date);
DROP FUNCTION IF EXISTS cdp_run_daily_build(uuid, date);
DROP FUNCTION IF EXISTS cdp_build_tier_membership(uuid, date);

-- 1) Build daily metrics (returns void)
CREATE OR REPLACE FUNCTION cdp_build_customer_metrics_daily(
  p_tenant_id uuid,
  p_as_of_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH orders_day AS (
    SELECT
      o.tenant_id,
      o.order_at::date AS as_of_date,
      o.customer_id,
      COUNT(*)::int AS orders_count,
      SUM(o.gross_revenue)::numeric AS gross_revenue,
      SUM(o.net_revenue)::numeric AS net_revenue,
      SUM(o.discount_amount)::numeric AS discount_amount,
      SUM(o.cogs)::numeric AS cogs,
      SUM(o.gross_margin)::numeric AS gross_margin,
      SUM(CASE WHEN o.is_discounted THEN 1 ELSE 0 END)::int AS is_discounted_orders_count,
      SUM(CASE WHEN o.is_bundle THEN 1 ELSE 0 END)::int AS bundle_orders_count,
      SUM(CASE WHEN o.payment_method = 'COD' THEN 1 ELSE 0 END)::int AS cod_orders_count,
      0::int AS orders_total_qty
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NOT NULL
      AND o.order_at::date = p_as_of_date
    GROUP BY 1,2,3
  ),
  refunds_day AS (
    SELECT
      r.tenant_id,
      r.refund_at::date AS as_of_date,
      r.customer_id,
      SUM(r.refund_amount)::numeric AS refund_amount
    FROM cdp_refunds r
    WHERE r.tenant_id = p_tenant_id
      AND r.customer_id IS NOT NULL
      AND r.refund_at::date = p_as_of_date
    GROUP BY 1,2,3
  ),
  merged AS (
    SELECT
      o.tenant_id, o.as_of_date, o.customer_id,
      o.orders_count, o.gross_revenue, o.net_revenue, o.discount_amount,
      COALESCE(r.refund_amount, 0)::numeric AS refund_amount,
      o.cogs, o.gross_margin,
      o.is_discounted_orders_count, o.bundle_orders_count, o.cod_orders_count,
      o.orders_total_qty
    FROM orders_day o
    LEFT JOIN refunds_day r ON r.tenant_id = o.tenant_id
      AND r.as_of_date = o.as_of_date AND r.customer_id = o.customer_id
  )
  INSERT INTO cdp_customer_metrics_daily (
    tenant_id, as_of_date, customer_id,
    orders_count, gross_revenue, net_revenue, discount_amount, refund_amount,
    cogs, gross_margin, is_discounted_orders_count, bundle_orders_count, 
    cod_orders_count, orders_total_qty
  )
  SELECT * FROM merged
  ON CONFLICT (tenant_id, as_of_date, customer_id) DO UPDATE SET
    orders_count = EXCLUDED.orders_count, gross_revenue = EXCLUDED.gross_revenue,
    net_revenue = EXCLUDED.net_revenue, discount_amount = EXCLUDED.discount_amount,
    refund_amount = EXCLUDED.refund_amount, cogs = EXCLUDED.cogs,
    gross_margin = EXCLUDED.gross_margin,
    is_discounted_orders_count = EXCLUDED.is_discounted_orders_count,
    bundle_orders_count = EXCLUDED.bundle_orders_count,
    cod_orders_count = EXCLUDED.cod_orders_count,
    orders_total_qty = EXCLUDED.orders_total_qty;
END;
$$;

-- 2) Build rolling metrics with fixed last2 CTE
CREATE OR REPLACE FUNCTION cdp_build_customer_metrics_rolling(
  p_tenant_id uuid,
  p_as_of_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH win AS (SELECT unnest(ARRAY[30,60,90,365])::int AS window_days),
  range_days AS (
    SELECT p_tenant_id AS tenant_id, p_as_of_date AS as_of_date, w.window_days,
      (p_as_of_date - (w.window_days || ' days')::interval)::date AS start_date
    FROM win w
  ),
  daily AS (
    SELECT * FROM cdp_customer_metrics_daily d
    WHERE d.tenant_id = p_tenant_id
      AND d.as_of_date BETWEEN (p_as_of_date - interval '365 days')::date AND p_as_of_date
  ),
  agg AS (
    SELECT rd.tenant_id, rd.as_of_date, d.customer_id, rd.window_days,
      SUM(d.orders_count)::int AS orders_count,
      SUM(d.net_revenue)::numeric AS net_revenue,
      SUM(d.gross_revenue)::numeric AS gross_revenue,
      SUM(d.gross_margin)::numeric AS gross_margin,
      SUM(d.refund_amount)::numeric AS refund_amount,
      SUM(d.discount_amount)::numeric AS discount_amount,
      SUM(d.cogs)::numeric AS cogs,
      SUM(d.is_discounted_orders_count)::int AS discounted_orders_count,
      SUM(d.bundle_orders_count)::int AS bundle_orders_count,
      SUM(d.cod_orders_count)::int AS cod_orders_count,
      SUM(d.orders_total_qty)::int AS total_qty
    FROM range_days rd
    JOIN daily d ON d.tenant_id = rd.tenant_id
      AND d.as_of_date > rd.start_date AND d.as_of_date <= rd.as_of_date
    GROUP BY 1,2,3,4
  ),
  ratios AS (
    SELECT a.*,
      (a.net_revenue / NULLIF(a.orders_count, 0))::numeric AS aov,
      (a.refund_amount / NULLIF(a.net_revenue + a.refund_amount, 0))::numeric AS return_rate,
      (a.discount_amount / NULLIF(a.gross_revenue, 0))::numeric AS discount_share,
      (a.discounted_orders_count::numeric / NULLIF(a.orders_count, 0))::numeric AS discounted_order_share,
      (a.bundle_orders_count::numeric / NULLIF(a.orders_count, 0))::numeric AS bundle_order_share,
      (a.cod_orders_count::numeric / NULLIF(a.orders_count, 0))::numeric AS cod_order_share
    FROM agg a
  ),
  orders_in_window AS (
    SELECT o.tenant_id, p_as_of_date AS as_of_date, o.customer_id, w.window_days, o.order_at
    FROM cdp_orders o
    CROSS JOIN (SELECT unnest(ARRAY[30,60,90,365])::int AS window_days) w
    WHERE o.tenant_id = p_tenant_id AND o.customer_id IS NOT NULL
      AND o.order_at::date > (p_as_of_date - (w.window_days || ' days')::interval)::date
      AND o.order_at::date <= p_as_of_date
  ),
  ranked AS (
    SELECT tenant_id, as_of_date, customer_id, window_days, order_at,
      ROW_NUMBER() OVER (PARTITION BY tenant_id, as_of_date, customer_id, window_days ORDER BY order_at DESC) AS rn
    FROM orders_in_window
  ),
  last2 AS (
    SELECT tenant_id, as_of_date, customer_id, window_days,
      MAX(order_at) FILTER (WHERE rn = 1) AS last_order_at,
      MAX(order_at) FILTER (WHERE rn = 2) AS prev_order_at
    FROM ranked GROUP BY 1,2,3,4
  ),
  order_counts AS (
    SELECT tenant_id, customer_id, window_days, COUNT(*) AS total_orders
    FROM orders_in_window GROUP BY 1,2,3
  ),
  final AS (
    SELECT r.tenant_id, r.as_of_date, r.customer_id, r.window_days,
      r.orders_count, r.net_revenue, r.gross_revenue, r.gross_margin, r.aov,
      r.refund_amount, r.return_rate, r.discount_amount, r.discount_share,
      r.discounted_order_share, r.bundle_order_share, r.cod_order_share,
      r.cogs, r.total_qty, r.net_revenue AS total_item_revenue,
      COALESCE(oc.total_orders, 0) > 1 AS is_repeat,
      l.last_order_at, l.prev_order_at,
      CASE WHEN l.last_order_at IS NOT NULL AND l.prev_order_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (l.last_order_at - l.prev_order_at)) / 86400.0 ELSE NULL END AS inter_purchase_days
    FROM ratios r
    LEFT JOIN last2 l ON l.tenant_id = r.tenant_id AND l.as_of_date = r.as_of_date
      AND l.customer_id = r.customer_id AND l.window_days = r.window_days
    LEFT JOIN order_counts oc ON oc.tenant_id = r.tenant_id 
      AND oc.customer_id = r.customer_id AND oc.window_days = r.window_days
  )
  INSERT INTO cdp_customer_metrics_rolling (
    tenant_id, as_of_date, customer_id, window_days,
    orders_count, net_revenue, gross_revenue, gross_margin, aov,
    refund_amount, return_rate, discount_amount, discount_share,
    discounted_order_share, bundle_order_share, cod_order_share,
    cogs, total_qty, total_item_revenue, is_repeat,
    last_order_at, prev_order_at, inter_purchase_days
  )
  SELECT * FROM final
  ON CONFLICT (tenant_id, as_of_date, customer_id, window_days) DO UPDATE SET
    orders_count = EXCLUDED.orders_count, net_revenue = EXCLUDED.net_revenue,
    gross_revenue = EXCLUDED.gross_revenue, gross_margin = EXCLUDED.gross_margin,
    aov = EXCLUDED.aov, refund_amount = EXCLUDED.refund_amount,
    return_rate = EXCLUDED.return_rate, discount_amount = EXCLUDED.discount_amount,
    discount_share = EXCLUDED.discount_share,
    discounted_order_share = EXCLUDED.discounted_order_share,
    bundle_order_share = EXCLUDED.bundle_order_share,
    cod_order_share = EXCLUDED.cod_order_share, cogs = EXCLUDED.cogs,
    total_qty = EXCLUDED.total_qty, total_item_revenue = EXCLUDED.total_item_revenue,
    is_repeat = EXCLUDED.is_repeat, last_order_at = EXCLUDED.last_order_at,
    prev_order_at = EXCLUDED.prev_order_at, inter_purchase_days = EXCLUDED.inter_purchase_days;
END;
$$;

-- 3) Build value tiers
CREATE OR REPLACE FUNCTION cdp_build_value_tiers(p_tenant_id uuid, p_as_of_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM cdp_value_tier_membership_daily
  WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;

  WITH src AS (
    SELECT tenant_id, as_of_date, customer_id, net_revenue::numeric AS metric_value
    FROM cdp_customer_metrics_rolling
    WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND window_days = 365
  ),
  ranked AS (
    SELECT *, percent_rank() OVER (PARTITION BY tenant_id, as_of_date ORDER BY metric_value DESC) AS pr
    FROM src
  ),
  assigned AS (
    SELECT tenant_id, as_of_date, customer_id, metric_value,
      CASE WHEN pr <= 0.10 THEN 'TOP10' WHEN pr <= 0.20 THEN 'TOP20'
           WHEN pr <= 0.30 THEN 'TOP30' ELSE 'REST' END AS tier_label
    FROM ranked
  )
  INSERT INTO cdp_value_tier_membership_daily (tenant_id, as_of_date, tier_label, customer_id, is_member, metric_name, metric_value)
  SELECT tenant_id, as_of_date, tier_label, customer_id, true, 'net_revenue_365', metric_value FROM assigned;
END;
$$;

-- 4) Refresh MVs
CREATE OR REPLACE FUNCTION cdp_refresh_mvs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_cdp_segment_metrics_rolling;
  REFRESH MATERIALIZED VIEW mv_cdp_cohort_metrics_rolling;
  REFRESH MATERIALIZED VIEW mv_cdp_value_tier_metrics_rolling;
  REFRESH MATERIALIZED VIEW mv_cdp_data_quality_daily;
END;
$$;

-- 5) Orchestrator: run daily for one tenant
CREATE OR REPLACE FUNCTION cdp_run_daily(p_tenant_id uuid, p_as_of_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM cdp_build_customer_metrics_daily(p_tenant_id, p_as_of_date);
  PERFORM cdp_build_customer_metrics_rolling(p_tenant_id, p_as_of_date);
  PERFORM cdp_build_value_tiers(p_tenant_id, p_as_of_date);
  PERFORM cdp_refresh_mvs();
END;
$$;

-- 6) Run daily for all active tenants
CREATE OR REPLACE FUNCTION cdp_run_daily_all(p_as_of_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  FOR t IN SELECT id AS tenant_id FROM tenants WHERE is_active = true LOOP
    PERFORM cdp_run_daily(t.tenant_id, p_as_of_date);
  END LOOP;
END;
$$;
