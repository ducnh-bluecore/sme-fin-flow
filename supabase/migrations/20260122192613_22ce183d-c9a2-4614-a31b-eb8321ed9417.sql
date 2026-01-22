-- ============================================
-- VIEW: v_cdp_insight_registry_summary
-- Cung cấp thông tin insight registry kèm trạng thái triggered
-- ============================================

CREATE OR REPLACE VIEW v_cdp_insight_registry_summary AS
WITH recent_events AS (
  -- Lấy insight events trong 30 ngày gần nhất, group by insight_code + tenant
  SELECT 
    tenant_id,
    insight_code,
    COUNT(*) as event_count,
    MAX(as_of_date) as last_triggered_date,
    MAX(created_at) as last_triggered_at
  FROM cdp_insight_events
  WHERE as_of_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY tenant_id, insight_code
),
category_mapping AS (
  SELECT 
    r.insight_code,
    r.name,
    r.category,
    r.population_type,
    r.window_days,
    r.baseline_days,
    r.threshold_json,
    r.cooldown_days,
    r.is_enabled,
    -- Map category to Vietnamese topic
    CASE r.category
      WHEN 'VALUE' THEN 'Giá trị'
      WHEN 'TIMING' THEN 'Thời gian mua'
      WHEN 'MIX' THEN 'Cơ cấu'
      WHEN 'RISK' THEN 'Rủi ro'
      WHEN 'QUALITY' THEN 'Chất lượng'
      ELSE r.category
    END as topic,
    -- Default owners based on category
    CASE r.category
      WHEN 'VALUE' THEN ARRAY['CEO', 'CFO']
      WHEN 'TIMING' THEN ARRAY['COO']
      WHEN 'MIX' THEN ARRAY['CEO', 'COO']
      WHEN 'RISK' THEN ARRAY['CFO', 'COO']
      WHEN 'QUALITY' THEN ARRAY['CEO']
      ELSE ARRAY['CEO']
    END as default_owners,
    -- Generate description from threshold_json
    COALESCE(
      r.threshold_json->>'description',
      'Phát hiện thay đổi dựa trên ngưỡng: ' || r.threshold_json::text
    ) as description,
    -- Generate threshold display text
    CASE 
      WHEN r.threshold_json ? 'pct_change' THEN 
        COALESCE(r.threshold_json->>'metric', 'metric') || ' ' ||
        CASE WHEN (r.threshold_json->>'pct_change')::numeric < 0 THEN 'giảm' ELSE 'tăng' END ||
        ' > ' || ABS((r.threshold_json->>'pct_change')::numeric * 100)::int || '%'
      WHEN r.threshold_json ? 'abs_change' THEN 
        COALESCE(r.threshold_json->>'metric', 'metric') || ' ' ||
        CASE WHEN r.threshold_json->>'direction' = 'down' THEN 'giảm' ELSE 'tăng' END ||
        ' > ' || (r.threshold_json->>'abs_change')::text || '%'
      WHEN r.threshold_json ? 'share_delta_abs' THEN 
        'Share thay đổi > ' || ((r.threshold_json->>'share_delta_abs')::numeric * 100)::int || '%'
      ELSE 
        'Theo cấu hình'
    END as threshold_display
  FROM cdp_insight_registry r
)
SELECT 
  cm.insight_code as code,
  cm.name,
  cm.category,
  cm.topic,
  cm.description,
  cm.threshold_display as threshold,
  cm.cooldown_days,
  cm.default_owners as owners,
  cm.is_enabled,
  cm.window_days,
  cm.baseline_days,
  cm.threshold_json,
  cm.population_type,
  -- Tenant-specific data (will be filtered in query)
  e.tenant_id,
  COALESCE(e.event_count, 0) > 0 as is_triggered,
  COALESCE(e.event_count, 0) as triggered_count,
  e.last_triggered_date,
  e.last_triggered_at
FROM category_mapping cm
LEFT JOIN recent_events e ON e.insight_code = cm.insight_code;

-- ============================================
-- VIEW: v_cdp_insight_registry_stats
-- Thống kê tổng hợp cho registry page
-- ============================================

CREATE OR REPLACE VIEW v_cdp_insight_registry_stats AS
SELECT 
  e.tenant_id,
  COUNT(DISTINCT r.insight_code) as total_insights,
  COUNT(DISTINCT r.insight_code) FILTER (WHERE r.is_enabled = true) as enabled_count,
  COUNT(DISTINCT e.insight_code) as triggered_count,
  COUNT(DISTINCT r.category) as topic_count
FROM cdp_insight_registry r
LEFT JOIN (
  SELECT DISTINCT tenant_id, insight_code 
  FROM cdp_insight_events 
  WHERE as_of_date >= CURRENT_DATE - INTERVAL '30 days'
) e ON e.insight_code = r.insight_code
GROUP BY e.tenant_id;

-- ============================================
-- FUNCTION: cdp_toggle_insight_enabled
-- Bật/tắt insight tracking
-- ============================================

CREATE OR REPLACE FUNCTION cdp_toggle_insight_enabled(
  p_insight_code text,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cdp_insight_registry
  SET is_enabled = p_enabled
  WHERE insight_code = p_insight_code;
END;
$$;