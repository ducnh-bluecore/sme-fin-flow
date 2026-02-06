
-- Fix severity values to match check constraint: critical, warning, info
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
      CASE WHEN r.drop_pct > 40 THEN 'critical' ELSE 'warning' END,
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
      CASE WHEN r.drop_pct > 50 THEN 'critical' ELSE 'warning' END,
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
    VALUES (p_tenant_id, 'threshold_breach', 'unit_economics', 'info',
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
    VALUES (p_tenant_id, 'threshold_breach', 'marketing', 'warning',
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
    VALUES (p_tenant_id, 'threshold_breach', 'marketing', 'info',
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
