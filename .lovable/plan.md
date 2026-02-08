

## Fix Inventory Backfill Count Bug va Mo rong Nguon Ton Kho

### Van de 1: Count bi sai giua Job va Source Progress

**Nguyen nhan**: Khi auto-continue, ham `syncInventory` tra ve `result.processed` chi la so records xu ly trong **chunk hien tai** (vd: 500 records), khong phai tong tich luy. Sau do tai dong 2669-2672:

```text
await updateJobStatus(supabase, job.id, {
  status: 'pending',
  processed_records: result.processed || 0,  // <-- Chi la chunk hien tai!
  total_records: totalRecords,
});
```

Moi lan auto-continue ghi de `processed_records` cua job bang so cua chunk do, trong khi `backfill_source_progress` tich luy dung (63,500).

**Fix**: Thay doi logic de lay `processed_records` tu `backfill_source_progress` (source of truth) thay vi tu `result.processed`:

- Truoc khi update job status, query tong `processed_records` tu `backfill_source_progress` cho job_id do
- Dung gia tri tich luy nay de ghi vao job

### Van de 2: total_records cua Job cung bi stale

Job dang giu gia tri `1,032,601` tu lan chay cu (co date filter), trong khi source progress da cap nhat thanh `3,963,757` (khong date filter). Fix cung nam trong logic tuong tu - lay `total_records` tu source progress thay vi tu result.

### Phuong an thuc hien

#### Buoc 1: Them ham helper lay tong tu source progress

Them function `getJobTotalsFromSources(supabase, jobId)` trong `backfill-bigquery/index.ts`:
- Query `backfill_source_progress` voi `job_id`
- SUM cac truong `processed_records` va `total_records`
- Tra ve `{ totalProcessed, totalRecords }`

#### Buoc 2: Cap nhat logic update job status sau moi chunk

Tai dong ~2665-2702, thay vi dung `result.processed`, goi ham helper de lay so chinh xac tu source progress truoc khi ghi vao job.

#### Buoc 3 (cau hoi 2): Mo rong INVENTORY_SOURCES

Hien tai chi co 1 source: `bdm_kov_xuat_nhap_ton` (KiotViet xuất nhập tồn). Cac nguon ton kho tiem nang khac trong BigQuery:

| Source | Dataset | Table | Loai data |
|--------|---------|-------|-----------|
| KiotViet | olvboutique | `bdm_kov_xuat_nhap_ton` | Xuat nhap ton daily (DA CO) |
| KiotViet | olvboutique | `bdm_master_transfer` | Chuyen kho |
| KiotViet | olvboutique | `csv_bao_cao_hang_hoa_kov` | Bao cao hang hoa |
| Lazada | olvboutique_lazada | `lazada_ProductMultiWarehouseInventories` | Ton kho theo kho |
| Shopee | olvboutique_shopee | `shopee_ProductStocks` | Ton kho Shopee |
| TikTok | olvboutique_tiktokshop | `tiktok_ProductSkuStocks` | Ton kho theo SKU |
| TikTok v2 | olvboutique_tiktokshop | `tiktok_v2_productskustocks` | Ton kho v2 |
| Tiki | olvboutique_tiki | `tiki_ProductInventories` | Ton kho Tiki |

**De nghi**: Truoc khi them cac source nay, can kiem tra schema cua tung table de xac dinh:
- Cac cot nao map duoc vao `inventory_movements` (movement_date, qty, branch...)
- Cac table marketplace thuong la **snapshot ton kho hien tai** (khong co lich su daily nhu KiotViet)
- Co the can tao bang rieng `inventory_snapshots` cho data dang snapshot thay vi movement

### Chi tiet ky thuat

**File thay doi:**
- `supabase/functions/backfill-bigquery/index.ts`: Them helper function va fix logic update job counts

**Ham helper moi:**
```text
async function getJobTotalsFromSources(supabase, jobId) {
  const { data } = await supabase
    .from('backfill_source_progress')
    .select('processed_records, total_records')
    .eq('job_id', jobId);
  
  return {
    totalProcessed: data?.reduce((s, r) => s + r.processed_records, 0) || 0,
    totalRecords: data?.reduce((s, r) => s + r.total_records, 0) || 0,
  };
}
```

**Ap dung tai 2 vi tri:**
1. Khi paused (dong ~2669): dung `getJobTotalsFromSources` thay vi `result.processed`
2. Khi completed (dong ~2696): tuong tu

**Thoi gian**: Fix count bug ~15 phut. Mo rong inventory sources can kiem tra schema truoc.

