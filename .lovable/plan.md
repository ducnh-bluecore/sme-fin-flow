
# Kế hoạch: Hệ thống Quản lý Gói dịch vụ & Sản phẩm cho Admin

## Tổng quan

Xây dựng trang Admin để quản lý:
1. **Gói dịch vụ (Plans)**: free, starter, professional, enterprise
2. **Sản phẩm/Modules**: FDP, MDP, CDP, Control Tower, Data Warehouse
3. **Cấu hình Tenant**: Chỉ định gói & modules được kích hoạt cho mỗi tenant

---

## Thiết kế Database

### Bảng mới cần tạo

**1. `platform_plans` - Danh sách gói dịch vụ**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | text | Unique code (free, starter, professional, enterprise) |
| name | text | Tên hiển thị |
| description | text | Mô tả gói |
| price_monthly | numeric | Giá tháng (VND) |
| price_yearly | numeric | Giá năm (VND) |
| max_users | integer | Giới hạn user (null = unlimited) |
| is_active | boolean | Còn bán hay không |
| sort_order | integer | Thứ tự hiển thị |
| features | jsonb | Danh sách tính năng |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**2. `platform_modules` - Danh sách sản phẩm/modules**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | text | Unique code (fdp, mdp, cdp, control_tower, data_warehouse) |
| name | text | Tên hiển thị |
| description | text | Mô tả module |
| icon | text | Icon name (lucide) |
| color | text | Brand color |
| is_core | boolean | Module lõi (luôn bật) |
| is_active | boolean | Có sẵn sàng triển khai |
| sort_order | integer | Thứ tự hiển thị |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**3. `plan_modules` - Liên kết gói với modules mặc định**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| plan_id | uuid | FK -> platform_plans |
| module_id | uuid | FK -> platform_modules |
| is_included | boolean | Có bao gồm trong gói |

**4. `tenant_modules` - Modules được kích hoạt cho từng tenant**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | FK -> tenants |
| module_id | uuid | FK -> platform_modules |
| is_enabled | boolean | Đang bật |
| enabled_at | timestamptz | Ngày kích hoạt |
| enabled_by | uuid | FK -> auth.users |
| expires_at | timestamptz | Ngày hết hạn (null = vĩnh viễn) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## Dữ liệu khởi tạo

### Platform Plans
```
| Code | Name | Price Monthly | Max Users |
|------|------|---------------|-----------|
| free | Miễn phí | 0 | 2 |
| starter | Starter | 2,000,000 | 5 |
| professional | Professional | 5,000,000 | 15 |
| enterprise | Enterprise | Custom | Unlimited |
```

### Platform Modules
```
| Code | Name | Description | Is Core |
|------|------|-------------|---------|
| fdp | FDP | Financial Data Platform - Nền tảng dữ liệu tài chính | true |
| mdp | MDP | Marketing Data Platform - Đo lường giá trị tài chính của marketing | false |
| cdp | CDP | Customer Data Platform - Phân tích hành vi khách hàng | false |
| control_tower | Control Tower | Trung tâm điều hành & cảnh báo | false |
| data_warehouse | Data Warehouse | Kho dữ liệu tập trung | false |
```

### Plan Modules (Mặc định)
```
| Plan | FDP | MDP | CDP | Control Tower | Data Warehouse |
|------|-----|-----|-----|---------------|----------------|
| free | ✓ | - | - | - | - |
| starter | ✓ | ✓ | - | - | - |
| professional | ✓ | ✓ | ✓ | ✓ | - |
| enterprise | ✓ | ✓ | ✓ | ✓ | ✓ |
```

---

## Giao diện Admin

### 1. Trang quản lý Gói dịch vụ (`/admin/plans`)

```
+--------------------------------------------------+
| PageHeader                                        |
| [Package] Quản lý Gói dịch vụ                     |
| "Cấu hình các gói dịch vụ của platform"           |
|                              [+ Thêm gói mới]     |
+--------------------------------------------------+
|                                                   |
|  +----------+ +----------+ +----------+ +-------+ |
|  | FREE     | | STARTER  | | PRO      | | ENT   | |
|  | 0đ/th    | | 2M/th    | | 5M/th    | | Custom| |
|  | 2 users  | | 5 users  | | 15 users | | ∞     | |
|  |          | |          | |          | |       | |
|  | [FDP]    | | [FDP]    | | [FDP]    | | [ALL] | |
|  |          | | [MDP]    | | [MDP]    | |       | |
|  |          | |          | | [CDP]    | |       | |
|  |          | |          | | [CT]     | |       | |
|  |          | |          | |          | |       | |
|  | [Edit]   | | [Edit]   | | [Edit]   | | [Edit]| |
|  +----------+ +----------+ +----------+ +-------+ |
|                                                   |
+--------------------------------------------------+
```

### 2. Trang quản lý Modules (`/admin/modules`)

