-- ============================================================================
-- E2E TEST SUITE - SCRIPT 10: KPI DEFINITIONS (L3 KPI)
-- ============================================================================
-- Architecture: v1.4.2 Layer 3 - KPI
-- Creates 20 KPI definitions covering all core metrics
--
-- CATEGORIES:
--   - Revenue: net_revenue, gross_revenue, aov
--   - Costs: cogs, platform_fees, marketing_spend
--   - Margin: gross_margin, contribution_margin
--   - Customer: customer_count, new_customers, returning_customers
--   - Efficiency: cac, ltv, ltv_cac_ratio, roas
--   - Operations: order_count, refund_rate, return_rate
--   - Retention: active_rate, churn_rate
-- ============================================================================

-- Clean existing definitions
DELETE FROM kpi_definitions 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Insert KPI definitions
INSERT INTO kpi_definitions (
  id, tenant_id, code, name, description, category,
  data_type, aggregation_method, unit, display_format,
  is_higher_better, is_active, sort_order, created_at
)
VALUES
  -- REVENUE KPIs
  ('99999999-0001-0001-0001-000000000001', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'net_revenue', 'Net Revenue', 'Total revenue after discounts', 'revenue',
   'currency', 'sum', 'VND', '₫{value:,.0f}', true, true, 1, NOW()),
   
  ('99999999-0001-0001-0001-000000000002', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'gross_revenue', 'Gross Revenue', 'Total revenue before discounts', 'revenue',
   'currency', 'sum', 'VND', '₫{value:,.0f}', true, true, 2, NOW()),
   
  ('99999999-0001-0001-0001-000000000003', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'aov', 'Average Order Value', 'Average value per order', 'revenue',
   'currency', 'avg', 'VND', '₫{value:,.0f}', true, true, 3, NOW()),
   
  -- COST KPIs
  ('99999999-0001-0001-0001-000000000004', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'cogs', 'COGS', 'Cost of Goods Sold', 'costs',
   'currency', 'sum', 'VND', '₫{value:,.0f}', false, true, 4, NOW()),
   
  ('99999999-0001-0001-0001-000000000005', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'platform_fees', 'Platform Fees', 'Marketplace platform fees', 'costs',
   'currency', 'sum', 'VND', '₫{value:,.0f}', false, true, 5, NOW()),
   
  ('99999999-0001-0001-0001-000000000006', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'marketing_spend', 'Marketing Spend', 'Total marketing/advertising spend', 'costs',
   'currency', 'sum', 'VND', '₫{value:,.0f}', false, true, 6, NOW()),
   
  -- MARGIN KPIs
  ('99999999-0001-0001-0001-000000000007', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'gross_margin', 'Gross Margin', 'Revenue minus COGS and fees', 'margin',
   'currency', 'sum', 'VND', '₫{value:,.0f}', true, true, 7, NOW()),
   
  ('99999999-0001-0001-0001-000000000008', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'contribution_margin', 'Contribution Margin', 'Gross margin minus variable costs', 'margin',
   'currency', 'sum', 'VND', '₫{value:,.0f}', true, true, 8, NOW()),
   
  ('99999999-0001-0001-0001-000000000009', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'cogs_percent', 'COGS %', 'COGS as percentage of revenue', 'margin',
   'percentage', 'avg', '%', '{value:.1f}%', false, true, 9, NOW()),
   
  -- CUSTOMER KPIs
  ('99999999-0001-0001-0001-000000000010', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'customer_count', 'Total Customers', 'Total unique customers', 'customer',
   'count', 'count_distinct', '', '{value:,}', true, true, 10, NOW()),
   
  ('99999999-0001-0001-0001-000000000011', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'new_customers', 'New Customers', 'First-time customers', 'customer',
   'count', 'count', '', '{value:,}', true, true, 11, NOW()),
   
  ('99999999-0001-0001-0001-000000000012', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'returning_customers', 'Returning Customers', 'Repeat customers', 'customer',
   'count', 'count', '', '{value:,}', true, true, 12, NOW()),
   
  -- EFFICIENCY KPIs
  ('99999999-0001-0001-0001-000000000013', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'cac', 'CAC', 'Customer Acquisition Cost', 'efficiency',
   'currency', 'avg', 'VND', '₫{value:,.0f}', false, true, 13, NOW()),
   
  ('99999999-0001-0001-0001-000000000014', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'ltv', 'LTV', 'Customer Lifetime Value', 'efficiency',
   'currency', 'avg', 'VND', '₫{value:,.0f}', true, true, 14, NOW()),
   
  ('99999999-0001-0001-0001-000000000015', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'ltv_cac_ratio', 'LTV:CAC Ratio', 'Lifetime Value to CAC ratio', 'efficiency',
   'ratio', 'avg', 'x', '{value:.1f}x', true, true, 15, NOW()),
   
  ('99999999-0001-0001-0001-000000000016', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'roas', 'ROAS', 'Return on Ad Spend', 'efficiency',
   'ratio', 'avg', 'x', '{value:.1f}x', true, true, 16, NOW()),
   
  -- OPERATIONS KPIs
  ('99999999-0001-0001-0001-000000000017', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'order_count', 'Order Count', 'Total orders', 'operations',
   'count', 'count', '', '{value:,}', true, true, 17, NOW()),
   
  ('99999999-0001-0001-0001-000000000018', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'refund_rate', 'Refund Rate', 'Percentage of orders refunded', 'operations',
   'percentage', 'avg', '%', '{value:.1f}%', false, true, 18, NOW()),
   
  -- RETENTION KPIs
  ('99999999-0001-0001-0001-000000000019', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'active_rate', 'Active Rate', 'Percentage of active customers', 'retention',
   'percentage', 'avg', '%', '{value:.1f}%', true, true, 19, NOW()),
   
  ('99999999-0001-0001-0001-000000000020', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'churn_rate', 'Churn Rate', 'Percentage of churned customers', 'retention',
   'percentage', 'avg', '%', '{value:.1f}%', false, true, 20, NOW());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L3_KPI: DEFINITIONS' as layer,
  COUNT(*) as total_definitions,
  COUNT(*) = 20 as count_ok,
  jsonb_object_agg(category, cnt ORDER BY category) as by_category
FROM (
  SELECT category, COUNT(*) as cnt
  FROM kpi_definitions
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY category
) sub;
