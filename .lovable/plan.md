

# Kế hoạch: Hỗ trợ Multi-tenant BigQuery Sources

## Vấn đề hiện tại
Edge Function `backfill-bigquery` hardcode toàn bộ dataset (ví dụ `olvboutique`, `olvboutique_shopee`...) — chỉ phục vụ tenant OLV Boutique. Tenant Icon Denim dùng Haravan trên dataset `DW-160STORE-BQ`, nhưng hệ thống vẫn query vào dataset cũ.

## Giải pháp: Bảng cấu hình nguồn dữ liệu theo tenant

### Bước 1: Tạo bảng `bigquery_tenant_sources`
Lưu cấu hình nguồn BQ cho từng tenant — tenant nào có cấu hình riêng thì dùng, không có thì fallback về hardcode (OLV Boutique).

```sql
CREATE TABLE public.bigquery_tenant_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_type text NOT NULL,   -- 'customers', 'orders', 'order_items', 'products', 'fulfillments'
  channel text NOT NULL,       -- 'haravan', 'kiotviet', 'shopee'...
  dataset text NOT NULL,       -- 'DW-160STORE-BQ'
  table_name text NOT NULL,    -- 'raw_hrv_Orders'
  mapping_overrides jsonb,     -- ghi đè mapping nếu cần (null = dùng mapping mặc định)
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, model_type, channel)
);
```

### Bước 2: Seed dữ liệu cho Icon Denim
Chỉ bật các channel Haravan (Icon Denim không dùng KiotViet, Shopee, Lazada...):

| model_type | channel | dataset | table_name |
|---|---|---|---|
| customers | haravan | DW-160STORE-BQ | raw_hrv_Customers |
| orders | haravan | DW-160STORE-BQ | raw_hrv_Orders |
| order_items | haravan | DW-160STORE-BQ | raw_hrv_OrdersLineItems |
| products | haravan | DW-160STORE-BQ | raw_hrv_Products |
| fulfillments | haravan | DW-160STORE-BQ | raw_hrv_Orders |

*(Mapping giữ nguyên mapping Haravan có sẵn trong code — không cần override)*

### Bước 3: Sửa Edge Function `backfill-bigquery/index.ts`
Thêm hàm `resolveSources()` ở đầu mỗi lần chạy:

1. Query `bigquery_tenant_sources` theo `tenant_id` + `model_type`
2. **Nếu có kết quả**: chỉ dùng các sources được cấu hình (lọc theo channel, thay dataset + table_name)
3. **Nếu không có**: dùng hardcode hiện tại (backward compatible cho OLV Boutique)

Áp dụng cho tất cả các hàm sync: `syncCustomers`, `syncOrders`, `syncOrderItems`, `syncProducts`, `syncFulfillments`, `syncPayments`, `syncRefunds`.

### Bước 4: Bỏ KIOTVIET_MARKETPLACE_CHANNEL_IDS filter cho tenant không dùng KiotViet
Logic dedup marketplace chỉ áp dụng khi tenant có channel `kiotviet`.

## Phạm vi thay đổi
- **1 migration**: tạo bảng + seed Icon Denim
- **1 file sửa**: `supabase/functions/backfill-bigquery/index.ts` — thêm ~40-50 dòng hàm `resolveSources()`, sửa các hàm sync để dùng sources động
- **Không ảnh hưởng** OLV Boutique — fallback về hardcode khi không có cấu hình tenant

## Lưu ý
- Cần xác nhận tên bảng Products của Haravan trên BigQuery (`raw_hrv_Products` hay tên khác?)
- Mapping columns giữ nguyên — Haravan mapping đã có sẵn trong code

