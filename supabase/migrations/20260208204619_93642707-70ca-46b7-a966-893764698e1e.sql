
CREATE OR REPLACE FUNCTION public.cdp_build_customer_equity_batched(
  p_tenant_id UUID,
  p_batch_size INTEGER DEFAULT 5000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_margin_rate NUMERIC;
  v_processed INTEGER := 0;
  v_total_equity_12m NUMERIC := 0;
  v_total_equity_24m NUMERIC := 0;
  v_batch_start TIMESTAMP := clock_timestamp();
  rec RECORD;
BEGIN
  -- Step 0: Calculate tenant-level margin rate from orders with COGS
  SELECT 
    CASE WHEN SUM(net_revenue) > 0 
      THEN SUM(net_revenue - COALESCE(cogs, 0)) / SUM(net_revenue)
      ELSE 0.15 -- fallback default
    END
  INTO v_tenant_margin_rate
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND cogs IS NOT NULL AND cogs > 0
    AND net_revenue > 0;

  -- If no COGS data at all, use conservative 15%
  IF v_tenant_margin_rate IS NULL OR v_tenant_margin_rate <= 0 THEN
    v_tenant_margin_rate := 0.15;
  END IF;

  -- Process customers in batch using cursor-style with LIMIT
  FOR rec IN
    SELECT 
      c.id AS customer_id,
      c.tenant_id,
      -- Lifetime stats
      COALESCE(stats.total_orders, 0) AS total_orders,
      COALESCE(stats.lifetime_revenue, 0) AS lifetime_revenue,
      COALESCE(stats.lifetime_aov, 0) AS lifetime_aov,
      stats.first_order_at,
      stats.last_order_at,
      EXTRACT(EPOCH FROM (NOW() - stats.last_order_at)) / 86400.0 AS recency_days,
      -- 180d window
      COALESCE(stats.orders_180d, 0) AS orders_180d,
      COALESCE(stats.revenue_180d, 0) AS revenue_180d,
      -- 90d window
      COALESCE(stats.orders_90d, 0) AS orders_90d,
      COALESCE(stats.revenue_90d, 0) AS revenue_90d,
      -- 30d window
      COALESCE(stats.orders_30d, 0) AS orders_30d,
      COALESCE(stats.revenue_30d, 0) AS revenue_30d,
      -- Avg inter-purchase interval
      CASE 
        WHEN COALESCE(stats.total_orders, 0) > 1 
        THEN EXTRACT(EPOCH FROM (stats.last_order_at - stats.first_order_at)) / 86400.0 / (stats.total_orders - 1)
        ELSE NULL
      END AS avg_inter_purchase_days,
      -- Customer has own COGS?
      COALESCE(stats.has_cogs, FALSE) AS has_cogs,
      COALESCE(stats.customer_margin_rate, NULL) AS customer_margin_rate,
      -- Data span
      EXTRACT(EPOCH FROM (COALESCE(stats.last_order_at, NOW()) - COALESCE(stats.first_order_at, NOW()))) / 86400.0 AS data_span_days
    FROM cdp_customers c
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_orders,
        SUM(net_revenue) AS lifetime_revenue,
        AVG(net_revenue) AS lifetime_aov,
        MIN(order_date) AS first_order_at,
        MAX(order_date) AS last_order_at,
        COUNT(*) FILTER (WHERE order_date >= NOW() - INTERVAL '180 days') AS orders_180d,
        SUM(net_revenue) FILTER (WHERE order_date >= NOW() - INTERVAL '180 days') AS revenue_180d,
        COUNT(*) FILTER (WHERE order_date >= NOW() - INTERVAL '90 days') AS orders_90d,
        SUM(net_revenue) FILTER (WHERE order_date >= NOW() - INTERVAL '90 days') AS revenue_90d,
        COUNT(*) FILTER (WHERE order_date >= NOW() - INTERVAL '30 days') AS orders_30d,
        SUM(net_revenue) FILTER (WHERE order_date >= NOW() - INTERVAL '30 days') AS revenue_30d,
        BOOL_OR(cogs IS NOT NULL AND cogs > 0) AS has_cogs,
        CASE 
          WHEN SUM(net_revenue) FILTER (WHERE cogs IS NOT NULL AND cogs > 0) > 0
          THEN SUM(net_revenue - cogs) FILTER (WHERE cogs IS NOT NULL AND cogs > 0) / SUM(net_revenue) FILTER (WHERE cogs IS NOT NULL AND cogs > 0)
          ELSE NULL
        END AS customer_margin_rate
      FROM cdp_orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.customer_id = c.id
        AND o.net_revenue > 0
    ) stats ON TRUE
    WHERE c.tenant_id = p_tenant_id
      AND COALESCE(stats.total_orders, 0) > 0
    -- Process only customers not yet computed today, or all
    ORDER BY c.id
    LIMIT p_batch_size
    OFFSET (
      SELECT COUNT(*) FROM cdp_customer_equity_computed 
      WHERE tenant_id = p_tenant_id AND as_of_date = CURRENT_DATE
    )
  LOOP
    DECLARE
      v_p_active NUMERIC;
      v_annual_run_rate NUMERIC;
      v_eq_12m NUMERIC;
      v_eq_24m NUMERIC;
      v_churn_risk NUMERIC;
      v_risk_level TEXT;
      v_confidence NUMERIC;
      v_margin_rate NUMERIC;
      v_margin_source TEXT;
      v_recency INT;
      v_freq_180d INT;
      v_mon_180d NUMERIC;
    BEGIN
      v_recency := GREATEST(COALESCE(rec.recency_days, 9999)::INT, 0);
      v_freq_180d := rec.orders_180d::INT;
      v_mon_180d := COALESCE(rec.revenue_180d, 0);

      -- Step 2: Retention probability
      IF rec.total_orders > 1 AND rec.avg_inter_purchase_days > 0 THEN
        v_p_active := EXP(-1.0 * v_recency / rec.avg_inter_purchase_days);
      ELSE
        -- Single-order: use 180-day half-life
        v_p_active := EXP(-1.0 * v_recency / 180.0);
      END IF;
      v_p_active := GREATEST(v_p_active, 0);
      v_p_active := LEAST(v_p_active, 1);

      -- Step 3: Margin rate (prefer customer-level if available)
      IF rec.has_cogs AND rec.customer_margin_rate IS NOT NULL AND rec.customer_margin_rate > 0 THEN
        v_margin_rate := rec.customer_margin_rate;
        v_margin_source := 'customer';
      ELSE
        v_margin_rate := v_tenant_margin_rate;
        v_margin_source := 'tenant_avg';
      END IF;

      -- Step 3: Annual run rate
      IF v_mon_180d > 0 THEN
        v_annual_run_rate := (v_mon_180d / 180.0) * 365.0;
      ELSIF rec.lifetime_revenue > 0 AND rec.data_span_days > 30 THEN
        v_annual_run_rate := (rec.lifetime_revenue / GREATEST(rec.data_span_days, 1)) * 365.0;
      ELSE
        v_annual_run_rate := rec.lifetime_aov * 1.0; -- single purchase extrapolation
      END IF;

      -- Equity projections
      v_eq_12m := v_annual_run_rate * v_p_active * v_margin_rate;
      v_eq_24m := v_eq_12m * (1.0 + v_p_active); -- year 2 decays further

      -- Step 4: Churn risk
      v_churn_risk := 1.0 - v_p_active;
      IF v_churn_risk < 0.3 THEN v_risk_level := 'low';
      ELSIF v_churn_risk < 0.7 THEN v_risk_level := 'medium';
      ELSE v_risk_level := 'high';
      END IF;

      -- Confidence score
      v_confidence := 30; -- base: has orders
      -- Frequency bonus (0-25)
      v_confidence := v_confidence + LEAST(rec.total_orders * 2.5, 25);
      -- Recency bonus (0-25)
      v_confidence := v_confidence + GREATEST(25 - (v_recency / 30.0) * 2.5, 0);
      -- COGS bonus
      IF rec.has_cogs THEN v_confidence := v_confidence + 20; END IF;
      v_confidence := LEAST(v_confidence, 100);

      -- UPSERT
      INSERT INTO cdp_customer_equity_computed (
        tenant_id, customer_id, as_of_date,
        orders_30d, orders_90d, orders_180d,
        net_revenue_30d, net_revenue_90d, net_revenue_180d,
        aov_90d, recency_days, frequency_180d, monetary_180d,
        equity_12m, equity_24m,
        equity_is_estimated, equity_estimation_method, equity_confidence, equity_reason,
        churn_risk_score, risk_level,
        data_quality_flags, computed_at, compute_version, compute_function
      ) VALUES (
        p_tenant_id, rec.customer_id, CURRENT_DATE,
        rec.orders_30d, rec.orders_90d, rec.orders_180d,
        rec.revenue_30d, rec.revenue_90d, rec.revenue_180d,
        CASE WHEN rec.orders_90d > 0 THEN rec.revenue_90d / rec.orders_90d ELSE NULL END,
        v_recency, v_freq_180d, v_mon_180d,
        ROUND(v_eq_12m, 2), ROUND(v_eq_24m, 2),
        TRUE, 'rfm_historical_projection_v1', ROUND(v_confidence, 1),
        CASE 
          WHEN v_margin_source = 'tenant_avg' THEN 'Using tenant avg margin rate ' || ROUND(v_tenant_margin_rate * 100, 1) || '%'
          ELSE 'Using customer-level margin'
        END,
        ROUND(v_churn_risk, 4), v_risk_level,
        jsonb_build_object(
          'has_cogs', rec.has_cogs,
          'margin_source', v_margin_source,
          'margin_rate', ROUND(v_margin_rate, 4),
          'order_count', rec.total_orders,
          'data_span_days', ROUND(rec.data_span_days),
          'tenant_margin_rate', ROUND(v_tenant_margin_rate, 4)
        ),
        NOW(), 'v1', 'cdp_build_customer_equity_batched'
      )
      ON CONFLICT (tenant_id, customer_id, as_of_date)
      DO UPDATE SET
        orders_30d = EXCLUDED.orders_30d,
        orders_90d = EXCLUDED.orders_90d,
        orders_180d = EXCLUDED.orders_180d,
        net_revenue_30d = EXCLUDED.net_revenue_30d,
        net_revenue_90d = EXCLUDED.net_revenue_90d,
        net_revenue_180d = EXCLUDED.net_revenue_180d,
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
        data_quality_flags = EXCLUDED.data_quality_flags,
        computed_at = EXCLUDED.computed_at,
        compute_version = EXCLUDED.compute_version,
        compute_function = EXCLUDED.compute_function;

      v_processed := v_processed + 1;
      v_total_equity_12m := v_total_equity_12m + COALESCE(v_eq_12m, 0);
      v_total_equity_24m := v_total_equity_24m + COALESCE(v_eq_24m, 0);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'customers_processed', v_processed,
    'tenant_margin_rate', ROUND(v_tenant_margin_rate, 4),
    'total_equity_12m', ROUND(v_total_equity_12m, 2),
    'total_equity_24m', ROUND(v_total_equity_24m, 2),
    'avg_equity_12m', CASE WHEN v_processed > 0 THEN ROUND(v_total_equity_12m / v_processed, 2) ELSE 0 END,
    'batch_size', p_batch_size,
    'duration_ms', EXTRACT(MILLISECOND FROM clock_timestamp() - v_batch_start)::INT
  );
END;
$$;
