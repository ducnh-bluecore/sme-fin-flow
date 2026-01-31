
# Plan: Auto-seed Alert Configs & Setup Guidance

## Tổng quan vấn đề
Tenant mới được tạo nhưng **không có bất kỳ alert config nào** trong bảng `extended_alert_configs`. Điều này khiến:
- Control Tower không có rules để detect alerts
- Portal hiển thị `0 alerts`, `0 decisions` dù có dữ liệu tài chính
- User không biết cần setup gì

## Giải pháp 3 phần

### Phần 1: Auto-seed default alert configs khi tạo tenant mới

**Thay đổi Edge Functions:**

1. **`create-tenant-self/index.ts`**
   - Sau khi tạo tenant + provision schema thành công
   - Insert 32 default alert configs từ `defaultExtendedAlerts` array
   - Sử dụng service client để bypass RLS

2. **`create-tenant-with-owner/index.ts`**
   - Tương tự: thêm logic seed alerts sau schema provisioning
   - Đảm bảo admin-created tenants cũng có configs mặc định

**SQL Insert Logic:**
```typescript
// Insert default alert configs
const defaultAlerts = [
  { category: 'cashflow', alert_type: 'cash_critical', severity: 'critical', ... },
  { category: 'cashflow', alert_type: 'ar_overdue', severity: 'warning', ... },
  // ... 32 alerts total
];

await serviceClient
  .from('extended_alert_configs')
  .insert(defaultAlerts.map(a => ({ tenant_id: tenant.id, ...a })));
```

### Phần 2: Hiển thị setup prompt trên Portal

**File: `src/pages/PortalPage.tsx`**

1. **Thêm hook kiểm tra alert configs:**
   - Gọi `useExtendedAlertConfigs()` để check số lượng configs
   - Nếu `configs.length === 0` → hiển thị setup banner

2. **UI Banner Component:**
   - Vị trí: Phía trên "System Overview" section
   - Nội dung: "Hệ thống chưa có cấu hình cảnh báo. Khởi tạo ngay để nhận thông báo kịp thời."
   - Button: "Khởi tạo mặc định" → gọi `initializeDefaultAlerts()`

**Mockup Banner:**
```text
+------------------------------------------------------------------+
| ⚠️ Control Tower chưa có cấu hình                                |
|    Khởi tạo 32 alert rules mặc định để nhận cảnh báo kịp thời    |
|                                      [Khởi tạo ngay →]           |
+------------------------------------------------------------------+
```

### Phần 3: Seed data ngay cho E2E Tenant

**Migration SQL:**
```sql
INSERT INTO extended_alert_configs (tenant_id, category, alert_type, ...)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  category, alert_type, severity, ...
FROM (VALUES
  ('cashflow', 'cash_critical', 'critical', ...),
  ('cashflow', 'ar_overdue', 'warning', ...),
  -- ... 32 rows
) AS defaults(category, alert_type, severity, ...)
ON CONFLICT (tenant_id, category, alert_type) DO NOTHING;
```

---

## Chi tiết kỹ thuật

### Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/create-tenant-self/index.ts` | Thêm seed alerts logic sau schema provisioning |
| `supabase/functions/create-tenant-with-owner/index.ts` | Thêm seed alerts logic tương tự |
| `src/pages/PortalPage.tsx` | Thêm setup banner + hook integration |
| `supabase/migrations/xxx_seed_e2e_alerts.sql` | Seed 32 alerts cho E2E tenant |

### Default Alerts (32 rules)

Sử dụng `defaultExtendedAlerts` array đã có sẵn trong `useExtendedAlertConfigs.ts`:

| Category | Alert Types | Count |
|----------|-------------|-------|
| Product | inventory_low, inventory_expired, product_return_high, product_slow_moving | 4 |
| Business | sales_target_miss, sales_drop, margin_low, promotion_ineffective | 4 |
| Store | store_performance_low, store_no_sales, store_high_expense, store_staff_shortage | 4 |
| Cashflow | cash_critical, ar_overdue, payment_due, reconciliation_pending | 4 |
| KPI | kpi_warning, kpi_critical, kpi_achieved, conversion_drop | 4 |
| Customer | negative_review, complaint, vip_order, churn_risk | 4 |
| Fulfillment | order_delayed, delivery_failed, shipping_cost_high, picking_error | 4 |
| Operations | system_error, data_quality, sync_failed, scheduled_task_failed | 4 |

### Portal Banner Logic

```typescript
// In PortalPage.tsx
const { data: alertConfigs, isLoading: configsLoading } = useExtendedAlertConfigs();
const initDefaults = useInitializeDefaultAlerts();

const needsSetup = !configsLoading && (!alertConfigs || alertConfigs.length === 0);

// Render banner if needsSetup
{needsSetup && (
  <AlertSetupBanner onInitialize={() => initDefaults.mutate()} />
)}
```

---

## Thứ tự thực hiện

1. **Migration**: Seed alerts cho E2E tenant (test ngay lập tức)
2. **Edge Functions**: Update cả 2 functions để auto-seed cho tenant mới
3. **Portal UI**: Thêm setup banner cho tenants hiện có chưa có configs
4. **Test E2E**: Verify Portal hiển thị đúng sau khi có alert configs

## Kết quả mong đợi

- Tenant mới: Tự động có 32 alert configs → Control Tower hoạt động ngay
- Tenant cũ chưa có configs: Thấy banner hướng dẫn → 1-click setup
- E2E tenant: Có data ngay để test System Overview
