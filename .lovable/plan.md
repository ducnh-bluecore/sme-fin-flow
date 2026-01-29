
# FIX: Phần đo lường không hoạt động

## Vấn đề phát hiện

Khi click nút "Đo lường" trong tab Follow-up của trang Outcomes, không có gì xảy ra vì:

1. **Thiếu integration** - `onMeasure` callback chỉ có `console.log` và TODO
2. **Thiếu dialog** - `OutcomeRecordingDialog` chưa được import và render
3. **Thiếu state** - Không có state để track item nào đang được đo lường

## Giải pháp

### Thay đổi trong OutcomesPage.tsx

```text
1. Import OutcomeRecordingDialog từ @/components/control-tower
2. Thêm state: selectedFollowup để track followup đang chọn
3. Thêm state: measureDialogOpen để control dialog visibility
4. Update onMeasure callback để set selectedFollowup và open dialog
5. Render OutcomeRecordingDialog với mapping:
   - alert.id = followup.id
   - alert.title = followup.decision_title  
   - alert.category = followup.decision_type
   - alert.impact_amount = followup.predicted_impact_amount
```

### Code Changes

```typescript
// Thêm state
const [selectedFollowup, setSelectedFollowup] = useState<PendingFollowup | null>(null);
const [measureDialogOpen, setMeasureDialogOpen] = useState(false);

// Update onMeasure
onMeasure={(followup) => {
  setSelectedFollowup(followup);
  setMeasureDialogOpen(true);
}}

// Render dialog
{selectedFollowup && (
  <OutcomeRecordingDialog
    open={measureDialogOpen}
    onOpenChange={setMeasureDialogOpen}
    alert={{
      id: selectedFollowup.id,
      title: selectedFollowup.decision_title,
      category: selectedFollowup.decision_type,
      impact_amount: selectedFollowup.predicted_impact_amount,
    }}
  />
)}
```

## Flow sau khi fix

1. User click "Đo lường" trên một pending followup
2. Dialog mở ra với thông tin decision
3. User chọn verdict (Tốt hơn/Đúng/Kém hơn/Theo dõi sau)
4. User nhập actual impact nếu có
5. Click "Ghi nhận & Resolve"
6. Data được save vào `decision_outcome_records`
7. Dialog đóng, queries được invalidate
8. UI refresh với data mới

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/pages/control-tower/OutcomesPage.tsx` | Thêm state, import dialog, update callback, render dialog |

## Timeline
- Estimate: 10 phút
