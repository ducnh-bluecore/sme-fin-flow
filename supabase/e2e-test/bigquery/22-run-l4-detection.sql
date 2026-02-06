-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 22: RUN L4 ALERT DETECTION
-- ============================================================================
-- Detect alerts from L3 KPI data
-- Populates alert_instances for Control Tower
-- ============================================================================

-- ============================================================================
-- SECTION 1: DETECT REVENUE DROP ALERTS
-- ============================================================================

-- 1.1 Detect significant daily revenue drops (>20% day-over-day)
INSERT INTO alert_instances (
  tenant_id,
  alert_type,
  category,
  severity,
  title,
  message,
  status,
  current_value,
  threshold_value,
  change_percent,
  impact_amount,
  impact_currency,
  metric_name,
  object_type,
  object_name,
  suggested_action,
  created_at
)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'threshold_breach',
  'revenue',
  CASE 
    WHEN (kf.metric_value - kf.comparison_value) / NULLIF(kf.comparison_value, 0) * 100 < -30 THEN 'critical'
    WHEN (kf.metric_value - kf.comparison_value) / NULLIF(kf.comparison_value, 0) * 100 < -20 THEN 'high'
    ELSE 'medium'
  END,
  'Revenue Drop Alert: ' || kf.dimension_value,
  'Daily revenue dropped ' || 
    ROUND(ABS((kf.metric_value - kf.comparison_value) / NULLIF(kf.comparison_value, 0) * 100), 1)::text || 
    '% on ' || kf.grain_date::text,
  'open',
  kf.metric_value,
  kf.comparison_value * 0.8, -- 80% of previous day as threshold
  ROUND((kf.metric_value - kf.comparison_value) / NULLIF(kf.comparison_value, 0) * 100, 2),
  kf.comparison_value - kf.metric_value, -- Impact = lost revenue
  'VND',
  'NET_REVENUE',
  'channel',
  kf.dimension_value,
  'Investigate ' || kf.dimension_value || ' channel performance. Check promotions, stock, and competition.',
  kf.grain_date::timestamptz
FROM kpi_facts_daily kf
WHERE kf.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND kf.metric_code = 'NET_REVENUE'
  AND kf.comparison_value IS NOT NULL
  AND kf.comparison_value > 0
  AND (kf.metric_value - kf.comparison_value) / kf.comparison_value < -0.20 -- >20% drop
  AND kf.grain_date >= CURRENT_DATE - INTERVAL '30 days' -- Last 30 days only
ON CONFLICT DO NOTHING;

-- 1.2 Detect low AOV alerts (below 200K VND)
INSERT INTO alert_instances (
  tenant_id,
  alert_type,
  category,
  severity,
  title,
  message,
  status,
  current_value,
  threshold_value,
  metric_name,
  object_type,
  object_name,
  suggested_action,
  created_at
)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'threshold_breach',
  'unit_economics',
  'medium',
  'Low AOV Alert: ' || kf.dimension_value,
  'Average order value is ' || ROUND(kf.metric_value, 0)::text || ' VND on ' || kf.grain_date::text,
  'open',
  kf.metric_value,
  200000, -- 200K VND threshold
  'AOV',
  'channel',
  kf.dimension_value,
  'Consider bundling offers or minimum order promotions for ' || kf.dimension_value,
  kf.grain_date::timestamptz
FROM kpi_facts_daily kf
WHERE kf.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND kf.metric_code = 'AOV'
  AND kf.metric_value < 200000
  AND kf.grain_date >= CURRENT_DATE - INTERVAL '7 days' -- Last 7 days only
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 2: DETECT ORDER COUNT ANOMALIES
-- ============================================================================

-- 2.1 Detect significant order count drops
INSERT INTO alert_instances (
  tenant_id,
  alert_type,
  category,
  severity,
  title,
  message,
  status,
  current_value,
  threshold_value,
  change_percent,
  metric_name,
  object_type,
  object_name,
  suggested_action,
  created_at
)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'anomaly',
  'operations',
  CASE 
    WHEN (kf.metric_value - kf.comparison_value) / NULLIF(kf.comparison_value, 0) * 100 < -40 THEN 'critical'
    ELSE 'high'
  END,
  'Order Volume Drop: ' || kf.dimension_value,
  'Order count dropped ' || 
    ROUND(ABS((kf.metric_value - kf.comparison_value) / NULLIF(kf.comparison_value, 0) * 100), 1)::text || 
    '% on ' || kf.grain_date::text,
  'open',
  kf.metric_value,
  kf.comparison_value * 0.7, -- 70% of previous day as threshold
  ROUND((kf.metric_value - kf.comparison_value) / NULLIF(kf.comparison_value, 0) * 100, 2),
  'ORDER_COUNT',
  'channel',
  kf.dimension_value,
  'Check for technical issues, stock availability, or competitor activity on ' || kf.dimension_value,
  kf.grain_date::timestamptz
FROM kpi_facts_daily kf
WHERE kf.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND kf.metric_code = 'ORDER_COUNT'
  AND kf.comparison_value IS NOT NULL
  AND kf.comparison_value > 10 -- Only alert if previous day had meaningful volume
  AND (kf.metric_value - kf.comparison_value) / kf.comparison_value < -0.30 -- >30% drop
  AND kf.grain_date >= CURRENT_DATE - INTERVAL '14 days' -- Last 14 days only
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 3: VERIFICATION
-- ============================================================================

SELECT 
  '=== L4 ALERT INSTANCES SUMMARY ===' as section;

-- 3.1 Alert count by category and severity
SELECT 
  category,
  severity,
  COUNT(*) as alert_count,
  ROUND(AVG(ABS(impact_amount)), 0) as avg_impact_vnd
FROM alert_instances
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY category, severity
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    ELSE 4 
  END;

-- 3.2 Top 10 alerts by impact
SELECT 
  title,
  severity,
  ROUND(current_value, 0) as current_val,
  ROUND(threshold_value, 0) as threshold,
  change_percent,
  ROUND(impact_amount, 0) as impact_vnd,
  object_name as channel,
  created_at::date as alert_date
FROM alert_instances
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY ABS(COALESCE(impact_amount, 0)) DESC
LIMIT 10;

-- 3.3 Alert trend by date
SELECT 
  created_at::date as alert_date,
  category,
  COUNT(*) as alert_count
FROM alert_instances
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY created_at::date, category
ORDER BY alert_date DESC
LIMIT 20;

/*
============================================================================
EXPECTED RESULTS
============================================================================

Alert Distribution:
- revenue: 10-30 alerts (revenue drops)
- unit_economics: 5-15 alerts (low AOV)
- operations: 5-20 alerts (order count anomalies)

Total Alerts: 20-65 depending on data variability

Severity Distribution:
- critical: 5-10%
- high: 20-30%
- medium: 60-70%

============================================================================
SUCCESS CRITERIA
============================================================================
[ ] Alerts generated from KPI data
[ ] Severity levels assigned correctly
[ ] Impact amounts calculated
[ ] Suggested actions populated
[ ] No duplicate alerts
*/
