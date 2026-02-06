
-- ============================================================================
-- L3 KPI LAYER: kpi_facts_daily + compute + detect functions
-- ============================================================================

-- 1. Create kpi_facts_daily table
CREATE TABLE public.kpi_facts_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  grain_date DATE NOT NULL,
  metric_code TEXT NOT NULL,
  dimension_type TEXT NOT NULL DEFAULT 'channel',
  dimension_value TEXT NOT NULL DEFAULT 'all_channels',
  metric_value NUMERIC,
  comparison_value NUMERIC,
  period_type TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kpi_facts_daily_unique UNIQUE (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
);

CREATE INDEX idx_kpi_facts_tenant_date ON public.kpi_facts_daily (tenant_id, grain_date);
CREATE INDEX idx_kpi_facts_tenant_metric ON public.kpi_facts_daily (tenant_id, metric_code);

ALTER TABLE public.kpi_facts_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for kpi_facts_daily"
  ON public.kpi_facts_daily FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- ============================================================================
-- 2. DB Function: compute_kpi_facts_daily
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_kpi_facts_daily(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_count INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  v_start := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '7 days');
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  -- NET_REVENUE by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.order_date, 'NET_REVENUE', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.order_date), 'daily'
  FROM (
    SELECT order_at::date AS order_date, channel, SUM(net_revenue) AS val
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at::date BETWEEN v_start AND v_end AND status NOT IN ('cancelled','refunded')
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
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at::date BETWEEN v_start AND v_end AND status NOT IN ('cancelled','refunded')
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
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at::date BETWEEN v_start AND v_end AND status NOT IN ('cancelled','refunded')
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
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at::date BETWEEN v_start AND v_end AND status NOT IN ('cancelled','refunded')
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
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at::date BETWEEN v_start AND v_end AND status NOT IN ('cancelled','refunded') AND net_revenue > 0
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
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at::date BETWEEN v_start AND v_end AND status NOT IN ('cancelled','refunded')
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
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at::date BETWEEN v_start AND v_end AND status NOT IN ('cancelled','refunded')
    GROUP BY order_at::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- AD_SPEND by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.spend_date, 'AD_SPEND', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.spend_date), 'daily'
  FROM (
    SELECT spend_date::date, channel, SUM(COALESCE(expense, 0)) AS val
    FROM ad_spend_daily WHERE tenant_id = p_tenant_id AND spend_date::date BETWEEN v_start AND v_end
    GROUP BY spend_date::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- AD_IMPRESSIONS by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.spend_date, 'AD_IMPRESSIONS', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.spend_date), 'daily'
  FROM (
    SELECT spend_date::date, channel, SUM(COALESCE(impressions, 0))::numeric AS val
    FROM ad_spend_daily WHERE tenant_id = p_tenant_id AND spend_date::date BETWEEN v_start AND v_end
    GROUP BY spend_date::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- ROAS by channel
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.spend_date, 'ROAS', 'channel', d.channel, d.val,
    LAG(d.val) OVER (PARTITION BY d.channel ORDER BY d.spend_date), 'daily'
  FROM (
    SELECT spend_date::date, channel,
      SUM(COALESCE(direct_order_amount, 0)) / NULLIF(SUM(COALESCE(expense, 0)), 0) AS val
    FROM ad_spend_daily WHERE tenant_id = p_tenant_id AND spend_date::date BETWEEN v_start AND v_end
    GROUP BY spend_date::date, channel
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- NEW_CUSTOMERS total
  INSERT INTO kpi_facts_daily (tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type)
  SELECT p_tenant_id, d.first_date, 'NEW_CUSTOMERS', 'total', 'all_channels', d.val,
    LAG(d.val) OVER (ORDER BY d.first_date), 'daily'
  FROM (
    SELECT first_order_date::date AS first_date, COUNT(*)::numeric AS val
    FROM cdp_customers WHERE tenant_id = p_tenant_id AND first_order_date::date BETWEEN v_start AND v_end
    GROUP BY first_order_date::date
  ) d
  ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, comparison_value = EXCLUDED.comparison_value, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RETURN jsonb_build_object('kpi_facts_upserted', v_total, 'start_date', v_start, 'end_date', v_end);
END;
$$;

-- ============================================================================
-- 3. DB Function: detect_threshold_breaches
-- ============================================================================
CREATE OR REPLACE FUNCTION public.detect_threshold_breaches(
  p_tenant_id UUID,
  p_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  v_date := COALESCE(p_date, CURRENT_DATE);

  -- Rule 1: Revenue Drop >20%
  FOR r IN
    SELECT grain_date, dimension_value, metric_value, comparison_value,
      ROUND((comparison_value - metric_value) / NULLIF(comparison_value, 0) * 100, 1) AS drop_pct,
      ROUND(comparison_value - metric_value, 0) AS lost_amount
    FROM kpi_facts_daily
    WHERE tenant_id = p_tenant_id AND metric_code = 'NET_REVENUE' AND grain_date = v_date
      AND comparison_value > 0 AND metric_value < comparison_value * 0.8
  LOOP
    INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message,
      object_type, object_name, metric_name, current_value, threshold_value, threshold_operator,
      change_percent, status, priority, impact_amount, impact_currency, suggested_action)
    VALUES (p_tenant_id, 'threshold_breach', 'revenue',
      CASE WHEN r.drop_pct > 40 THEN 'critical' ELSE 'high' END,
      'Revenue giảm ' || r.drop_pct || '% - ' || r.dimension_value,
      'Doanh thu ' || r.dimension_value || ' giảm ' || r.drop_pct || '% so với hôm trước, mất ' || TO_CHAR(r.lost_amount, 'FM999,999,999') || ' VND',
      'channel', r.dimension_value, 'NET_REVENUE', r.metric_value, r.comparison_value * 0.8, 'lt',
      -r.drop_pct, 'open', CASE WHEN r.drop_pct > 40 THEN 1 ELSE 2 END,
      r.lost_amount, 'VND',
      'Kiểm tra nguồn traffic và conversion rate kênh ' || r.dimension_value);
    v_count := v_count + 1;
  END LOOP;

  -- Rule 2: Order Count Drop >30%
  FOR r IN
    SELECT grain_date, dimension_value, metric_value, comparison_value,
      ROUND((comparison_value - metric_value) / NULLIF(comparison_value, 0) * 100, 1) AS drop_pct
    FROM kpi_facts_daily
    WHERE tenant_id = p_tenant_id AND metric_code = 'ORDER_COUNT' AND grain_date = v_date
      AND comparison_value > 0 AND metric_value < comparison_value * 0.7
  LOOP
    INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message,
      object_type, object_name, metric_name, current_value, threshold_value, threshold_operator,
      change_percent, status, priority, suggested_action)
    VALUES (p_tenant_id, 'threshold_breach', 'operations',
      CASE WHEN r.drop_pct > 50 THEN 'critical' ELSE 'high' END,
      'Đơn hàng giảm ' || r.drop_pct || '% - ' || r.dimension_value,
      'Số đơn ' || r.dimension_value || ' giảm từ ' || r.comparison_value || ' xuống ' || r.metric_value,
      'channel', r.dimension_value, 'ORDER_COUNT', r.metric_value, r.comparison_value * 0.7, 'lt',
      -r.drop_pct, 'open', CASE WHEN r.drop_pct > 50 THEN 1 ELSE 2 END,
      'Kiểm tra listing và inventory kênh ' || r.dimension_value);
    v_count := v_count + 1;
  END LOOP;

  -- Rule 3: Low AOV < 200K
  FOR r IN
    SELECT grain_date, dimension_value, metric_value
    FROM kpi_facts_daily
    WHERE tenant_id = p_tenant_id AND metric_code = 'AOV' AND grain_date = v_date AND metric_value < 200000
  LOOP
    INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message,
      object_type, object_name, metric_name, current_value, threshold_value, threshold_operator,
      status, priority, suggested_action)
    VALUES (p_tenant_id, 'threshold_breach', 'unit_economics', 'medium',
      'AOV thấp ' || TO_CHAR(r.metric_value, 'FM999,999') || 'đ - ' || r.dimension_value,
      'Giá trị đơn trung bình ' || r.dimension_value || ' chỉ ' || TO_CHAR(r.metric_value, 'FM999,999') || ' VND',
      'channel', r.dimension_value, 'AOV', r.metric_value, 200000, 'lt',
      'open', 3, 'Review pricing strategy và bundle deals');
    v_count := v_count + 1;
  END LOOP;

  -- Rule 4: Low ROAS < 2.0
  FOR r IN
    SELECT grain_date, dimension_value, metric_value
    FROM kpi_facts_daily
    WHERE tenant_id = p_tenant_id AND metric_code = 'ROAS' AND grain_date = v_date
      AND metric_value < 2.0 AND metric_value IS NOT NULL
  LOOP
    INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message,
      object_type, object_name, metric_name, current_value, threshold_value, threshold_operator,
      status, priority, suggested_action)
    VALUES (p_tenant_id, 'threshold_breach', 'marketing', 'high',
      'ROAS thấp ' || ROUND(r.metric_value, 2) || ' - ' || r.dimension_value,
      'ROAS kênh ' || r.dimension_value || ' chỉ đạt ' || ROUND(r.metric_value, 2) || ', chi quảng cáo đang lỗ',
      'channel', r.dimension_value, 'ROAS', r.metric_value, 2.0, 'lt',
      'open', 1, 'Pause campaign ROAS thấp, tập trung budget vào campaign hiệu quả');
    v_count := v_count + 1;
  END LOOP;

  -- Rule 5: Ad Spend Spike >50%
  FOR r IN
    SELECT grain_date, dimension_value, metric_value, comparison_value,
      ROUND((metric_value - comparison_value) / NULLIF(comparison_value, 0) * 100, 1) AS spike_pct
    FROM kpi_facts_daily
    WHERE tenant_id = p_tenant_id AND metric_code = 'AD_SPEND' AND grain_date = v_date
      AND comparison_value > 0 AND metric_value > comparison_value * 1.5
  LOOP
    INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message,
      object_type, object_name, metric_name, current_value, threshold_value, threshold_operator,
      change_percent, status, priority, impact_amount, impact_currency, suggested_action)
    VALUES (p_tenant_id, 'threshold_breach', 'marketing', 'medium',
      'Chi quảng cáo tăng ' || r.spike_pct || '% - ' || r.dimension_value,
      'Chi phí ads ' || r.dimension_value || ' tăng đột biến ' || TO_CHAR(r.metric_value, 'FM999,999,999') || ' VND',
      'channel', r.dimension_value, 'AD_SPEND', r.metric_value, r.comparison_value * 1.5, 'gt',
      r.spike_pct, 'open', 2, r.metric_value - r.comparison_value, 'VND',
      'Review budget allocation và campaign performance');
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('alerts_created', v_count, 'check_date', v_date);
END;
$$;
