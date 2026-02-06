-- ============================================================================
-- E2E TEST SUITE - SCRIPT 12: KPI TARGETS (L3 KPI)
-- ============================================================================
-- Architecture: v1.4.2 Layer 3 - KPI
-- Creates KPI targets for performance tracking
--
-- TARGET PERIODS:
--   - Monthly targets for each KPI
--   - Based on historical performance + growth goals
--
-- EXPECTED VALUES:
--   - 100 target records (20 KPIs × 5 periods or monthly)
-- ============================================================================

-- Clean existing targets
DELETE FROM kpi_targets 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Insert KPI targets based on actual aggregated data
INSERT INTO kpi_targets (
  id, tenant_id, organization_id, kpi_definition_id,
  period_type, period_start, period_end,
  target_value, stretch_target, floor_value,
  status, created_at
)
WITH monthly_actuals AS (
  SELECT
    DATE_TRUNC('month', fact_date)::date as period_start,
    (DATE_TRUNC('month', fact_date) + INTERVAL '1 month' - INTERVAL '1 day')::date as period_end,
    kpi_code,
    SUM(kpi_value) as actual_value
  FROM kpi_facts_daily
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY DATE_TRUNC('month', fact_date), kpi_code
),
kpi_defs AS (
  SELECT id as kpi_definition_id, code as kpi_code
  FROM kpi_definitions
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
)
SELECT
  ('aaaaaaaa-targ-' || LPAD(ROW_NUMBER() OVER ()::text, 4, '0') || '-0001-000000000001')::uuid as id,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  'bbbbbbbb-1111-1111-1111-111111111111'::uuid as organization_id,
  kd.kpi_definition_id,
  'monthly' as period_type,
  ma.period_start,
  ma.period_end,
  -- Target = Actual × 1.1 (10% growth goal)
  ma.actual_value * 1.10 as target_value,
  -- Stretch = Actual × 1.2 (20% stretch)
  ma.actual_value * 1.20 as stretch_target,
  -- Floor = Actual × 0.9 (10% minimum)
  ma.actual_value * 0.90 as floor_value,
  'active' as status,
  NOW() as created_at
FROM monthly_actuals ma
JOIN kpi_defs kd ON ma.kpi_code = kd.kpi_code
WHERE ma.period_start >= '2025-01-01'  -- Only recent months
LIMIT 100;  -- Cap at 100 records

-- ============================================================================
-- ALSO POPULATE: FDP LOCKED COSTS (backward compatibility)
-- ============================================================================
DELETE FROM fdp_locked_costs 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO fdp_locked_costs (
  tenant_id, year, month,
  total_cogs, total_platform_fees, total_marketing_spend,
  avg_cogs_percent, avg_fee_percent, avg_cac,
  locked_at, locked_by
)
WITH monthly_data AS (
  SELECT 
    EXTRACT(YEAR FROM order_at)::int as year,
    EXTRACT(MONTH FROM order_at)::int as month,
    SUM(cogs) as total_cogs,
    SUM(net_revenue) as total_revenue,
    SUM(gross_margin) as total_margin,
    COUNT(*) as order_count,
    SUM(CASE 
      WHEN channel = 'Shopee' THEN net_revenue * 0.06
      WHEN channel = 'Lazada' THEN net_revenue * 0.05
      WHEN channel = 'TikTok Shop' THEN net_revenue * 0.04
      ELSE 0
    END) as total_fees
  FROM cdp_orders
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY EXTRACT(YEAR FROM order_at), EXTRACT(MONTH FROM order_at)
)
SELECT
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  year,
  month,
  total_cogs,
  total_fees as total_platform_fees,
  total_revenue * (0.08 + (month % 5) * 0.01) as total_marketing_spend,
  ROUND((total_cogs / NULLIF(total_revenue, 0) * 100)::numeric, 2) as avg_cogs_percent,
  ROUND((total_fees / NULLIF(total_revenue, 0) * 100)::numeric, 2) as avg_fee_percent,
  ROUND((total_revenue * (0.08 + (month % 5) * 0.01) / (order_count * 0.2))::numeric, 0) as avg_cac,
  (make_date(year, month, 1) + INTERVAL '1 month' + INTERVAL '5 days')::timestamptz as locked_at,
  'system_e2e_test' as locked_by
FROM monthly_data
ORDER BY year, month;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L3_KPI: TARGETS' as layer,
  COUNT(*) as total_targets,
  COUNT(DISTINCT kpi_definition_id) as unique_kpis,
  MIN(period_start) as first_period,
  MAX(period_end) as last_period
FROM kpi_targets
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'L3_KPI: FDP_LOCKED_COSTS (compat)' as layer,
  COUNT(*) as total_months,
  SUM(total_cogs) as total_cogs_all,
  ROUND(AVG(avg_cogs_percent), 1) as avg_cogs_pct
FROM fdp_locked_costs
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
