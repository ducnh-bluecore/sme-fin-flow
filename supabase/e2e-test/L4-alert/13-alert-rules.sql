-- ============================================================================
-- E2E TEST SUITE - SCRIPT 13: ALERT RULES (L4 Alert)
-- ============================================================================
-- Architecture: v1.4.2 Layer 4 - Alert/Decision
-- Creates alert rules based on KPI thresholds
--
-- RULE TYPES:
--   - Threshold breach: KPI crosses defined threshold
--   - Trend: KPI trending in wrong direction
--   - Anomaly: Unusual pattern detected
--
-- EXPECTED VALUES:
--   - 15 alert rules covering core KPIs
-- ============================================================================

-- Clean existing rules
DELETE FROM intelligent_alert_rules 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Insert alert rules
INSERT INTO intelligent_alert_rules (
  id, tenant_id, name, description, rule_type,
  metric_code, condition_operator, threshold_value,
  severity, is_active, check_frequency, created_at
)
VALUES
  -- REVENUE ALERTS
  ('aaaaaaaa-rule-0001-0001-000000000001', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Low Daily Revenue', 'Daily revenue below threshold', 'threshold',
   'net_revenue', '<', 10000000,
   'warning', true, 'daily', NOW()),
   
  ('aaaaaaaa-rule-0001-0001-000000000002', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Revenue Drop 20%', 'Revenue dropped 20% from previous period', 'trend',
   'net_revenue', 'drop_pct', 20,
   'critical', true, 'daily', NOW()),
   
  -- MARGIN ALERTS
  ('aaaaaaaa-rule-0001-0001-000000000003', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'COGS Exceeds 55%', 'COGS percentage above 55%', 'threshold',
   'cogs_percent', '>', 55,
   'warning', true, 'daily', NOW()),
   
  ('aaaaaaaa-rule-0001-0001-000000000004', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Negative Gross Margin', 'Gross margin turned negative', 'threshold',
   'gross_margin', '<', 0,
   'critical', true, 'hourly', NOW()),
   
  -- CUSTOMER ALERTS
  ('aaaaaaaa-rule-0001-0001-000000000005', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Low New Customers', 'New customer acquisition below target', 'threshold',
   'new_customers', '<', 5,
   'info', true, 'daily', NOW()),
   
  ('aaaaaaaa-rule-0001-0001-000000000006', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'High Churn Rate', 'Customer churn rate above 10%', 'threshold',
   'churn_rate', '>', 10,
   'warning', true, 'weekly', NOW()),
   
  -- EFFICIENCY ALERTS
  ('aaaaaaaa-rule-0001-0001-000000000007', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'CAC Above LTV', 'Customer acquisition cost exceeds lifetime value', 'threshold',
   'ltv_cac_ratio', '<', 1,
   'critical', true, 'weekly', NOW()),
   
  ('aaaaaaaa-rule-0001-0001-000000000008', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Low ROAS', 'Return on ad spend below 2x', 'threshold',
   'roas', '<', 2,
   'warning', true, 'daily', NOW()),
   
  -- OPERATIONS ALERTS
  ('aaaaaaaa-rule-0001-0001-000000000009', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'High Refund Rate', 'Refund rate above 5%', 'threshold',
   'refund_rate', '>', 5,
   'warning', true, 'daily', NOW()),
   
  ('aaaaaaaa-rule-0001-0001-000000000010', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Order Volume Drop', 'Order volume dropped 30% from average', 'trend',
   'order_count', 'drop_pct', 30,
   'warning', true, 'hourly', NOW()),
   
  -- CHANNEL-SPECIFIC ALERTS
  ('aaaaaaaa-rule-0001-0001-000000000011', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Shopee Performance Drop', 'Shopee channel underperforming', 'trend',
   'net_revenue', 'drop_pct', 25,
   'info', true, 'daily', NOW()),
   
  ('aaaaaaaa-rule-0001-0001-000000000012', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Low AOV Alert', 'Average order value below ₫300K', 'threshold',
   'aov', '<', 300000,
   'info', true, 'daily', NOW()),
   
  -- SPENDING ALERTS
  ('aaaaaaaa-rule-0001-0001-000000000013', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Marketing Overspend', 'Marketing spend exceeds 15% of revenue', 'threshold',
   'marketing_spend', 'pct_of_revenue', 15,
   'warning', true, 'daily', NOW()),
   
  ('aaaaaaaa-rule-0001-0001-000000000014', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Platform Fee Spike', 'Platform fees above normal range', 'anomaly',
   'platform_fees', 'std_dev', 2,
   'info', true, 'daily', NOW()),
   
  -- CASH FLOW ALERT
  ('aaaaaaaa-rule-0001-0001-000000000015', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'Cash Flow Risk', 'Contribution margin below sustainable level', 'threshold',
   'contribution_margin', '<', 5000000,
   'critical', true, 'daily', NOW());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L4_ALERT: RULES' as layer,
  COUNT(*) as total_rules,
  COUNT(*) = 15 as count_ok,
  jsonb_object_agg(severity, cnt ORDER BY severity) as by_severity
FROM (
  SELECT severity, COUNT(*) as cnt
  FROM intelligent_alert_rules
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY severity
) sub;

SELECT 
  severity,
  COUNT(*) as rule_count,
  array_agg(name ORDER BY name) as rules
FROM intelligent_alert_rules
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY severity
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'warning' THEN 2 
    ELSE 3 
  END;
