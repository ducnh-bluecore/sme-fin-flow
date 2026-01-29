
# FIX: Lỗi không thể sửa chi phí cố định

## Nguyên nhân gốc

### Lỗi 1: SelectItem với value rỗng
```tsx
// ❌ SAI - Radix Select không cho phép value=""
<SelectItem value="">Không chỉ định</SelectItem>
```
**Hậu quả**: Dialog crash ngay khi mở → toàn bộ form không hoạt động.

### Lỗi 2: useState sử dụng sai
```tsx
// ❌ SAI - useState không chạy lại khi props thay đổi
useState(() => {
  if (baseline) {
    setFormData({...});
  }
});
```
**Hậu quả**: Khi click Edit, form không load data của item cần sửa.

## Giải pháp

### Fix 1: Đổi value rỗng thành "none"
```tsx
// ✅ ĐÚNG
<SelectItem value="none">Không chỉ định</SelectItem>

// Và xử lý khi submit
paymentDueDay: formData.paymentDueDay && formData.paymentDueDay !== 'none' 
  ? parseInt(formData.paymentDueDay) 
  : null
```

### Fix 2: Đổi useState thành useEffect
```tsx
// ✅ ĐÚNG - useEffect chạy lại khi baseline thay đổi
useEffect(() => {
  if (baseline) {
    setFormData({
      category: baseline.category,
      name: baseline.name,
      monthlyAmount: baseline.monthlyAmount?.toString() || '',
      effectiveFrom: baseline.effectiveFrom,
      effectiveTo: baseline.effectiveTo || '',
      paymentDueDay: baseline.paymentDueDay?.toString() || '',
      notes: baseline.notes || '',
    });
  } else {
    // Reset về default khi thêm mới
    setFormData({
      category: 'salary',
      name: '',
      monthlyAmount: '',
      effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
      effectiveTo: '',
      paymentDueDay: '',
      notes: '',
    });
  }
}, [baseline]);
```

## File cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/expenses/FixedCostDefinitionPanel.tsx` | Fix SelectItem value + đổi useState thành useEffect |

## Code changes chi tiết

**Dòng 83-96**: Đổi `useState` thành `useEffect` với dependency `[baseline]`

**Dòng 107**: Cập nhật logic parse paymentDueDay để handle value "none"

**Dòng 207**: Đổi `value=""` thành `value="none"`

## Timeline
- Estimate: 5 phút

