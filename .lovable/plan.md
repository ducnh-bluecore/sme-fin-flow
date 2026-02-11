
# Persist SKU Stop Action + Outcome Tracking trong FDP

## Tong quan

Khi user click "NGUNG BAN NGAY" (hoac cac action khac) tren SKUStopAction, he thong se:
1. **Ghi quyet dinh vao DB** (`decision_outcome_records`)
2. **Hien thi Outcome Tracking ngay trong trang FDP** (Unit Economics) de theo doi ket qua

Hien tai, `onAcknowledge` chi `console.log` va luu trong React state (mat khi reload).

---

## Thay doi chi tiet

### 1. Ket noi SKUStopAction voi Database

**File: `src/pages/UnitEconomicsPage.tsx`**
- Import `useRecordOutcome` tu `@/hooks/control-tower`
- Thay `console.log` trong `onAcknowledge` bang mutation ghi vao `decision_outcome_records`:
  - `decision_type`: `'FDP_SKU_STOP'`
  - `decision_title`: Ten san pham + SKU
  - `predicted_impact_amount`: `monthlyLoss` cua SKU
  - `outcome_verdict`: `'pending_followup'`
  - `followup_due_date`: +7 ngay (de kiem tra SKU da ngung chua)
  - `metric_code`: `'sku_stop_action'`
  - `context_snapshot`: Luu toan bo thong tin SKU (margin, locked cash, reasons)

### 2. Tao component FDP Outcome Tracker

**File moi: `src/components/dashboard/FDPOutcomeTracker.tsx`**

Component hien thi ngay trong trang Unit Economics, gom:
- **Danh sach cac quyet dinh da thuc hien** (SKU da acknowledge)
- **Trang thai**: Pending Follow-up / Resolved
- **Nut "Do luong ket qua"**: Mo `OutcomeRecordingDialog` (reuse tu Control Tower)
- **Thong ke nhanh**: So quyet dinh, ty le thanh cong, tong impact

Thiet ke: Card don gian, khong lam nhieu trang FDP. Chi hien khi co du lieu.

### 3. Tich hop vao UnitEconomicsPage

**File: `src/pages/UnitEconomicsPage.tsx`**
- Them `FDPOutcomeTracker` component ben duoi SKUStopAction
- Chi hien khi co pending decisions hoac recent outcomes
- Su dung hook `usePendingFollowups` va `useOutcomeStats` (da co san)

### 4. Cap nhat SKUStopAction dialog

**File: `src/components/dashboard/SKUStopAction.tsx`**
- Them prop `isSubmitting` de hien loading state khi ghi DB
- Them toast xac nhan "Da ghi nhan quyet dinh - theo doi sau 7 ngay"
- Sau khi acknowledge thanh cong, invalidate query `pending-followups`

---

## Flow tong the

```text
User click "NGUNG BAN NGAY"
  |
  v
Dialog xac nhan --> Click "Da ghi nhan, se xu ly"
  |
  v
Ghi vao decision_outcome_records (decision_type = FDP_SKU_STOP)
  + followup_due_date = +7 ngay
  |
  v
FDPOutcomeTracker hien thi trong FDP page
  - "SKU XYZ - Cho theo doi (con 5 ngay)"
  |
  v
Sau 7 ngay, user click "Do luong"
  --> Mo OutcomeRecordingDialog (reuse)
  --> Ghi actual_impact, verdict
  |
  v
Hien thi ket qua: Thanh cong / That bai / Can xem lai
```

---

## Phan ky thuat

### Database
- **Khong can migration moi** - bang `decision_outcome_records` da co du cac cot can thiet (`decision_type`, `predicted_impact_amount`, `followup_due_date`, `outcome_verdict`, `context_snapshot`)

### Hooks su dung lai
- `useRecordOutcome` tu `@/hooks/control-tower/useOutcomeRecording.ts` - ghi quyet dinh
- `usePendingFollowups` tu `@/hooks/useDecisionOutcomes.ts` - lay danh sach can theo doi  
- `useOutcomeStats` tu `@/hooks/useDecisionOutcomes.ts` - thong ke

### Component reuse
- `OutcomeRecordingDialog` tu `@/components/control-tower/common/` - dialog do luong ket qua

### Files thay doi
| File | Thay doi |
|---|---|
| `src/pages/UnitEconomicsPage.tsx` | Ket noi onAcknowledge voi DB, them FDPOutcomeTracker |
| `src/components/dashboard/SKUStopAction.tsx` | Them loading state, callback async |
| `src/components/dashboard/FDPOutcomeTracker.tsx` | **Moi** - hien thi outcome tracking trong FDP |
