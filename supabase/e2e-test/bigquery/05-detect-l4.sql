-- ============================================================================
-- E2E BIGQUERY SYNC TEST - SCRIPT 05: DETECT ALERTS (L4)
-- ============================================================================
-- Generate alerts based on KPI thresholds (L4 Alert/Decision Layer)
-- ============================================================================

-- Create test alerts based on aggregated data
INSERT INTO alert_instances (
  tenant_id, alert_type, category, severity, title, message,
  object_type, object_name, metric_name, current_value, threshold_value, threshold_operator,
  status, priority, impact_amount, impact_currency
) VALUES 
  -- Alert 1: High cancellation rate
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'threshold_breach', 'operations', 'warning',
   'Tỷ lệ hủy đơn cao', 'Có 1/7 đơn hàng (14.3%) bị hủy trong ngày 02/01/2026',
   'channel', 'shopee', 'cancellation_rate', 14.3, 10.0, 'gt',
   'open', 2, 650500, 'VND'),
  -- Alert 2: Revenue threshold reached
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'threshold_breach', 'revenue', 'info',
   'Doanh thu đạt mốc', 'Doanh thu kênh Shopee đạt 3.4M VND trong ngày',
   'channel', 'shopee', 'daily_revenue', 3445998, 3000000, 'gt',
   'open', 3, NULL, NULL);

-- Verify L4 alerts
SELECT 
  alert_type,
  category,
  severity,
  title,
  status,
  priority,
  impact_amount,
  created_at
FROM alert_instances 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY priority ASC, created_at DESC;

-- Expected result:
-- 2 alerts:
--   1. "Tỷ lệ hủy đơn cao" - warning, priority 2, impact 650,500 VND
--   2. "Doanh thu đạt mốc" - info, priority 3

-- Note: In production, use detect-alerts edge function:
-- POST /functions/v1/detect-alerts { "tenant_id": "..." }
