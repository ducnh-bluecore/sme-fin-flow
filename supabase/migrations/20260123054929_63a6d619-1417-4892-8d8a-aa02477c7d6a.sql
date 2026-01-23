
-- CDP Insight Detection - Complete Functions (SSOT from cdp_orders)

-- 1. Helper: Format currency in Vietnamese
CREATE OR REPLACE FUNCTION cdp_format_currency(amount numeric)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF amount IS NULL THEN RETURN '0'; END IF;
  IF amount >= 1000000000 THEN
    RETURN ROUND(amount / 1000000000, 1)::text || ' tỷ';
  ELSIF amount >= 1000000 THEN
    RETURN ROUND(amount / 1000000, 1)::text || ' triệu';
  ELSIF amount >= 1000 THEN
    RETURN ROUND(amount / 1000, 0)::text || 'K';
  ELSE
    RETURN amount::text;
  END IF;
END;
$$;

-- 2. Detect M02 (Low-Margin Drift) from REAL data
CREATE OR REPLACE FUNCTION cdp_detect_margin_drift(
  p_tenant_id uuid,
  p_window_days int DEFAULT 60,
  p_baseline_days int DEFAULT 60
)
RETURNS TABLE(
  out_code text,
  out_detected boolean,
  out_current_margin numeric,
  out_baseline_margin numeric,
  out_change_percent numeric,
  out_margin_loss numeric,
  out_customer_count int,
  out_revenue_contribution numeric,
  out_drivers jsonb,
  out_sample_customers jsonb,
  out_business_implication text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_start date;
  v_current_end date;
  v_baseline_start date;
  v_baseline_end date;
BEGIN
  v_current_end := CURRENT_DATE;
  v_current_start := v_current_end - p_window_days;
  v_baseline_end := v_current_start;
  v_baseline_start := v_baseline_end - p_baseline_days;

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      o.channel,
      SUM(o.net_revenue) as revenue,
      SUM(o.gross_margin) as margin,
      ROUND(SUM(o.gross_margin) / NULLIF(SUM(o.net_revenue), 0) * 100, 1) as margin_pct,
      COUNT(DISTINCT o.customer_id) as customers
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at >= v_current_start AND o.order_at < v_current_end
    GROUP BY o.channel
  ),
  baseline_period AS (
    SELECT 
      o.channel,
      SUM(o.net_revenue) as revenue,
      SUM(o.gross_margin) as margin,
      ROUND(SUM(o.gross_margin) / NULLIF(SUM(o.net_revenue), 0) * 100, 1) as margin_pct
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at >= v_baseline_start AND o.order_at < v_baseline_end
    GROUP BY o.channel
  ),
  total_metrics AS (
    SELECT 
      COALESCE(SUM(c.revenue), 0) as total_current_revenue,
      COALESCE(SUM(c.margin), 0) as total_current_margin,
      COALESCE(SUM(b.revenue), 0) as total_baseline_revenue,
      COALESCE(SUM(b.margin), 0) as total_baseline_margin,
      ROUND(COALESCE(SUM(c.margin), 0) / NULLIF(COALESCE(SUM(c.revenue), 0), 0) * 100, 1) as current_margin_pct,
      ROUND(COALESCE(SUM(b.margin), 0) / NULLIF(COALESCE(SUM(b.revenue), 0), 0) * 100, 1) as baseline_margin_pct,
      COALESCE(SUM(c.customers), 0)::int as total_customers
    FROM current_period c
    FULL OUTER JOIN baseline_period b ON c.channel = b.channel
  ),
  channel_drivers AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'name', c.channel || ' margin',
        'value', c.margin_pct,
        'unit', '%',
        'trend', CASE 
          WHEN c.margin_pct < COALESCE(b.margin_pct, c.margin_pct) THEN 'down'
          WHEN c.margin_pct > COALESCE(b.margin_pct, c.margin_pct) THEN 'up'
          ELSE 'stable'
        END
      )
    ), '[]'::jsonb) as drivers
    FROM current_period c
    LEFT JOIN baseline_period b ON c.channel = b.channel
    WHERE c.revenue > 0
  ),
  sample_cust AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'anonymousId', cust.customer_id::text,
        'currentValue', ROUND(COALESCE(cust.current_margin, 0), 0),
        'previousValue', ROUND(COALESCE(cust.baseline_margin, cust.current_margin, 0), 0)
      )
    ), '[]'::jsonb) as samples
    FROM (
      SELECT DISTINCT ON (o.customer_id)
        o.customer_id,
        (SELECT ROUND(SUM(o2.gross_margin) / NULLIF(SUM(o2.net_revenue), 0) * 100, 1) 
         FROM cdp_orders o2 
         WHERE o2.tenant_id = p_tenant_id AND o2.customer_id = o.customer_id
           AND o2.order_at >= v_current_start AND o2.order_at < v_current_end) as current_margin,
        (SELECT ROUND(SUM(o3.gross_margin) / NULLIF(SUM(o3.net_revenue), 0) * 100, 1) 
         FROM cdp_orders o3 
         WHERE o3.tenant_id = p_tenant_id AND o3.customer_id = o.customer_id
           AND o3.order_at >= v_baseline_start AND o3.order_at < v_baseline_end) as baseline_margin
      FROM cdp_orders o
      WHERE o.tenant_id = p_tenant_id AND o.order_at >= v_current_start
      LIMIT 3
    ) cust
  )
  SELECT 
    'M02'::text,
    (t.current_margin_pct IS NOT NULL AND t.baseline_margin_pct IS NOT NULL 
     AND t.current_margin_pct < t.baseline_margin_pct - 3),
    t.current_margin_pct,
    t.baseline_margin_pct,
    ROUND((t.current_margin_pct - t.baseline_margin_pct) / NULLIF(t.baseline_margin_pct, 0) * 100, 1),
    ROUND(t.total_baseline_margin - t.total_current_margin, 0),
    t.total_customers,
    ROUND(t.total_current_revenue / NULLIF((SELECT SUM(net_revenue) FROM cdp_orders WHERE tenant_id = p_tenant_id), 0) * 100, 0),
    cd.drivers,
    sc.samples,
    'Gross margin ' || 
    CASE WHEN t.current_margin_pct < t.baseline_margin_pct THEN 'giảm' ELSE 'tăng' END ||
    ' từ ' || COALESCE(t.baseline_margin_pct::text, '0') || '% xuống ' || COALESCE(t.current_margin_pct::text, '0') || 
    '%, ' || 
    CASE WHEN t.total_baseline_margin > t.total_current_margin THEN 'xói mòn' ELSE 'tăng thêm' END ||
    ' ' || cdp_format_currency(ABS(t.total_baseline_margin - t.total_current_margin)) || ' lợi nhuận trong ' ||
    p_window_days || ' ngày qua.'
  FROM total_metrics t
  CROSS JOIN channel_drivers cd
  CROSS JOIN sample_cust sc;
