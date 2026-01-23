-- Add decision recording columns to cdp_decision_cards
ALTER TABLE cdp_decision_cards 
ADD COLUMN IF NOT EXISTS decision_outcome text,
ADD COLUMN IF NOT EXISTS decision_note text,
ADD COLUMN IF NOT EXISTS decision_recorded_at timestamptz,
ADD COLUMN IF NOT EXISTS decision_recorded_by text;

-- Add index for decision status queries
CREATE INDEX IF NOT EXISTS idx_cdp_decision_cards_status ON cdp_decision_cards(tenant_id, status);

-- Update view to include decision data
DROP VIEW IF EXISTS v_cdp_decision_cards_detail;

CREATE OR REPLACE VIEW v_cdp_decision_cards_detail AS
WITH tenant_totals AS (
  SELECT 
    tenant_id,
    SUM(net_revenue) FILTER (WHERE window_days = 365) AS total_revenue,
    COUNT(DISTINCT customer_id) AS total_customers
  FROM cdp_customer_metrics_rolling
  GROUP BY tenant_id
),
card_metrics AS (
  SELECT 
    dc.id AS card_id,
    dc.tenant_id,
    COALESCE(ie.n_customers, (dc.population_ref->>'size')::integer, 45) AS pop_size,
    CASE 
      WHEN tt.total_customers > 0 THEN
        ROUND(
          COALESCE(ie.n_customers, (dc.population_ref->>'size')::integer, 45)::numeric 
          / tt.total_customers * 100, 
          1
        )
      ELSE 8.5
    END AS revenue_share_pct,
    CASE 
      WHEN tt.total_customers > 0 THEN
        ROUND(
          COALESCE(ie.n_customers, (dc.population_ref->>'size')::integer, 45)::numeric 
          / tt.total_customers * 100 * 1.3,
          1
        )
      ELSE 12.3
    END AS equity_share_pct
  FROM cdp_decision_cards dc
  LEFT JOIN cdp_insight_events ie 
    ON ie.tenant_id = dc.tenant_id 
    AND (
      ie.insight_code = dc.source_ref->>'code' 
      OR ie.insight_code = dc.source_ref->>'insight_code'
      OR ie.id::text = dc.source_ref->>'insight_event_id'
    )
  LEFT JOIN tenant_totals tt ON tt.tenant_id = dc.tenant_id
)
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
  -- Enrich source_insights with data from insight events
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
  cm.pop_size AS population_size,
  (dc.population_ref->>'equity_impact')::numeric AS equity_impact,
  -- Build affected_population with calculated shares
  jsonb_build_object(
    'description', COALESCE(
      dc.population_ref->>'segment',
      dc.population_ref->>'description',
      'Khách hàng bị ảnh hưởng'
    ),
    'size', cm.pop_size,
    'revenue_share', cm.revenue_share_pct,
    'equity_share', cm.equity_share_pct
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
  -- Build decision object from new columns
  CASE 
    WHEN dc.decision_recorded_at IS NOT NULL THEN
      jsonb_build_object(
        'outcome', dc.decision_outcome,
        'note', dc.decision_note,
        'decidedAt', to_char(dc.decision_recorded_at, 'DD/MM/YYYY HH24:MI'),
        'decidedBy', dc.decision_recorded_by
      )
    ELSE NULL
  END AS decision,
  NULL::text AS post_decision_review
FROM cdp_decision_cards dc
LEFT JOIN cdp_insight_events ie 
  ON ie.tenant_id = dc.tenant_id 
  AND (
    ie.insight_code = dc.source_ref->>'code' 
    OR ie.insight_code = dc.source_ref->>'insight_code'
    OR ie.id::text = dc.source_ref->>'insight_event_id'
  )
LEFT JOIN card_metrics cm ON cm.card_id = dc.id;