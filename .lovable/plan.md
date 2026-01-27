
# Kế hoạch: Fix Unit Economics Data - 2 lỗi chính

## Vấn đề đã xác định

### Lỗi 1: RPC SKU dùng sai tên cột

RPC `get_sku_profitability_by_date_range` tham chiếu cột không tồn tại:

| RPC dùng | Cột thực tế (cdp_order_items) |
|----------|-------------------------------|
| `coi.quantity` | `coi.qty` |
| `coi.total_amount` | `coi.line_revenue` |
| `coi.cogs_amount` | `coi.line_cogs` |

Console error: `"column coi.quantity does not exist"`

### Lỗi 2: Hook mapping sai format

Hook `useFDPAggregatedMetricsSSOT` expect interface theo format không khớp với RPC response:
- RPC trả về: `total_platform_fee`, `total_shipping_fee` (snake_case)  
- Interface định nghĩa: `totalPlatformFees`, `totalShippingFees` (camelCase)

Nhưng RPC `get_fdp_period_summary` đã trả về camelCase đúng - vấn đề là hook không dùng đúng RPC response.

---

## Giải pháp

### Bước 1: Database Migration - Fix RPC SKU Column Names

```sql
DROP FUNCTION IF EXISTS get_sku_profitability_by_date_range(...);

CREATE FUNCTION get_sku_profitability_by_date_range(...)
  ...
  SELECT 
    -- FIX: qty thay vì quantity
    SUM(coi.qty)::BIGINT as total_quantity,
    -- FIX: line_revenue thay vì total_amount
    SUM(coi.line_revenue)::NUMERIC as total_revenue,
    -- FIX: line_cogs thay vì cogs_amount  
    SUM(COALESCE(coi.line_cogs, coi.line_revenue * 0.55))::NUMERIC as total_cogs,
    ...
  FROM cdp_order_items coi
  ...
```

### Bước 2: Fix Hook mapping (nếu cần)

Kiểm tra và đảm bảo `useFDPAggregatedMetricsSSOT` mapping đúng RPC response fields.

---

## Tệp tin thay đổi

| File | Thay đổi | Mục đích |
|------|----------|----------|
| **Database Migration** | Fix RPC `get_sku_profitability_by_date_range` - đổi column names | Fix lỗi "column does not exist" |

---

## Kết quả mong đợi

### Trước (Hiện tại)
- AOV: 0
- CM/Order: 0  
- COGS: -0 đ
- Tab SKU Profitability: Lỗi

### Sau khi fix
- AOV: ~369,000đ
- CM/Order: ~126,000đ
- COGS: -195,606đ (53%)
- Tab SKU Profitability: Hiển thị đầy đủ 500 SKU

---

## Chi tiết kỹ thuật

Schema thực tế của `cdp_order_items`:
- `id` (uuid)
- `tenant_id` (uuid)
- `order_id` (uuid)
- `product_id` (text)
- `category` (text)
- `qty` (integer) ← **Đúng**
- `unit_price` (numeric)
- `line_revenue` (numeric) ← **Đúng**
- `line_cogs` (numeric) ← **Đúng**
- `line_margin` (numeric)
