
-- ============================================================
-- Fix CDP Engine Schema Isolation
-- Make all CDP build functions tenant-schema-aware
-- ============================================================

-- Helper: Set search_path for a tenant (lightweight)
CREATE OR REPLACE FUNCTION public.set_tenant_search_path(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schema text;
  v_provisioned boolean;
BEGIN
  SELECT 'tenant_' || slug, COALESCE(schema_provisioned, false)
  INTO v_schema, v_provisioned
  FROM public.tenants WHERE id = p_tenant_id AND is_active = true;

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Tenant not found or inactive: %', p_tenant_id;
  END IF;

  IF v_provisioned AND EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema
  ) THEN
    EXECUTE format('SET LOCAL search_path TO %I, public', v_schema);
    RETURN v_schema;
  ELSE
    EXECUTE 'SET LOCAL search_path TO public';
    RETURN 'public';
  END IF;
END;
$$;

-- ============================================================
-- 1. link_orders_batch - schema-aware
-- ============================================================
CREATE OR REPLACE FUNCTION public.link_orders_batch(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_linked integer := 0;
  v_pass integer := 0;
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);

  WITH batch AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.external_ids @> jsonb_build_array(
        jsonb_build_object('id', o.buyer_id::bigint, 'source', 'kiotviet')
      )
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.buyer_id IS NOT NULL 
      AND o.buyer_id != ''
      AND o.channel = 'kiotviet'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  WITH batch AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.canonical_key = regexp_replace(o.customer_phone, '[^0-9]', '', 'g')
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_phone IS NOT NULL
      AND o.customer_phone !~ '\*'
      AND length(regexp_replace(o.customer_phone, '[^0-9]', '', 'g')) >= 9
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  WITH unique_names AS (
    SELECT name, (array_agg(id ORDER BY created_at))[1] as customer_id
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND name IS NOT NULL AND trim(name) != '' AND name !~ '\*'
    GROUP BY name HAVING COUNT(*) = 1
  ),
  batch AS (
    SELECT o.id as order_id, un.customer_id
    FROM cdp_orders o
    JOIN unique_names un ON trim(o.customer_name) = un.name
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_name IS NOT NULL
      AND o.customer_name !~ '\*'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  RETURN v_linked;
END;
$function$;

-- ============================================================
-- 2. cdp_build_customer_metrics_daily - schema-aware
-- ============================================================
CREATE OR REPLACE FUNCTION public.cdp_build_customer_metrics_daily(p_tenant_id uuid, p_as_of_date date DEFAULT (CURRENT_DATE - '1 day'::interval))
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);

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
  ),
  inserted AS (
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
      orders_total_qty = EXCLUDED.orders_total_qty
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;
  
  RETURN COALESCE(v_count, 0);
END;
$function$;

-- ============================================================
-- 3. cdp_build_customer_metrics_rolling - schema-aware
-- ============================================================
CREATE OR REPLACE FUNCTION public.cdp_build_customer_metrics_rolling(p_tenant_id uuid, p_as_of_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);

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
    inter_purchase_days = EXCLUDED.inter_purchase_days;
END;
$function$;

-- ============================================================
-- 4. cdp_build_customer_equity_batched - schema-aware
-- ============================================================
CREATE OR REPLACE FUNCTION public.cdp_build_customer_equity_batched(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_tenant_margin_rate NUMERIC;
  v_processed INTEGER := 0;
  v_total_equity_12m NUMERIC := 0;
  v_total_equity_24m NUMERIC := 0;
  v_batch_start TIMESTAMP := clock_timestamp();
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);

  SELECT CASE WHEN SUM(net_revenue) > 0 
    THEN SUM(net_revenue - COALESCE(cogs, 0)) / SUM(net_revenue) ELSE 0.15 END
  INTO v_tenant_margin_rate
  FROM cdp_orders WHERE tenant_id = p_tenant_id AND cogs IS NOT NULL AND cogs > 0 AND net_revenue > 0;
  IF v_tenant_margin_rate IS NULL OR v_tenant_margin_rate <= 0 THEN v_tenant_margin_rate := 0.15; END IF;

  WITH customer_batch AS (
    SELECT id AS customer_id
    FROM cdp_customers 
    WHERE tenant_id = p_tenant_id
      AND id IN (SELECT DISTINCT customer_id FROM cdp_orders WHERE tenant_id = p_tenant_id AND customer_id IS NOT NULL AND net_revenue > 0)
      AND id NOT IN (SELECT customer_id FROM cdp_customer_equity_computed WHERE tenant_id = p_tenant_id AND as_of_date = CURRENT_DATE)
    ORDER BY id
    LIMIT p_batch_size
  ),
  order_stats AS (
    SELECT 
      o.customer_id,
      COUNT(*)::INT AS total_orders,
      COALESCE(SUM(net_revenue), 0) AS lifetime_revenue,
      COALESCE(AVG(net_revenue), 0) AS lifetime_aov,
      MIN(order_at) AS first_order_at,
      MAX(order_at) AS last_order_at,
      GREATEST(EXTRACT(EPOCH FROM (NOW() - MAX(order_at))) / 86400.0, 0) AS recency_days,
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '180 days')::INT AS orders_180d,
      COALESCE(SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '180 days'), 0) AS revenue_180d,
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '90 days')::INT AS orders_90d,
      COALESCE(SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '90 days'), 0) AS revenue_90d,
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '30 days')::INT AS orders_30d,
      COALESCE(SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '30 days'), 0) AS revenue_30d,
      BOOL_OR(cogs IS NOT NULL AND cogs > 0) AS has_cogs,
      CASE WHEN SUM(net_revenue) FILTER (WHERE cogs IS NOT NULL AND cogs > 0) > 0
        THEN SUM(net_revenue - cogs) FILTER (WHERE cogs IS NOT NULL AND cogs > 0) / SUM(net_revenue) FILTER (WHERE cogs IS NOT NULL AND cogs > 0)
        ELSE NULL END AS customer_margin_rate,
      GREATEST(EXTRACT(EPOCH FROM (MAX(order_at) - MIN(order_at))) / 86400.0, 0) AS data_span_days,
      CASE WHEN COUNT(*) > 1
        THEN EXTRACT(EPOCH FROM (MAX(order_at) - MIN(order_at))) / 86400.0 / (COUNT(*) - 1)
        ELSE NULL END AS avg_inter_purchase_days
    FROM cdp_orders o
    INNER JOIN customer_batch cb ON cb.customer_id = o.customer_id
    WHERE o.tenant_id = p_tenant_id AND o.net_revenue > 0
    GROUP BY o.customer_id
  ),
  computed AS (
    SELECT s.*,
      LEAST(GREATEST(
        CASE WHEN s.total_orders > 1 AND s.avg_inter_purchase_days > 0
          THEN EXP(-1.0 * s.recency_days / s.avg_inter_purchase_days)
          ELSE EXP(-1.0 * s.recency_days / 180.0) END, 0), 1) AS p_active,
      CASE WHEN s.has_cogs AND s.customer_margin_rate IS NOT NULL AND s.customer_margin_rate > 0
        THEN s.customer_margin_rate ELSE v_tenant_margin_rate END AS margin_rate,
      CASE WHEN s.has_cogs AND s.customer_margin_rate IS NOT NULL AND s.customer_margin_rate > 0
        THEN 'customer' ELSE 'tenant_avg' END AS margin_source,
      CASE 
        WHEN s.revenue_180d > 0 THEN (s.revenue_180d / 180.0) * 365.0
        WHEN s.lifetime_revenue > 0 AND s.data_span_days > 30 THEN (s.lifetime_revenue / GREATEST(s.data_span_days, 1)) * 365.0
        ELSE s.lifetime_aov END AS annual_run_rate
    FROM order_stats s
  ),
  final AS (
    SELECT c.*,
      c.annual_run_rate * c.p_active * c.margin_rate AS eq_12m,
      c.annual_run_rate * c.p_active * c.margin_rate * (1.0 + c.p_active) AS eq_24m,
      1.0 - c.p_active AS churn_risk,
      CASE WHEN (1.0 - c.p_active) < 0.3 THEN 'low' WHEN (1.0 - c.p_active) < 0.7 THEN 'medium' ELSE 'high' END AS risk_lvl,
      LEAST(0.30 + LEAST(c.total_orders * 0.025, 0.25) + GREATEST(0.25 - (c.recency_days / 30.0) * 0.025, 0)
        + CASE WHEN c.has_cogs THEN 0.20 ELSE 0 END, 1.0) AS confidence
    FROM computed c
  ),
  inserted AS (
    INSERT INTO cdp_customer_equity_computed (
      tenant_id, customer_id, as_of_date,
      total_orders, lifetime_revenue, lifetime_aov,
      first_order_at, last_order_at, recency_days,
      orders_180d, revenue_180d, orders_90d, revenue_90d,
      orders_30d, revenue_30d,
      margin_rate, margin_source, annual_run_rate,
      p_active, eq_12m, eq_24m, churn_risk, risk_level, confidence
    )
    SELECT
      p_tenant_id, f.customer_id, CURRENT_DATE,
      f.total_orders, f.lifetime_revenue, f.lifetime_aov,
      f.first_order_at, f.last_order_at, f.recency_days,
      f.orders_180d, f.revenue_180d, f.orders_90d, f.revenue_90d,
      f.orders_30d, f.revenue_30d,
      f.margin_rate, f.margin_source, f.annual_run_rate,
      f.p_active, f.eq_12m, f.eq_24m, f.churn_risk, f.risk_lvl, f.confidence
    FROM final f
    ON CONFLICT (tenant_id, customer_id, as_of_date) DO UPDATE SET
      total_orders = EXCLUDED.total_orders,
      lifetime_revenue = EXCLUDED.lifetime_revenue,
      lifetime_aov = EXCLUDED.lifetime_aov,
      first_order_at = EXCLUDED.first_order_at,
      last_order_at = EXCLUDED.last_order_at,
      recency_days = EXCLUDED.recency_days,
      orders_180d = EXCLUDED.orders_180d,
      revenue_180d = EXCLUDED.revenue_180d,
      orders_90d = EXCLUDED.orders_90d,
      revenue_90d = EXCLUDED.revenue_90d,
      orders_30d = EXCLUDED.orders_30d,
      revenue_30d = EXCLUDED.revenue_30d,
      margin_rate = EXCLUDED.margin_rate,
      margin_source = EXCLUDED.margin_source,
      annual_run_rate = EXCLUDED.annual_run_rate,
      p_active = EXCLUDED.p_active,
      eq_12m = EXCLUDED.eq_12m,
      eq_24m = EXCLUDED.eq_24m,
      churn_risk = EXCLUDED.churn_risk,
      risk_level = EXCLUDED.risk_level,
      confidence = EXCLUDED.confidence
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_processed FROM inserted;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'batch_size', p_batch_size,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_batch_start)::integer
  );
