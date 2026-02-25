
-- RPC: fn_store_customer_kpis_with_delta
-- Compares current period vs previous period for the same store
-- Returns both current values and % change
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
  -- Find latest data date
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
  
  -- Build result with deltas
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
    'items_per_transaction', CASE WHEN v_current.total_transactions > 0 AND v_current.avg_order_value > 0
      THEN ROUND((v_current.total_revenue::NUMERIC / v_current.total_transactions / v_current.avg_order_value)::NUMERIC, 1) ELSE 0 END,
    'return_rate', CASE WHEN v_current.customer_count > 0
      THEN ROUND((v_current.repeat_count::NUMERIC / v_current.customer_count * 100)::NUMERIC, 1) ELSE 0 END,
    -- Deltas (% change vs previous period)
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

-- RPC: fn_store_breakdown_comparison
-- Compares breakdown (demand_space, size, color) between current and previous period
-- Uses inv_state_demand periods
CREATE OR REPLACE FUNCTION public.fn_store_breakdown_comparison(
  p_tenant_id UUID,
  p_store_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_start DATE;
  v_current_end DATE;
  v_prev_start DATE;
  v_prev_end DATE;
  v_period_count INTEGER;
  v_result JSON;
BEGIN
  -- Get distinct periods
  SELECT COUNT(DISTINCT period_start) INTO v_period_count
  FROM inv_state_demand
  WHERE tenant_id = p_tenant_id AND store_id = p_store_id;
  
  -- Get latest period
  SELECT period_start, period_end INTO v_current_start, v_current_end
  FROM inv_state_demand
  WHERE tenant_id = p_tenant_id AND store_id = p_store_id
  ORDER BY period_start DESC LIMIT 1;
  
  IF v_current_start IS NULL THEN
    RETURN json_build_object('has_comparison', false);
  END IF;
  
  -- Get previous period if exists
  IF v_period_count > 1 THEN
    SELECT period_start, period_end INTO v_prev_start, v_prev_end
    FROM inv_state_demand
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id
      AND period_start < v_current_start
    ORDER BY period_start DESC LIMIT 1;
  END IF;
  
  -- Build the comparison
  WITH current_ds AS (
    SELECT f.demand_space AS label, SUM(d.total_sold) AS units
    FROM inv_state_demand d
    JOIN inv_sku_fc_mapping m ON m.sku = d.sku AND m.tenant_id = d.tenant_id
    JOIN inv_family_codes f ON f.id = m.fc_id AND f.tenant_id = d.tenant_id
    WHERE d.tenant_id = p_tenant_id AND d.store_id = p_store_id
      AND d.period_start = v_current_start
    GROUP BY f.demand_space
  ),
  prev_ds AS (
    SELECT f.demand_space AS label, SUM(d.total_sold) AS units
    FROM inv_state_demand d
    JOIN inv_sku_fc_mapping m ON m.sku = d.sku AND m.tenant_id = d.tenant_id
    JOIN inv_family_codes f ON f.id = m.fc_id AND f.tenant_id = d.tenant_id
    WHERE d.tenant_id = p_tenant_id AND d.store_id = p_store_id
      AND v_prev_start IS NOT NULL AND d.period_start = v_prev_start
    GROUP BY f.demand_space
  ),
  current_size AS (
    SELECT m.size AS label, SUM(d.total_sold) AS units
    FROM inv_state_demand d
    JOIN inv_sku_fc_mapping m ON m.sku = d.sku AND m.tenant_id = d.tenant_id
    WHERE d.tenant_id = p_tenant_id AND d.store_id = p_store_id
      AND d.period_start = v_current_start
    GROUP BY m.size
  ),
  prev_size AS (
    SELECT m.size AS label, SUM(d.total_sold) AS units
    FROM inv_state_demand d
    JOIN inv_sku_fc_mapping m ON m.sku = d.sku AND m.tenant_id = d.tenant_id
    WHERE d.tenant_id = p_tenant_id AND d.store_id = p_store_id
      AND v_prev_start IS NOT NULL AND d.period_start = v_prev_start
    GROUP BY m.size
  ),
  current_color AS (
    SELECT m.color AS label, SUM(d.total_sold) AS units
    FROM inv_state_demand d
    JOIN inv_sku_fc_mapping m ON m.sku = d.sku AND m.tenant_id = d.tenant_id
    WHERE d.tenant_id = p_tenant_id AND d.store_id = p_store_id
      AND d.period_start = v_current_start AND m.color IS NOT NULL
    GROUP BY m.color
  ),
  prev_color AS (
    SELECT m.color AS label, SUM(d.total_sold) AS units
    FROM inv_state_demand d
    JOIN inv_sku_fc_mapping m ON m.sku = d.sku AND m.tenant_id = d.tenant_id
    WHERE d.tenant_id = p_tenant_id AND d.store_id = p_store_id
      AND v_prev_start IS NOT NULL AND d.period_start = v_prev_start AND m.color IS NOT NULL
    GROUP BY m.color
  )
  SELECT json_build_object(
    'has_comparison', v_prev_start IS NOT NULL,
    'current_period', json_build_object('start', v_current_start, 'end', v_current_end),
    'prev_period', CASE WHEN v_prev_start IS NOT NULL 
      THEN json_build_object('start', v_prev_start, 'end', v_prev_end) ELSE NULL END,
    'demand_space', (
      SELECT json_agg(json_build_object(
        'label', c.label, 'units', c.units, 
        'prev_units', p.units,
        'delta_pct', CASE WHEN p.units IS NOT NULL AND p.units > 0 
          THEN ROUND(((c.units::NUMERIC - p.units) / p.units * 100)::NUMERIC, 1) ELSE NULL END
      ) ORDER BY c.units DESC)
      FROM current_ds c LEFT JOIN prev_ds p ON p.label = c.label
    ),
    'size', (
      SELECT json_agg(json_build_object(
        'label', c.label, 'units', c.units,
        'prev_units', p.units,
        'delta_pct', CASE WHEN p.units IS NOT NULL AND p.units > 0 
          THEN ROUND(((c.units::NUMERIC - p.units) / p.units * 100)::NUMERIC, 1) ELSE NULL END
      ) ORDER BY c.units DESC)
      FROM current_size c LEFT JOIN prev_size p ON p.label = c.label
    ),
    'color', (
      SELECT json_agg(json_build_object(
        'label', c.label, 'units', c.units,
        'prev_units', p.units,
        'delta_pct', CASE WHEN p.units IS NOT NULL AND p.units > 0 
          THEN ROUND(((c.units::NUMERIC - p.units) / p.units * 100)::NUMERIC, 1) ELSE NULL END
      ) ORDER BY c.units DESC)
      FROM current_color c LEFT JOIN prev_color p ON p.label = c.label
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
