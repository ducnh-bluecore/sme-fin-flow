
# Plan: Tach Size Khi Chay Engine + Chi tiet Size + Chinh sua So luong

## Tong quan

3 thay doi chinh:
1. **Engine tach size ngay khi chay** (khong can backfill rieng)
2. **Hien thi chi tiet tung size** giong kieu le size (kho nguon, kho dich, toc do ban, sold 7 ngay, net benefit)
3. **Cho phep chinh sua so luong** truoc khi duyet (vi day la de xuat, khong phai quyet dinh)

---

## 1. Engine tu dong tach size khi chay

**Hien tai**: Engine tao de xuat o cap FC (size_breakdown = null), phai chay "Tach theo Size" rieng.

**Thay doi**: Sau khi tao tat ca recs, goi `fn_allocate_size_split` cho tung rec truoc khi persist.

### File: `supabase/functions/inventory-allocation-engine/index.ts`

- Sau khi build `allRecs` (truoc buoc Persist), them 1 buoc moi:
  - Loop qua tung rec, goi RPC `fn_allocate_size_split` voi params: `(tenant_id, fc_id, null, store_id, recommended_qty)`
  - Gan ket qua vao `rec.size_breakdown`
  - Xu ly theo batch (20 rec/batch) de tranh timeout
  - Neu RPC loi cho 1 rec, set `size_breakdown = []` va tiep tuc
- Tuong tu cho rebalance: Cap nhat `fn_rebalance_engine` RPC hoac goi size split sau khi rebalance hoan thanh

### Luu y hieu nang:
- Batch 20 recs x Promise.allSettled
- Timeout guard: neu > 50s thi dung va de nhung rec con lai co size_breakdown = null
- Log so luong da tach / chua tach

---

## 2. Hien thi chi tiet tung size trong bang de xuat

**Hien tai**: Bang chi hien thi ten SP, tu kho, SL, Revenue, Ly do.

**Thay doi**: Khi expand 1 dong (click vao row), hien thi chi tiet tung size giong screenshot (image-179):

```text
+------------------+------+-----------+-----+----------+-----------+--------+
| Mau SP           | Size | Tu Kho    | SL  | Loi ich  | Muc dich  | Trang thai
+------------------+------+-----------+-----+----------+-----------+--------+
| Ngua Hong OLV    | FS   | OLV Giga  | [3] | 1 tr     | Can bang  | O X
+------------------+------+-----------+-----+----------+-----------+--------+
  Kho nguon: 98u (con 95u)  |  Kho dich: 1u (con 1u)  |  Toc do ban: 4.81u/ngay
  Revenue DK: 2tr           |  Chi phi VC: 70K         |  Net Benefit: 1tr
  Da ban 7 ngay: X units    |  Ton size tai dich: ...
```

### File: `src/components/inventory/DailyTransferOrder.tsx`

- Them state `expandedRows: Set<string>` de track dong nao dang mo
- Click vao row -> toggle expand
- Khi expand, hien thi grid 3 cot:
  - **Kho nguon**: source_on_hand, con lai sau chuyen
  - **Kho dich**: dest_on_hand, con lai sau nhan  
  - **Toc do ban dich**: velocity (units/ngay), het hang trong X ngay
- Them row: Revenue DK, Chi phi VC, Net Benefit
- Them row: "Da ban 7 ngay" - lay tu `inv_state_demand.total_sold` (fetch khi expand)
- Hien thi bang size_breakdown voi tung size co the chinh SL

### Fetch "Da ban 7 ngay":
- Dung du lieu tu `inv_state_demand` (da co `total_sold` field) 
- Truyen qua props hoac fetch lazy khi expand row
- Thuc te: Engine da fetch demand data, nen luu them `total_sold_7d` vao `constraint_checks` JSON khi tao rec

---

## 3. Cho phep chinh sua so luong de xuat

**Hien tai**: Chi co nut Duyet / Tu choi.

**Thay doi**: 
- Cot SL trong bang chuyen tu text -> **input number** co the chinh
- Khi chinh SL, luu vao local state `editedQty: Record<string, number>`
- Khi duyet, truyen `editedQty` len `onApprove` -> hook `useApproveRebalance` da ho tro `editedQty` param
- Visual: Input co border nhe, khi thay doi hien badge "Da chinh" mau vang
- **Size-level editing**: Trong expanded view, cho phep chinh qty tung size. Tong qty tu dong cap nhat

### File: `src/components/inventory/DailyTransferOrder.tsx`

- Them state: `editedQty: Record<string, number>` (key = suggestion.id)
- Cot SL: render `<Input type="number" />` thay vi text
- onChange: cap nhat editedQty
- Khi approve (ca don le va nhom): truyen editedQty vao onApprove
- Khi approve toan bo P1: truyen editedQty cho tat ca P1 ids

### File: `src/hooks/inventory/useApproveRebalance.ts`

- Da ho tro `editedQty` -> cap nhat `qty` khi approve
- Them logic: neu editedQty co gia tri cho allocation_recommendations thi cap nhat `recommended_qty` thay vi `qty`

---

## 4. Cap nhat Engine luu them 7-day sold data

### File: `supabase/functions/inventory-allocation-engine/index.ts`

- Khi tao rec (V1 va V2), them vao `constraint_checks`:
  - `sold_7d`: lay tu demand map (total_sold field)
  - `dest_on_hand`: ton hien tai tai store dich
  - `source_on_hand`: ton tai CW/source

Nhu vay UI co du data hien thi ma khong can fetch them.

---

## Trinh tu thuc hien

1. Cap nhat `inventory-allocation-engine/index.ts`: them size split inline + luu them sold_7d/dest/source data vao constraint_checks
2. Deploy edge function
3. Cap nhat `DailyTransferOrder.tsx`: them expandable row, editable qty, hien thi chi tiet size
4. Cap nhat `useApproveRebalance.ts`: ho tro update ca 2 bang (rebalance va allocation)
