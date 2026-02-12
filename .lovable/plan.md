

# Reset Stuck Sync Runs va Chay Lai Pipeline

## Tinh hinh hien tai

- `backfill-bigquery` da co san logic sync **tat ca channels** (Shopee, Lazada, TikTok, Tiki, KiotViet) trong cung 1 model type `orders` -- KHONG can tao them data model rieng
- Du lieu trong `cdp_orders` (L2) da day du: KiotViet toi Feb 11, Shopee toi Jan 3, etc.
- Van de: **3 daily sync runs bi treo** (Feb 9, 11, 12) o status `running` voi `succeeded_count = 0`
- Hau qua: KPI facts (L3) chi tinh toi **Feb 8**, dashboard thieu 4 ngay data gan nhat

## Nguyen nhan

Cac run bi treo co the do timeout hoac loi khi goi `backfill-bigquery` tu `daily-bigquery-sync`. Khi run cu chua ket thuc, cron tiep tuc tao run moi --> chong chat.

## Giai phap

### Buoc 1: Migration SQL - Reset stuck runs + Recompute KPI

Chay 1 migration lam 3 viec:

1. **Reset 3 runs bi treo** thanh `failed` voi error ghi ro ly do
2. **Goi `compute_kpi_facts_daily`** cho khoang Feb 1 - Feb 12 de cap nhat KPI tu du lieu L2 da co san
3. **Goi `compute_central_metrics_snapshot`** de cap nhat dashboard metrics

```sql
-- 1. Reset stuck runs
UPDATE daily_sync_runs 
SET status = 'failed', 
    error_summary = 'Auto-reset: stuck in running state',
    completed_at = NOW()
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '1 hour';

-- 2. Recompute KPI facts cho Feb 1-12
SELECT compute_kpi_facts_daily(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '2026-02-01',
  '2026-02-12'
);

-- 3. Recompute central metrics snapshot
SELECT compute_central_metrics_snapshot(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
);
```

### Buoc 2: Khong can thay doi code

- `backfill-bigquery` da xu ly dung (multi-channel trong 1 model `orders`)
- `daily-bigquery-sync` da co logic goi tuan tu tat ca model types
- Chi can reset stuck state de pipeline hoat dong lai binh thuong

## Ky vong sau fix

| Metric | Truoc | Sau |
|--------|-------|-----|
| KPI data range | Toi Feb 8 | Toi Feb 12 |
| Stuck runs | 3 runs `running` | 0 (da reset thanh `failed`) |
| Dashboard revenue | Thieu 4 ngay | Day du |
| Channel War | Chi KiotViet (thieu ngay) | KiotViet day du + cac channel co data |

## Files thay doi

| File | Thay doi |
|------|---------|
| Migration SQL | Reset stuck runs + recompute KPI Feb 1-12 + recompute snapshot |

