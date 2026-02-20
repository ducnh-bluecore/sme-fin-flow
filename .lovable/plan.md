

# Fix Bug: Update Discounts - Sai tên cột

## Vấn đề

Edge function `update_discounts` đang query bằng `.eq('external_order_id', orderId)` nhưng bảng `cdp_orders` **KHÔNG CÓ cột `external_order_id`**. Cột đúng là `order_key`.

Kết quả: Mỗi batch 500 orders từ BigQuery đều trả về `updated: 0` vì không tìm thấy record nào.

## Sửa lỗi

Thay đổi duy nhất trong file `supabase/functions/backfill-bigquery/index.ts`:

**Dòng 3125**: Đổi `external_order_id` thành `order_key`

```
// TRƯỚC (sai):
.eq('external_order_id', orderId)

// SAU (đúng):
.eq('order_key', orderId)
```

## Sau khi fix

Deploy xong, bấm lại nút "Update Discount" trên trang Admin. Lần này mỗi batch sẽ thực sự update `discount_amount` và `net_revenue` cho các đơn KiotViet.

