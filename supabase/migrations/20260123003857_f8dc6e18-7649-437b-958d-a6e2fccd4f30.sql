-- =============================================
-- CDP INSIGHT FEED VIEWS (DB-First, No UI Calculation)
-- Fixed: Use cdp_decision_insight_links instead of source_insight_code
-- =============================================

-- 1. View for Insight Feed (InsightsPage)
CREATE OR REPLACE VIEW v_cdp_insight_feed AS
WITH active_events AS (
  SELECT 
    e.id as event_id,
    e.tenant_id,
    e.insight_code,
    r.name as title,
    r.category,
    CASE r.category
      WHEN 'VALUE' THEN 'value'
      WHEN 'TIMING' THEN 'timing'
      WHEN 'MIX' THEN 'demand'
      WHEN 'RISK' THEN 'risk'
      WHEN 'QUALITY' THEN 'equity'
      ELSE 'demand'
    END as topic,
    e.headline,
    e.population_type,
    COALESCE(e.population_ref->>'name', 
      CASE e.population_type
        WHEN 'SEGMENT' THEN 'Phân khúc'
        WHEN 'COHORT' THEN 'Đoàn hệ'
        WHEN 'PERCENTILE' THEN 'Nhóm phân vị'
        ELSE 'Toàn bộ khách hàng'
      END
    ) as population_name,
    e.n_customers as population_size,
    COALESCE((e.impact_snapshot->>'revenue_contribution_pct')::numeric, 0)::int as revenue_contribution,
    COALESCE(e.metric_snapshot->>'severity', 'medium') as severity,
    COALESCE(e.metric_snapshot->>'confidence', 'medium') as confidence,
    COALESCE((e.metric_snapshot->>'change_percent')::numeric, 0) as change_percent,
    CASE 
      WHEN (e.metric_snapshot->>'change_percent')::numeric < 0 THEN 'down'
      WHEN (e.metric_snapshot->>'change_percent')::numeric > 0 THEN 'up'
      ELSE 'stable'
    END as change_direction,
    CASE 
      WHEN e.cooldown_until IS NOT NULL AND e.cooldown_until > CURRENT_DATE THEN 'cooldown'
      ELSE 'active'
    END as status,
    e.as_of_date,
    e.created_at as detected_at,
    e.cooldown_until
  FROM cdp_insight_events e
  JOIN cdp_insight_registry r ON r.insight_code = e.insight_code
  WHERE e.as_of_date >= CURRENT_DATE - INTERVAL '60 days'
)
SELECT 
  event_id,
  tenant_id,
  insight_code as code,
  COALESCE(headline, title) as title,
  topic,
  population_name,
  population_size,
  revenue_contribution,
  severity,
  confidence,
  change_percent,
  change_direction,
  status,
  detected_at,
  as_of_date,
  cooldown_until
FROM active_events
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  detected_at DESC;

-- 2. View for Topic Summary
CREATE OR REPLACE VIEW v_cdp_insight_topic_counts AS
SELECT 
  e.tenant_id,
  CASE r.category
    WHEN 'VALUE' THEN 'value'
    WHEN 'TIMING' THEN 'timing'
    WHEN 'MIX' THEN 'demand'
    WHEN 'RISK' THEN 'risk'
    WHEN 'QUALITY' THEN 'equity'
    ELSE 'demand'
  END as topic,
  COUNT(*) as total_count,
  COUNT(*) FILTER (
    WHERE e.cooldown_until IS NULL OR e.cooldown_until <= CURRENT_DATE
  ) as active_count
FROM cdp_insight_events e
JOIN cdp_insight_registry r ON r.insight_code = e.insight_code
WHERE e.as_of_date >= CURRENT_DATE - INTERVAL '60 days'
GROUP BY e.tenant_id, r.category;