END;
$function$;

-- ============================================================
-- 5. cdp_run_daily_build - schema-aware orchestrator
-- ============================================================
CREATE OR REPLACE FUNCTION public.cdp_run_daily_build(p_tenant_id uuid, p_as_of_date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '300s'
AS $function$
DECLARE
  v_daily_count integer;
  v_equity_result jsonb;
  v_start_ts timestamptz;
  v_daily_ts timestamptz;
  v_rolling_ts timestamptz;
  v_equity_ts timestamptz;
  v_effective_date date;
  v_schema text;
BEGIN
  v_start_ts := clock_timestamp();
  v_effective_date := COALESCE(p_as_of_date, CURRENT_DATE - 1);

  -- Set search_path to tenant schema if provisioned
  v_schema := public.set_tenant_search_path(p_tenant_id);
  
  -- Step 1: Build daily metrics
  v_daily_count := public.cdp_build_customer_metrics_daily(p_tenant_id, v_effective_date);
  v_daily_ts := clock_timestamp();
  
  -- Step 2: Build rolling metrics
  PERFORM public.cdp_build_customer_metrics_rolling(p_tenant_id, v_effective_date);
  v_rolling_ts := clock_timestamp();
  
  -- Step 3: Build customer equity (batched)
  v_equity_result := public.cdp_build_customer_equity_batched(p_tenant_id, 10000);
  v_equity_ts := clock_timestamp();
  
  -- Step 4: Refresh MVs only for public schema tenants
  IF v_schema = 'public' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_segment_metrics_rolling;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_cohort_metrics_rolling;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_value_tier_metrics_rolling;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_data_quality_daily;
  END IF;
  
  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'schema', v_schema,
    'as_of_date', v_effective_date,
    'daily_customers', v_daily_count,
    'rolling_customers', (SELECT COUNT(DISTINCT customer_id) FROM cdp_customer_metrics_rolling WHERE tenant_id = p_tenant_id AND as_of_date = v_effective_date),
    'equity_result', v_equity_result,
    'duration_daily_ms', EXTRACT(MILLISECONDS FROM v_daily_ts - v_start_ts)::integer,
    'duration_rolling_ms', EXTRACT(MILLISECONDS FROM v_rolling_ts - v_daily_ts)::integer,
    'duration_equity_ms', EXTRACT(MILLISECONDS FROM v_equity_ts - v_rolling_ts)::integer,
    'duration_total_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_ts)::integer
  );
END;
$function$;
