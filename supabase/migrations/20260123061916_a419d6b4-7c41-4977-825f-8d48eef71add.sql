-- Drop and recreate the view with enriched data from insight events
DROP VIEW IF EXISTS v_cdp_decision_cards_detail;

CREATE OR REPLACE VIEW v_cdp_decision_cards_detail AS
SELECT 
  dc.id,
  dc.tenant_id,
  dc.title,
  dc.status,
  dc.severity,
  dc.priority,
  dc.owner_role AS owner,
  dc.review_by AS review_deadline,
  dc.created_at,
  dc.problem_statement,
  -- Enrich source_insights with data from insight events if available
  CASE 
    WHEN ie.id IS NOT NULL THEN 
      jsonb_build_array(jsonb_build_object(
        'code', COALESCE(dc.source_ref->>'code', dc.source_ref->>'insight_code', 'INS'),
        'title', COALESCE(ie.title, ie.headline, 'Insight liên quan'),
        'change', COALESCE(
          ie.metric_snapshot->>'change_percent',
          ie.metric_snapshot->>'change',
          '—'
        ),
        'impact', COALESCE(
          ie.impact_snapshot->>'business_implication',
          ie.impact_snapshot->>'impact',
          dc.summary,
          '—'
        )
      ))
    ELSE 
      jsonb_build_array(jsonb_build_object(
        'code', COALESCE(dc.source_ref->>'code', dc.source_ref->>'insight_code', 'INS'),
        'title', dc.summary,
        'change', '—',
        'impact', dc.summary
      ))
  END AS source_insights,
  dc.source_type = 'equity' AS source_equity,
  -- Get population size from insight event or population_ref
  COALESCE(
    ie.n_customers,
    (dc.population_ref->>'size')::integer,
    45 -- fallback for seed data
  ) AS population_size,
  (dc.population_ref->>'equity_impact')::numeric AS equity_impact,
  -- Build affected_population with more details
  jsonb_build_object(
    'description', COALESCE(
      dc.population_ref->>'segment',
      dc.population_ref->>'description',
      'Khách hàng bị ảnh hưởng'
    ),
    'size', COALESCE(ie.n_customers, (dc.population_ref->>'size')::integer, 0),
    'revenue_share', COALESCE((dc.population_ref->>'revenue_share')::numeric, 0),
    'equity_share', COALESCE((dc.population_ref->>'equity_share')::numeric, 0)
  ) AS affected_population,
  -- Build risks from data
  jsonb_build_object(
    'revenue', COALESCE(
      ie.impact_snapshot->>'revenue_risk',
      CASE WHEN dc.severity = 'CRITICAL' THEN 'Rủi ro doanh thu nghiêm trọng: ' || dc.summary
           WHEN dc.severity = 'HIGH' THEN 'Rủi ro doanh thu cao: ' || dc.summary
           ELSE 'Rủi ro doanh thu tiềm ẩn'
      END
    ),
    'cashflow', COALESCE(
      ie.impact_snapshot->>'cashflow_risk',
      'Ảnh hưởng dòng tiền cần theo dõi'
    ),
    'longTerm', COALESCE(
      ie.impact_snapshot->>'longterm_risk',
      'Quan hệ khách hàng dài hạn có thể bị ảnh hưởng'
    ),
    'level', LOWER(COALESCE(dc.severity, 'medium'))
  ) AS risks,
  NULL::text[] AS options,
  NULL::jsonb AS decision,
  NULL::text AS post_decision_review
FROM cdp_decision_cards dc
LEFT JOIN cdp_insight_events ie 
  ON ie.tenant_id = dc.tenant_id 
  AND (
    ie.insight_code = dc.source_ref->>'code' 
    OR ie.insight_code = dc.source_ref->>'insight_code'
    OR ie.id::text = dc.source_ref->>'insight_event_id'
  );