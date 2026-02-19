
# Sync KiotViet Discount Data vào Database

## Bối cảnh

BigQuery dataset `olvboutique` có bảng `raw_kiotviet_Invoice` chứa discount fields (Discount, DiscountRatio, VoucherCode, VoucherDiscount, etc.) từ KiotViet. Tuy nhiên pipeline sync hiện tại không map các fields này khi đưa vào `cdp_orders`.

Kết quả: 1.03 triệu đơn KiotViet trong `cdp_orders` nhưng `discount_amount = 0` cho tất cả.

## Mục tiêu

Sau khi xong, các trang MDP và Promotions sẽ hiển thị:
- Tổng discount đã giảm cho khách (KiotViet)
- Chiến dịch nào hiệu quả (giảm ít nhưng revenue cao)
- Net revenue thật = Gross - Discount

## Giải pháp: 2 bước

### Bước 1: Cập nhật BigQuery sync — map discount fields KiotViet

Trong edge function `backfill-bigquery`, khi sync KiotViet orders từ BigQuery vào `cdp_orders`, thêm mapping cho các discount columns:

```
BigQuery raw_kiotviet_Invoice  →  cdp_orders
─────────────────────────────────────────────
Discount                       →  discount_amount
DiscountRatio                  →  (metadata/raw_data)
VoucherCode                    →  (raw_data)
VoucherDiscount                →  voucher_discount
```

File cần sửa: `supabase/functions/backfill-bigquery/index.ts` — phần xử lý model `kiotviet_orders`

### Bước 2: Backfill lại existing records

Sau khi fix mapping, cần trigger 1 lần backfill KiotViet để cập nhật `discount_amount` cho 1M+ đơn đã có:

```sql
-- Sau khi sync xong, verify:
SELECT 
  channel,
  COUNT(CASE WHEN discount_amount > 0 THEN 1 END) as has_discount,
  SUM(discount_amount) as total_discount
FROM cdp_orders
WHERE tenant_id = '...' AND channel = 'kiotviet'
GROUP BY channel;
```

### Bước 3: Cập nhật view `v_mdp_campaign_attribution`

View này hiện tại tính `attributed_revenue` từ orders nhưng không trừ discount. Cần update để:

```sql
-- Thêm discount vào view:
SUM(o.gross_amount) as attributed_revenue,
SUM(o.discount_amount + o.voucher_discount) as total_discount,
SUM(o.net_revenue) as net_attributed_revenue
```

### Bước 4: Hiển thị trong UI — Promotions page

Trang `src/pages/mdp/PromotionsPage.tsx` hoặc `usePromotionROI` hook cần thêm:
- Cột "Discount đã cho" (từ `cdp_orders.discount_amount` group by channel/date)
- Net Revenue = Gross Revenue - Discount
- Efficiency ratio: Revenue per 1đ discount

## Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `supabase/functions/backfill-bigquery/index.ts` | Thêm `discount_amount`, `voucher_discount` mapping cho KiotViet |
| 2 | `supabase/functions/daily-bigquery-sync/index.ts` | Thêm discount fields vào incremental sync KiotViet |
| 3 | Database migration | Update view `v_mdp_campaign_attribution` để include discount |
| 4 | `src/hooks/usePromotionROI.ts` | Thêm discount data từ cdp_orders vào tính toán ROI |

## Trình tự thực hiện

```text
1. Fix backfill-bigquery edge function (discount mapping)
      ↓
2. Fix daily-bigquery-sync (incremental discount)
      ↓
3. Update view v_mdp_campaign_attribution
      ↓
4. Trigger manual backfill từ Admin → BigQuery Backfill
      ↓
5. Update UI hooks để hiển thị discount data
```

## Kết quả kỳ vọng

| Metric | Trước | Sau |
|--------|-------|-----|
| KiotViet orders có discount_amount | 0 / 1.03M | ~300K+ (ước tính) |
| Total discount KiotViet | 0 | Thực tế từ BQ |
| Net Revenue accuracy | Gross only | Gross - Discount |
| MDP Promotions page | Chỉ Shopee Ads | Cả KiotViet + Shopee Ads |

## Lưu ý quan trọng

Trước khi bắt đầu, cần verify BigQuery schema của `raw_kiotviet_Invoice` có những discount columns nào — tên chính xác có thể khác (`Discount`, `TotalDiscount`, `DiscountValue`). Có thể kiểm tra qua BigQuery console hoặc qua edge function test call.
