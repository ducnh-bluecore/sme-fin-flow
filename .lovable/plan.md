

## Plan: Hiển thị tổng records thực tế trong DB + cải thiện Lịch sử Sync

### Vấn đề hiện tại

- Trang "Lịch sử Sync" chỉ hiển thị số records của **lần sync gần nhất** (thường chỉ 2 ngày lookback), không phải tổng records trong database
- Ví dụ: UI hiển thị 539 customers, nhưng thực tế DB có **311,837** customers
- Gây nhầm lẫn rằng "data bị xóa"

### Dữ liệu thực tế trong DB

| Model | Tổng trong DB |
|-------|--------------|
| cdp_orders | 1,198,985 |
| cdp_payments | 988,523 |
| cdp_fulfillments | 329,650 |
| cdp_customers | 311,837 |
| cdp_order_items | 191,551 |
| products | 35,821 |
| cdp_refunds | 14,502 |

### Thay đổi

#### 1. Thêm Summary Card "Tổng records trong DB" vào DailySyncHistory

- Thêm 1 section phía trên lịch sử chạy, hiển thị tổng record thực tế cho mỗi model
- Query trực tiếp count từ các bảng `cdp_*` và `products`
- Hiển thị dạng grid cards với icon + số lượng

#### 2. Cập nhật bảng chi tiết mỗi lần chạy

- Thêm cột "Tổng trong DB" bên cạnh cột "Records" (số lần sync đó)
- Giúp phân biệt rõ: "lần này sync 539" vs "tổng DB có 311,837"

#### 3. Tạo hook `useModelTotalCounts`

- Hook mới query count từ tất cả model tables
- Sử dụng `useTenantQueryBuilder` để đúng schema
- Cache 60s, không cần poll thường xuyên

### Technical Details

**Files sẽ thay đổi:**
- `src/hooks/useModelTotalCounts.ts` (mới) -- hook query tổng record từ DB
- `src/components/warehouse/DailySyncHistory.tsx` -- thêm section tổng records + cột "Tổng DB" trong bảng chi tiết

**Hook `useModelTotalCounts`:**
- Query parallel count cho: `cdp_customers`, `cdp_orders`, `cdp_order_items`, `cdp_refunds`, `cdp_payments`, `cdp_fulfillments`, `products`, `cdp_campaigns`, `cdp_ad_spend`
- Return `Record<string, number>` mapping model name to count

**UI Changes:**
- Grid 5 cột hiển thị icon + model name + total count (giống style hiện tại của SummaryCard)
- Trong expanded run detail table, thêm cột "Tổng DB" hiển thị con số từ hook

