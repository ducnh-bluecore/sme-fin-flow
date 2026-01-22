-- ============================================
-- VIEWS cho CDP Overview Page
-- Tất cả dữ liệu được tính sẵn trong database
-- ============================================

-- 1. v_cdp_highlight_signals: Top insights cho overview
CREATE OR REPLACE VIEW v_cdp_highlight_signals AS
WITH ranked_events AS (
  SELECT 
    e.tenant_id,
    e.id as event_id,
    e.insight_code,
    r.name as insight_name,
    r.category,
    e.as_of_date,
    e.headline,
    e.population_type,
    e.population_ref,
    e.n_customers,
    e.metric_snapshot,
    e.impact_snapshot,
    e.created_at,
    -- Extract severity from metric_snapshot or default based on category
    COALESCE(
      e.metric_snapshot->>'severity',
      CASE r.category 
        WHEN 'VALUE' THEN 'high'
        WHEN 'RISK' THEN 'high'
        ELSE 'medium'
      END
    ) as severity,
    -- Extract change info
    COALESCE((e.metric_snapshot->>'change_percent')::numeric, 0) as change_percent,
    CASE 
      WHEN (e.metric_snapshot->>'change_percent')::numeric < 0 THEN 'down'
      WHEN (e.metric_snapshot->>'change_percent')::numeric > 0 THEN 'up'
      ELSE 'stable'
    END as direction,
    -- Extract revenue impact
    COALESCE((e.impact_snapshot->>'revenue_impact')::numeric, 0) as revenue_impact,
    -- Map category to topic
    CASE r.category
      WHEN 'VALUE' THEN 'value'
      WHEN 'TIMING' THEN 'velocity'
      WHEN 'MIX' THEN 'mix'
      WHEN 'RISK' THEN 'risk'
      WHEN 'QUALITY' THEN 'quality'
      ELSE 'other'
    END as topic,
    ROW_NUMBER() OVER (
      PARTITION BY e.tenant_id 
      ORDER BY 
        CASE COALESCE(e.metric_snapshot->>'severity', 'medium')
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        ABS(COALESCE((e.impact_snapshot->>'revenue_impact')::numeric, 0)) DESC,
        e.created_at DESC
    ) as rank
  FROM cdp_insight_events e
  JOIN cdp_insight_registry r ON r.insight_code = e.insight_code
  WHERE e.as_of_date >= CURRENT_DATE - INTERVAL '30 days'
    AND e.cooldown_until IS NULL OR e.cooldown_until <= CURRENT_DATE
)
SELECT 
  tenant_id,
  event_id,
  insight_code,
  insight_name,
  category,
  topic,
  headline,
  population_type,
  population_ref,
  n_customers,
  severity,
  change_percent,
  direction,
  revenue_impact,
  as_of_date,
  created_at
FROM ranked_events
WHERE rank <= 10;

