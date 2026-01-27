
# Kế hoạch: Thêm cột phí sàn vào cdp_orders (SSOT Layer 1)

## Tóm tắt vấn đề

Dữ liệu phí sàn **đã có sẵn** trong `external_orders` từ data warehouse:
- `platform_fee` - Phí nền tảng (Shopee, Lazada, TikTok...)
- `commission_fee` - Phí hoa hồng
- `payment_fee` - Phí thanh toán
- `shipping_fee` - Phí vận chuyển
- `total_fees` - Tổng phí

**NHƯNG** bảng `cdp_orders` (SSOT Layer 1) **thiếu các cột này**, dẫn đến:
1. Phí sàn không được sync sang SSOT
2. View `v_channel_performance` không có data phí
3. Trang Phân tích Đa kênh hiển thị 0₫

## Giải pháp

### Bước 1: Thêm cột phí sàn vào cdp_orders

Thêm 3 cột mới vào bảng `cdp_orders`:

```text
cdp_orders
├── ... (existing columns)
├── platform_fee NUMERIC DEFAULT 0    ← Phí sàn (Shopee/Lazada/TikTok fee)
├── shipping_fee NUMERIC DEFAULT 0    ← Phí vận chuyển
└── other_fees NUMERIC DEFAULT 0      ← Phí khác (commission + payment)
```

### Bước 2: Cập nhật view v_channel_performance

Thêm aggregation phí sàn:

```text
v_channel_performance (updated)
├── channel
├── order_count  
├── gross_revenue
├── net_revenue
├── total_fees = SUM(platform_fee + shipping_fee + other_fees)  ← MỚI
├── cogs
└── gross_margin
```

### Bước 3: Backfill dữ liệu từ external_orders

Sync phí sàn từ `external_orders` sang `cdp_orders` cho dữ liệu đã tồn tại:

```text
UPDATE cdp_orders SET
  platform_fee = external_orders.platform_fee,
  shipping_fee = external_orders.shipping_fee,
  other_fees = external_orders.commission_fee + external_orders.payment_fee
FROM external_orders
WHERE cdp_orders.order_key = external_orders.external_order_id
  AND cdp_orders.tenant_id = external_orders.tenant_id;
```

### Bước 4: Cập nhật hook useChannelPerformance

Sửa mapping để lấy `total_fees` từ view thay vì hardcode 0.

---

## Chi tiết kỹ thuật

### Migration SQL

```sql
-- 1. Thêm cột phí vào cdp_orders
ALTER TABLE cdp_orders 
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_fees NUMERIC DEFAULT 0;

-- 2. Backfill từ external_orders
UPDATE cdp_orders co
SET 
  platform_fee = COALESCE(eo.platform_fee, 0),
  shipping_fee = COALESCE(eo.shipping_fee, 0),
  other_fees = COALESCE(eo.commission_fee, 0) + COALESCE(eo.payment_fee, 0)
FROM external_orders eo
WHERE co.tenant_id = eo.tenant_id
  AND co.order_key = COALESCE(eo.external_order_id, eo.order_number, eo.id::text);

-- 3. Cập nhật view v_channel_performance
CREATE OR REPLACE VIEW v_channel_performance 
WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  channel,
  COUNT(*)::INTEGER as order_count,
  COALESCE(SUM(gross_revenue), 0) as gross_revenue,
  COALESCE(SUM(net_revenue), 0) as net_revenue,
  COALESCE(SUM(platform_fee + shipping_fee + other_fees), 0) as total_fees,
  COALESCE(SUM(cogs), 0) as cogs,
  COALESCE(SUM(gross_margin), 0) as gross_margin
FROM cdp_orders
GROUP BY tenant_id, channel;
```

### Hook Update (useChannelAnalytics.ts)

```typescript
// Sửa mapping total_fees
total_fees: Number(item.total_fees) || 0,  // Từ view thay vì hardcode 0
```

---

## Kết quả mong đợi

Sau khi implement, trang Phân tích Đa kênh sẽ hiển thị phí sàn thực từ data warehouse:

| Kênh | Đơn hàng | Doanh thu | Phí sàn | COGS | Lợi nhuận |
|------|----------|-----------|---------|------|-----------|
| Shopee | 2,200 | 821.7M | ~70M | 398.4M | 353.3M |
| Lazada | 1,375 | 577.5M | ~52M | 278.6M | 247.0M |
| TikTok | 1,100 | 356.0M | ~34M | 170.7M | 151.5M |
| Website | 825 | 463.7M | ~32M | 228.5M | 202.7M |

---

## Tệp tin cần thay đổi

1. **Database Migration** - Thêm cột `platform_fee`, `shipping_fee`, `other_fees` vào `cdp_orders`
2. **Database Migration** - Backfill data từ `external_orders`
3. **Database Migration** - Cập nhật view `v_channel_performance`
4. **`src/hooks/useChannelAnalytics.ts`** - Sửa mapping `total_fees`

## Tuân thủ SSOT Architecture

- ✅ Phí sàn lưu ở Layer 1 (`cdp_orders`) - nguồn sự thật duy nhất
- ✅ Trigger sync đã có sẵn mapping - chỉ cần thêm cột
- ✅ View tính aggregation - không tính ở frontend
- ✅ Data warehouse → external_orders → cdp_orders → views → hooks
