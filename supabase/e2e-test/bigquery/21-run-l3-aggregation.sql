-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 21: RUN L3 AGGREGATION
-- ============================================================================
-- Compute KPI facts from L2 Master Model data
-- Populates kpi_facts_daily for downstream alert detection
-- ============================================================================

-- ============================================================================
-- SECTION 1: COMPUTE DAILY KPI FACTS
-- ============================================================================

-- 1.1 Insert/Update daily revenue KPIs
INSERT INTO kpi_facts_daily (
  tenant_id,
  grain_date,
  metric_code,
  dimension_type,
  dimension_value,
  metric_value,
  comparison_value,
  period_type
)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as tenant_id,
  DATE(order_at) as grain_date,
  'NET_REVENUE' as metric_code,
  'channel' as dimension_type,
  channel as dimension_value,
  SUM(net_revenue) as metric_value,
  LAG(SUM(net_revenue)) OVER (PARTITION BY channel ORDER BY DATE(order_at)) as comparison_value,
  'daily' as period_type
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND order_at >= '2025-01-01'
  AND status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(order_at), channel
ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
DO UPDATE SET 
  metric_value = EXCLUDED.metric_value,
  comparison_value = EXCLUDED.comparison_value,
  updated_at = now();

-- 1.2 Insert/Update daily order count KPIs
INSERT INTO kpi_facts_daily (
  tenant_id,
  grain_date,
  metric_code,
  dimension_type,
  dimension_value,
  metric_value,
  comparison_value,
  period_type
)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as tenant_id,
  DATE(order_at) as grain_date,
  'ORDER_COUNT' as metric_code,
  'channel' as dimension_type,
  channel as dimension_value,
  COUNT(*) as metric_value,
  LAG(COUNT(*)) OVER (PARTITION BY channel ORDER BY DATE(order_at)) as comparison_value,
  'daily' as period_type
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND order_at >= '2025-01-01'
  AND status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(order_at), channel
ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
DO UPDATE SET 
  metric_value = EXCLUDED.metric_value,
  comparison_value = EXCLUDED.comparison_value,
  updated_at = now();

-- 1.3 Insert/Update AOV (Average Order Value) KPIs
INSERT INTO kpi_facts_daily (
  tenant_id,
  grain_date,
  metric_code,
  dimension_type,
  dimension_value,
  metric_value,
  comparison_value,
  period_type
)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as tenant_id,
  DATE(order_at) as grain_date,
  'AOV' as metric_code,
  'channel' as dimension_type,
  channel as dimension_value,
  AVG(net_revenue) as metric_value,
  LAG(AVG(net_revenue)) OVER (PARTITION BY channel ORDER BY DATE(order_at)) as comparison_value,
  'daily' as period_type
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND order_at >= '2025-01-01'
  AND status NOT IN ('cancelled', 'refunded')
  AND net_revenue > 0
GROUP BY DATE(order_at), channel
ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
DO UPDATE SET 
  metric_value = EXCLUDED.metric_value,
  comparison_value = EXCLUDED.comparison_value,
  updated_at = now();

-- 1.4 Insert/Update total (all channels combined) KPIs
INSERT INTO kpi_facts_daily (
  tenant_id,
  grain_date,
  metric_code,
  dimension_type,
  dimension_value,
  metric_value,
  comparison_value,
  period_type
)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as tenant_id,
  DATE(order_at) as grain_date,
  'NET_REVENUE' as metric_code,
  'total' as dimension_type,
  'all_channels' as dimension_value,
  SUM(net_revenue) as metric_value,
  LAG(SUM(net_revenue)) OVER (ORDER BY DATE(order_at)) as comparison_value,
  'daily' as period_type
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND order_at >= '2025-01-01'
  AND status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(order_at)
ON CONFLICT (tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)
DO UPDATE SET 
  metric_value = EXCLUDED.metric_value,
  comparison_value = EXCLUDED.comparison_value,
  updated_at = now();

-- ============================================================================
-- SECTION 2: VERIFICATION
-- ============================================================================

SELECT 
  '=== L3 KPI FACTS SUMMARY ===' as section;

-- 2.1 KPI facts count by metric
SELECT 
  metric_code,
  COUNT(*) as fact_count,
  MIN(grain_date) as earliest_date,
  MAX(grain_date) as latest_date,
  SUM(metric_value) as total_value
FROM kpi_facts_daily
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY metric_code
ORDER BY metric_code;

-- 2.2 Daily trend sample (last 7 days)
SELECT 
  grain_date,
  metric_code,
  dimension_value,
  ROUND(metric_value, 0) as value,
  ROUND(comparison_value, 0) as prev_value,
  CASE 
    WHEN comparison_value > 0 
    THEN ROUND((metric_value - comparison_value) / comparison_value * 100, 1)
    ELSE NULL
  END as change_percent
FROM kpi_facts_daily
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND metric_code = 'NET_REVENUE'
  AND dimension_type = 'total'
ORDER BY grain_date DESC
LIMIT 7;

-- ============================================================================
-- SECTION 3: CREATE KPI TARGETS (Optional)
-- ============================================================================

-- Insert monthly revenue targets for alerting
INSERT INTO kpi_targets (
  tenant_id,
  metric_code,
  dimension_type,
  dimension_value,
  target_value,
  period_type,
  period_start,
  period_end
)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'NET_REVENUE',
  'total',
  'all_channels',
  5000000000, -- 5 tỷ VND monthly target
  'monthly',
  DATE_TRUNC('month', CURRENT_DATE),
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
WHERE NOT EXISTS (
  SELECT 1 FROM kpi_targets 
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    AND metric_code = 'NET_REVENUE'
    AND period_start = DATE_TRUNC('month', CURRENT_DATE)
);

/*
============================================================================
EXPECTED RESULTS
============================================================================

KPI Facts:
- NET_REVENUE: 200-400 daily facts (per channel per day)
- ORDER_COUNT: 200-400 daily facts
- AOV: 200-400 daily facts

Total KPI Facts: 600 - 1,200 rows

============================================================================
SUCCESS CRITERIA
============================================================================
[ ] KPI facts created for all 3 metrics
[ ] All channels represented
[ ] Date range covers test period
[ ] Comparison values populated (except first day)
[ ] Total aggregation working
*/
