

## Tính năng: Click vào dòng cửa hàng → Popup điều chuyển thông minh

### Bối cảnh
Trong ma trận Size × Cửa Hàng (tab "Theo Sản Phẩm"), hiện tại click vào dòng cửa hàng không có hành động gì. Yêu cầu là khi click vào một dòng cửa hàng, hiển thị popup cho phép:
1. Xem tốc độ bán tại cửa hàng đó
2. Chọn **nhận hàng từ kho khác** (hiển thị kho còn hàng, tốc độ bán chậm nhất)
3. Hoặc **chuyển hàng đi kho khác** (hiển thị kho có tốc độ bán nhanh nhất)
4. Sinh lệnh điều chuyển → lưu vào DB để duyệt sau

### Kiến trúc

```text
┌─────────────────────────────────────────┐
│  SizeMatrix (existing)                  │
│  Click row → open StoreTransferDialog   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  StoreTransferDialog (new)              │
│  ┌────────────────────────────────────┐ │
│  │ Header: Store name + FC name       │ │
│  │ Velocity tại store hiện tại        │ │
│  ├────────────────────────────────────┤ │
│  │ Tab 1: Nhận hàng về (Pull)         │ │
│  │  - List kho CÒN hàng, sort by     │ │
│  │    velocity ASC (chậm nhất trước)  │ │
│  │  - Checkbox chọn + input qty       │ │
│  ├────────────────────────────────────┤ │
│  │ Tab 2: Chuyển hàng đi (Push)       │ │
│  │  - List kho BÁN NHANH, sort by    │ │
│  │    velocity DESC (nhanh nhất trước)│ │
│  │  - Checkbox chọn + input qty       │ │
│  ├────────────────────────────────────┤ │
│  │ Footer: Tạo lệnh điều chuyển      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
               │
               ▼
  INSERT into inv_manual_transfers (new table)
  status = 'pending' → user duyệt ở trang riêng
```

### Các bước thực hiện

#### 1. Tạo bảng `inv_manual_transfers` (DB migration)
Bảng mới lưu lệnh điều chuyển thủ công do người dùng tạo từ popup:

```sql
CREATE TABLE public.inv_manual_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  fc_id UUID NOT NULL,
  fc_name TEXT,
  from_store_id UUID NOT NULL,
  from_store_name TEXT,
  to_store_id UUID NOT NULL,
  to_store_name TEXT,
  qty INTEGER NOT NULL DEFAULT 0,
  reason TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / approved / rejected
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS + tenant isolation
```

#### 2. Tạo RPC `fn_store_velocity_for_fc`
Truy vấn tốc độ bán + tồn kho của **tất cả stores** cho một FC cụ thể, trả về:
- `store_id`, `store_name`, `on_hand` (tổng tồn kho mới nhất), `avg_daily_sales`, `total_sold`
- Lấy từ `inv_state_demand` join `inv_state_positions` (latest snapshot per store)

#### 3. Tạo component `StoreTransferDialog`
- **Props**: `fcId`, `fcName`, `storeName`, `storeId`, `currentOnHand`, `sizeOrder`, `storeSizes`
- **Data fetch**: Gọi RPC trên để lấy velocity + on_hand tất cả stores
- **UI**:
  - Header: Tên sản phẩm, tên cửa hàng, velocity hiện tại
  - 2 tabs (Nhận hàng / Chuyển đi)
  - Mỗi tab: bảng stores với velocity, on_hand, checkbox, input qty
  - Nút "Tạo lệnh" → insert vào `inv_manual_transfers`

#### 4. Tích hợp vào `SizeMatrix`
- Thêm state `selectedStore` trong `SizeMatrix`
- Click vào `TableRow` → mở `StoreTransferDialog` 
- Truyền context: fcId, store info, on_hand

#### 5. Trang duyệt lệnh thủ công
- Thêm section hoặc tab trong trang Phân Bổ/Cơ Cấu Size để hiển thị danh sách `inv_manual_transfers` status='pending'
- Cho phép approve/reject từng lệnh

### Chi tiết kỹ thuật
- RPC sử dụng `SECURITY DEFINER` + tenant isolation
- Dialog sử dụng `@radix-ui/react-dialog` (đã có)
- Dữ liệu velocity lấy từ `inv_state_demand` (đã có per store + fc)
- Tồn kho lấy từ `inv_state_positions` (latest snapshot per store)
- Lệnh được lưu với `status = 'pending'`, `created_by = auth.uid()`

