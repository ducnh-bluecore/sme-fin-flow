
Mục tiêu: Tab “SKU Profitability” đang fail và toàn bộ tab trong `/unit-economics` không lên dữ liệu. Hiện tại mình đã xác định được “lỗi thật” còn lại của SKU Profitability: RPC `get_sku_profitability_by_date_range` vẫn đang JOIN sai kiểu dữ liệu (`text = uuid`), nên hook `useCachedSKUProfitability()` luôn throw error ⇒ UI hiện “Không thể tải dữ liệu SKU”.

Bằng chứng (console log hiện tại):
- `SKU profitability RPC error: operator does not exist: text = uuid`

Nguồn gốc trong migration đang active:
- File `supabase/migrations/20260127091338_...sql` đang tạo function 4-args với dòng:
  - `LEFT JOIN products p ON coi.product_id = p.id AND coi.tenant_id = p.tenant_id`
  - Trong khi `coi.product_id` là `text`, còn `p.id` là `uuid` ⇒ crash.
- Việc drop overload 3-args đã xong, nhưng function 4-args vẫn lỗi JOIN nên SKU vẫn fail.

---

## Phần 1 — Chuẩn đoán chính xác trong DB (để chắc không còn overload/khác signature)
1) Chạy query đọc metadata để confirm chỉ còn đúng function signature đang được gọi:
   - Liệt kê tất cả overload của `get_sku_profitability_by_date_range` trong `pg_proc` + argument types.
2) Confirm cột `cdp_order_items.product_id` đang là `text` (hoặc `varchar`) và `products.id` là `uuid`.

Kết quả mong đợi:
- Chỉ còn 1 signature “note-worthy” đang dùng cho frontend:
  - `(uuid, date, date, integer default …)`.

---

## Phần 2 — Fix dứt điểm RPC (DB-first, SSOT)
Tạo 1 migration mới để **CREATE OR REPLACE** function `get_sku_profitability_by_date_range(uuid, date, date, integer)` với JOIN đúng kiểu.

### Option A (đề xuất, an toàn nhất): JOIN có “regex guard” để không bao giờ crash vì cast
Thay dòng JOIN bằng:

- `LEFT JOIN products p ON p.tenant_id = coi.tenant_id
   AND p.id = CASE
     WHEN coi.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     THEN coi.product_id::uuid
     ELSE NULL
   END`

Ưu điểm:
- Không phụ thuộc 100% việc `product_id` luôn là UUID string.
- Không gây “white screen” khi gặp record xấu.

### Option B (nhanh hơn nhưng rủi ro): JOIN bằng `p.id::text = coi.product_id`
- `LEFT JOIN products p ON p.id::text = coi.product_id AND p.tenant_id = coi.tenant_id`
Ưu điểm: không cast `product_id` sang uuid.
Nhược: join sẽ tốn hơn (khó dùng index tốt), và vẫn phụ thuộc format.

Mình sẽ chọn **Option A** để đảm bảo “Truth > Flexibility” + “no silent failure”.

### Đồng thời: giữ return types đúng
- Giữ toàn bộ `::TEXT` cho `sku`, `product_name`, `channel` như migration hiện tại để tránh mismatch kiểu.
- Giữ `order_count`, `total_quantity`, `total_revenue`, `total_cogs`, `gross_profit`, `margin_percent` đúng như hook đang map.

### Quyền thực thi
- Đảm bảo `GRANT EXECUTE` cho `authenticated` và `anon` giống file hiện tại.

---

## Phần 3 — Xác nhận flow end-to-end (không sửa UI trước khi backend đúng)
Sau migration:
1) Test gọi RPC trực tiếp từ client (tab SKU) sẽ không còn lỗi `text = uuid`.
2) `useCachedSKUProfitability()` sẽ nhận array rows ⇒ `SKUProfitabilityAnalysis` hết error state.
3) Trường hợp vẫn “không có data”:
   - Khi đó UI sẽ rơi vào empty-state “Chưa có dữ liệu SKU …” (khác với error).
   - Bấm “Tính toán SKU Profitability” sẽ chạy `useRecalculateSKUProfitability()` (dựa vào view `fdp_sku_summary` vốn đang trả 200 OK trong network log) để populate cache.

---

## Phần 4 — Dọn kỹ thuật (để tránh tái phát)
1) Tuyệt đối không chỉnh `src/integrations/supabase/types.ts` thủ công nữa (file này auto-generated). Nếu đang bị drift thì sẽ revert về trạng thái auto.
2) Giữ frontend hook như hiện tại (đã pass `p_limit` và mapping output), vì lỗi hiện tại hoàn toàn ở RPC JOIN.

---

## Checklist “done”
- Console không còn: `operator does not exist: text = uuid`
- Tab “SKU Profitability” hiển thị summary + list SKU
- Nếu date range không có orders: hiển thị empty state + nút recalc (không phải error)

---

## Phạm vi thay đổi dự kiến khi vào Default mode
- Backend: thêm 1 migration mới “Fix join text(uuid) in get_sku_profitability_by_date_range (4 args)”
- Frontend: không cần thay đổi thêm cho SKU tab (trừ khi muốn hiển thị error message chi tiết hơn)