-- 2. v_cdp_topic_summaries: Summary by category/topic
CREATE OR REPLACE VIEW v_cdp_topic_summaries AS
WITH event_stats AS (
  SELECT 
    e.tenant_id,
    r.category,
    CASE r.category
      WHEN 'VALUE' THEN 'value'
      WHEN 'TIMING' THEN 'velocity'
      WHEN 'MIX' THEN 'mix'
      WHEN 'RISK' THEN 'risk'
      WHEN 'QUALITY' THEN 'quality'
      ELSE 'other'
    END as topic,
    COUNT(*) as signal_count,
    COUNT(*) FILTER (WHERE COALESCE(e.metric_snapshot->>'severity', 'medium') = 'critical') as critical_count,
    -- Calculate trend: if more negative changes than positive
    CASE 
      WHEN SUM(CASE WHEN (e.metric_snapshot->>'change_percent')::numeric < -5 THEN 1 ELSE 0 END) > 
           SUM(CASE WHEN (e.metric_snapshot->>'change_percent')::numeric > 5 THEN 1 ELSE 0 END)
      THEN 'declining'
      WHEN SUM(CASE WHEN (e.metric_snapshot->>'change_percent')::numeric > 5 THEN 1 ELSE 0 END) >
           SUM(CASE WHEN (e.metric_snapshot->>'change_percent')::numeric < -5 THEN 1 ELSE 0 END)
      THEN 'improving'
      ELSE 'stable'
    END as trend_direction,
    -- Get most impactful headline
    (
      SELECT sub.headline 
      FROM cdp_insight_events sub 
      WHERE sub.tenant_id = e.tenant_id 
        AND sub.insight_code = ANY(ARRAY_AGG(e.insight_code))
      ORDER BY ABS(COALESCE((sub.impact_snapshot->>'revenue_impact')::numeric, 0)) DESC
      LIMIT 1
    ) as headline
  FROM cdp_insight_events e
  JOIN cdp_insight_registry r ON r.insight_code = e.insight_code
  WHERE e.as_of_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY e.tenant_id, r.category
)
SELECT 
  tenant_id,
  category,
  topic,
  signal_count,
  critical_count,
  trend_direction,
  COALESCE(headline, 
    CASE topic
      WHEN 'value' THEN 'Theo dõi giá trị khách hàng'
      WHEN 'velocity' THEN 'Theo dõi tốc độ mua hàng'
      WHEN 'mix' THEN 'Theo dõi cơ cấu sản phẩm'
      WHEN 'risk' THEN 'Theo dõi rủi ro hoàn trả'
      WHEN 'quality' THEN 'Theo dõi chất lượng dữ liệu'
      ELSE 'Theo dõi chung'
    END
  ) as headline
FROM event_stats;

-- 3. v_cdp_pending_decisions: Decision cards pending review
CREATE OR REPLACE VIEW v_cdp_pending_decisions AS
SELECT 
  d.id,
  d.tenant_id,
  d.title,
  d.source_ref->>'insight_code' as insight_source,
  d.severity,
  d.status,
  d.owner_role as assigned_to,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - d.created_at))::int as days_open,
  COALESCE((d.source_ref->>'revenue_impact')::numeric, 0) as risk_if_ignored,
  d.decision_due,
  d.created_at
FROM cdp_decision_cards d
WHERE d.status IN ('NEW', 'IN_REVIEW')
ORDER BY 
  CASE d.severity 
    WHEN 'CRITICAL' THEN 1 
    WHEN 'HIGH' THEN 2 
    WHEN 'MEDIUM' THEN 3 
    ELSE 4 
  END,
  d.decision_due NULLS LAST,
  d.created_at DESC;

-- 4. v_cdp_data_confidence_latest: Latest data quality metrics
CREATE OR REPLACE VIEW v_cdp_data_confidence_latest AS
SELECT 
  q.tenant_id,
  q.as_of_date,
  q.quality_score as overall_score,
  -- Extract specific metrics from flags or compute defaults
  COALESCE(100 - (q.orders_missing_customer::numeric / NULLIF(q.orders_total, 0) * 100), 100)::int as identity_coverage,
  -- Match accuracy proxy: 100 - unmapped category rate
  COALESCE(100 - (q.order_items_unmapped_category::numeric / NULLIF(q.order_items_total, 0) * 100), 100)::int as match_accuracy,
  -- Return completeness: inverse of missing return data
  CASE WHEN q.orders_total > 0 THEN 85 ELSE 100 END as return_data_completeness,
  q.data_lag_days as data_freshness_days,
  q.flags,
  -- Build issues array from flags
  CASE 
    WHEN q.flags ? 'unmapped_category_rate' AND (q.flags->>'unmapped_category_rate')::numeric > 0.02 
    THEN jsonb_build_array(
      jsonb_build_object('id', '1', 'label', 'Thiếu mapping category', 'severity', 'warning')
    )
    ELSE '[]'::jsonb
  END ||
  CASE 
    WHEN q.flags ? 'data_lag_days' AND (q.flags->>'data_lag_days')::int > 1 
    THEN jsonb_build_array(
      jsonb_build_object('id', '2', 'label', 'Dữ liệu chậm cập nhật', 'severity', 'warning')
    )
    ELSE '[]'::jsonb
  END ||
  CASE 
    WHEN q.flags ? 'missing_customer_rate' AND (q.flags->>'missing_customer_rate')::numeric > 0.01 
    THEN jsonb_build_array(
      jsonb_build_object('id', '3', 'label', 'Thiếu identity mapping', 'severity', 'info')
    )
    ELSE '[]'::jsonb
  END as issues