END;
$$;

-- 3. Main detection runner
CREATE OR REPLACE FUNCTION cdp_run_insight_detection(p_tenant_id uuid)
RETURNS TABLE(code text, is_detected boolean, details text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_id uuid := gen_random_uuid();
  v_as_of_date date := CURRENT_DATE;
  v_m02 record;
BEGIN
  -- Delete old seed data
  DELETE FROM cdp_insight_events e
  WHERE e.tenant_id = p_tenant_id 
    AND e.insight_code IN ('M02', 'M01', 'V03', 'V05', 'T02');

  -- Detect M02
  SELECT * INTO v_m02 FROM cdp_detect_margin_drift(p_tenant_id);
  
  IF v_m02.out_detected THEN
    INSERT INTO cdp_insight_events (
      tenant_id, insight_code, run_id, as_of_date, population_type, population_ref,
      metric_snapshot, impact_snapshot, headline, n_customers, severity, confidence, status
    ) VALUES (
      p_tenant_id, 'M02', v_run_id, v_as_of_date, 'channel',
      jsonb_build_object('name', 'Tất cả kênh bán'),
      jsonb_build_object(
        'current_value', v_m02.out_current_margin,
        'baseline_value', v_m02.out_baseline_margin,
        'change_percent', v_m02.out_change_percent,
        'metric_name', 'Gross Margin',
        'metric_unit', '%',
        'drivers', v_m02.out_drivers,
        'severity', CASE WHEN ABS(v_m02.out_change_percent) > 20 THEN 'high' WHEN ABS(v_m02.out_change_percent) > 10 THEN 'medium' ELSE 'low' END,
        'confidence', CASE WHEN v_m02.out_customer_count > 100 THEN 'high' WHEN v_m02.out_customer_count > 30 THEN 'medium' ELSE 'low' END
      ),
      jsonb_build_object(
        'business_implication', v_m02.out_business_implication,
        'revenue_contribution_pct', v_m02.out_revenue_contribution,
        'sample_customers', v_m02.out_sample_customers
      ),
      'Margin ' || CASE WHEN v_m02.out_change_percent < 0 THEN 'giảm' ELSE 'tăng' END || ' ' || ABS(v_m02.out_change_percent) || '%',
      v_m02.out_customer_count,
      CASE WHEN ABS(v_m02.out_change_percent) > 20 THEN 'high' WHEN ABS(v_m02.out_change_percent) > 10 THEN 'medium' ELSE 'low' END,
      CASE WHEN v_m02.out_customer_count > 100 THEN 0.9 WHEN v_m02.out_customer_count > 30 THEN 0.7 ELSE 0.5 END,
      'active'
    );
  END IF;

  RETURN QUERY SELECT 'M02'::text, v_m02.out_detected, v_m02.out_business_implication;
END;
$$;
