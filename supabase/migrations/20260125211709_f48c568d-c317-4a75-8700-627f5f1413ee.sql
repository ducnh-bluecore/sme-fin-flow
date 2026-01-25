-- Update v_cdp_highlight_signals to filter out insignificant margin changes (< 5%)
CREATE OR REPLACE VIEW v_cdp_highlight_signals AS
WITH ranked_events AS (
  SELECT 
    e.tenant_id,
    e.id AS event_id,
    e.insight_code,
    r.name AS insight_name,
    r.category,
    e.as_of_date,
    e.headline,
    e.population_type,
    e.population_ref,
    e.n_customers,
    e.metric_snapshot,
    e.impact_snapshot,
    e.created_at,
    COALESCE(
      e.metric_snapshot->>'severity',
      CASE r.category
        WHEN 'VALUE' THEN 'high'
        WHEN 'RISK' THEN 'high'
        ELSE 'medium'
      END
    ) AS severity,
    COALESCE((e.metric_snapshot->>'change_percent')::numeric, 0) AS change_percent,
    CASE
      WHEN (e.metric_snapshot->>'change_percent')::numeric < 0 THEN 'down'
      WHEN (e.metric_snapshot->>'change_percent')::numeric > 0 THEN 'up'
      ELSE 'stable'
    END AS direction,
    COALESCE((e.impact_snapshot->>'revenue_impact')::numeric, 0) AS revenue_impact,
    CASE r.category
      WHEN 'VALUE' THEN 'value'
      WHEN 'TIMING' THEN 'velocity'
      WHEN 'MIX' THEN 'mix'
      WHEN 'RISK' THEN 'risk'
      WHEN 'QUALITY' THEN 'quality'
      ELSE 'other'
    END AS topic,
    row_number() OVER (
      PARTITION BY e.tenant_id 
      ORDER BY
        CASE COALESCE(e.metric_snapshot->>'severity', 'medium')
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        abs(COALESCE((e.impact_snapshot->>'revenue_impact')::numeric, 0)) DESC,
        e.created_at DESC
    ) AS rank
  FROM cdp_insight_events e
  JOIN cdp_insight_registry r ON r.insight_code = e.insight_code
  WHERE (
    (e.as_of_date >= CURRENT_DATE - INTERVAL '30 days' AND e.cooldown_until IS NULL) 
    OR e.cooldown_until <= CURRENT_DATE
  )
  -- NEW: Filter out margin insights with insignificant changes (< 5%)
  AND NOT (
    e.insight_code IN ('M01', 'M02', 'M03') 
    AND ABS(COALESCE((e.metric_snapshot->>'change_percent')::numeric, 0)) < 5
  )
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