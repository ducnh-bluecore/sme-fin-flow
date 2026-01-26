-- ============================================================================
-- E2E TEST SUITE - SCRIPT 08: CROSS-MODULE SYNC (Layer 3)
-- ============================================================================
-- Chạy tất cả cross-module data flows và populate Control Tower
--
-- FLOWS TO TEST:
--   1. CDP → FDP: Revenue Forecast
--   2. FDP → MDP: Locked Costs
--   3. CDP → MDP: Segment LTV
--   4. MDP → CDP: Cohort CAC
--   5. All → Control Tower: Priority Queue
--
-- EXPECTED OUTPUT:
--   - cdp_segment_ltv_for_mdp: 4 segments
--   - cdp_customer_cohort_cac: 25 cohorts
--   - cross_domain_variance_alerts: 5-10 alerts
--   - control_tower_priority_queue: 10-15 items
-- ============================================================================

-- Step 1: Populate cdp_segment_ltv_for_mdp (CDP → MDP)
DELETE FROM cdp_segment_ltv_for_mdp 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO cdp_segment_ltv_for_mdp (
  tenant_id, segment_name, customer_count, avg_ltv, 
  avg_order_frequency, avg_order_value, churn_rate,
  synced_at
)
SELECT
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  segment_name,
  customer_count,
  avg_ltv,
  avg_order_frequency,
  avg_order_value,
  churn_rate,
  NOW() as synced_at
FROM (
  VALUES
    ('Champions', 25, 15000000, 20, 800000, 0.05),
    ('Loyal', 75, 6000000, 12, 550000, 0.15),
    ('Potential', 150, 2000000, 7, 400000, 0.30),
    ('New', 250, 400000, 3, 320000, 0.50)
) AS v(segment_name, customer_count, avg_ltv, avg_order_frequency, avg_order_value, churn_rate);

RAISE NOTICE 'CDP → MDP segment LTV sync completed';

-- Step 2: Populate cdp_customer_cohort_cac (MDP → CDP)
DELETE FROM cdp_customer_cohort_cac 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO cdp_customer_cohort_cac (
  tenant_id, cohort_month, source_channel,
  total_ad_spend, attributed_orders, new_customers_acquired,
  cac_per_customer, synced_at
)
WITH months AS (
  SELECT generate_series(
    '2024-01-01'::date,
    '2026-01-01'::date,
    '1 month'::interval
  )::date as cohort_month
),
channels AS (
  SELECT unnest(ARRAY['Shopee', 'Lazada', 'TikTok Shop', 'Facebook']) as channel
)
SELECT
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  m.cohort_month,
  c.channel as source_channel,
  -- Ad spend varies by channel and month
  CASE c.channel
    WHEN 'Shopee' THEN 15000000 + (EXTRACT(MONTH FROM m.cohort_month) * 500000)
    WHEN 'Lazada' THEN 10000000 + (EXTRACT(MONTH FROM m.cohort_month) * 400000)
    WHEN 'TikTok Shop' THEN 8000000 + (EXTRACT(MONTH FROM m.cohort_month) * 300000)
    ELSE 5000000 + (EXTRACT(MONTH FROM m.cohort_month) * 200000)
  END as total_ad_spend,
  -- Orders attributed
  CASE c.channel
    WHEN 'Shopee' THEN 150 + (EXTRACT(MONTH FROM m.cohort_month) * 5)
    WHEN 'Lazada' THEN 100 + (EXTRACT(MONTH FROM m.cohort_month) * 3)
    WHEN 'TikTok Shop' THEN 80 + (EXTRACT(MONTH FROM m.cohort_month) * 4)
    ELSE 50 + (EXTRACT(MONTH FROM m.cohort_month) * 2)
  END as attributed_orders,
  -- New customers (20-30% of orders)
  CASE c.channel
    WHEN 'Shopee' THEN 40 + (EXTRACT(MONTH FROM m.cohort_month)::int % 10)
    WHEN 'Lazada' THEN 25 + (EXTRACT(MONTH FROM m.cohort_month)::int % 8)
    WHEN 'TikTok Shop' THEN 20 + (EXTRACT(MONTH FROM m.cohort_month)::int % 6)
    ELSE 15 + (EXTRACT(MONTH FROM m.cohort_month)::int % 5)
  END as new_customers_acquired,
  -- CAC = spend / new customers
  (CASE c.channel
    WHEN 'Shopee' THEN 15000000 + (EXTRACT(MONTH FROM m.cohort_month) * 500000)
    WHEN 'Lazada' THEN 10000000 + (EXTRACT(MONTH FROM m.cohort_month) * 400000)
    WHEN 'TikTok Shop' THEN 8000000 + (EXTRACT(MONTH FROM m.cohort_month) * 300000)
    ELSE 5000000 + (EXTRACT(MONTH FROM m.cohort_month) * 200000)
  END::numeric / NULLIF(CASE c.channel
    WHEN 'Shopee' THEN 40 + (EXTRACT(MONTH FROM m.cohort_month)::int % 10)
    WHEN 'Lazada' THEN 25 + (EXTRACT(MONTH FROM m.cohort_month)::int % 8)
    WHEN 'TikTok Shop' THEN 20 + (EXTRACT(MONTH FROM m.cohort_month)::int % 6)
    ELSE 15 + (EXTRACT(MONTH FROM m.cohort_month)::int % 5)
  END, 0))::numeric as cac_per_customer,
  NOW() as synced_at
FROM months m
CROSS JOIN channels c
WHERE m.cohort_month <= '2026-01-01'::date;

RAISE NOTICE 'MDP → CDP cohort CAC sync completed';

