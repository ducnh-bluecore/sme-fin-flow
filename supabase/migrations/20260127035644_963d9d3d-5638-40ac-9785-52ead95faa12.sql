-- Phase C: Schedule Working Capital Daily cron job (skip unschedule since job doesn't exist)

-- Schedule daily working capital refresh
SELECT cron.schedule(
  'refresh-working-capital-daily',
  '5 3 * * *',
  $$SELECT compute_working_capital_daily(id) FROM tenants WHERE is_active = true;$$
);

-- Populate historical working capital data for E2E tenant (last 90 days)
INSERT INTO working_capital_daily (
  tenant_id, day, dso, dio, dpo, ccc,
  total_ar, overdue_ar, total_ap, overdue_ap, inventory,
  net_working_capital, cash_balance
)
SELECT 
  s.tenant_id,
  gs::date as day,
  s.dso,
  s.dio,
  s.dpo,
  s.ccc,
  s.total_ar,
  s.overdue_ar,
  s.total_ap,
  s.overdue_ap,
  s.total_inventory_value,
  s.total_ar + s.total_inventory_value - s.total_ap,
  s.cash_today
FROM (
  SELECT *
  FROM central_metrics_snapshots
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    AND net_revenue > 0
  ORDER BY created_at DESC
  LIMIT 1
) s
CROSS JOIN generate_series(
  CURRENT_DATE - INTERVAL '90 days',
  CURRENT_DATE - INTERVAL '1 day',
  INTERVAL '1 day'
) gs
ON CONFLICT (tenant_id, day) DO NOTHING;