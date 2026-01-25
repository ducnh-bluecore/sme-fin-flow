-- Drop and recreate view with new schema
DROP VIEW IF EXISTS v_cdp_insight_detail CASCADE;

CREATE VIEW v_cdp_insight_detail 
WITH (security_invoker = on) AS
SELECT 
  e.id as event_id,
  e.tenant_id,
  r.insight_code as code,
  r.name as title,
  r.category as topic,
  COALESCE(e.population_ref->>'name', r.population_type) as population_name,
  e.n_customers as population_size,
  COALESCE((e.impact_snapshot->>'revenue_contribution_pct')::int, 0) as revenue_contribution,
  COALESCE(e.severity, 'low') as severity,
  CASE 
    WHEN e.confidence >= 0.8 THEN 'high'
    WHEN e.confidence >= 0.6 THEN 'medium'
    ELSE 'low'
  END as confidence,
  e.status,
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
  to_char(e.as_of_date - (r.window_days || ' days')::interval, 'DD/MM/YYYY') || ' - ' || to_char(e.as_of_date, 'DD/MM/YYYY') as period_current,
  to_char(e.as_of_date - (r.window_days + r.baseline_days || ' days')::interval, 'DD/MM/YYYY') || ' - ' || to_char(e.as_of_date - (r.window_days || ' days')::interval, 'DD/MM/YYYY') as period_baseline,
  COALESCE(e.impact_snapshot->>'business_implication', '') as business_implication,
  COALESCE(e.metric_snapshot->'drivers', '[]'::jsonb) as drivers,
  COALESCE(e.impact_snapshot->'sample_customers', '[]'::jsonb) as sample_customers,
  to_char(e.as_of_date, 'DD/MM/YYYY') as snapshot_date,
  to_char(e.created_at, 'DD/MM/YYYY') as detected_at,
  CASE WHEN e.cooldown_until IS NOT NULL THEN to_char(e.cooldown_until, 'DD/MM/YYYY') ELSE NULL END as cooldown_until,
  dc.id as linked_decision_card_id,
  dc.status as linked_decision_card_status,
  -- NEW ACTIONABLE COLUMNS
  COALESCE(e.recommended_action, 'Chưa có đề xuất cụ thể') as recommended_action,
  COALESCE(e.urgency, 'low') as urgency,
  COALESCE(e.estimated_impact, 0) as estimated_impact,
  COALESCE(e.impact_currency, 'VND') as impact_currency,
  COALESCE(e.action_owner, 'CEO') as action_owner
FROM cdp_insight_events e
JOIN cdp_insight_registry r ON e.insight_code = r.insight_code
LEFT JOIN cdp_decision_insight_links dil ON dil.insight_event_id = e.id
LEFT JOIN cdp_decision_cards dc ON dc.id = dil.decision_id
WHERE e.status IN ('active', 'cooldown');