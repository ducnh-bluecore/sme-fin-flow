
# Nang cap Board Table: Hien thi tot hon, chinh sua hang loat, xuat Excel

## Van de hien tai

1. **Hien thi chua toi uu cho hang loat** -- bang dai, kho scan, thieu summary nhanh va batch actions
2. **Chinh qty tung dong** -- da co input nhung thieu batch approve/reject, thieu tong hop thay doi
3. **Khong co xuat Excel** -- sau khi duyet, user phai tu tay lam phieu dieu chuyen, khong co file san de giao cho kho

---

## Giai phap

### 1. Cai thien hien thi bang

**Toolbar phia tren bang:**
- Checkbox "Chon tat ca pending" + counter "Da chon X/Y"
- Nut "Duyet tat ca da chon" (xanh) + "Tu choi tat ca da chon" (do)
- Nut "Xuat Excel" (download)
- Filter nhanh: Priority (P1/P2/P3), Status (Pending/Approved/Rejected)
- Search theo ten san pham hoac kho

**Bang toi uu:**
- Them checkbox moi dong (cho batch select)
- Sticky header khi scroll
- Row grouping theo kho nguon (collapsible) -- giup CEO nhin theo tung kho thay vi list phang
- Subtotal row cho moi nhom kho: tong qty, tong revenue
- Highlight dong da chinh qty (background vang nhe)
- Pagination hoac virtual scroll khi > 50 dong

**Summary bar phia duoi bang (sticky):**
- Tong so de xuat pending / approved / rejected
- Tong qty da chon
- Tong revenue da chon
- Nut "Duyet X de xuat da chon" (primary action)

### 2. Chinh sua qty hang loat

- Input qty van o tung dong (da co)
- Them: khi chinh qty, hien thi delta (`+50` hoac `-30`) ben canh input
- Them: badge "Da chinh" tren toolbar cho biet co bao nhieu dong bi sua
- Khi approve hang loat, gui `editedQty` map cho tat ca dong da chinh

### 3. Xuat Excel

Nut "Xuat Excel" tao file `.xlsx` voi:

**Sheet 1: "Phieu dieu chuyen"**
| Cot | Noi dung |
|-----|---------|
| STT | So thu tu |
| Ma SP (FC) | fc_id |
| Ten SP | fc_name |
| Kho nguon | from_location_name |
| Loai kho nguon | from_location_type |
| Kho dich | to_location_name |
| Loai kho dich | to_location_type |
| SL de xuat | qty goc |
| SL da chinh | qty da edit (neu co) |
| SL cuoi cung | qty cuoi cung (edit hoac goc) |
| Uu tien | priority |
| Trang thai | status |
| Cover truoc (nguon) | from_weeks_cover |
| Cover truoc (dich) | to_weeks_cover |
| Cover sau | balanced_weeks_cover |
| Revenue du kien | potential_revenue_gain |
| Ghi chu | reason |

**Sheet 2: "Tom tat"**
- Tong so dong
- Tong qty chuyen
- Tong revenue du kien
- Ngay xuat
- Trang thai run

Su dung thu vien `xlsx` da co san trong project.

---

## File can thay doi

| File | Thay doi |
|------|---------|
| `src/components/inventory/RebalanceBoardTable.tsx` | Refactor toan bo: them toolbar, checkbox, batch actions, filter, search, grouping, summary bar, export button |
| `src/lib/inventory-export.ts` | Tao moi: ham `exportRebalanceToExcel()` dung thu vien xlsx |
| `src/pages/InventoryAllocationPage.tsx` | Truyen them props neu can (suggestions cho export) |

---

## Chi tiet ky thuat

### RebalanceBoardTable refactor:

- State moi: `selectedIds: Set<string>`, `filterPriority`, `filterStatus`, `searchQuery`
- Group logic: `Map<from_location, suggestions[]>` voi collapsible sections
- Sticky summary bar dung `position: sticky; bottom: 0`
- Batch approve: collect edited qty cho tat ca selected ids, goi `onApprove(selectedIds, editedQtyMap)`

### inventory-export.ts:

```text
exportRebalanceToExcel(suggestions, editedQty) {
  1. Build data rows voi qty cuoi cung = editedQty[id] ?? qty
  2. Tao worksheet "Phieu dieu chuyen"
  3. Tao worksheet "Tom tat" voi summary stats
  4. Style: header bold, columns auto-width
  5. Download file "dieu-chuyen-hang-YYYY-MM-DD.xlsx"
}
```

### Thu tu build:

1. `src/lib/inventory-export.ts` -- ham export Excel
2. `src/components/inventory/RebalanceBoardTable.tsx` -- refactor voi toolbar, batch, grouping, export
3. `src/pages/InventoryAllocationPage.tsx` -- cap nhat neu can
