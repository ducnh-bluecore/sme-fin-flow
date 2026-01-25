-- Phase 2: Enhance Insight Business Value (retry with DROP)

-- 1. Add new columns for actionable insights
ALTER TABLE cdp_insight_events 
ADD COLUMN IF NOT EXISTS recommended_action text,
ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'low',
ADD COLUMN IF NOT EXISTS estimated_impact numeric,
ADD COLUMN IF NOT EXISTS impact_currency text DEFAULT 'VND',
ADD COLUMN IF NOT EXISTS action_owner text DEFAULT 'CEO';

-- Drop existing function to change return type
DROP FUNCTION IF EXISTS cdp_detect_margin_drift(uuid, int, int);

-- 2. Recreate cdp_detect_margin_drift with new return columns
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
  out_business_implication text,
  out_recommended_action text,
  out_urgency text,
  out_estimated_impact numeric,
  out_action_owner text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_reference_date date;
  v_current_start date;
  v_current_end date;
  v_baseline_start date;
  v_baseline_end date;
BEGIN
  SELECT MAX(order_at)::date INTO v_reference_date
  FROM cdp_orders WHERE tenant_id = p_tenant_id;
  
  IF v_reference_date IS NULL THEN
    RETURN QUERY SELECT 'M02'::text, false, NULL::numeric, NULL::numeric, NULL::numeric, 
                        0::numeric, 0::int, 0::numeric, '[]'::jsonb, '[]'::jsonb, 
                        'Không có dữ liệu đơn hàng'::text, NULL::text, 'low'::text, 0::numeric, 'CEO'::text;
    RETURN;
  END IF;

  v_current_end := v_reference_date + 1;
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
  distinct_customers AS (
    SELECT COUNT(DISTINCT customer_id)::int as total_customers
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND order_at >= v_current_start AND order_at < v_current_end
  ),
  total_metrics AS (
    SELECT 
      COALESCE(SUM(c.revenue), 0) as total_current_revenue,
      COALESCE(SUM(c.margin), 0) as total_current_margin,
      COALESCE(SUM(b.revenue), 0) as total_baseline_revenue,
      COALESCE(SUM(b.margin), 0) as total_baseline_margin,
      ROUND(COALESCE(SUM(c.margin), 0) / NULLIF(COALESCE(SUM(c.revenue), 0), 0) * 100, 1) as current_margin_pct,
      ROUND(COALESCE(SUM(b.margin), 0) / NULLIF(COALESCE(SUM(b.revenue), 0), 0) * 100, 1) as baseline_margin_pct
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
    'M02'::text as out_code,
    (ABS(t.current_margin_pct - t.baseline_margin_pct) > 5) as out_detected,
    t.current_margin_pct,
    t.baseline_margin_pct,
    ROUND(t.current_margin_pct - t.baseline_margin_pct, 1),
    ROUND((t.baseline_margin_pct - t.current_margin_pct) / 100.0 * t.total_current_revenue, 0),
    dc.total_customers,
    ROUND(t.total_current_revenue / NULLIF((SELECT SUM(net_revenue) FROM cdp_orders WHERE tenant_id = p_tenant_id), 0) * 100, 0),
    cd.drivers,
    sc.samples,
    CASE 
      WHEN t.current_margin_pct > t.baseline_margin_pct THEN
        'Gross margin tăng từ ' || t.baseline_margin_pct || '% lên ' || t.current_margin_pct || 
        '%, tăng thêm ' || ROUND(ABS((t.current_margin_pct - t.baseline_margin_pct) / 100.0 * t.total_current_revenue) / 1000, 0) || 'K lợi nhuận.'
      ELSE
        'Gross margin giảm từ ' || t.baseline_margin_pct || '% xuống ' || t.current_margin_pct || 
        '%, mất ' || ROUND(ABS((t.baseline_margin_pct - t.current_margin_pct) / 100.0 * t.total_current_revenue) / 1000, 0) || 'K lợi nhuận.'
    END,
    -- Recommended Action
    CASE 
      WHEN t.current_margin_pct < t.baseline_margin_pct THEN
        'Đề xuất: Rà soát chiến lược giá và chi phí vận hành tại các kênh có margin giảm. Xem xét điều chỉnh portfolio sản phẩm.'
      ELSE
        'Đề xuất: Duy trì chiến lược hiện tại. Phân tích kênh hoạt động tốt để nhân rộng.'
    END,
    -- Urgency
    CASE 
      WHEN ABS(t.current_margin_pct - t.baseline_margin_pct) > 20 THEN 'critical'
      WHEN ABS(t.current_margin_pct - t.baseline_margin_pct) > 10 THEN 'high'
      WHEN ABS(t.current_margin_pct - t.baseline_margin_pct) > 5 THEN 'medium'
      ELSE 'low'
    END,
    -- Estimated Impact
    ROUND(ABS((t.baseline_margin_pct - t.current_margin_pct) / 100.0 * t.total_current_revenue), 0),
    -- Action Owner
    CASE WHEN ABS(t.current_margin_pct - t.baseline_margin_pct) > 10 THEN 'CFO' ELSE 'CEO' END
  FROM total_metrics t
  CROSS JOIN channel_drivers cd
  CROSS JOIN sample_cust sc
  CROSS JOIN distinct_customers dc;
END;
$$;