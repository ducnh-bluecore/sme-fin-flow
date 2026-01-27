
## Tình trạng hiện tại (vì sao vẫn lỗi)
Tab **SKU Profitability** vẫn không có data vì RPC `get_sku_profitability_by_date_range` đang **crash ở DB** do tham chiếu sai schema bảng `cdp_order_items`.

Bằng chứng từ network request hiện tại:
- RPC trả **400** với lỗi:
  - `column coi.sku does not exist` (code `42703`)

Nguyên nhân:
- Migration gần nhất đã “fix join text=uuid”, nhưng function mới lại dùng các cột **không tồn tại** trong `cdp_order_items` và `cdp_orders`:
  - `coi.sku` (không có)
  - `coi.quantity` (đúng phải là `coi.qty`)
  - `coi.line_total` (đúng phải là `coi.line_revenue`)
  - `coi.cogs_amount` (đúng phải là `coi.line_cogs`)
  - `co.order_date` (đúng là `co.order_at`)
  - `co.status` (cdp_orders không có cột này trong schema hiện tại)

Schema thật (đã xác nhận trong migration tạo bảng):
- `cdp_order_items`: `product_id (text)`, `qty`, `unit_price`, `line_revenue`, `line_cogs`, `line_margin`
- `cdp_orders`: `order_at`, `channel`, `net_revenue`, `cogs`, `gross_margin`… (không có status)

=> Vì vậy function hiện tại **không thể chạy** nên UI chỉ hiện “Không thể tải dữ liệu SKU”.

---

## Mục tiêu fix
1) RPC `get_sku_profitability_by_date_range(uuid, date, date, integer)` chạy OK với schema thật
2) Frontend hook `useCachedSKUProfitability()` không còn throw error
3) SKU Profitability tab hiển thị được list + summary theo date range (đúng DB-first / SSOT)

---

## Thiết kế giải pháp (DB-first, an toàn, không “làm đẹp số”)
### 1) Sửa lại RPC bằng migration mới (CREATE OR REPLACE / DROP + CREATE)
Tạo migration mới để **DROP và tạo lại** function `public.get_sku_profitability_by_date_range(uuid, date, date, integer)` với các thay đổi:

**a) Dùng đúng cột thực tế**
- Quantity: `SUM(coi.qty)`
- Revenue: `SUM(coi.line_revenue)`
- COGS: `SUM(coi.line_cogs)` (không tự “ước lượng” nếu null; nếu có null thì trả đúng null/0 tùy dữ liệu hiện có, tránh magic number)
- Order count: `COUNT(DISTINCT coi.order_id)` hoặc `COUNT(DISTINCT co.id)` (tương đương)

**b) Filter theo thời gian đúng**
- `co.order_at::date BETWEEN p_start_date AND p_end_date`

**c) SKU / product_name**
Vì `products` table không có cột `sku`, chỉ có `code`:
- `sku` output sẽ dùng: `COALESCE(p.code, coi.product_id, 'Unknown')::text`
- `product_name`: `COALESCE(p.name, 'Unknown')::text`

**d) Channel**
- `channel`: `COALESCE(co.channel, 'Unknown')::text`

**e) Fix join text -> uuid vẫn giữ “regex guard”**
Giữ join an toàn để không crash:
- `p.id = CASE WHEN coi.product_id matches UUID THEN coi.product_id::uuid ELSE NULL END`
- `p.tenant_id = coi.tenant_id`

**f) Bỏ điều kiện status**
Vì `cdp_orders` không có `status`, sẽ bỏ:
- `AND co.status NOT IN (...)`

**g) Return types khớp frontend**
Giữ đúng các cột frontend đang map:
- `sku, product_name, channel, order_count, total_quantity, total_revenue, total_cogs, gross_profit, margin_percent`
(Chỉ chỉnh dữ liệu nguồn cho đúng schema)

**h) Quyền thực thi**
- `GRANT EXECUTE` cho `authenticated` và `anon` như hiện tại.

---

## 2) Xác minh end-to-end sau khi migration chạy
1) Trên client, request RPC `/rpc/get_sku_profitability_by_date_range` phải trả 200 và array rows
2) UI SKU tab:
   - Không còn “Không thể tải dữ liệu SKU”
   - Nếu không có orders trong range: UI vào empty-state “Chưa có dữ liệu…” (khác error)

---

## 3) Dọn kỹ thuật (để không tái phát)
- Không chỉnh `src/integrations/supabase/types.ts` thủ công nữa (đang bị chạm nhiều lần). Khi implement ở default mode, sẽ revert nó về trạng thái auto-generated / remove các sửa tay nếu còn.

---

## Phạm vi thay đổi khi chuyển sang Default mode (implementation)
- Backend:
  - Thêm 1 migration mới thay thế function `get_sku_profitability_by_date_range` (sửa đúng tên cột + order_at)
- Frontend:
  - Không cần đổi hook `useSKUProfitabilityCache.ts` (vì hook đã gọi đúng params + mapping đúng output)
  - (Optional) nếu muốn thông báo lỗi chi tiết hơn trong UI, có thể render `error.message`, nhưng không bắt buộc để fix data.

---

## Tiêu chí “DONE”
- Network không còn 400 `column ... does not exist`
- SKU Profitability hiển thị list (Top 500) theo date range
- Không có “magic numbers” che lỗi dữ liệu; thiếu data thì empty-state, không fake

