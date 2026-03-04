

## Tách Store Intel thành module độc lập + Mở rộng phân tích chi nhánh

### Bối cảnh
Hiện tại Store Intel là một tab nhỏ bên trong trang Phân Bổ (`/command/allocation`). Người dùng muốn nâng cấp thành một menu riêng cùng cấp, với khả năng phân tích sâu hơn từng chi nhánh: set KPI, doanh thu mong đợi, so sánh hiệu suất.

### Kiến trúc

```text
SIDEBAR (BluecoreCommandLayout)
├── COMMAND CENTER
│   ├── War Room
│   ├── Capital Map
│   └── Tổng Quan
├── MARKETING (...)
├── OPERATIONS
│   ├── Phân Bổ          ← giữ nguyên, bỏ tab Store Intel
│   ├── ★ Chi Nhánh      ← MỚI: /command/stores
│   ├── Cơ Cấu Size
│   ├── Thanh Lý
│   └── ...
└── SYSTEM (...)
```

### Các bước thực hiện

#### 1. Tạo bảng `store_kpi_targets` (DB migration)
Lưu KPI target và doanh thu mong đợi cho từng cửa hàng theo kỳ:

```sql
CREATE TABLE public.store_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly',  -- monthly / weekly / quarterly
  period_value TEXT NOT NULL,                    -- '2026-03', '2026-W10'
  revenue_target NUMERIC DEFAULT 0,
  orders_target INTEGER DEFAULT 0,
  customers_target INTEGER DEFAULT 0,
  aov_target NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, store_id, period_type, period_value)
);
-- RLS: tenant isolation
```

#### 2. Tạo trang `/command/stores` (StoreIntelPage)
Trang mới full-page với layout 2 panel (list + detail), nâng cấp từ `StoreIntelligenceTab` hiện tại:

- **Panel trái**: Danh sách cửa hàng (giữ nguyên logic sort by tier)
- **Panel phải** (khi chọn store): Mở rộng với các tab:
  - **Tổng quan**: KPIs hiện tại (giữ nguyên) + so sánh vs target
  - **KPI & Mục tiêu**: Form set revenue target, orders target, customers target theo tháng. Hiển thị actual vs target với progress bar
  - **Top BST / Top FC**: Giữ nguyên
  - **Xu hướng**: Trend charts (giữ nguyên) mở rộng full-width

#### 3. Cập nhật navigation
- **BluecoreCommandLayout**: Thêm item `{ id: 'stores', label: 'Chi Nhánh', icon: Store, href: '/command/stores' }` vào section OPERATIONS
- **App.tsx**: Thêm route `/command/stores` → `StoreIntelPage`
- **MobileBottomNav**: Cân nhắc thêm vào drawer "Thêm"

#### 4. Bỏ tab Store Intel khỏi trang Phân Bổ
- Xóa tab "Store Intel" trong `InventoryAllocationPage.tsx`
- Giữ nguyên các tab phân bổ khác

#### 5. Hook `useStoreKpiTargets`
- CRUD cho `store_kpi_targets`: đọc targets theo store + period, upsert targets
- So sánh actual (từ `useStoreCustomerKpis`) vs target → tính variance, status (on_track / at_risk / behind / exceeded)

### Kết quả
- Store Intel có không gian riêng, không bị chèn trong trang Phân Bổ
- Người dùng set KPI doanh thu/đơn hàng/khách hàng cho từng chi nhánh
- So sánh actual vs target trực quan với progress bar và trạng thái
- Trend analysis có không gian hiển thị rộng hơn

