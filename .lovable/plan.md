

# Backfill Size Breakdown cho Allocation Recommendations

## Van de
- DB function `fn_allocate_size_split` da ton tai va hoat dong
- Engine code da goi RPC sau khi tinh qty
- Nhung **tat ca 1459 records hien tai deu co `size_breakdown = NULL`** vi chung duoc tao TRUOC khi function va code duoc deploy
- Ket qua: bang hien thi khong co thong tin size nhu screenshot

## Giai phap: Backfill Edge Function

Tao mot edge function `inventory-backfill-size-split` de:
1. Query tat ca `inv_allocation_recommendations` va `inv_rebalance_suggestions` co `size_breakdown IS NULL`
2. Goi `fn_allocate_size_split` cho tung record (batch 20 song song)
3. Update `size_breakdown` vao DB
4. Tra ve so luong da xu ly

### Flow

```text
Client -> POST /inventory-backfill-size-split { tenant_id, run_id? }
  -> Query records WHERE size_breakdown IS NULL
  -> For each record: call fn_allocate_size_split(fc_id, source, dest, qty)
  -> UPDATE inv_allocation_recommendations SET size_breakdown = result
  -> Return { updated_count }
```

### Files can tao/sua

1. **Tao** `supabase/functions/inventory-backfill-size-split/index.ts`
   - Nhan `tenant_id`, optional `run_id`
   - Query records null size_breakdown (ca allocation_recommendations va rebalance_suggestions)
   - Batch goi RPC `fn_allocate_size_split`
   - Update tung record voi ket qua
   - Tra ve thong ke

2. **Sua** `src/pages/command/AllocationPage.tsx` (hoac component tuong ung)
   - Them nut "Backfill Size" (hien chi khi co records thieu size)
   - Goi edge function va refresh data sau khi xong

### Chi tiet ky thuat

Edge function logic:
- Query: `SELECT id, fc_id, store_id, recommended_qty FROM inv_allocation_recommendations WHERE tenant_id = ? AND size_breakdown IS NULL`
- Batch 20: `Promise.all(batch.map(rec => supabase.rpc('fn_allocate_size_split', {...})))`
- Update: `supabase.from('inv_allocation_recommendations').update({ size_breakdown: result }).eq('id', rec.id)`
- Tuong tu cho `inv_rebalance_suggestions` (dung `qty` thay vi `recommended_qty`, dung `to_location` thay vi `store_id`)

### Xu ly edge case
- RPC tra ve `[]` (khong co size nao tai nguon) -> luu `[]` de danh dau da xu ly, UI hien "Khong co ton"
- RPC fail -> skip, giu NULL de retry lan sau
- Record da co size_breakdown -> skip (WHERE IS NULL)

### Sau khi backfill xong
- Tat ca records se co size badges hien thi trong bang
- Excel export se xuat theo tung size/SKU
- Cac lan chay engine moi se tu dong co size (code da san)

