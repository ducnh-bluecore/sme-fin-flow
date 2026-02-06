
-- Fix: use first_order_at instead of first_order_date
CREATE OR REPLACE FUNCTION public.compute_kpi_facts_daily(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_count INTEGER := 0;
  v_total INTEGER := 0;
  v_ts_start TIMESTAMPTZ;
  v_ts_end TIMESTAMPTZ;
BEGIN
  v_start := COALESCE(p_start_date, CURRENT_DATE - 7);
  v_end := COALESCE(p_end_date, CURRENT_DATE);
  v_ts_start := v_start::timestamptz;
  v_ts_end := (v_end + 1)::timestamptz;

  -- NET_REVENUE by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.order_date, 'NET_REVENUE', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.order_date), 'daily'
  FROM (
    SELECT order_at::date AS order_date, channel, SUM(net_revenue) AS val
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= v_ts_start AND order_at < v_ts_end AND status NOT IN ('cancelled','refunded')
    GROUP BY order_at::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- NET_REVENUE total
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.order_date, 'NET_REVENUE', 'total', 'all_channels', d.val,
    LAG(d.val) OVER (ORDER BY d.order_date), 'daily'
  FROM (
    SELECT order_at::date AS order_date, SUM(net_revenue) AS val
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= v_ts_start AND order_at < v_ts_end AND status NOT IN ('cancelled','refunded')
    GROUP BY order_at::date
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- ORDER_COUNT by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.order_date, 'ORDER_COUNT', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.order_date), 'daily'
  FROM (
    SELECT order_at::date AS order_date, channel, COUNT(*)::numeric AS val
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= v_ts_start AND order_at < v_ts_end AND status NOT IN ('cancelled','refunded')
    GROUP BY order_at::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- ORDER_COUNT total
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.order_date, 'ORDER_COUNT', 'total', 'all_channels', d.val,
    LAG(d.val) OVER (ORDER BY d.order_date), 'daily'
  FROM (
    SELECT order_at::date AS order_date, COUNT(*)::numeric AS val
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= v_ts_start AND order_at < v_ts_end AND status NOT IN ('cancelled','refunded')
    GROUP BY order_at::date
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- AOV by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.order_date, 'AOV', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.order_date), 'daily'
  FROM (
    SELECT order_at::date AS order_date, channel, AVG(net_revenue) AS val
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= v_ts_start AND order_at < v_ts_end AND status NOT IN ('cancelled','refunded') AND net_revenue > 0
    GROUP BY order_at::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- COGS by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.order_date, 'COGS', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.order_date), 'daily'
  FROM (
    SELECT order_at::date AS order_date, channel, SUM(COALESCE(cogs, 0)) AS val
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= v_ts_start AND order_at < v_ts_end AND status NOT IN ('cancelled','refunded')
    GROUP BY order_at::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- GROSS_MARGIN by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.order_date, 'GROSS_MARGIN', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.order_date), 'daily'
  FROM (
    SELECT order_at::date AS order_date, channel, SUM(COALESCE(gross_margin, 0)) AS val
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= v_ts_start AND order_at < v_ts_end AND status NOT IN ('cancelled','refunded')
    GROUP BY order_at::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- AD_SPEND by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.sd, 'AD_SPEND', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.sd), 'daily'
  FROM (
    SELECT spend_date::date AS sd, channel, SUM(COALESCE(expense, 0)) AS val
    FROM ad_spend_daily WHERE tenant_id = p_tenant_id AND spend_date >= v_start AND spend_date <= v_end
    GROUP BY spend_date::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- AD_IMPRESSIONS by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.sd, 'AD_IMPRESSIONS', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.sd), 'daily'
  FROM (
    SELECT spend_date::date AS sd, channel, SUM(COALESCE(impressions, 0))::numeric AS val
    FROM ad_spend_daily WHERE tenant_id = p_tenant_id AND spend_date >= v_start AND spend_date <= v_end
    GROUP BY spend_date::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- ROAS by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.sd, 'ROAS', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.sd), 'daily'
  FROM (
    SELECT spend_date::date AS sd, channel,
      SUM(COALESCE(direct_order_amount, 0)) / NULLIF(SUM(COALESCE(expense, 0)), 0) AS val
    FROM ad_spend_daily WHERE tenant_id = p_tenant_id AND spend_date >= v_start AND spend_date <= v_end
    GROUP BY spend_date::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- NEW_CUSTOMERS (using first_order_at)
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.fd, 'NEW_CUSTOMERS', 'total', 'all_channels', d.val,
    LAG(d.val) OVER (ORDER BY d.fd), 'daily'
  FROM (
    SELECT first_order_at::date AS fd, COUNT(*)::numeric AS val
    FROM cdp_customers WHERE tenant_id = p_tenant_id AND first_order_at >= v_ts_start AND first_order_at < v_ts_end
    GROUP BY first_order_at::date
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RETURN jsonb_build_object('kpi_facts_upserted', v_total, 'start_date', v_start, 'end_date', v_end);
END;
$$;
