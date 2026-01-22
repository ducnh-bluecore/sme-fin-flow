
-- =====================================================
-- CDP Incremental Build Schema Fixes
-- =====================================================

-- 1) Extend window_days constraint to include 365
ALTER TABLE cdp_customer_metrics_rolling
  DROP CONSTRAINT IF EXISTS cdp_customer_metrics_rolling_window_days_check;

ALTER TABLE cdp_customer_metrics_rolling
  ADD CONSTRAINT cdp_customer_metrics_rolling_window_days_check
  CHECK (window_days = ANY (ARRAY[30, 60, 90, 365]));

-- 2) Add missing columns to rolling table for full aggregation support
ALTER TABLE cdp_customer_metrics_rolling
  ADD COLUMN IF NOT EXISTS gross_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cogs numeric NOT NULL DEFAULT 0;

-- 3) Create optimized function for daily metrics upsert
CREATE OR REPLACE FUNCTION cdp_build_customer_metrics_daily(
  p_tenant_id uuid,
  p_as_of_date date
)
RETURNS int
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count int;
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
      o.tenant_id,
      o.as_of_date,
      o.customer_id,
      o.orders_count,
      o.gross_revenue,
      o.net_revenue,
      o.discount_amount,
      COALESCE(r.refund_amount, 0)::numeric AS refund_amount,
      o.cogs,
      o.gross_margin,
      o.is_discounted_orders_count,
      o.bundle_orders_count,
      o.cod_orders_count,
      o.orders_total_qty
    FROM orders_day o
    LEFT JOIN refunds_day r
      ON r.tenant_id = o.tenant_id
     AND r.as_of_date = o.as_of_date
     AND r.customer_id = o.customer_id
  ),
  upserted AS (
    INSERT INTO cdp_customer_metrics_daily (
      tenant_id, as_of_date, customer_id,
      orders_count, gross_revenue, net_revenue, discount_amount, refund_amount,
      cogs, gross_margin,
      is_discounted_orders_count, bundle_orders_count, cod_orders_count,
      orders_total_qty
    )
    SELECT * FROM merged
    ON CONFLICT (tenant_id, as_of_date, customer_id)
    DO UPDATE SET
      orders_count = EXCLUDED.orders_count,
      gross_revenue = EXCLUDED.gross_revenue,
      net_revenue = EXCLUDED.net_revenue,
      discount_amount = EXCLUDED.discount_amount,
      refund_amount = EXCLUDED.refund_amount,
      cogs = EXCLUDED.cogs,
      gross_margin = EXCLUDED.gross_margin,
      is_discounted_orders_count = EXCLUDED.is_discounted_orders_count,
      bundle_orders_count = EXCLUDED.bundle_orders_count,
      cod_orders_count = EXCLUDED.cod_orders_count,
      orders_total_qty = EXCLUDED.orders_total_qty
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM upserted;
  
  RETURN v_count;
END;
$$;

-- 4) Create optimized function for rolling metrics upsert (with fixed last2 logic)
CREATE OR REPLACE FUNCTION cdp_build_customer_metrics_rolling(
  p_tenant_id uuid,
  p_as_of_date date
)
RETURNS int
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  WITH win AS (
    SELECT unnest(ARRAY[30, 60, 90, 365])::int AS window_days
  ),
  range_days AS (
    SELECT
      p_tenant_id AS tenant_id,
      p_as_of_date AS as_of_date,
      w.window_days,
      (p_as_of_date - (w.window_days || ' days')::interval)::date AS start_date
    FROM win w
  ),
  daily AS (
    SELECT *
    FROM cdp_customer_metrics_daily d
    WHERE d.tenant_id = p_tenant_id
      AND d.as_of_date > (p_as_of_date - interval '365 days')::date
      AND d.as_of_date <= p_as_of_date
  ),
  agg AS (
    SELECT
      rd.tenant_id,
      rd.as_of_date,
      d.customer_id,
      rd.window_days,
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
    JOIN daily d
      ON d.tenant_id = rd.tenant_id
     AND d.as_of_date > rd.start_date
     AND d.as_of_date <= rd.as_of_date
    GROUP BY 1,2,3,4
  ),
  -- Fixed: proper ROW_NUMBER approach for last 2 orders
  orders_ranked AS (
    SELECT
      o.tenant_id,
      o.customer_id,
      w.window_days,
      o.order_at,
      ROW_NUMBER() OVER (
        PARTITION BY o.tenant_id, o.customer_id, w.window_days
        ORDER BY o.order_at DESC
      ) AS rn
    FROM cdp_orders o
    CROSS JOIN win w
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NOT NULL
      AND o.order_at::date > (p_as_of_date - (w.window_days || ' days')::interval)::date
      AND o.order_at::date <= p_as_of_date
  ),
  last2 AS (
    SELECT
      tenant_id,
      customer_id,
      window_days,
      MAX(CASE WHEN rn = 1 THEN order_at END) AS last_order_at,
      MAX(CASE WHEN rn = 2 THEN order_at END) AS prev_order_at
    FROM orders_ranked
    WHERE rn <= 2
    GROUP BY 1,2,3
  ),
  -- Count total orders for is_repeat flag
  order_counts AS (
    SELECT
      o.tenant_id,
      o.customer_id,
      w.window_days,
      COUNT(*) AS total_orders
    FROM cdp_orders o
    CROSS JOIN win w
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NOT NULL
      AND o.order_at::date > (p_as_of_date - (w.window_days || ' days')::interval)::date
      AND o.order_at::date <= p_as_of_date
    GROUP BY 1,2,3
  ),
  final AS (
    SELECT
      a.tenant_id,
      a.as_of_date,
      a.customer_id,
      a.window_days,
      a.orders_count,
      a.net_revenue,
      a.gross_revenue,
      a.gross_margin,
      (a.net_revenue / NULLIF(a.orders_count, 0))::numeric AS aov,
      a.refund_amount,
      (a.refund_amount / NULLIF(a.net_revenue + a.refund_amount, 0))::numeric AS return_rate,
      a.discount_amount,
      (a.discount_amount / NULLIF(a.gross_revenue, 0))::numeric AS discount_share,
      (a.discounted_orders_count::numeric / NULLIF(a.orders_count, 0))::numeric AS discounted_order_share,
      (a.bundle_orders_count::numeric / NULLIF(a.orders_count, 0))::numeric AS bundle_order_share,
      (a.cod_orders_count::numeric / NULLIF(a.orders_count, 0))::numeric AS cod_order_share,
      a.cogs,
      a.total_qty,
      a.net_revenue AS total_item_revenue,
      COALESCE(oc.total_orders, 0) > 1 AS is_repeat,
      l.last_order_at,
      l.prev_order_at,
      CASE
        WHEN l.last_order_at IS NOT NULL AND l.prev_order_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (l.last_order_at - l.prev_order_at)) / 86400.0
        ELSE NULL
      END AS inter_purchase_days
    FROM agg a
    LEFT JOIN last2 l
      ON l.tenant_id = a.tenant_id
     AND l.customer_id = a.customer_id
     AND l.window_days = a.window_days
    LEFT JOIN order_counts oc
      ON oc.tenant_id = a.tenant_id
     AND oc.customer_id = a.customer_id
     AND oc.window_days = a.window_days
  ),
  upserted AS (
    INSERT INTO cdp_customer_metrics_rolling (
      tenant_id, as_of_date, customer_id, window_days,
      orders_count, net_revenue, gross_revenue, gross_margin, aov,
      refund_amount, return_rate, discount_amount, discount_share,
      discounted_order_share, bundle_order_share, cod_order_share,
      cogs, total_qty, total_item_revenue, is_repeat,
      last_order_at, prev_order_at, inter_purchase_days
    )
    SELECT
      tenant_id, as_of_date, customer_id, window_days,
      orders_count, net_revenue, gross_revenue, gross_margin, aov,
      refund_amount, return_rate, discount_amount, discount_share,
      discounted_order_share, bundle_order_share, cod_order_share,
      cogs, total_qty, total_item_revenue, is_repeat,
      last_order_at, prev_order_at, inter_purchase_days
    FROM final
    ON CONFLICT (tenant_id, as_of_date, customer_id, window_days)
    DO UPDATE SET
      orders_count = EXCLUDED.orders_count,
      net_revenue = EXCLUDED.net_revenue,
      gross_revenue = EXCLUDED.gross_revenue,
      gross_margin = EXCLUDED.gross_margin,
      aov = EXCLUDED.aov,
      refund_amount = EXCLUDED.refund_amount,
      return_rate = EXCLUDED.return_rate,
      discount_amount = EXCLUDED.discount_amount,
      discount_share = EXCLUDED.discount_share,
      discounted_order_share = EXCLUDED.discounted_order_share,
      bundle_order_share = EXCLUDED.bundle_order_share,
      cod_order_share = EXCLUDED.cod_order_share,
      cogs = EXCLUDED.cogs,
      total_qty = EXCLUDED.total_qty,
      total_item_revenue = EXCLUDED.total_item_revenue,
      is_repeat = EXCLUDED.is_repeat,
      last_order_at = EXCLUDED.last_order_at,
      prev_order_at = EXCLUDED.prev_order_at,
      inter_purchase_days = EXCLUDED.inter_purchase_days
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM upserted;
  
  RETURN v_count;
END;
$$;

-- 5) Master function to run daily CDP build pipeline
CREATE OR REPLACE FUNCTION cdp_run_daily_build(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE - 1
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_daily_count int;
  v_rolling_count int;
  v_start_ts timestamptz;
  v_daily_ts timestamptz;
  v_rolling_ts timestamptz;
BEGIN
  v_start_ts := clock_timestamp();
  
  -- Step 1: Build daily metrics
  v_daily_count := cdp_build_customer_metrics_daily(p_tenant_id, p_as_of_date);
  v_daily_ts := clock_timestamp();
  
  -- Step 2: Build rolling metrics
  v_rolling_count := cdp_build_customer_metrics_rolling(p_tenant_id, p_as_of_date);
  v_rolling_ts := clock_timestamp();
  
  -- Step 3: Refresh MVs concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_segment_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_cohort_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_value_tier_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_data_quality_daily;
  
  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'as_of_date', p_as_of_date,
    'daily_customers', v_daily_count,
    'rolling_customers', v_rolling_count,
    'daily_duration_ms', EXTRACT(EPOCH FROM (v_daily_ts - v_start_ts)) * 1000,
    'rolling_duration_ms', EXTRACT(EPOCH FROM (v_rolling_ts - v_daily_ts)) * 1000,
    'total_duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_ts)) * 1000,
    'completed_at', clock_timestamp()
  );
END;
$$;

-- 6) Add helpful index for orders lookup by date range
CREATE INDEX IF NOT EXISTS idx_cdp_orders_tenant_customer_date
ON cdp_orders (tenant_id, customer_id, order_at DESC)
WHERE customer_id IS NOT NULL;