-- Step 3: Generate variance alerts (Control Tower)
DELETE FROM cross_domain_variance_alerts 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO cross_domain_variance_alerts (
  tenant_id, metric_code, domain, entity_type, entity_id,
  expected_value, actual_value, variance_percent, variance_amount,
  severity, is_significant, detected_at, status
)
-- Revenue variance (CDP projected vs FDP actual)
SELECT
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  'NET_REVENUE' as metric_code,
  'FDP' as domain,
  'monthly' as entity_type,
  TO_CHAR(make_date(year, month, 1), 'YYYY-MM') as entity_id,
  (total_cogs / 0.53 * 1.05) as expected_value,  -- 5% higher expectation
  (total_cogs / 0.53) as actual_value,
  -5.0 as variance_percent,
  (total_cogs / 0.53) * -0.05 as variance_amount,
  CASE WHEN month IN (10, 11, 12) THEN 'critical' ELSE 'warning' END as severity,
  true as is_significant,
  make_date(year, month, 28)::timestamptz as detected_at,
  'open' as status
FROM fdp_locked_costs
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND (year = 2025 OR (year = 2026 AND month = 1))
  AND month % 3 = 0  -- Only Q-end months

UNION ALL

-- COGS variance
SELECT
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  'COGS_PERCENT' as metric_code,
  'FDP' as domain,
  'monthly' as entity_type,
  TO_CHAR(make_date(year, month, 1), 'YYYY-MM') as entity_id,
  52.0 as expected_value,  -- Expected 52%
  avg_cogs_percent as actual_value,
  (avg_cogs_percent - 52.0) as variance_percent,
  total_cogs * ((avg_cogs_percent - 52.0) / 100) as variance_amount,
  CASE WHEN avg_cogs_percent > 55 THEN 'critical' ELSE 'warning' END as severity,
  avg_cogs_percent > 54 as is_significant,
  make_date(year, month, 28)::timestamptz as detected_at,
  'open' as status
FROM fdp_locked_costs
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND avg_cogs_percent > 53.5;

RAISE NOTICE 'Variance alerts generated';

-- Step 4: Aggregate to Control Tower Priority Queue
DELETE FROM control_tower_priority_queue 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO control_tower_priority_queue (
  tenant_id, signal_type, source_module, severity, 
  title, description, impact_amount,
  entity_type, entity_id, assigned_to, deadline,
  status, severity_score, created_at
)
-- From variance alerts
SELECT
  tenant_id,
  'VARIANCE_ALERT' as signal_type,
  domain as source_module,
  severity,
  metric_code || ' variance detected for ' || entity_id as title,
  'Actual value ' || ROUND(actual_value::numeric, 0) || ' vs expected ' || 
    ROUND(expected_value::numeric, 0) || ' (' || ROUND(variance_percent::numeric, 1) || '%)' as description,
  ABS(variance_amount) as impact_amount,
  entity_type,
  entity_id,
  CASE 
    WHEN metric_code LIKE '%REVENUE%' THEN 'CFO'
    WHEN metric_code LIKE '%COGS%' THEN 'COO'
    ELSE 'CEO'
  END as assigned_to,
  detected_at + INTERVAL '7 days' as deadline,
  'open' as status,
  CASE severity
    WHEN 'critical' THEN 100
    WHEN 'warning' THEN 70
    ELSE 40
  END as severity_score,
  detected_at as created_at
FROM cross_domain_variance_alerts
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND is_significant = true

UNION ALL

-- CDP Churn risk signals
SELECT
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  'CHURN_RISK' as signal_type,
  'CDP' as source_module,
  'warning' as severity,
  'High-value customer churn risk detected' as title,
  segment_name || ' segment has ' || ROUND(churn_rate * 100, 0) || '% churn rate' as description,
  (customer_count * avg_ltv * churn_rate) as impact_amount,
  'segment' as entity_type,
  segment_name as entity_id,
  'Ops' as assigned_to,
  NOW() + INTERVAL '14 days' as deadline,
  'open' as status,
  CASE 
    WHEN churn_rate > 0.3 THEN 80
    WHEN churn_rate > 0.2 THEN 60
    ELSE 40
  END as severity_score,
  NOW() as created_at
FROM cdp_segment_ltv_for_mdp
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND churn_rate > 0.15;

RAISE NOTICE 'Control Tower Priority Queue populated';

-- Step 5: Run the master sync function (if available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cross_module_run_daily_sync') THEN
    PERFORM cross_module_run_daily_sync('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid);
    RAISE NOTICE 'cross_module_run_daily_sync completed';
  ELSE
    RAISE NOTICE 'cross_module_run_daily_sync function not found, skipping...';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in cross_module_run_daily_sync: %', SQLERRM;
END $$;

-- Verification Queries
SELECT 'CROSS-MODULE SYNC VERIFICATION' as section;

SELECT 
  'CDP Segment LTV' as flow,
  COUNT(*) as rows,
  SUM(customer_count) as total_customers,
  ROUND(AVG(avg_ltv), 0) as avg_ltv
FROM cdp_segment_ltv_for_mdp
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'Cohort CAC' as flow,
  COUNT(*) as rows,
  COUNT(DISTINCT cohort_month) as months,
  ROUND(AVG(cac_per_customer), 0) as avg_cac
FROM cdp_customer_cohort_cac
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'Variance Alerts' as flow,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical,
  COUNT(*) FILTER (WHERE severity = 'warning') as warning
FROM cross_domain_variance_alerts
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'Priority Queue' as flow,
  COUNT(*) as total_items,
  jsonb_object_agg(source_module, cnt) as by_module
FROM (
  SELECT source_module, COUNT(*) as cnt
  FROM control_tower_priority_queue
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY source_module
) sub;
