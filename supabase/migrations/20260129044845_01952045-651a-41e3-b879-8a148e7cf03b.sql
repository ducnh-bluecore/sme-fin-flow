-- Fix cron job refresh-finance-snapshot-daily
-- Xóa cron job cũ đang truyền sai parameter
SELECT cron.unschedule('refresh-finance-snapshot-daily');

-- Tạo lại cron job với syntax đúng - truyền NULL để dùng default
SELECT cron.schedule(
  'refresh-finance-snapshot-daily',
  '0 3 * * *',
  $$
  DO $inner$
  DECLARE
    t_id UUID;
  BEGIN
    FOR t_id IN SELECT id FROM tenants WHERE is_active = true
    LOOP
      -- Gọi với explicit NULL params → trigger default 90 days
      PERFORM compute_central_metrics_snapshot(t_id, NULL::date, NULL::date);
    END LOOP;
  END $inner$;
  $$
);

-- Xóa snapshot bị lỗi (period = 1 ngày)
DELETE FROM central_metrics_snapshots
WHERE period_start = period_end
  AND DATE(snapshot_at) = CURRENT_DATE;

-- Trigger recalculate ngay lập tức cho tất cả tenants
DO $$ 
DECLARE t_id UUID;
BEGIN
  FOR t_id IN SELECT id FROM tenants WHERE is_active = true
  LOOP
    PERFORM compute_central_metrics_snapshot(t_id, NULL::date, NULL::date);
  END LOOP;
END $$;