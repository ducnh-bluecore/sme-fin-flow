

## Sửa logic Purpose Badge: ưu tiên "Lẻ size" khi có core_size

### Nguyên nhân gốc
Data trong `state_size_transfer_daily` KHÔNG có tag `broken_size`. Thay vào đó, tag `core_size` chính là dấu hiệu lẻ size (kho đích thiếu size core bán chạy). Nhưng logic hiện tại ưu tiên `stockout` trước `core_size`, nên 159/200 dòng đều hiện badge "Hết hàng" thay vì "Lẻ size".

### Phân tích data thực tế

| Reason pattern | Số lượng | Badge hiện tại | Badge đúng |
|---|---|---|---|
| stockout + same_region + core_size | 117 | Het hang | **Le size** |
| stockout + cross_region + core_size | 42 | Het hang | **Le size** |
| stockout + same_region | 28 | Het hang | Het hang (dung) |
| stockout + cross_region | 10 | Het hang | Het hang (dung) |
| low_stock + same_region + core_size | 3 | Can bang kho | **Le size** |

### Thay doi

**File: `src/components/command/TransferSuggestionsCard.tsx`**

Sua thu tu uu tien trong `getPurposeBadge()`:

```
// Truoc (SAI):
broken_size > stockout > core_size > ...

// Sau (DUNG):
core_size > stockout > high_velocity > low_stock/excess_source
```

Cu the:
- `core_size` trong reason -> **"Le size"** (badge tim) — bat ke co `stockout` hay khong
- Chi `stockout` (khong co `core_size`) -> **"Het hang"** (badge do)
- `low_stock` / `excess_source` (khong co `core_size`) -> **"Can bang kho"** (badge xanh)

### Ket qua mong doi
- 162 dong co `core_size` se hien badge **"Le size"** (tim)
- 38 dong chi co `stockout` se hien badge **"Het hang"** (do)
- 3 dong `low_stock` + `core_size` se hien **"Le size"** (tim)

Nguoi van hanh se thay ngay dong nao la xu ly le size, dong nao la bo sung het hang.

