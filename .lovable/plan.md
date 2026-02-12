

## Hiển thị tồn kho size đầy đủ tại kho đích

### Vấn đề hiện tại
Phần "Tồn kho size tại kho đích" chỉ hiển thị những size **đang được đề xuất chuyển**, không phải toàn bộ size sản phẩm tại cửa hàng. Vì vậy không chứng minh được lý do chuyển hàng: cửa hàng đã có sẵn S, XL nhưng thiếu M, nên cần chuyển M vào để chống lẻ size.

### Giải pháp
Query trực tiếp bảng `inv_state_positions` để lấy **tất cả SKU** của sản phẩm (theo `fc_id`) tại cửa hàng đích (`store_id`), rồi tách size từ mã SKU.

### Thay đổi cụ thể

#### 1. Tạo hook mới: `useDestinationSizeInventory`
- Input: danh sách `{ product_id, dest_store_id }` (lấy từ transfer suggestions đang expand)
- Query `inv_state_positions` WHERE `fc_id = product_id` AND `store_id = dest_store_id`
- Parse size từ SKU suffix (ví dụ: `222011792M` -> size `M`)
- Return: `Map<product_id, { size, on_hand }[]>`

#### 2. Cập nhật `TransferSuggestionsCard.tsx`
- Gọi hook mới khi expand một group (kho đích)
- Thay thế logic hiện tại (chỉ dùng sibling rows) bằng data thật từ `inv_state_positions`
- Hiển thị:
  - Size **có hàng**: badge xanh, ghi rõ số lượng (ví dụ: `S: 3`, `XL: 2`)
  - Size **đang chuyển vào**: badge highlight, ghi "← đang chuyển X đv"
  - Size **hết hàng** (0 units, không nằm trong đề xuất): badge đỏ, ghi `0`
- Thêm dòng tóm tắt: "Cửa hàng có 4/6 size, thiếu M — chuyển để hoàn thiện size run"

#### 3. Logic tách size từ SKU
Dựa trên pattern dữ liệu thực: SKU suffix là size code (S, M, L, XL, FS...). Sử dụng regex match cuối chuỗi SKU.

### Files thay đổi

| File | Thay đổi |
|------|---------|
| `src/hooks/inventory/useDestinationSizeInventory.ts` | Hook mới, query `inv_state_positions` |
| `src/components/command/TransferSuggestionsCard.tsx` | Dùng hook mới, hiển thị full size curve + tóm tắt lý do |

### Kết quả mong đợi

Khi expand một dòng transfer (ví dụ: chuyển size M vào cửa hàng X):

```
Tồn kho size tại kho đích
[S: 3] [M: 0 ← đang chuyển 2đv] [L: 2] [XL: 1]
Cửa hàng có 3/4 size · Thiếu M — chuyển để hoàn thiện size run
```

Giúp người duyệt thấy ngay: cửa hàng đã có S, L, XL nhưng thiếu M, chuyển vào là hợp lý.
