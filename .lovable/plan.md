

## Phân tích: Admin Tenant Onboarding Gaps

### Thực trạng hiện tại

Trang **Admin Tenant Detail** (`/admin/tenants/:tenantId`) có 7 tabs:
- Tổng quan, Thành viên, Schema, Sử dụng, Gói & Modules, Lịch sử, Sức khỏe

**Thiếu hoàn toàn 3 khả năng quan trọng** khi onboard tenant mới:

| Cần làm | Hiện trạng |
|---------|-----------|
| Cấu hình BigQuery Service Account riêng cho tenant | Chỉ có ở warehouse page (dùng localStorage, không per-tenant) |
| Quản lý Data Backfill cho tenant | Chỉ có ở `/admin/backfill` — hardcode E2E tenant |
| Quản lý Connector Integrations | Chỉ có ở tenant-side, admin không can thiệp được |

### Kế hoạch: Thêm 3 tabs mới vào Admin Tenant Detail

#### Tab 1: "BigQuery" — Cấu hình service account
- Hiển thị `bigquery_configs` hiện tại của tenant (project_id, datasets, status)
- Form nhập/cập nhật: `project_id`, `service_account_json` (textarea), `default_dataset`
- Lưu vào bảng `bigquery_configs` với `tenant_id`
- Nút "Test Connection" gọi edge function verify kết nối

#### Tab 2: "Data Sync" — Backfill & Sync cho tenant
- Hiển thị `daily_sync_runs` + `bigquery_backfill_jobs` filtered theo `tenant_id` này
- Nút "Trigger Daily Sync" / "Start Backfill" cho tenant cụ thể
- Trạng thái các model (orders, products, customers...) — đã sync chưa, bao nhiêu records

#### Tab 3: "Connectors" — Quản lý kết nối
- Hiển thị `connector_integrations` của tenant
- Thêm/sửa/xóa connector (shopee, lazada, tiktok, bigquery, kiotviet...)
- Hiển thị status, last_synced

### Files cần tạo/sửa

1. **Sửa** `src/pages/admin/AdminTenantDetailPage.tsx` — thêm 3 TabsTrigger + TabsContent mới
2. **Tạo** `src/components/admin/TenantBigQueryTab.tsx` — form cấu hình BQ per-tenant
3. **Tạo** `src/components/admin/TenantDataSyncTab.tsx` — backfill/sync management per-tenant  
4. **Tạo** `src/components/admin/TenantConnectorsTab.tsx` — connector integrations per-tenant

### Lưu ý quan trọng
- Service account JSON phải lưu vào DB (bảng `bigquery_configs` đã có sẵn), **không dùng localStorage**
- Backfill hooks hiện hardcode `E2E_TENANT_ID` — cần tạo version nhận `tenantId` param
- Tất cả dùng `supabase` client trực tiếp (admin page, cross-tenant)