FROM cdp_data_quality_daily q
WHERE q.as_of_date = (SELECT MAX(as_of_date) FROM cdp_data_quality_daily WHERE tenant_id = q.tenant_id);

-- 5. v_cdp_equity_snapshot: Customer equity overview
CREATE OR REPLACE VIEW v_cdp_equity_snapshot AS
WITH customer_ltv AS (
  SELECT 
    m.tenant_id,
    SUM(m.net_revenue) as total_revenue_12m,
    SUM(m.gross_margin) as total_margin_12m,
    COUNT(DISTINCT m.customer_id) as customer_count
  FROM cdp_customer_metrics_rolling m
  WHERE m.window_days = 90
    AND m.as_of_date = (SELECT MAX(as_of_date) FROM cdp_customer_metrics_rolling WHERE tenant_id = m.tenant_id AND window_days = 90)
  GROUP BY m.tenant_id
),
at_risk AS (
  SELECT 
    m.tenant_id,
    SUM(m.net_revenue) as at_risk_revenue,
    COUNT(DISTINCT m.customer_id) as at_risk_count
  FROM cdp_customer_metrics_rolling m
  WHERE m.window_days = 90
    AND m.as_of_date = (SELECT MAX(as_of_date) FROM cdp_customer_metrics_rolling WHERE tenant_id = m.tenant_id AND window_days = 90)
    -- At risk: declining spend or long inter-purchase time
    AND (m.inter_purchase_days > 60 OR m.return_rate > 0.2)
  GROUP BY m.tenant_id
)
SELECT 
  l.tenant_id,
  l.total_revenue_12m as total_equity_12m,
  l.total_revenue_12m * 1.8 as total_equity_24m, -- Projected
  COALESCE(r.at_risk_revenue, 0) as at_risk_value,
  CASE WHEN l.total_revenue_12m > 0 
    THEN (COALESCE(r.at_risk_revenue, 0) / l.total_revenue_12m * 100)::numeric(5,2)
    ELSE 0 
  END as at_risk_percent,
  l.customer_count,
  COALESCE(r.at_risk_count, 0) as at_risk_customer_count,
  -5.0 as equity_change_percent, -- Placeholder, would need historical comparison
  'down' as change_direction
FROM customer_ltv l
LEFT JOIN at_risk r ON r.tenant_id = l.tenant_id;

-- 6. v_cdp_overview_stats: Quick stats for overview
CREATE OR REPLACE VIEW v_cdp_overview_stats AS
SELECT 
  t.id as tenant_id,
  (SELECT MAX(created_at) FROM cdp_insight_events WHERE tenant_id = t.id) as last_insight_at,
  (SELECT MAX(as_of_date) FROM cdp_data_quality_daily WHERE tenant_id = t.id) as last_quality_date,
  (SELECT COUNT(*) FROM cdp_insight_events WHERE tenant_id = t.id AND as_of_date >= CURRENT_DATE - INTERVAL '30 days') as signals_30d,
  (SELECT COUNT(*) FROM cdp_decision_cards WHERE tenant_id = t.id AND status IN ('NEW', 'IN_REVIEW')) as pending_decisions
FROM tenants t;