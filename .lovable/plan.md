

## Plan: Di chuyển nút "Thêm SP" xuống cấp Store

### Thay đổi UX

Hiện tại: Nút "＋ Thêm SP" ở header tổng → mở Sheet → chọn FC → chọn store → nhập qty.

Mới: Nút "＋ Thêm SP" nằm **trong mỗi store accordion** → mở Sheet → chọn FC → nhập qty. **Store đã xác định sẵn** — bỏ bước chọn store.

```text
┌─ Store A (Tier S) ──────────────────────┐
│ Tồn: 120 · Capacity: 200 · ...         │
│ ┌──────────────────────────────────────┐│
│ │ FC001 - Áo polo   │ 10 units │ ...  ││
│ │ FC002 - Quần jean  │ 5 units  │ ...  ││
│ └──────────────────────────────────────┘│
│ [＋ Thêm sản phẩm vào Store A]         │ ← NÚT MỚI
└─────────────────────────────────────────┘
```

Sheet khi mở sẽ **không có bước chọn store** nữa — chỉ còn:
1. Tìm/chọn FC từ collection
2. Xem velocity tại store đó (highlight)
3. Nhập qty → Thêm

### Thay đổi kỹ thuật

#### 1. `AddProductSheet.tsx`
- Thêm prop `targetStoreId` + `targetStoreName` (required)
- Bỏ bước "Chọn store" — store đã fix sẵn
- Bảng velocity vẫn hiển thị (để so sánh), nhưng store đích được highlight và auto-select
- Mutation truyền thẳng `targetStoreId` / `targetStoreName`

#### 2. `DailyTransferOrder.tsx`
- **Xóa** nút "＋ Thêm SP" ở header tổng
- **Thêm** nút "＋ Thêm SP" ở cuối mỗi store accordion content (sau bảng detail)
- State `addProductOpen` đổi thành `addProductStoreId: string | null` để biết đang mở cho store nào
- Truyền `targetStoreId` + `targetStoreName` vào `AddProductSheet`

#### Files
- Sửa `src/components/inventory/AddProductSheet.tsx` — thêm prop store, bỏ bước chọn store
- Sửa `src/components/inventory/DailyTransferOrder.tsx` — di chuyển nút xuống per-store

