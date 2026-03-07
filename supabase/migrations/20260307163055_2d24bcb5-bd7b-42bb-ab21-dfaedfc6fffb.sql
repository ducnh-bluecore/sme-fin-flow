
-- ============================================
-- Add all missing daily cron jobs
-- ============================================

-- 1. Finance Snapshots (2:00 AM UTC)
SELECT cron.schedule(
  'refresh-finance-snapshot-daily',
  '0 2 * * *',
  $$SELECT public.refresh_finance_snapshot('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')$$
);

-- 2. Working Capital refresh (2:10 AM UTC)
SELECT cron.schedule(
  'refresh-working-capital-daily',
  '10 2 * * *',
  $$SELECT public.refresh_working_capital_snapshot('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')$$
);

-- 3. Finance Expenses refresh (2:20 AM UTC)
SELECT cron.schedule(
  'refresh-finance-expenses-daily',
  '20 2 * * *',
  $$SELECT public.refresh_finance_expenses_snapshot('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')$$
);

-- 4. Inventory KPI Engine (4:30 AM UTC - after lifecycle sync)
SELECT cron.schedule(
  'inventory-kpi-engine-daily',
  '30 4 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/inventory-kpi-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}'::jsonb
  )$$
);

-- 5. CDP Full Pipeline (3:00 AM UTC)
SELECT cron.schedule(
  'cdp-full-pipeline-daily',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scheduled-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action": "cdp_full_pipeline", "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}'::jsonb
  )$$
);

-- 6. Build Knowledge Snapshots (5:00 AM UTC - after all data ready)
SELECT cron.schedule(
  'build-knowledge-snapshots-daily',
  '0 5 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/build-knowledge-snapshots',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}'::jsonb
  )$$
);

-- 7. Compute KPI Pipeline (2:30 AM UTC)
SELECT cron.schedule(
  'compute-kpi-pipeline-daily',
  '30 2 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/compute-kpi-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}'::jsonb
  )$$
);

-- 8. Ads Sync Campaigns (6:00 AM UTC)
SELECT cron.schedule(
  'ads-sync-campaigns-daily',
  '0 6 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ads-sync-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}'::jsonb
  )$$
);
