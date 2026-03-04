
CREATE OR REPLACE FUNCTION public.fn_store_performance_benchmark(
  p_tenant_id uuid,
  p_store_id uuid,
  p_from_date date DEFAULT (date_trunc('month', CURRENT_DATE))::date,
  p_to_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_store_metrics jsonb;
  v_chain_avg jsonb;
  v_same_tier_avg jsonb;
  v_store_tier text;
  v_monthly_gap jsonb;
BEGIN
  -- Get store tier
  SELECT tier INTO v_store_tier
  FROM inv_stores WHERE id = p_store_id AND tenant_id = p_tenant_id;

  -- Store metrics
  SELECT jsonb_build_object(
    'avg_daily_revenue', COALESCE(AVG(total_revenue), 0),
    'avg_daily_txn', COALESCE(AVG(total_transactions), 0),
    'avg_aov', COALESCE(AVG(CASE WHEN total_transactions > 0 THEN total_revenue / total_transactions ELSE 0 END), 0),
    'avg_daily_customers', COALESCE(AVG(customer_count), 0),
    'total_revenue', COALESCE(SUM(total_revenue), 0),
    'total_txn', COALESCE(SUM(total_transactions), 0),
    'days_counted', COUNT(*),
    'revenue_per_customer', COALESCE(
      CASE WHEN SUM(customer_count) > 0 THEN SUM(total_revenue) / SUM(customer_count) ELSE 0 END, 0
    )
  ) INTO v_store_metrics
  FROM store_daily_metrics
  WHERE tenant_id = p_tenant_id AND store_id = p_store_id
    AND metrics_date >= p_from_date AND metrics_date <= p_to_date;

  -- Chain average (all stores excluding central warehouse)
  SELECT jsonb_build_object(
    'avg_daily_revenue', COALESCE(AVG(avg_rev), 0),
    'avg_daily_txn', COALESCE(AVG(avg_txn), 0),
    'avg_aov', COALESCE(AVG(avg_aov), 0),
    'avg_daily_customers', COALESCE(AVG(avg_cust), 0),
    'store_count', COUNT(*),
    'revenue_per_customer', COALESCE(AVG(rpc), 0)
  ) INTO v_chain_avg
  FROM (
    SELECT 
      m.store_id,
      AVG(m.total_revenue) as avg_rev,
      AVG(m.total_transactions) as avg_txn,
      AVG(CASE WHEN m.total_transactions > 0 THEN m.total_revenue / m.total_transactions ELSE 0 END) as avg_aov,
      AVG(m.customer_count) as avg_cust,
      CASE WHEN SUM(m.customer_count) > 0 THEN SUM(m.total_revenue) / SUM(m.customer_count) ELSE 0 END as rpc
    FROM store_daily_metrics m
    JOIN inv_stores s ON s.id = m.store_id AND s.tenant_id = m.tenant_id
    WHERE m.tenant_id = p_tenant_id
      AND m.metrics_date >= p_from_date AND m.metrics_date <= p_to_date
      AND s.location_type = 'store'
      AND s.is_active = true
    GROUP BY m.store_id
  ) sub;

  -- Same tier average
  SELECT jsonb_build_object(
    'avg_daily_revenue', COALESCE(AVG(avg_rev), 0),
    'avg_daily_txn', COALESCE(AVG(avg_txn), 0),
    'avg_aov', COALESCE(AVG(avg_aov), 0),
    'avg_daily_customers', COALESCE(AVG(avg_cust), 0),
    'store_count', COUNT(*),
    'revenue_per_customer', COALESCE(AVG(rpc), 0)
  ) INTO v_same_tier_avg
  FROM (
    SELECT 
      m.store_id,
      AVG(m.total_revenue) as avg_rev,
      AVG(m.total_transactions) as avg_txn,
      AVG(CASE WHEN m.total_transactions > 0 THEN m.total_revenue / m.total_transactions ELSE 0 END) as avg_aov,
      AVG(m.customer_count) as avg_cust,
      CASE WHEN SUM(m.customer_count) > 0 THEN SUM(m.total_revenue) / SUM(m.customer_count) ELSE 0 END as rpc
    FROM store_daily_metrics m
    JOIN inv_stores s ON s.id = m.store_id AND s.tenant_id = m.tenant_id
    WHERE m.tenant_id = p_tenant_id
      AND m.metrics_date >= p_from_date AND m.metrics_date <= p_to_date
      AND s.location_type = 'store'
      AND s.is_active = true
      AND s.tier = v_store_tier
    GROUP BY m.store_id
  ) sub;

  -- Monthly revenue vs target gap (last 6 months)
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.month), '[]'::jsonb) INTO v_monthly_gap
  FROM (
    SELECT
      to_char(m.metrics_date, 'YYYY-MM') as month,
      SUM(m.total_revenue) as actual_revenue,
      MAX(t.revenue_target) as target_revenue,
      CASE WHEN MAX(t.revenue_target) > 0 
        THEN ROUND((SUM(m.total_revenue) / MAX(t.revenue_target) * 100)::numeric, 1)
        ELSE NULL
      END as achievement_pct,
      SUM(m.total_transactions) as total_txn,
      AVG(CASE WHEN m.total_transactions > 0 THEN m.total_revenue / m.total_transactions ELSE 0 END) as avg_aov,
      SUM(m.customer_count) as total_customers
    FROM store_daily_metrics m
    LEFT JOIN store_kpi_targets t ON t.store_id = m.store_id 
      AND t.tenant_id = m.tenant_id 
      AND t.period_type = 'monthly'
      AND t.period_value = to_char(m.metrics_date, 'YYYY-MM')
    WHERE m.tenant_id = p_tenant_id AND m.store_id = p_store_id
      AND m.metrics_date >= (CURRENT_DATE - interval '6 months')
    GROUP BY to_char(m.metrics_date, 'YYYY-MM')
  ) sub;

  v_result := jsonb_build_object(
    'store', v_store_metrics,
    'chain_avg', v_chain_avg,
    'same_tier_avg', v_same_tier_avg,
    'store_tier', v_store_tier,
    'monthly_gap', v_monthly_gap,
    'period', jsonb_build_object('from', p_from_date, 'to', p_to_date)
  );

  RETURN v_result;
END;
$$;
