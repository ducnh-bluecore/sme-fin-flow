
CREATE OR REPLACE FUNCTION public.cdp_build_customer_equity_batched(
  p_tenant_id UUID,
  p_batch_size INTEGER DEFAULT 5000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_tenant_margin_rate NUMERIC;
  v_processed INTEGER := 0;
  v_total_equity_12m NUMERIC := 0;
  v_total_equity_24m NUMERIC := 0;
  v_batch_start TIMESTAMP := clock_timestamp();
  v_offset INTEGER;
BEGIN
  -- Tenant margin rate
  SELECT CASE WHEN SUM(net_revenue) > 0 
    THEN SUM(net_revenue - COALESCE(cogs, 0)) / SUM(net_revenue) ELSE 0.15 END
  INTO v_tenant_margin_rate
  FROM cdp_orders WHERE tenant_id = p_tenant_id AND cogs IS NOT NULL AND cogs > 0 AND net_revenue > 0;
  IF v_tenant_margin_rate IS NULL OR v_tenant_margin_rate <= 0 THEN v_tenant_margin_rate := 0.15; END IF;

  -- Get current offset
  SELECT COUNT(*) INTO v_offset FROM cdp_customer_equity_computed 
  WHERE tenant_id = p_tenant_id AND as_of_date = CURRENT_DATE;

  -- Bulk insert using a single query with pre-aggregated stats
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
      COUNT(*) AS total_orders,
      SUM(net_revenue) AS lifetime_revenue,
      AVG(net_revenue) AS lifetime_aov,
      MIN(order_at) AS first_order_at,
      MAX(order_at) AS last_order_at,
      EXTRACT(EPOCH FROM (NOW() - MAX(order_at))) / 86400.0 AS recency_days,
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '180 days') AS orders_180d,
      SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '180 days') AS revenue_180d,
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '90 days') AS orders_90d,
      SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '90 days') AS revenue_90d,
      COUNT(*) FILTER (WHERE order_at >= NOW() - INTERVAL '30 days') AS orders_30d,
      SUM(net_revenue) FILTER (WHERE order_at >= NOW() - INTERVAL '30 days') AS revenue_30d,
      BOOL_OR(cogs IS NOT NULL AND cogs > 0) AS has_cogs,
      CASE WHEN SUM(net_revenue) FILTER (WHERE cogs IS NOT NULL AND cogs > 0) > 0
        THEN SUM(net_revenue - cogs) FILTER (WHERE cogs IS NOT NULL AND cogs > 0) / SUM(net_revenue) FILTER (WHERE cogs IS NOT NULL AND cogs > 0)
        ELSE NULL END AS customer_margin_rate,
      EXTRACT(EPOCH FROM (MAX(order_at) - MIN(order_at))) / 86400.0 AS data_span_days,
      CASE WHEN COUNT(*) > 1
        THEN EXTRACT(EPOCH FROM (MAX(order_at) - MIN(order_at))) / 86400.0 / (COUNT(*) - 1)
        ELSE NULL END AS avg_inter_purchase_days
    FROM cdp_orders o
    INNER JOIN customer_batch cb ON cb.customer_id = o.customer_id
    WHERE o.tenant_id = p_tenant_id AND o.net_revenue > 0
    GROUP BY o.customer_id
  ),
  computed AS (
    SELECT
      s.customer_id,
      s.total_orders, s.lifetime_revenue, s.lifetime_aov,
      s.recency_days, s.orders_180d, s.revenue_180d, s.orders_90d, s.revenue_90d, s.orders_30d, s.revenue_30d,
      s.has_cogs, s.customer_margin_rate, s.data_span_days, s.avg_inter_purchase_days,
      -- p_active
      LEAST(GREATEST(
        CASE WHEN s.total_orders > 1 AND s.avg_inter_purchase_days > 0
          THEN EXP(-1.0 * GREATEST(s.recency_days, 0) / s.avg_inter_purchase_days)
          ELSE EXP(-1.0 * GREATEST(s.recency_days, 0) / 180.0)
        END, 0), 1) AS p_active,
      -- margin
      CASE WHEN s.has_cogs AND s.customer_margin_rate IS NOT NULL AND s.customer_margin_rate > 0
        THEN s.customer_margin_rate ELSE v_tenant_margin_rate END AS margin_rate,
      CASE WHEN s.has_cogs AND s.customer_margin_rate IS NOT NULL AND s.customer_margin_rate > 0
        THEN 'customer' ELSE 'tenant_avg' END AS margin_source,
      -- annual_run_rate
      CASE 
        WHEN COALESCE(s.revenue_180d, 0) > 0 THEN (s.revenue_180d / 180.0) * 365.0
        WHEN s.lifetime_revenue > 0 AND s.data_span_days > 30 THEN (s.lifetime_revenue / GREATEST(s.data_span_days, 1)) * 365.0
        ELSE s.lifetime_aov
      END AS annual_run_rate
    FROM order_stats s
  ),
  final AS (
    SELECT
      c.*,
      c.annual_run_rate * c.p_active * c.margin_rate AS eq_12m,
      c.annual_run_rate * c.p_active * c.margin_rate * (1.0 + c.p_active) AS eq_24m,
      1.0 - c.p_active AS churn_risk,
      CASE WHEN (1.0 - c.p_active) < 0.3 THEN 'low' WHEN (1.0 - c.p_active) < 0.7 THEN 'medium' ELSE 'high' END AS risk_lvl,
      LEAST(
        0.30
        + LEAST(c.total_orders * 0.025, 0.25)
        + GREATEST(0.25 - (GREATEST(c.recency_days, 0) / 30.0) * 0.025, 0)
        + CASE WHEN c.has_cogs THEN 0.20 ELSE 0 END
      , 1.0) AS confidence
    FROM computed c
  ),
  inserted AS (
    INSERT INTO cdp_customer_equity_computed (
      tenant_id, customer_id, as_of_date,
      orders_30d, orders_90d, orders_180d,
      net_revenue_30d, net_revenue_90d, net_revenue_180d,
      aov_90d, recency_days, frequency_180d, monetary_180d,
      equity_12m, equity_24m,
      equity_is_estimated, equity_estimation_method, equity_confidence, equity_reason,
      churn_risk_score, risk_level,
      data_quality_flags, computed_at, compute_version, compute_function
    )
    SELECT
      p_tenant_id, f.customer_id, CURRENT_DATE,
      f.orders_30d, f.orders_90d, f.orders_180d,
      f.revenue_30d, f.revenue_90d, f.revenue_180d,
      CASE WHEN f.orders_90d > 0 THEN f.revenue_90d / f.orders_90d ELSE NULL END,
      GREATEST(f.recency_days, 0)::INT, f.orders_180d, COALESCE(f.revenue_180d, 0),
      ROUND(f.eq_12m, 2), ROUND(f.eq_24m, 2),
      TRUE, 'rfm_historical_projection_v1', ROUND(f.confidence, 4),
      CASE WHEN f.margin_source = 'tenant_avg' THEN 'Tenant avg margin ' || ROUND(v_tenant_margin_rate * 100, 1) || '%'
        ELSE 'Customer-level margin' END,
      ROUND(f.churn_risk, 4), f.risk_lvl,
      jsonb_build_object('has_cogs', f.has_cogs, 'margin_source', f.margin_source,
        'margin_rate', ROUND(f.margin_rate, 4), 'order_count', f.total_orders,
        'data_span_days', ROUND(COALESCE(f.data_span_days, 0)), 'tenant_margin_rate', ROUND(v_tenant_margin_rate, 4)),
      NOW(), 'v1', 'cdp_build_customer_equity_batched'
    FROM final f
    ON CONFLICT (tenant_id, customer_id, as_of_date) DO UPDATE SET
      orders_30d = EXCLUDED.orders_30d, orders_90d = EXCLUDED.orders_90d, orders_180d = EXCLUDED.orders_180d,
      net_revenue_30d = EXCLUDED.net_revenue_30d, net_revenue_90d = EXCLUDED.net_revenue_90d, net_revenue_180d = EXCLUDED.net_revenue_180d,
      aov_90d = EXCLUDED.aov_90d, recency_days = EXCLUDED.recency_days, frequency_180d = EXCLUDED.frequency_180d, monetary_180d = EXCLUDED.monetary_180d,
      equity_12m = EXCLUDED.equity_12m, equity_24m = EXCLUDED.equity_24m,
      equity_is_estimated = EXCLUDED.equity_is_estimated, equity_estimation_method = EXCLUDED.equity_estimation_method,
      equity_confidence = EXCLUDED.equity_confidence, equity_reason = EXCLUDED.equity_reason,
      churn_risk_score = EXCLUDED.churn_risk_score, risk_level = EXCLUDED.risk_level,
      data_quality_flags = EXCLUDED.data_quality_flags, computed_at = EXCLUDED.computed_at,
      compute_version = EXCLUDED.compute_version, compute_function = EXCLUDED.compute_function
    RETURNING equity_12m, equity_24m
  )
  SELECT COUNT(*), COALESCE(SUM(equity_12m), 0), COALESCE(SUM(equity_24m), 0)
  INTO v_processed, v_total_equity_12m, v_total_equity_24m
  FROM inserted;

  RETURN jsonb_build_object(
    'customers_processed', v_processed, 'tenant_margin_rate', ROUND(v_tenant_margin_rate, 4),
    'total_equity_12m', ROUND(v_total_equity_12m, 2), 'total_equity_24m', ROUND(v_total_equity_24m, 2),
    'avg_equity_12m', CASE WHEN v_processed > 0 THEN ROUND(v_total_equity_12m / v_processed, 2) ELSE 0 END,
    'batch_size', p_batch_size, 'duration_ms', EXTRACT(MILLISECOND FROM clock_timestamp() - v_batch_start)::INT
  );
END;
$$;
