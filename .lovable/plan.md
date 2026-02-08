
# Xử lý dứt điểm vấn đề Limit 1000 dòng: Pre-Aggregate mọi thứ trong DB

## Vấn đề gốc

Với 1.1M+ orders, bất kỳ hook nào pull raw rows đều sẽ:
- Bị cắt ở 1000 dòng (Supabase default) hoặc 50000 (hack limit)
- Trả sai số liệu (count, sum bị thiếu)
- Chậm và tốn bandwidth

**Nguyên tắc**: Hook KHÔNG BAO GIỜ được pull raw rows để tính toán. View/RPC phải trả về con số cuối cùng.

## Scan toàn bộ: Hooks còn pull raw rows

| Hook | File | Vấn đề | Rows pulled |
|------|------|--------|-------------|
| `useAllRevenueData` | useChannelAnalytics.ts | Pull 50k raw orders + invoices | 50000 |
| `useDailyChannelRevenue` | useChannelAnalytics.ts | Pull ALL raw orders, group client-side | ALL |
| `useOrderStatusSummary` | useChannelAnalytics.ts | Pull ALL orders chỉ để count | ALL |
| `useChannelFeesSummary` | useChannelAnalytics.ts | Pull ALL fees, group client-side | ALL |
| `useChannelPerformance` (fallback) | useChannelAnalytics.ts | Fallback pull raw orders | 1000 |
| `useExternalOrders` | useChannelAnalytics.ts | Pull raw orders (list page - OK nếu paginated) | varies |
| `useAudienceData` | useAudienceData.ts | Pull 50k customer summaries | 50000 |
| `useForecastInputs` (orders) | useForecastInputs.ts | Pull 50k raw orders | 50000 |
| `useOrders` | useOrders.ts | Pull 50k raw orders (list page) | 50000 |
| `useFDPMetrics` | useFDPMetrics.ts | Pull 50k orders (deprecated) | 50000 |
| `useMDPData` | useMDPData.ts | Pull 50k (deprecated) | 50000 |

## Kế hoạch sửa

### Bước 1: Tạo Views aggregate thiếu (Migration)

**View 1: `v_order_status_summary`** - Thay useOrderStatusSummary
```text
tenant_id | status | order_count | total_amount
```
(1-2 rows per tenant thay vì 1.1M)

**View 2: `v_channel_fees_summary`** - Thay useChannelFeesSummary
```text
tenant_id | fee_type | total_amount
```
(5-10 rows thay vì hàng ngàn)

**View 3: `v_all_revenue_summary`** - Thay useAllRevenueData
```text
tenant_id | source (ecommerce/invoice/revenue) | channel | total_orders | gross_revenue | net_revenue | cogs | gross_profit | avg_order_value
```
(10-15 rows thay vì 50k+)

**View 4: `v_forecast_order_stats`** - Thay useForecastInputs orders query
```text
tenant_id | total_orders | total_net_revenue | avg_daily_revenue | min_date | max_date
```
(1 row per tenant thay vì 50k)

### Bước 2: Refactor hooks thành thin wrappers

**useChannelAnalytics.ts** - Sửa toàn bộ file:
- `useAllRevenueData()`: Query `v_all_revenue_summary` (trả ~10 rows)
- `useDailyChannelRevenue()`: Đã có view `v_channel_daily_revenue`, chuyển sang dùng nó (trả ~90*5 = 450 rows max)
- `useOrderStatusSummary()`: Query `v_order_status_summary` (trả 1-2 rows)
- `useChannelFeesSummary()`: Query `v_channel_fees_summary` (trả 5-10 rows)
- `useChannelPerformance()`: Xóa fallback, chỉ dùng `v_channel_performance` (trả 5-7 rows)

**useForecastInputs.ts** - Sửa orders query:
- Thay `cdp_orders` limit 50000 bằng `v_forecast_order_stats` (1 row)

**useAudienceData.ts** - Đã dùng view nhưng vẫn limit 50000:
- View `v_audience_customer_summary` đã aggregate per customer, số customer thường dưới 50k nên tạm chấp nhận
- Nếu cần, tạo thêm `v_audience_segment_summary` (aggregate per segment thay vì per customer)

### Bước 3: Ngoại lệ (KHÔNG sửa)

| Hook | Lý do |
|------|-------|
| `useOrders` | List page cần raw rows + pagination - sẽ thêm server-side pagination sau |
| `useExternalOrders` | Tương tự, list page |
| `useFDPMetrics` | Deprecated, sẽ xóa |
| `useMDPData` | Deprecated, sẽ xóa |
| `useEcommerceReconciliation` | Reconciliation cần raw rows để so khớp |

## Kết quả sau sửa

```text
TRƯỚC: Hook pull 50,000 rows -> tính toán client-side -> sai số
SAU:   Hook pull 1-15 rows   -> hiển thị trực tiếp   -> chính xác 100%
```

Tổng cộng giảm từ ~200,000+ rows pulled xuống còn ~500 rows cho toàn bộ channel analytics page.

## Chi tiết kỹ thuật

### Migration SQL (4 views mới)

```text
1. v_order_status_summary: GROUP BY tenant_id, 'delivered' (fixed status)
   -> COUNT(*), SUM(gross_revenue)

2. v_channel_fees_summary: GROUP BY tenant_id, fee_type
   -> SUM(amount)

3. v_all_revenue_summary: 
   UNION ALL of:
   - cdp_orders grouped by channel
   - invoices grouped by status
   - revenues grouped by source

4. v_forecast_order_stats:
   -> COUNT, SUM(net_revenue), AVG, MIN/MAX date
```

### Hooks thay đổi

```text
src/hooks/useChannelAnalytics.ts:
  - useAllRevenueData() -> v_all_revenue_summary
  - useDailyChannelRevenue() -> v_channel_daily_revenue (existing)
  - useOrderStatusSummary() -> v_order_status_summary
  - useChannelFeesSummary() -> v_channel_fees_summary
  - useChannelPerformance() -> remove fallback, keep v_channel_performance only

src/hooks/useForecastInputs.ts:
  - forecast-orders query -> v_forecast_order_stats
```

Tất cả views dùng `security_invoker = on` để respect RLS.
