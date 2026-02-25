
-- Fix IPT calculation in fn_store_customer_kpis_with_delta
-- IPT should be total_transactions / customer_count (transactions per customer)
CREATE OR REPLACE FUNCTION public.fn_store_customer_kpis_with_delta(
  p_tenant_id UUID,
  p_store_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_date DATE;
  v_current_start DATE;
  v_prev_start DATE;
  v_prev_end DATE;
  v_current RECORD;
  v_prev RECORD;
  v_result JSON;
BEGIN
  SELECT MAX(metrics_date) INTO v_max_date
  FROM store_daily_metrics
  WHERE tenant_id = p_tenant_id AND store_id = p_store_id;
  
  IF v_max_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_current_start := v_max_date - p_days;
  v_prev_end := v_current_start;
  v_prev_start := v_prev_end - p_days;
  
  -- Current period
  SELECT
    COALESCE(SUM(customer_count), 0) AS customer_count,
    COALESCE(SUM(total_transactions), 0) AS total_transactions,
    COALESCE(SUM(total_revenue), 0) AS total_revenue,
    CASE WHEN COALESCE(SUM(total_transactions), 0) > 0
      THEN COALESCE(SUM(total_revenue), 0)::NUMERIC / SUM(total_transactions)
      ELSE 0 END AS avg_order_value,
    COALESCE(SUM(repeat_customer_count), 0) AS repeat_count,
    COUNT(*) AS days_counted,
    MIN(metrics_date) AS period_start,
    MAX(metrics_date) AS period_end
  INTO v_current
  FROM store_daily_metrics
  WHERE tenant_id = p_tenant_id 
    AND store_id = p_store_id
    AND metrics_date > v_current_start 
    AND metrics_date <= v_max_date;
  
  -- Previous period  
  SELECT
    COALESCE(SUM(customer_count), 0) AS customer_count,
    COALESCE(SUM(total_transactions), 0) AS total_transactions,
    COALESCE(SUM(total_revenue), 0) AS total_revenue,
    CASE WHEN COALESCE(SUM(total_transactions), 0) > 0
      THEN COALESCE(SUM(total_revenue), 0)::NUMERIC / SUM(total_transactions)
      ELSE 0 END AS avg_order_value,
    COALESCE(SUM(repeat_customer_count), 0) AS repeat_count,
    COUNT(*) AS days_counted
  INTO v_prev
  FROM store_daily_metrics
  WHERE tenant_id = p_tenant_id 
    AND store_id = p_store_id
    AND metrics_date > v_prev_start 
    AND metrics_date <= v_prev_end;
  
  -- Compute current IPT and return rate
  -- IPT = total_transactions / customer_count (transactions per customer)
  SELECT json_build_object(
    'customer_count', v_current.customer_count,
    'total_transactions', v_current.total_transactions,
    'total_revenue', v_current.total_revenue,
    'avg_order_value', ROUND(v_current.avg_order_value),
    'days_counted', v_current.days_counted,
    'period_start', v_current.period_start,
    'period_end', v_current.period_end,
    'daily_avg_customers', CASE WHEN v_current.days_counted > 0 
      THEN ROUND(v_current.customer_count::NUMERIC / v_current.days_counted, 1) ELSE 0 END,
    'items_per_transaction', CASE WHEN v_current.customer_count > 0
      THEN ROUND((v_current.total_transactions::NUMERIC / v_current.customer_count)::NUMERIC, 2) ELSE 0 END,
    'return_rate', CASE WHEN v_current.customer_count > 0
      THEN ROUND((v_current.repeat_count::NUMERIC / v_current.customer_count * 100)::NUMERIC, 1) ELSE 0 END,
    -- Deltas
    'delta_customers', CASE WHEN v_prev.customer_count > 0 AND v_prev.days_counted > 0
      THEN ROUND(((v_current.customer_count::NUMERIC - v_prev.customer_count) / v_prev.customer_count * 100)::NUMERIC, 1) ELSE NULL END,
    'delta_aov', CASE WHEN v_prev.avg_order_value > 0
      THEN ROUND(((v_current.avg_order_value - v_prev.avg_order_value) / v_prev.avg_order_value * 100)::NUMERIC, 1) ELSE NULL END,
    'delta_transactions', CASE WHEN v_prev.total_transactions > 0
      THEN ROUND(((v_current.total_transactions::NUMERIC - v_prev.total_transactions) / v_prev.total_transactions * 100)::NUMERIC, 1) ELSE NULL END,
    'delta_revenue', CASE WHEN v_prev.total_revenue > 0
      THEN ROUND(((v_current.total_revenue::NUMERIC - v_prev.total_revenue) / v_prev.total_revenue * 100)::NUMERIC, 1) ELSE NULL END,
    'has_previous_period', v_prev.days_counted > 0
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