-- 3. View for Demand Insights (DemandInsightsPage)
CREATE OR REPLACE VIEW v_cdp_demand_insights AS
SELECT 
  e.id as event_id,
  e.tenant_id,
  e.insight_code as code,
  CASE 
    WHEN e.insight_code LIKE 'PD01%' OR e.insight_code LIKE 'PD02%' THEN 'demand_shift'
    WHEN e.insight_code LIKE 'PD06%' OR e.insight_code LIKE 'PD07%' THEN 'substitution'
    WHEN e.insight_code LIKE 'PD08%' OR e.insight_code LIKE 'PD09%' OR e.insight_code LIKE 'PD10%' THEN 'basket_structure'
    WHEN e.insight_code LIKE 'PD11%' OR e.insight_code LIKE 'PD12%' OR e.insight_code LIKE 'PD13%' THEN 'product_customer'
    WHEN e.insight_code LIKE 'PD05%' OR e.insight_code LIKE 'PD14%' OR e.insight_code LIKE 'PD15%' THEN 'product_risk'
    ELSE 'demand_shift'
  END as category,
  r.name as name_vi,
  COALESCE(e.headline, r.name) as description,
  COALESCE(e.metric_snapshot->>'severity', 'medium') as severity,
  COALESCE(
    e.metric_snapshot->>'product_group',
    e.metric_snapshot->>'category_name',
    'Đa nhóm'
  ) as product_group,
  e.n_customers as affected_customers,
  COALESCE((e.impact_snapshot->>'revenue_contribution_pct')::numeric, 0)::int as revenue_contribution,
  COALESCE((e.metric_snapshot->>'change_percent')::numeric, 0) as shift_percent,
  CASE 
    WHEN (e.metric_snapshot->>'change_percent')::numeric < 0 THEN 'down'
    ELSE 'up'
  END as shift_direction,
  COALESCE(
    e.impact_snapshot->>'business_meaning',
    'Cần phân tích thêm để hiểu nguyên nhân và tác động'
  ) as business_meaning_vi,
  COALESCE(
    e.impact_snapshot->>'risk_label',
    CASE 
      WHEN e.metric_snapshot->>'severity' = 'critical' THEN 'Rủi ro tài chính cao'
      WHEN e.metric_snapshot->>'severity' = 'high' THEN 'Cần xem xét'
      ELSE 'Theo dõi'
    END
  ) as risk_vi,
  e.created_at as detected_at,
  CASE 
    WHEN e.cooldown_until IS NOT NULL AND e.cooldown_until > CURRENT_DATE THEN 'cooldown'
    ELSE 'active'
  END as status
FROM cdp_insight_events e
JOIN cdp_insight_registry r ON r.insight_code = e.insight_code
WHERE r.category IN ('MIX', 'VALUE', 'RISK')
  AND e.as_of_date >= CURRENT_DATE - INTERVAL '60 days'
ORDER BY 
  CASE e.metric_snapshot->>'severity'
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  e.created_at DESC;

-- 4. View for Demand Category Counts
CREATE OR REPLACE VIEW v_cdp_demand_category_counts AS
WITH categorized AS (
  SELECT 
    e.tenant_id,
    CASE 
      WHEN e.insight_code LIKE 'PD01%' OR e.insight_code LIKE 'PD02%' THEN 'demand_shift'
      WHEN e.insight_code LIKE 'PD06%' OR e.insight_code LIKE 'PD07%' THEN 'substitution'
      WHEN e.insight_code LIKE 'PD08%' OR e.insight_code LIKE 'PD09%' OR e.insight_code LIKE 'PD10%' THEN 'basket_structure'
      WHEN e.insight_code LIKE 'PD11%' OR e.insight_code LIKE 'PD12%' OR e.insight_code LIKE 'PD13%' THEN 'product_customer'
      WHEN e.insight_code LIKE 'PD05%' OR e.insight_code LIKE 'PD14%' OR e.insight_code LIKE 'PD15%' THEN 'product_risk'
      ELSE 'demand_shift'
    END as category,
    CASE 
      WHEN e.cooldown_until IS NULL OR e.cooldown_until <= CURRENT_DATE THEN 'active'
      ELSE 'cooldown'
    END as status
  FROM cdp_insight_events e
  JOIN cdp_insight_registry r ON r.insight_code = e.insight_code
  WHERE r.category IN ('MIX', 'VALUE', 'RISK')
    AND e.as_of_date >= CURRENT_DATE - INTERVAL '60 days'
)
SELECT 
  tenant_id,
  category,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count
FROM categorized
GROUP BY tenant_id, category;

