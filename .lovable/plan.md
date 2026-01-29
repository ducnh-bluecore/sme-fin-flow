
# FIX: Working Capital Metrics = 0 (DSO/DIO/DPO/CCC)

## Nguyên nhân gốc

Cron job `refresh-finance-snapshot-daily` (chạy lúc 3:00 AM UTC) đang gọi hàm sai:

```sql
-- ❌ SAI - Đang truyền current_date vào p_start_date
PERFORM compute_central_metrics_snapshot(t_id, current_date);
```

Điều này khiến hàm tính metrics chỉ trong 1 ngày (hôm nay) thay vì 90 ngày trailing:
- `period_start = 2026-01-29`
- `period_end = 2026-01-29`
- Không có orders nào trong 1 ngày → **tất cả metrics = 0**

## Giải pháp

### Migration SQL - Fix cron job command

```sql
-- Xóa cron job cũ và tạo lại với syntax đúng
SELECT cron.unschedule('refresh-finance-snapshot-daily');

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
      -- ✅ ĐÚNG: Không truyền parameters → dùng default (90 days trailing)
      PERFORM compute_central_metrics_snapshot(t_id);
    END LOOP;
  END $inner$;
  $$
);

-- Xóa snapshot bị lỗi (period = 1 ngày)
DELETE FROM central_metrics_snapshots
WHERE period_start = period_end
  AND DATE(snapshot_at) = CURRENT_DATE;

-- Trigger recalculate ngay lập tức với 90 days trailing
DO $$ 
DECLARE t_id UUID;
BEGIN
  FOR t_id IN SELECT id FROM tenants WHERE is_active = true
  LOOP
    PERFORM compute_central_metrics_snapshot(t_id);
  END LOOP;
END $$;
```

## Kết quả sau fix

| Metric | Hiện tại (bị lỗi) | Sau fix (dự kiến) |
|--------|------------------|-------------------|
| DSO | 0 ngày | ~49 ngày |
| DIO | 0 ngày | ~365 ngày |
| DPO | 0 ngày | ~263 ngày |
| CCC | 0 ngày | ~151 ngày |
| Net Revenue | 0₫ | ~340M₫ |

## Files cần tạo

| File | Loại | Mô tả |
|------|------|-------|
| Migration SQL | Tạo mới | Fix cron job + cleanup + recalculate |

## Timeline
- Estimate: 5 phút
- Metrics sẽ khôi phục ngay sau migration chạy
