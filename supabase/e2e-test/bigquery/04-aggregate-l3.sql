-- ============================================================================
-- E2E BIGQUERY SYNC TEST - SCRIPT 04: AGGREGATE TO L3 (KPI LAYER)
-- ============================================================================
-- Aggregate L2 data to central_metric_facts (L3 KPI Layer)
-- SMB tier uses shared public schema tables
-- ============================================================================

-- Aggregate daily revenue by channel
INSERT INTO central_metric_facts (
  tenant_id, grain_type, grain_id, grain_name, 
  revenue, cost, profit, margin_percent, quantity, order_count,
  period_start, period_end
)
SELECT 
  tenant_id,
  'channel' as grain_type,
  channel as grain_id,
  channel as grain_name,
  SUM(gross_revenue) as revenue,
  SUM(COALESCE(cogs, 0)) as cost,
  SUM(net_revenue) as profit,
  CASE WHEN SUM(gross_revenue) > 0 
       THEN ROUND(SUM(net_revenue) / SUM(gross_revenue) * 100, 2) 
       ELSE 0 END as margin_percent,
  SUM(COALESCE(total_quantity, 1)) as quantity,
  COUNT(*) as order_count,
  order_at::date as period_start,
  order_at::date as period_end
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND status != 'cancelled'
GROUP BY tenant_id, channel, order_at::date
ON CONFLICT DO NOTHING;

-- Verify L3 data
SELECT 
  grain_type,
  grain_name,
  revenue,
  profit,
  margin_percent,
  order_count,
  period_start
FROM central_metric_facts 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY period_start DESC;

-- Expected result:
-- grain_type: channel
-- grain_name: shopee
-- revenue: ~3,445,998 VND (excluding cancelled)
-- order_count: 6
-- margin_percent: ~90%