-- 5. View for Insight Detail (using cdp_decision_insight_links)
CREATE OR REPLACE VIEW v_cdp_insight_detail AS
SELECT 
  e.id as event_id,
  e.tenant_id,
  e.insight_code as code,
  r.name as title,
  CASE r.category
    WHEN 'VALUE' THEN 'Giá trị'
    WHEN 'TIMING' THEN 'Thời gian mua'
    WHEN 'MIX' THEN 'Cơ cấu/Nhu cầu'
    WHEN 'RISK' THEN 'Hoàn trả & Rủi ro'
    WHEN 'QUALITY' THEN 'Chất lượng dữ liệu'
    ELSE r.category
  END as topic,
  COALESCE(e.population_ref->>'name', 
    CASE e.population_type
      WHEN 'SEGMENT' THEN 'Phân khúc'
      WHEN 'COHORT' THEN 'Đoàn hệ'
      WHEN 'PERCENTILE' THEN 'Nhóm phân vị'
      ELSE 'Toàn bộ khách hàng'
    END
  ) as population_name,
  e.n_customers as population_size,
  COALESCE((e.impact_snapshot->>'revenue_contribution_pct')::numeric, 0)::int as revenue_contribution,
  COALESCE(e.metric_snapshot->>'severity', 'medium') as severity,
  COALESCE(e.metric_snapshot->>'confidence', 'medium') as confidence,
  CASE 
    WHEN e.cooldown_until IS NOT NULL AND e.cooldown_until > CURRENT_DATE THEN 'cooldown'
    ELSE 'active'
  END as status,
  COALESCE((e.metric_snapshot->>'current_value')::numeric, 0) as current_value,
  COALESCE((e.metric_snapshot->>'baseline_value')::numeric, 0) as baseline_value,
  COALESCE((e.metric_snapshot->>'change_percent')::numeric, 0) as change_percent,
  CASE 
    WHEN (e.metric_snapshot->>'change_percent')::numeric < 0 THEN 'down'
    WHEN (e.metric_snapshot->>'change_percent')::numeric > 0 THEN 'up'
    ELSE 'stable'
  END as change_direction,
  COALESCE(e.metric_snapshot->>'metric_name', 'Metric') as metric_name,
  COALESCE(e.metric_snapshot->>'metric_unit', '') as metric_unit,
  COALESCE(e.metric_snapshot->>'period_current', 
    to_char(e.as_of_date - (r.window_days || ' days')::interval, 'DD/MM/YYYY') || ' - ' || to_char(e.as_of_date, 'DD/MM/YYYY')
  ) as period_current,
  COALESCE(e.metric_snapshot->>'period_baseline',
    to_char(e.as_of_date - ((r.window_days + r.baseline_days) || ' days')::interval, 'DD/MM/YYYY') || ' - ' || 
    to_char(e.as_of_date - (r.window_days || ' days')::interval, 'DD/MM/YYYY')
  ) as period_baseline,
  COALESCE(e.impact_snapshot->>'business_implication', e.headline) as business_implication,
  COALESCE(e.metric_snapshot->'drivers', '[]'::jsonb) as drivers,
  COALESCE(e.impact_snapshot->'sample_customers', '[]'::jsonb) as sample_customers,
  to_char(e.as_of_date, 'DD/MM/YYYY') as snapshot_date,
  to_char(e.created_at, 'DD/MM/YYYY') as detected_at,
  CASE 
    WHEN e.cooldown_until IS NOT NULL THEN to_char(e.cooldown_until, 'DD/MM/YYYY')
    ELSE NULL
  END as cooldown_until,
  -- Use cdp_decision_insight_links to find linked decision
  link.decision_id as linked_decision_card_id,
  dc.status as linked_decision_card_status
FROM cdp_insight_events e
JOIN cdp_insight_registry r ON r.insight_code = e.insight_code
LEFT JOIN cdp_decision_insight_links link ON link.insight_event_id = e.id AND link.tenant_id = e.tenant_id
LEFT JOIN cdp_decision_cards dc ON dc.id = link.decision_id;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cdp_insight_events_code_date 
  ON cdp_insight_events(insight_code, as_of_date DESC);
CREATE INDEX IF NOT EXISTS idx_cdp_insight_events_tenant_date 
  ON cdp_insight_events(tenant_id, as_of_date DESC);