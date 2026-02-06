
# KẾ HOẠCH: Thêm Route cho BigQuery Backfill Admin Page

## 1. VẤN ĐỀ HIỆN TẠI

Page `/admin/bigquery-backfill` hiện đang trả về 404 vì:
- File `src/pages/admin/BigQueryBackfill.tsx` đã được tạo
- Nhưng **chưa được import và đăng ký route** trong `src/App.tsx`

## 2. GIẢI PHÁP

Thêm route vào App.tsx theo pattern hiện tại của các admin pages khác.

## 3. THAY ĐỔI CẦN THỰC HIỆN

### 3.1 File: `src/App.tsx`

**Bước 1: Thêm lazy import** (sau dòng 70)
```typescript
const AdminModulesPage = lazy(() => import("./pages/admin/AdminModulesPage"));
const BigQueryBackfillPage = lazy(() => import("./pages/admin/BigQueryBackfill")); // THÊM
```

**Bước 2: Thêm route** (trong block Super Admin Routes, sau dòng 568)
```typescript
<Route path="/admin/settings" element={<AdminSettingsPage />} />
<Route path="/admin/bigquery-backfill" element={<BigQueryBackfillPage />} /> {/* THÊM */}
```

## 4. KẾT QUẢ SAU KHI SỬA

| Route | Status |
|-------|--------|
| `/admin/bigquery-backfill` | ✅ Hoạt động |
| Page hiển thị | BigQuery Backfill Admin UI |
| Permissions | Super Admin only |

## 5. VERIFICATION

Sau khi apply changes:
1. Truy cập `/admin/bigquery-backfill`
2. Page BigQuery Backfill sẽ hiển thị với:
   - Form "Start New Backfill"
   - Bảng "Backfill Jobs"
   - Model overview cards

