
Mục tiêu: `/unit-economics` vẫn không load data ở tất cả tab. Qua log + code hiện tại, có 2 “blocker” độc lập đang chặn dữ liệu:

1) KPI/Cost per order = 0 vì hook SSOT đọc sai contract của RPC `get_fdp_period_summary`
2) Tab SKU vẫn fail vì backend còn tồn tại 2 overload của `get_sku_profitability_by_date_range` ⇒ Supabase RPC bị mơ hồ (PGRST203)

Dưới đây là kế hoạch sửa dứt điểm theo SSOT/DB-first.

---

## A. Chẩn đoán (nguyên nhân thật)

### A1) KPI và các tab (Order/Customer/Channel/Trends) đều rỗng/0
- `UnitEconomicsPage` dùng `useUnitEconomics()`
- `useUnitEconomics()` đang gọi `useFDPAggregatedMetrics()` (wrapper)
- Wrapper này gọi `useFDPAggregatedMetricsSSOT()`
- Nhưng `useFDPAggregatedMetricsSSOT.ts` đang parse RPC sai:
  - Đang expect **snake_case** (`total_orders`, `total_revenue`, …) và truy cập `summaryRes.data?.[0]`
  - Trong khi `get_fdp_period_summary` thực tế trả về **JSON camelCase** (đã có hook `useFDPPeriodSummary` parse đúng kiểu này)

=> Kết quả: totalOrders/totalRevenue/... bị fallback về 0 ⇒ toàn bộ UI hiển thị 0.

### A2) SKU tab không load vì lỗi PGRST203 (overload)
Console log hiện tại:
- `PGRST203 Could not choose the best candidate function ... (3 args) vs (4 args)`

DB test xác nhận đang có 2 function:
- `(p_tenant_id uuid, p_start_date date, p_end_date date)`
- `(p_tenant_id uuid, p_start_date date, p_end_date date, p_limit integer)`

Frontend `useSKUProfitabilityCache.ts` hiện gọi **3 tham số** (không truyền p_limit) ⇒ luôn bị mơ hồ ⇒ tab SKU không có dữ liệu.

---

## B. Thiết kế giải pháp (đúng SSOT, ít rủi ro)

### B1) Fix KPI: sửa `useFDPAggregatedMetricsSSOT.ts` để parse đúng JSON camelCase
Có 2 phương án, mình chọn phương án an toàn/ít thay đổi:

**Phương án đề xuất (nhanh và chắc):**
- Trong `useFDPAggregatedMetricsSSOT.ts`, sửa phần “Parse RPC response”:
  - Không dùng `data?.[0]`
  - Không dùng snake_case keys
  - Parse trực tiếp `summaryRes.data` như object camelCase, fallback hợp lý
- Đồng thời log error nếu RPC trả lỗi để không “im lặng” (Truth > Flexibility)

Lưu ý: file `src/hooks/useFDPPeriodSummary.ts` đã là “mẫu đúng” cho contract này. Mình sẽ align theo đó để không lệch.

Kết quả mong đợi:
- `useFDPAggregatedMetricsSSOT()` trả về totalRevenue/totalOrders/etc đúng ⇒ `useUnitEconomics()` tự có AOV/COGS/Fees/Shipping/CM đầy đủ ⇒ các tab Order/Customer/Channel/Trends có data.

### B2) Fix SKU: bỏ overload 3-args ở backend + ép frontend luôn truyền p_limit
**Backend migration:**
- Drop function signature 3-args:
  - `DROP FUNCTION IF EXISTS public.get_sku_profitability_by_date_range(uuid, date, date);`
- Giữ lại 1 function duy nhất có `p_limit integer DEFAULT 500` (hoặc 100/500 tuỳ muốn):
  - Như vậy dù frontend có truyền hay không, RPC vẫn resolve được (nhưng mình vẫn sẽ truyền explicit ở frontend để “hardening”).

**Frontend:**
- Trong `useSKUProfitabilityCache.ts`, sửa call:
  - truyền `p_limit: 500`
- (Giữ mapping theo output hiện tại: `order_count, total_quantity, total_revenue, total_cogs, gross_profit, margin_percent`)

Kết quả mong đợi:
- Hết PGRST203
- Tab SKU Profitability load danh sách SKU theo date range

---

