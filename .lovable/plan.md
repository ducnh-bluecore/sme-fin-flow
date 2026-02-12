

## Phase 3.2: Smart Transfer — Approve + Export Excel

### Muc tieu
Khi CEO/CFO bam "Approve" tren Smart Transfer Suggestions, he thong:
1. Cap nhat trang thai cac dong duoc duyet trong DB
2. Tu dong download file Excel "Phieu dieu chuyen" de import vao WMS/ERP tao lenh dieu chuyen

### Thay doi ky thuat

#### 1. Database Migration
Them 3 cot vao `state_size_transfer_daily`:
- `status` (text, default 'pending') — pending / approved / rejected
- `approved_by` (uuid, nullable)
- `approved_at` (timestamptz, nullable)

#### 2. Export function: `exportSizeTransferToExcel`
Them function moi trong `src/lib/inventory-export.ts`, tao file Excel 2 sheet:
- **Sheet "Phieu dieu chuyen"**: STT, Ten SP, Size, Kho nguon, Kho dich, SL, Net Benefit, Reason, Ngay duyet
- **Sheet "Tom tat"**: Tong dong, tong SL, tong net benefit, ngay xuat, nguoi duyet

Tai su dung pattern tu `exportRebalanceToExcel` da co san, dung thu vien `xlsx`.

#### 3. Hook moi: `useApproveTransfer.ts`
- Mutation nhan `transferIds[]` + action ('approved' | 'rejected')
- Khi approve: update status trong DB
- Goi callback `onApproved` de trigger Excel export
- Invalidate queries lien quan

#### 4. Component moi: `TransferSuggestionsCard.tsx`
Tach logic Smart Transfer tu `AssortmentPage.tsx` ra component rieng:
- Props: transferByDest, detailRows, storeNames, fcNames
- Them nut "Duyet & Xuat Excel" tren moi store group header
- Them nut "Duyet tat ca & Xuat Excel" o card header
- Khi bam Approve:
  1. Confirm dialog (xac nhan so luong)
  2. Update DB status = approved
  3. Auto download Excel file
- Row da approved: highlight xanh + badge "Da duyet"
- Row da rejected: mo di + badge "Tu choi"

#### 5. Refactor `AssortmentPage.tsx`
- Thay the inline Smart Transfer Suggestions bang `<TransferSuggestionsCard />`
- Giu nguyen cac phan khac (Hero KPIs, Tabs, Evidence)

### Flow nguoi dung

```text
CEO xem Smart Transfer Suggestions
  → Expand store group → Xem chi tiet
  → Bam "Duyet & Xuat Excel"
  → Confirm dialog hien tong SL + net benefit
  → Bam "Xac nhan"
  → DB cap nhat status = approved
  → Browser tu dong download file Excel
  → CEO gui file Excel cho team Ops import WMS
```

### Files thay doi
- `supabase/migrations/` — them cot status, approved_by, approved_at
- `src/lib/inventory-export.ts` — them `exportSizeTransferToExcel()`
- `src/hooks/inventory/useApproveTransfer.ts` — hook moi
- `src/components/command/TransferSuggestionsCard.tsx` — component moi
- `src/pages/command/AssortmentPage.tsx` — thay the inline code bang component

