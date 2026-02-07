

## Hai che do sync BigQuery: Manual (Full) va Tu dong (Incremental)

### Tong quan

| Che do | Khi nao | Cach chay | Date filter |
|--------|---------|-----------|-------------|
| **Manual (Full Backfill)** | Lan dau, hoac khi can re-sync toan bo | Admin bam nut tren UI | Khong co `date_from` - scan full |
| **Tu dong (Daily Incremental)** | Moi ngay 8h sang | Cron job tu dong | `date_from` = 2 ngay truoc |

### Nhung gi da co

- `backfill-bigquery`: Function chinh, da ho tro `date_from` trong options, da fix upsert/date filter o buoc truoc
- `scheduled-bigquery-sync`: Function CU, sai config (target `external_orders`, dataset `menstaysimplicity_shopee`) - **KHONG dung duoc, can xoa**
- Admin UI tai `/admin/bigquery-backfill`: Giao dien manual backfill da hoat dong

### Can lam

#### 1. Tao Edge Function `daily-bigquery-sync`

Orchestrator moi, goi `backfill-bigquery` lien tiep cho tung model type:

```text
daily-bigquery-sync (cron 8h AM)
  |
  +-> backfill-bigquery(products, date_from=2d ago)
  +-> backfill-bigquery(customers, date_from=2d ago)  
  +-> backfill-bigquery(orders, date_from=2d ago)
  +-> backfill-bigquery(order_items, date_from=2d ago)
  +-> RPC: update_order_items_cogs()
  +-> backfill-bigquery(payments, date_from=2d ago)
  +-> backfill-bigquery(fulfillments, date_from=2d ago)
  +-> backfill-bigquery(refunds, date_from=2d ago)
  +-> backfill-bigquery(ad_spend, date_from=2d ago)
  +-> backfill-bigquery(campaigns, date_from=2d ago)
```

Logic:
- Tinh `date_from` = today - 2 ngay (lookback window)
- Goi tung model type theo thu tu dependency
- Sau order_items, goi `update_order_items_cogs()` de cap nhat gia von
- Log ket qua tung buoc va tong thoi gian
- Neu mot model fail, tiep tuc model tiep theo (khong dung lai)

#### 2. Thiet lap Cron Job

Dung `pg_cron` + `pg_net` de goi function moi ngay:

```text
Schedule: '0 1 * * *'  (1:00 AM UTC = 8:00 AM Vietnam)
Target: POST /functions/v1/daily-bigquery-sync
Tenant: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

#### 3. Xoa function cu `scheduled-bigquery-sync`

Function nay dung config sai, khong tuong thich voi kien truc hien tai. Can xoa de tranh nham lan.

### Chi tiet ky thuat

#### File tao moi: `supabase/functions/daily-bigquery-sync/index.ts`

- Su dung `SUPABASE_SERVICE_ROLE_KEY` de goi `backfill-bigquery` noi bo
- Moi model type duoc goi voi `action: 'start'` va `options.date_from`
- Timeout-safe: moi model chay doc lap, khong bi anh huong boi model khac
- Ket qua duoc log va tra ve trong response

#### Migration SQL: Tao cron job

- Enable `pg_cron` va `pg_net` extensions (neu chua co)
- Tao schedule goi `daily-bigquery-sync` luc 1:00 AM UTC

#### Xoa: `supabase/functions/scheduled-bigquery-sync/`

- Function cu voi config sai, thay the bang `daily-bigquery-sync`

### Ket qua

- **Lan dau**: Admin vao UI, bam "Start Backfill" cho tung model - keo full data
- **Hang ngay**: Cron tu dong chay luc 8h sang, chi keo 2 ngay gan nhat
- **Data cu**: Khong bi anh huong, chi update nhung record thay doi trong 2 ngay lookback

