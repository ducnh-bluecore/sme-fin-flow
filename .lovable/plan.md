
# Bảo vệ kho nguồn theo Chi tiết Size

## Vấn đề hiện tại

Rule Check "Bảo vệ kho nguồn (>=3 units)" đang tính trên **tổng tồn kho nguồn** (aggregate). Ví dụ: tổng nguồn = 129, chuyển 5, còn 124 => PASS.

Nhưng nhìn chi tiết theo size:
- Size M: nguồn 117, chuyển 3, còn 114 => OK
- Size S: nguồn 12, chuyển 2, còn 10 => OK

Trường hợp nguy hiểm là khi một size chỉ còn 3-4 units mà vẫn chuyển 2-3, dẫn đến còn 0-1 unit tại nguồn cho size đó => đứt size tại kho nguồn. Rule tổng vẫn pass nhưng thực tế một size cụ thể bị vi phạm.

## Giải pháp

Thay đổi logic Rule Check trong `DailyTransferOrder.tsx`:

1. **Khi có `size_breakdown`**: Kiểm tra từng size xem `nguồn_tồn_size - qty_size >= 3`. Nếu bất kỳ size nào vi phạm, rule sẽ hiển thị cảnh báo kèm danh sách size bị ảnh hưởng.

2. **Khi không có `size_breakdown`**: Giữ nguyên logic cũ (aggregate).

3. **Hiển thị chi tiết hơn trong bảng size**: Đánh dấu dòng size nào vi phạm ngưỡng 3 units bằng highlight đỏ/vàng tại cột "Nguồn tồn".

## Chi tiết kỹ thuật

### File: `src/components/inventory/DailyTransferOrder.tsx`

**A. Cập nhật hàm `buildRuleChecks`** (dòng 112-123):

Thay vì chỉ kiểm tra aggregate, thêm logic kiểm tra per-size:

```typescript
// Source protection guardrail — per-size when available
const sizeBreakdown = (s as any).size_breakdown as any[] | null;
const srcOnHand = cc.source_on_hand ?? cc.cw_available_before;

if (sizeBreakdown && sizeBreakdown.length > 0 && srcOnHand != null) {
  // Per-size check
  const totalRawSrc = sizeBreakdown.reduce((sum, x) => sum + (x.source_on_hand || 0), 0);
  const violatedSizes: string[] = [];
  
  for (const sz of sizeBreakdown) {
    const propSrc = totalRawSrc > 0
      ? Math.round((sz.source_on_hand || 0) / totalRawSrc * srcOnHand)
      : sz.source_on_hand || 0;
    const remaining = propSrc - (sz.qty || 0);
    if (remaining < 3) {
      violatedSizes.push(`${sz.size || sz.size_code}: còn ${remaining}`);
    }
  }
  
  checks.push({
    label: 'Bảo vệ kho nguồn (≥3 units/size)',
    passed: violatedSizes.length === 0,
    detail: violatedSizes.length === 0
      ? `Tất cả size còn ≥3 units sau chuyển`
      : `${violatedSizes.join(', ')} – cân nhắc giảm SL`,
  });
} else if (srcOnHand != null) {
  // Fallback: aggregate check
  const remaining = srcOnHand - (s.qty || 0);
  checks.push({
    label: 'Bảo vệ kho nguồn (≥3 units)',
    passed: remaining >= 3,
    detail: remaining >= 3
      ? `Còn ${remaining} units sau chuyển`
      : `Chỉ còn ${remaining} units – cân nhắc giảm SL`,
  });
}
```

**B. Highlight dòng vi phạm trong bảng size** (dòng 644-665):

Thêm style cảnh báo cho các dòng size có `remaining < 3`:

```typescript
const sizeRemaining = (proportionalSrc || 0) - (sz.qty || 0);
const isViolated = proportionalSrc != null && sizeRemaining < 3;

// Thêm class vào <tr>
<tr className={`border-b last:border-b-0 hover:bg-accent/20 
  ${isViolated ? 'bg-red-500/10' : ''}`}>

// Thêm icon cảnh báo vào cột "còn X"
{proportionalSrc != null && (
  <span className={`text-[10px] ml-1 ${isViolated ? 'text-red-400 font-semibold' : ''}`}>
    (còn {sizeRemaining})
    {isViolated && ' ⚠'}
  </span>
)}
```

## Kết quả mong đợi

- Rule Check sẽ hiển thị "Bảo vệ kho nguồn (>=3 units/size)" với trạng thái PASS/FAIL dựa trên từng size.
- Nếu fail, chi tiết sẽ liệt kê cụ thể size nào vi phạm (VD: "S: còn 1, XS: còn 0").
- Bảng Chi tiết theo Size sẽ highlight đỏ các dòng có nguồn tồn còn < 3 sau chuyển.