## C. Kế hoạch triển khai (theo thứ tự để tránh “vẫn 0”)

### Step 1 — Sửa frontend hook SSOT để KPI/Cost tabs có data
Files:
- `src/hooks/useFDPAggregatedMetricsSSOT.ts`

Việc làm:
1) Đổi interface “Types from RPC response” sang camelCase hoặc dùng type loosen (Json)
2) Thay logic parse:
   - `const summary = (summaryRes.data ?? {}) as any;`
   - `totalOrders = Number(summary.totalOrders ?? 0)`
   - `totalRevenue = Number(summary.totalRevenue ?? 0)`
   - `totalCogs = Number(summary.totalCogs ?? 0)`
   - `totalPlatformFees = Number(summary.totalPlatformFees ?? 0)` (nếu RPC đã gộp)
   - `totalShippingFees = Number(summary.totalShippingFees ?? 0)`
   - `contributionMargin = Number(summary.contributionMargin ?? 0)`
   - `uniqueCustomers = Number(summary.uniqueCustomers ?? 0)`
   - `period.start/end` lấy từ `summary.periodStart/periodEnd` hoặc fallback (tuỳ RPC trả gì)
3) Nếu RPC error: throw error để React Query báo lỗi rõ ràng (đỡ “0 im lặng”)

### Step 2 — Backend migration: remove overload 3-args cho SKU RPC
Files:
- `supabase/migrations/...sql` (tạo migration mới)

Việc làm:
1) `DROP FUNCTION IF EXISTS public.get_sku_profitability_by_date_range(uuid, date, date);`
2) (Optional hardening) đảm bảo function còn lại có default:
   - `CREATE OR REPLACE FUNCTION ... (p_limit integer DEFAULT 500)` hoặc giữ nguyên nếu đã có.
3) Re-check signature chỉ còn 1.

### Step 3 — Frontend hardening: luôn truyền p_limit khi gọi SKU RPC
Files:
- `src/hooks/useSKUProfitabilityCache.ts`

Việc làm:
- sửa RPC call thành:
  - `{ p_tenant_id: tenantId, p_start_date: startDateStr, p_end_date: endDateStr, p_limit: 500 }`

### Step 4 — Dọn “unsafe change” đã lỡ làm trước đó
Quan sát lịch sử cho thấy đã có lần “edited src/integrations/supabase/types.ts” (file này không nên sửa tay).
Việc làm:
- Revert mọi thay đổi thủ công trong `src/integrations/supabase/types.ts` về trạng thái auto-generated (để tránh drift type & merge conflicts).
- Các view/RPC thiếu typing thì dùng `as any` tại nơi query (đúng pattern hiện có trong codebase).

---

## D. Checklist xác nhận sau khi sửa

1) Reload `/unit-economics`
   - KPI cards (AOV/CM-Order/ROAS/LTV:CAC) không còn 0
   - Tab “Chi phí/Đơn” có số COGS/Phí sàn/Vận chuyển
2) Mở tab “SKU Profitability”
   - Không còn log PGRST203
   - Có danh sách SKU (>= vài chục dòng)
3) Quick sanity:
   - AOV ≈ totalRevenue/totalOrders (chỉ lệch do rounding)
4) Nếu vẫn rỗng:
   - Kiểm tra date range đang chọn có nằm trong khoảng dữ liệu
   - Verify tenantId đang active đúng company

---

## E. Rủi ro & cách xử lý

- Nếu RPC `get_fdp_period_summary` thay đổi key (camelCase khác): sẽ bọc layer mapping + fallback, đồng thời log warning để nhìn thấy ngay.
- Nếu vẫn có overload do migration trước chưa chạy đúng môi trường: sẽ chạy lại migration và xác minh bằng query pg_proc (mình sẽ tự kiểm tra).
- Nếu SKU RPC trả schema khác với hook: chỉnh mapping theo “return columns” thực tế của function.

---

## Phạm vi thay đổi (tóm tắt)
- Frontend:
  - Sửa `useFDPAggregatedMetricsSSOT.ts` parse đúng JSON camelCase
  - Sửa `useSKUProfitabilityCache.ts` truyền `p_limit`
  - Revert sửa tay `src/integrations/supabase/types.ts` (nếu đang bị drift)
- Backend:
  - Migration drop overload 3-args cho `get_sku_profitability_by_date_range`