```
+--------------------------------------------------+
| PageHeader                                        |
| [Layers] Quản lý Sản phẩm                         |
| "Cấu hình các module của platform"                |
+--------------------------------------------------+
|                                                   |
| +------------------------------------------------+|
| | Module | Mô tả           | Core | Active | Edit||
| |--------|-----------------|------|--------|-----||
| | FDP    | Financial Data  | ✓    | ✓      | [.] ||
| | MDP    | Marketing Data  | -    | ✓      | [.] ||
| | CDP    | Customer Data   | -    | ✓      | [.] ||
| | CT     | Control Tower   | -    | ✓      | [.] ||
| | DW     | Data Warehouse  | -    | ✓      | [.] ||
| +------------------------------------------------+|
|                                                   |
+--------------------------------------------------+
```

### 3. Tab mới trong Tenant Detail (`/admin/tenants/:id` - Tab "Gói & Modules")

```
+--------------------------------------------------+
| [Overview] [Members] [Schema] [Gói & Modules] ... |
+--------------------------------------------------+
|                                                   |
| +----------------------+ +-----------------------+|
| | Gói hiện tại         | | Modules được bật      ||
| | [Professional]   [▼] | |                       ||
| |                      | | [✓] FDP               ||
| | • 15 users max       | | [✓] MDP               ||
| | • 5M VND/tháng       | | [✓] CDP               ||
| |                      | | [✓] Control Tower     ||
| | [Đổi gói]            | | [ ] Data Warehouse    ||
| +----------------------+ |                       ||
|                          | [Lưu thay đổi]        ||
|                          +-----------------------+|
+--------------------------------------------------+
```

---

## Luồng hoạt động

### Khi tạo Tenant mới:
1. Admin chọn gói dịch vụ (plan)
2. Hệ thống tự động copy modules mặc định từ `plan_modules` vào `tenant_modules`
3. Admin có thể override bật/tắt module theo ý

### Khi đổi gói cho Tenant:
1. Update `plan` trong bảng `tenants`
2. Hiển thị cảnh báo nếu tenant đang dùng module không có trong gói mới
3. Admin quyết định giữ hay tắt module đó

### Frontend kiểm tra quyền truy cập module:
```typescript
// Hook mới: useModuleAccess
const { hasModule, enabledModules } = useModuleAccess();

if (!hasModule('mdp')) {
  // Redirect hoặc hiển thị upgrade prompt
}
```

---

## Chi tiết triển khai

### Files cần tạo mới

| File | Mục đích |
|------|----------|
| `src/pages/admin/AdminPlansPage.tsx` | Trang quản lý gói dịch vụ |
| `src/pages/admin/AdminModulesPage.tsx` | Trang quản lý modules |
| `src/components/admin/PlanCard.tsx` | Card hiển thị thông tin gói |
| `src/components/admin/TenantSubscriptionTab.tsx` | Tab gói & modules trong tenant detail |
| `src/hooks/usePlatformPlans.ts` | Hook lấy danh sách gói |
| `src/hooks/usePlatformModules.ts` | Hook lấy danh sách modules |
| `src/hooks/useTenantModules.ts` | Hook quản lý modules của tenant |
| `src/hooks/useModuleAccess.ts` | Hook kiểm tra quyền truy cập module |

### Files cần cập nhật

| File | Thay đổi |
|------|----------|
| `src/App.tsx` | Thêm routes mới `/admin/plans`, `/admin/modules` |
| `src/pages/admin/AdminTenantsPage.tsx` | Thêm cột hiển thị modules đang bật |
| `src/pages/admin/AdminTenantDetailPage.tsx` | Thêm tab "Gói & Modules" |
| `src/pages/admin/AdminDashboard.tsx` | Thêm quick action đến trang Plans/Modules |
| `src/components/layout/AdminLayout.tsx` | Thêm menu items mới |
| `src/locales/*.json` | Thêm translations |

### Database Migrations

1. Tạo bảng `platform_plans`
2. Tạo bảng `platform_modules`
3. Tạo bảng `plan_modules`
4. Tạo bảng `tenant_modules`
5. Insert dữ liệu khởi tạo
6. Tạo RLS policies (chỉ admin được sửa, tất cả user đọc được)

---

## RLS Policies

```sql
-- platform_plans: Read all, Write admin only
CREATE POLICY "Anyone can read plans" ON platform_plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage plans" ON platform_plans FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- platform_modules: Read all, Write admin only  
CREATE POLICY "Anyone can read modules" ON platform_modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage modules" ON platform_modules FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- tenant_modules: Read by tenant members, Write admin only
CREATE POLICY "Tenant members can read their modules" ON tenant_modules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_users tu 
    WHERE tu.tenant_id = tenant_modules.tenant_id 
    AND tu.user_id = auth.uid() 
    AND tu.is_active = true
  ));
CREATE POLICY "Admins can manage tenant modules" ON tenant_modules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

---

## Kết quả mong đợi

1. Admin có thể quản lý gói dịch vụ và sản phẩm từ một nơi tập trung
2. Khi tạo tenant, hệ thống tự động assign modules theo gói
3. Admin có thể override bật/tắt module riêng cho từng tenant
4. Frontend có thể kiểm tra quyền truy cập module để hiển thị/ẩn chức năng
5. Dữ liệu subscription được lưu trữ riêng, dễ dàng mở rộng thêm billing logic sau này
