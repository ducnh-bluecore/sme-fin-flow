
-- Fix cdp_build_customer_equity_batched to match actual table schema
CREATE OR REPLACE FUNCTION public.cdp_build_customer_equity_batched(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_tenant_margin_rate NUMERIC;
  v_processed INTEGER := 0;
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
      -- Period-based metrics
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '30 days')::INT AS orders_30d,
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '90 days')::INT AS orders_90d,
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '180 days')::INT AS orders_180d,
      COALESCE(SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '30 days'), 0) AS revenue_30d,
      COALESCE(SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '90 days'), 0) AS revenue_90d,
      COALESCE(SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '180 days'), 0) AS revenue_180d,
      COALESCE(SUM(net_revenue - COALESCE(cogs,0)) FILTER (WHERE order_at >= NOW() - INTERVAL '30 days'), 0) AS gp_30d,
      COALESCE(SUM(net_revenue - COALESCE(cogs,0)) FILTER (WHERE order_at >= NOW() - INTERVAL '90 days'), 0) AS gp_90d,
      -- Ratios
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
        THEN 'customer_cogs' ELSE 'tenant_avg' END AS margin_source,
      CASE 
        WHEN s.revenue_180d > 0 THEN (s.revenue_180d / 180.0) * 365.0
        WHEN s.lifetime_revenue > 0 AND s.data_span_days > 30 THEN (s.lifetime_revenue / GREATEST(s.data_span_days, 1)) * 365.0
        ELSE s.lifetime_aov END AS annual_run_rate,
      -- AOV 90d
      CASE WHEN s.orders_90d > 0 THEN s.revenue_90d / s.orders_90d ELSE 0 END AS aov_90d,
      -- Repeat rate 180d
      CASE WHEN s.orders_180d > 1 THEN true ELSE false END AS is_repeat_180d,
      -- Frequency
      s.orders_180d AS frequency_180d,
      s.revenue_180d AS monetary_180d
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
      orders_30d, orders_90d, orders_180d,
      net_revenue_30d, net_revenue_90d, net_revenue_180d,
      gross_profit_30d, gross_profit_90d,
      aov_90d, recency_days,
      frequency_180d, monetary_180d,
      equity_12m, equity_24m,
      equity_is_estimated, equity_estimation_method, equity_confidence, equity_reason,
      churn_risk_score, risk_level,
      computed_at, compute_version, compute_function
    )
    SELECT
      p_tenant_id, f.customer_id, CURRENT_DATE,
      f.orders_30d, f.orders_90d, f.orders_180d,
      f.revenue_30d, f.revenue_90d, f.revenue_180d,
      f.gp_30d, f.gp_90d,
      f.aov_90d, f.recency_days,
      f.frequency_180d, f.monetary_180d,
      f.eq_12m, f.eq_24m,
      NOT f.has_cogs, f.margin_source, f.confidence,
      CASE WHEN NOT f.has_cogs THEN 'Estimated using tenant avg margin' ELSE 'Computed from actual COGS' END,
      f.churn_risk, f.risk_lvl,
      NOW(), 'v2.0', 'cdp_build_customer_equity_batched'
    FROM final f
    ON CONFLICT (tenant_id, customer_id, as_of_date) DO UPDATE SET
      orders_30d = EXCLUDED.orders_30d,
      orders_90d = EXCLUDED.orders_90d,
      orders_180d = EXCLUDED.orders_180d,
      net_revenue_30d = EXCLUDED.net_revenue_30d,
      net_revenue_90d = EXCLUDED.net_revenue_90d,
      net_revenue_180d = EXCLUDED.net_revenue_180d,
      gross_profit_30d = EXCLUDED.gross_profit_30d,
      gross_profit_90d = EXCLUDED.gross_profit_90d,
      aov_90d = EXCLUDED.aov_90d,
      recency_days = EXCLUDED.recency_days,
      frequency_180d = EXCLUDED.frequency_180d,
      monetary_180d = EXCLUDED.monetary_180d,
      equity_12m = EXCLUDED.equity_12m,
      equity_24m = EXCLUDED.equity_24m,
      equity_is_estimated = EXCLUDED.equity_is_estimated,
      equity_estimation_method = EXCLUDED.equity_estimation_method,
      equity_confidence = EXCLUDED.equity_confidence,
      equity_reason = EXCLUDED.equity_reason,
      churn_risk_score = EXCLUDED.churn_risk_score,
      risk_level = EXCLUDED.risk_level,
      computed_at = EXCLUDED.computed_at,
      compute_version = EXCLUDED.compute_version,
      compute_function = EXCLUDED.compute_function
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
