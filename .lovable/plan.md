

## Gom `inventory_snapshots` vao chung model `inventory`

### Y tuong

Thay vi tach 2 model type rieng biet (`inventory` va `inventory_snapshots`), gom tat ca vao 1 model `inventory` duy nhat. Khi chay backfill inventory, he thong se tu dong sync **ca 2 loai**:
1. `inventory_movements` (KiotViet - xuat nhap ton daily)
2. `inventory_snapshots` (Lazada, Shopee, TikTok, Tiki - ton kho hien tai)

### Thay doi

#### 1. Edge Function (`backfill-bigquery/index.ts`)

- **Xoa** case `inventory_snapshots` rieng trong switch handler
- **Gop** logic `syncInventorySnapshots` vao cuoi ham `syncInventory`:
  - Sau khi sync xong `INVENTORY_SOURCES` (KiotViet movements), tiep tuc sync `INVENTORY_SNAPSHOT_SOURCES` (marketplace snapshots) trong cung 1 job
  - Tat ca sources (ca movements va snapshots) deu duoc track trong `backfill_source_progress` cua cung job_id
  - Logic pause/resume van hoat dong binh thuong vi moi source co progress rieng

```text
syncInventory() {
  // Phase 1: Sync INVENTORY_SOURCES (KiotViet movements) -> inventory_movements
  for (source of INVENTORY_SOURCES) { ... }
  
  // Phase 2: Sync INVENTORY_SNAPSHOT_SOURCES (marketplace) -> inventory_snapshots  
  for (source of INVENTORY_SNAPSHOT_SOURCES) { ... }
  
  // Return combined results
}
```

#### 2. UI - Xoa `inventory_snapshots` khoi danh sach

- **`src/hooks/useBigQueryBackfill.ts`**: Xoa `inventory_snapshots` khoi `BackfillModelType`, `MODEL_TYPE_LABELS`, `MODEL_TYPE_ICONS`
- **`src/pages/admin/BigQueryBackfill.tsx`**: Xoa `inventory_snapshots` khoi `MODEL_TYPES` array
- Cap nhat label `inventory` thanh "Inventory (All Channels)" de the hien no bao gom ca movements va snapshots

#### 3. Uu diem

- 1 nut bam duy nhat de sync toan bo ton kho
- Source progress van hien thi chi tiet tung source (kiotviet, lazada, shopee, tiktok, tiki)
- Nguoi dung khong can biet su khac biet giua movements va snapshots
- Dam bao tinh nhat quan: moi lan sync inventory la sync **day du** tat ca kenh

### Chi tiet ky thuat

**Files thay doi:**
- `supabase/functions/backfill-bigquery/index.ts`: Gop snapshot sync vao cuoi `syncInventory()`, xoa `case 'inventory_snapshots'`
- `src/hooks/useBigQueryBackfill.ts`: Xoa type, labels, icons cua `inventory_snapshots`; update label inventory
- `src/pages/admin/BigQueryBackfill.tsx`: Xoa `inventory_snapshots` khoi MODEL_TYPES

**Logic merge trong `syncInventory`:**
- Sau vong lap `INVENTORY_SOURCES`, them vong lap `INVENTORY_SNAPSHOT_SOURCES`
- Moi snapshot source: count records, init progress, fetch chunks, upsert vao `inventory_snapshots` (giu nguyen logic hien tai cua `syncInventorySnapshots`)
- Tat ca source results gop chung vao 1 mang `sourceResults`

