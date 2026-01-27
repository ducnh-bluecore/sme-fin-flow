
Mục tiêu: Vì bạn đang ở `/unit-economics` mà tất cả KPI = 0 và tab “SKU Profitability” báo “Không thể tải dữ liệu SKU”, mình review và thấy có 2 lỗi gốc độc lập (1 lỗi khiến KPI = 0, 1 lỗi khiến tab SKU fail).

## 1) Kết luận review (nguyên nhân thật)

### A. KPI (AOV / CM/Order / LTV:CAC / ROAS) = 0 dù DB có data
- RPC `get_fdp_period_summary` hiện **trả về JSONB với key camelCase** (ví dụ: `totalOrders`, `totalRevenue`, `totalCogs`, `totalPlatformFees`, `totalShippingFees`…).
- Nhưng `src/hooks/useFDPAggregatedMetricsSSOT.ts` lại đang parse như **một row có snake_case** (`total_orders`, `total_revenue`, …) và còn truy cập `summaryRes.data?.[0]`.
- Kết quả: hook đọc sai cấu trúc -> toàn bộ số bị fallback về 0 -> UI hiển thị 0.

Bằng chứng: query trực tiếp DB cho tenant `E2E Test Company` trả về:
- `totalOrders = 5500`
- `totalRevenue ~ 2.03B`
- `totalCogs ~ 1.076B`
- `totalPlatformFees ~ 130.9M`
- `totalShippingFees ~ 44.9M`
=> Data có, chỉ là frontend đọc sai contract.

### B. Tab “SKU Profitability” fail (PGRST203 + lỗi join)
Có **2 vấn đề trong RPC `get_sku_profitability_by_date_range`**:
1) **Overload function**: DB đang tồn tại 2 phiên bản:
   - `(p_tenant_id, p_start_date, p_end_date)`
   - `(p_tenant_id, p_start_date, p_end_date, p_limit)`
   => PostgREST/Supabase RPC gọi bằng JSON params bị mơ hồ -> trả `PGRST203` (đúng như console/network bạn thấy).

2) **Sai kiểu join product_id** (lỗi SQL thật khi gọi trực tiếp 4 tham số):
   - `cdp_order_items.product_id` là `text`
   - `products.id` là `uuid`
   - RPC hiện đang join: `coi.product_id = p.id` -> lỗi `operator does not exist: text = uuid`
   => Dù có fix overload, RPC vẫn fail nếu không fix join.

## 2) Cách sửa (tuân thủ SSOT/DB-first)

### Bước 1 — Sửa hook để KPI load đúng (frontend)
File: `src/hooks/useFDPAggregatedMetricsSSOT.ts`

Thay đổi chính:
- Đổi type `FDPPeriodSummary` sang dạng camelCase theo JSONB:
  - `totalOrders`, `totalRevenue`, `totalCogs`, `totalPlatformFees`, `totalShippingFees`, `contributionMargin`, `uniqueCustomers`, `avgOrderValue`, …
- Parse đúng:
  - `const summary = summaryRes.data ?? { ...defaults }` (KHÔNG dùng `[0]`)
- Mapping lại `totalOrders/totalRevenue/...` từ đúng keys.
- (Optional nhưng nên làm ngay để “Truth > Flexibility”): nếu `summary.dataQuality?.hasRealData === false` thì hiển thị empty-state rõ ràng, không im lặng.

Kết quả mong đợi:
- KPI cards sẽ nhảy từ 0 -> đúng số (AOV, CM/Order, …).
- Các tab “Chi phí/Đơn”, “Khách hàng”, “Theo kênh”… sẽ có dữ liệu vì `useUnitEconomics` lấy từ hook này.

### Bước 2 — Fix dứt điểm RPC SKU (backend migration)
Tạo migration mới để:
1) **Xóa overload 3 tham số** để hết mơ hồ:
   - `DROP FUNCTION IF EXISTS public.get_sku_profitability_by_date_range(uuid, date, date);`
   - Giữ lại 1 function duy nhất có `p_limit integer DEFAULT 100`.

2) **Fix join text->uuid** an toàn:
   - Join theo: `LEFT JOIN products p ON p.id = (coi.product_id::uuid) AND ...`
   - Vì `product_id` đang là UUID string (mình đã thấy mẫu `11111111-0001-...`), cast sẽ chạy được.
   - Nếu bạn lo có dòng “product_id không phải UUID”, mình sẽ dùng phương án an toàn hơn:
     ```sql
     LEFT JOIN products p
       ON p.id = CASE WHEN coi.product_id ~* '^[0-9a-f-]{36}$' THEN coi.product_id::uuid ELSE NULL END
      AND p.tenant_id = coi.tenant_id
     ```
     để không bao giờ crash do cast.

3) Giữ `::TEXT` cast cho output như bạn đã yêu cầu trước đó (tránh mismatch `varchar` vs `text`).

Kết quả mong đợi:
- Tab “SKU Profitability” hết lỗi “Không thể tải dữ liệu SKU”, trả về danh sách SKU theo kỳ.

### Bước 3 — Hardening ở frontend call (không bắt buộc nhưng nên)
File: `src/hooks/useSKUProfitabilityCache.ts`

- Khi gọi RPC, truyền thêm `p_limit` (vd `p_limit: 500`) để:
  - Rõ ràng contract
  - Dù ai đó tạo lại overload trong tương lai, call vẫn “chỉ định” signature có p_limit

## 3) Checklist xác nhận sau khi làm
1) Mở `/unit-economics`:
   - AOV/CM/ROAS không còn 0
2) Chuyển tab “SKU Profitability”:
   - Không còn “Không thể tải dữ liệu SKU”
   - Có danh sách SKU (ít nhất vài chục dòng)
3) Verify nhanh:
   - So sánh AOV hiển thị vs `totalRevenue/totalOrders` từ RPC (sai lệch chỉ do rounding)

## 4) Phạm vi thay đổi (tóm tắt)
- Backend: 1 migration (drop overload + fix join + giữ 1 function chuẩn)
- Frontend:
  - `src/hooks/useFDPAggregatedMetricsSSOT.ts` (parse JSONB đúng)
  - `src/hooks/useSKUProfitabilityCache.ts` (thêm `p_limit` khi gọi RPC)

## 5) Rủi ro & cách xử lý
- Nếu có `product_id` không phải UUID: dùng join “regex guard” như ở trên để không crash.
- Nếu vẫn thấy KPI 0 sau fix: khi đó sẽ kiểm tra `useActiveTenantId` có đang trỏ đúng tenant không (nhưng hiện network log cho thấy đang gọi đúng tenant `aaaaaaaa-bbbb-...`).

