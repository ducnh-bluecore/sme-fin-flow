

# Fix: Chuyển Update Discounts sang bảng RAW thay vì BDM

## Vấn đề hiện tại

Logic `update_discounts` đang query từ bảng BDM (`bdm_Tbl_KOV_Orderslineitem`) — đây là bảng tổng hợp từ nhiều bảng khác. Cách này:
- Không triệt để: BDM là data đã qua xử lý, có thể sai hoặc thiếu
- Phức tạp không cần thiết: phải GROUP BY và tính toán lại discount từ line items
- Chậm: BDM table có nhiều cột thừa và logic aggregate phức tạp

## Giải pháp: Truy vấn trực tiếp `raw_kiotviet_Orders`

Bảng `raw_kiotviet_Orders` có **1,079,515 records** — khớp với số đơn KiotViet trong database. Schema đã xác nhận:
- `OrderId` (INTEGER) -- key
- `discount` (FLOAT) -- giảm giá trực tiếp, không cần tính toán
- `TotalPayment` (FLOAT) -- net revenue đã trừ discount

Thay đổi duy nhất: đổi BigQuery query trong action `update_discounts`.

## Chi tiết kỹ thuật

File: `supabase/functions/backfill-bigquery/index.ts` (khu vực dòng 3058-3070)

**TRUOC (BDM - phức tạp, gián tiếp):**
```sql
SELECT 
  CAST(OrderId AS STRING) as order_id,
  SUM(IFNULL(order_discount, 0)) as total_order_discount,
  SUM(IFNULL(Discount, 0)) as total_line_discount,
  SUM(IFNULL(TotalPayment, 0)) as total_payment
FROM bdm_Tbl_KOV_Orderslineitem
GROUP BY OrderId
HAVING SUM(...) > 0 OR SUM(...) > 0
```

**SAU (RAW - trực tiếp, đơn giản):**
```sql
SELECT 
  CAST(OrderId AS STRING) as order_id,
  IFNULL(discount, 0) as discount_amount,
  IFNULL(TotalPayment, 0) as total_payment
FROM raw_kiotviet_Orders
WHERE discount > 0
ORDER BY OrderId
LIMIT ... OFFSET ...
```

Ngoài ra cần cập nhật logic xử lý kết quả:
- Bỏ logic `Math.max(orderDiscount, lineDiscount)` -- không cần vì raw đã có discount trực tiếp
- Dùng `discount_amount` thẳng từ BigQuery
- Tính `net_revenue = gross_revenue - discount_amount`
- Cập nhật comment mô tả nguồn dữ liệu

## Lợi ích

- Triệt để: Query trực tiếp từ nguồn gốc, không qua trung gian
- Nhanh hơn: Không cần GROUP BY, không cần aggregate
- Chính xác hơn: discount đã sẵn ở cấp order, không cần suy ngược từ line items
- 1:1 mapping: 1,079,515 records BigQuery tuong ung 1,029,887 records cdp_orders
