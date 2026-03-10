

# Plan: Tạo tenant GUNO với cấu hình hoàn toàn riêng biệt

## Tổng quan

Tạo tenant mới "GUNO" với schema riêng (hard isolation), gán cho user `dng.triduc@gmail.com` (user mới, chưa tồn tại trong hệ thống). Không dùng chung bất kỳ config nào với OLV Fashion hay Icon Denim.

## Các bước thực hiện

### 1. Gọi Edge Function `create-tenant-with-owner`
- `tenantName`: "GUNO"
- `slug`: "guno"  
- `plan`: "pro"
- `ownerEmail`: "dng.triduc@gmail.com"

Function này sẽ tự động:
- Tạo user mới (email confirmed) + gửi recovery link để user tự đặt mật khẩu
- Tạo tenant record trong bảng `tenants`
- Gán user làm owner trong `tenant_users`
- Set `active_tenant_id` trên profile
- Auto-provision schema `tenant_guno` (hard isolation)
- Seed default alert configs

### 2. Tạo BigQuery config riêng (trống)
Insert record vào `bigquery_configs` cho tenant GUNO với `is_active = false` (chưa kết nối). GUNO dùng Shopee/Lazada/TikTok nên sẽ cần cấu hình BigQuery project riêng sau.

### 3. Tạo connector_integrations riêng
Insert các connector placeholder cho Shopee, Lazada, TikTok Shop với status `pending` — sẵn sàng để kết nối khi có shop credentials.

### 4. Verify isolation
- Kiểm tra schema `tenant_guno` đã được provision
- Kiểm tra không có `bigquery_tenant_sources` nào trỏ tới dataset/credentials của tenant khác
- Kiểm tra `tenant_users` chỉ có 1 record cho user mới

## Lưu ý bảo mật
- GUNO sẽ cần service account key BigQuery riêng (ví dụ secret `GUNO_GOOGLE_SERVICE_ACCOUNT_JSON`) — cấu hình sau khi có
- Schema `tenant_guno` đảm bảo dữ liệu không bao giờ trộn với public hay tenant khác
- User `dng.triduc@gmail.com` chỉ có quyền truy cập tenant GUNO, không thấy OLV hay Icon Denim

## Thực thi
Toàn bộ thao tác thực hiện qua Edge Function call + SQL insert. Không cần thay đổi code frontend.

