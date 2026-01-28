
## Tóm tắt tình trạng (đã kiểm tra trực tiếp trong database)
Hiện **không phải “không có data”** mà là **RPC đang crash** nên UI không render được.

- `cdp_orders` có dữ liệu thật:
  - Tenant `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`: 5,500 orders (min `2024-01-01`, max `2026-01-26`)
  - Tenant `11111111-1111-1111-1111-111111111111` (active): 1,800 orders (min `2024-07-01`, max `2025-04-26`)
- `cdp_order_items` cũng có dữ liệu:
  - Tenant `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`: 13,200 items
  - Tenant `11111111-1111-1111-1111-111111111111`: 1,620 items
- Function hiện tại chỉ còn **1 signature** (không còn overload):
  - `public.get_sku_profitability_by_date_range(p_tenant_id uuid, p_start_date date, p_end_date date, p_limit integer)`

Nhưng khi chạy function, DB trả lỗi:
- `ERROR: 42703: column p.code does not exist`

=> Nghĩa là RPC hiện tại vẫn **tham chiếu sai cột trong bảng `products`**.

## Nguyên nhân gốc (Root Cause)
Migration mới nhất của function dùng:
- `COALESCE(p.code, ...)`  

Trong khi schema thật của `products` là:
- có `products.sku` (varchar)
- **không có** `products.code`

=> RPC crash ngay khi SELECT `p.code`.

## Hướng xử lý (SSOT / DB-first, không “làm đẹp số”)
### 1) Sửa RPC: thay `p.code` -> `p.sku` (đúng schema)
Tạo migration mới để `CREATE OR REPLACE FUNCTION public.get_sku_profitability_by_date_range(...)` và chỉnh:
- `sku` output:
  - `COALESCE(p.sku, coi.product_id, 'Unknown')::text AS sku`
- `GROUP BY` tương ứng:
  - `GROUP BY COALESCE(p.sku, coi.product_id, 'Unknown'), COALESCE(p.name, 'Unknown'), COALESCE(co.channel, 'Unknown')`

Giữ nguyên:
- cột `qty`, `line_revenue`, `line_cogs`, `order_at` (đúng schema SSOT)
- join “regex guard” `product_id::uuid` để tránh crash kiểu text/uuid
- return columns đúng như frontend hook đang map
- `GRANT EXECUTE` cho `authenticated` và `anon`

### 2) Xác minh end-to-end sau migration
Sau khi migration chạy, kiểm tra theo 2 tầng:

**(A) DB verification**
- Chạy SQL:
  - `select * from public.get_sku_profitability_by_date_range(<tenant>, <start>, <end>, 10);`
- Kỳ vọng: trả về array rows, không còn lỗi `p.code`.

**(B) UI verification**
- Reload tab SKU Profitability:
  - Nếu date range có dữ liệu: phải hiện list + summary.
  - Nếu date range rỗng: phải hiện empty-state (không phải error).

### 3) Kiểm tra 1 điểm rất hay gây hiểu nhầm: Date range trên UI
Tenant “active” hiện tại trong DB là `11111111-...` và dữ liệu của tenant này **dừng ở `2025-04-26`**.
Nếu UI đang chọn “Last 30 days” theo ngày hiện tại (2026) thì **đúng là sẽ không có data** (nhưng phải là empty-state, không phải crash).

=> Sau khi RPC hết crash, nếu vẫn không thấy data, bước tiếp theo là:
- chuyển date range về khoảng có dữ liệu (ví dụ `2025-04-01` → `2025-04-26`) hoặc đổi active tenant sang tenant có data 2026.

## Dọn kỹ thuật (để không tái phát)
- `src/integrations/supabase/types.ts` đã bị chạm sửa tay ở các lần trước (đi ngược chuẩn). Khi implement, sẽ **revert** về trạng thái auto-generated và không chỉnh nữa.
- Frontend hook `useSKUProfitabilityCache.ts` hiện đã truyền `p_limit` explicit (tốt), không cần đổi thêm cho bug này.

## Phạm vi thay đổi khi bạn chuyển mình sang Default mode để mình sửa
1) Backend: thêm 1 migration “Fix products.sku reference in get_sku_profitability_by_date_range” (p.code → p.sku)
2) (Nếu cần) revert thay đổi thủ công trong `src/integrations/supabase/types.ts`

## Tiêu chí DONE
- RPC không còn 400/42703
- Tab SKU Profitability:
  - có data khi date range nằm trong khoảng có orders
  - hoặc empty-state rõ ràng khi không có orders (không crash, không fake)
