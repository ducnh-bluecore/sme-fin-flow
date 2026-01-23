-- Fix cdp_build_customer_equity - recency_days calculation was using EXTRACT incorrectly
-- When subtracting two dates in PostgreSQL, the result is already an integer (days)
DROP FUNCTION IF EXISTS cdp_build_customer_equity(uuid, date);

CREATE OR REPLACE FUNCTION cdp_build_customer_equity(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS jsonb AS $$
DECLARE
  v_customers_processed integer := 0;
  v_customers_with_equity integer := 0;
  v_estimated_count integer := 0;
  v_has_cogs boolean := false;
  v_has_fees boolean := false;
  v_start_ts timestamptz := clock_timestamp();
BEGIN
  -- Check if we have COGS data
  SELECT EXISTS (
    SELECT 1 FROM cdp_orders 
    WHERE tenant_id = p_tenant_id AND cogs > 0 LIMIT 1
  ) INTO v_has_cogs;
  
  -- Check if we have fees data (would come from channel_fees)
  SELECT EXISTS (
    SELECT 1 FROM channel_fees 
    WHERE tenant_id = p_tenant_id LIMIT 1
  ) INTO v_has_fees;
  
  -- Upsert computed metrics for all customers with orders
  WITH customer_base AS (
    SELECT 
      c.tenant_id,
      c.id as customer_id,
      c.first_order_at,
      c.last_order_at
    FROM cdp_customers c
    WHERE c.tenant_id = p_tenant_id
      AND c.status = 'ACTIVE'
  ),
  order_metrics AS (
    SELECT 
      o.customer_id,
      -- 30-day metrics
      COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '30 days') as orders_30d,
      COALESCE(SUM(o.net_revenue) FILTER (WHERE o.order_at >= p_as_of_date - interval '30 days'), 0) as net_revenue_30d,
      COALESCE(SUM(o.gross_margin) FILTER (WHERE o.order_at >= p_as_of_date - interval '30 days'), 0) as gross_profit_30d,
      -- 90-day metrics
      COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days') as orders_90d,
      COALESCE(SUM(o.net_revenue) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days'), 0) as net_revenue_90d,
      COALESCE(SUM(o.gross_margin) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days'), 0) as gross_profit_90d,
      -- 180-day metrics
      COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '180 days') as orders_180d,
      COALESCE(SUM(o.net_revenue) FILTER (WHERE o.order_at >= p_as_of_date - interval '180 days'), 0) as net_revenue_180d,
      -- AOV 90d
      CASE WHEN COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days') > 0
           THEN SUM(o.net_revenue) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days') / 
                COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days')
           ELSE NULL END as aov_90d,
      -- Recency: date subtraction returns integer days directly
      (p_as_of_date - MAX(o.order_at)::date) as recency_days
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at <= p_as_of_date
    GROUP BY o.customer_id
  ),
  refund_metrics AS (
    SELECT 
      r.customer_id,
      COALESCE(SUM(r.refund_amount) FILTER (WHERE r.refund_at >= p_as_of_date - interval '90 days'), 0) as refund_amount_90d
    FROM cdp_refunds r
    WHERE r.tenant_id = p_tenant_id
      AND r.refund_at <= p_as_of_date
    GROUP BY r.customer_id
  ),
  computed AS (
    SELECT 
      cb.tenant_id,
      cb.customer_id,
      p_as_of_date as as_of_date,
      COALESCE(om.orders_30d, 0)::integer as orders_30d,
      COALESCE(om.orders_90d, 0)::integer as orders_90d,
      COALESCE(om.orders_180d, 0)::integer as orders_180d,
      COALESCE(om.net_revenue_30d, 0) as net_revenue_30d,
      COALESCE(om.net_revenue_90d, 0) as net_revenue_90d,
      COALESCE(om.net_revenue_180d, 0) as net_revenue_180d,
      CASE WHEN v_has_cogs THEN om.gross_profit_30d ELSE NULL END as gross_profit_30d,
      CASE WHEN v_has_cogs THEN om.gross_profit_90d ELSE NULL END as gross_profit_90d,
      NULL::numeric as contribution_profit_90d,
      om.aov_90d,
      CASE WHEN om.net_revenue_90d > 0 
           THEN COALESCE(rm.refund_amount_90d, 0) / om.net_revenue_90d 
           ELSE NULL END as refund_rate_90d,
      CASE WHEN om.orders_180d > 0 
           THEN CASE WHEN om.orders_180d > 1 THEN 1.0 ELSE 0.0 END 
           ELSE NULL END as repeat_rate_180d,
      om.recency_days::integer,
      COALESCE(om.orders_180d, 0)::integer as frequency_180d,
      COALESCE(om.net_revenue_180d, 0) as monetary_180d,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL AND om.gross_profit_90d > 0 THEN
          om.gross_profit_90d * 4 * 0.85
        WHEN om.net_revenue_90d > 0 THEN
          om.net_revenue_90d * 4 * 0.30
        ELSE NULL
      END as equity_12m,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL AND om.gross_profit_90d > 0 THEN
          om.gross_profit_90d * 8 * 0.70
        WHEN om.net_revenue_90d > 0 THEN
          om.net_revenue_90d * 8 * 0.25
        ELSE NULL
      END as equity_24m,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL THEN false
        WHEN om.net_revenue_90d > 0 THEN true
        ELSE true
      END as equity_is_estimated,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL THEN 'PROFIT_BASED'
        WHEN om.net_revenue_90d > 0 THEN 'REVENUE_PROXY'
        ELSE 'NO_DATA'
      END as equity_estimation_method,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL THEN 0.85
        WHEN om.net_revenue_90d > 0 THEN 0.45
        ELSE NULL
      END as equity_confidence,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL THEN 'Calculated from real profit data'
        WHEN om.net_revenue_90d > 0 THEN 'Estimated: Missing COGS/fees; using 30% margin proxy'
        ELSE 'No order data available'
      END as equity_reason,
      CASE 
        WHEN om.recency_days IS NULL THEN NULL
        WHEN om.recency_days > 180 THEN 0.9
        WHEN om.recency_days > 90 THEN 0.7
        WHEN om.recency_days > 60 THEN 0.5
        WHEN om.recency_days > 30 THEN 0.3
        ELSE 0.1
      END as churn_risk_score,
      CASE 
        WHEN om.recency_days IS NULL THEN NULL
        WHEN om.recency_days > 180 THEN 'critical'
        WHEN om.recency_days > 90 THEN 'high'
        WHEN om.recency_days > 60 THEN 'medium'
        ELSE 'low'
      END as risk_level,
      jsonb_build_object(
        'has_orders', COALESCE(om.orders_180d, 0) > 0,
        'has_refunds', COALESCE(rm.refund_amount_90d, 0) > 0,
        'has_cogs', v_has_cogs,
        'has_fees', v_has_fees,
        'has_contribution_margin', false,
        'is_estimated', NOT v_has_cogs OR om.gross_profit_90d IS NULL OR om.gross_profit_90d <= 0
      ) as data_quality_flags,
      now() as computed_at
    FROM customer_base cb
    LEFT JOIN order_metrics om ON om.customer_id = cb.customer_id
    LEFT JOIN refund_metrics rm ON rm.customer_id = cb.customer_id
  )
  INSERT INTO cdp_customer_equity_computed
  SELECT * FROM computed
  ON CONFLICT (tenant_id, customer_id, as_of_date)
  DO UPDATE SET
    orders_30d = EXCLUDED.orders_30d,
    orders_90d = EXCLUDED.orders_90d,
    orders_180d = EXCLUDED.orders_180d,
    net_revenue_30d = EXCLUDED.net_revenue_30d,
    net_revenue_90d = EXCLUDED.net_revenue_90d,
    net_revenue_180d = EXCLUDED.net_revenue_180d,
    gross_profit_30d = EXCLUDED.gross_profit_30d,
    gross_profit_90d = EXCLUDED.gross_profit_90d,
    contribution_profit_90d = EXCLUDED.contribution_profit_90d,
    aov_90d = EXCLUDED.aov_90d,
    refund_rate_90d = EXCLUDED.refund_rate_90d,
    repeat_rate_180d = EXCLUDED.repeat_rate_180d,
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
    computed_at = EXCLUDED.computed_at;
  
  GET DIAGNOSTICS v_customers_processed = ROW_COUNT;
  
  -- Count customers with equity
  SELECT COUNT(*), COUNT(*) FILTER (WHERE equity_is_estimated)
  INTO v_customers_with_equity, v_estimated_count
  FROM cdp_customer_equity_computed
  WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND equity_12m IS NOT NULL;
  
  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'as_of_date', p_as_of_date,
    'customers_processed', v_customers_processed,
    'customers_with_equity', v_customers_with_equity,
    'estimated_count', v_estimated_count,
    'has_cogs', v_has_cogs,
    'has_fees', v_has_fees,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_ts)::integer
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;