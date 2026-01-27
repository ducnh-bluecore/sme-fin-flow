
# Kế hoạch: Fill chi phí vào Unit Economics

## 1. Phân tích vấn đề

### A. Dữ liệu có sẵn trong Database

| Metric | Giá trị thực |
|--------|-------------|
| Total Orders | 5,280 (trong date range) |
| Total Revenue | 1.95 tỷ VND |
| Total COGS | 1.03 tỷ VND |
| Total Platform Fees | 125.7 triệu VND |
| Total Shipping Fees | 43.1 triệu VND |
| Unique Customers | 300 |
| **AOV** | **369,074 VND** |
| **CM** | **666 triệu VND** |

### B. RPC đã fix - Hoạt động đúng

Kiểm tra RPC `get_fdp_period_summary`:
```
✅ totalRevenue: 1,948,709,568 VND
✅ totalCogs: 1,032,816,071 VND
✅ totalPlatformFees: 125,690,250 VND (ĐÃ FIX!)
✅ totalShippingFees: 43,111,945 VND (ĐÃ FIX!)
✅ avgOrderValue: 369,074 VND
✅ contributionMargin: 666,221,372 VND
```

### C. Vấn đề còn lại: SKU RPC lỗi Type Mismatch

```
Error: "Returned type character varying does not match expected type text in column 1"
```

RPC `get_sku_profitability_by_date_range` có return type không khớp:
- `COALESCE(p.sku, coi.product_id)` trả về `varchar`
- Function declaration yêu cầu `text`

---

## 2. Giải pháp

### Bước 1: Fix RPC SKU Profitability Type Mismatch

```sql
-- Cast all varchar columns to TEXT explicitly
CREATE OR REPLACE FUNCTION get_sku_profitability_by_date_range(...)
RETURNS TABLE (
  sku TEXT,
  product_name TEXT,
  channel TEXT,
  ...
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.sku, coi.product_id)::TEXT as sku,
    COALESCE(p.name, 'Product ' || coi.product_id)::TEXT as product_name,
    co.channel::TEXT,
    ...
  FROM cdp_order_items coi
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Bước 2: Verify Data Flow

Sau khi fix, Unit Economics page sẽ hiển thị:

| KPI | Giá trị |
|-----|---------|
| AOV | 369,074₫ |
| CM/Order | ~126,100₫ |
| CM% | ~34.2% |
| LTV:CAC | ~2.1x |
| ROAS | ~1.8x |

---

## 3. Chi tiết tệp tin thay đổi

| File | Thay đổi | Mục đích |
|------|----------|----------|
| **Database Migration** | Fix RPC `get_sku_profitability_by_date_range` - cast VARCHAR to TEXT | Fix type mismatch error |

---

## 4. Kết quả mong đợi

### Trước (Hiện tại):
```
AOV: 0
CM/Order: 0
Doanh thu/đơn: 0 đ
(-) COGS: -0 đ
(-) Phí sàn: -0 đ
(-) Vận chuyển: -0 đ
= Contribution Margin: 0 đ (0.0%)
Pie chart: Trống
```

### Sau khi fix:
```
AOV: 369,074₫
CM/Order: 126,100₫
Doanh thu/đơn: 369,074₫
(-) COGS: -195,606₫ (53.0%)
(-) Phí sàn: -23,806₫ (6.4%)
(-) Vận chuyển: -8,165₫ (2.2%)
= Contribution Margin: 126,100₫ (34.2%)
Pie chart: 4 segments với đầy đủ data
```

---

## 5. Tuân thủ FDP Manifesto

- ✅ **SINGLE SOURCE OF TRUTH**: Data từ `cdp_orders` qua RPC
- ✅ **REVENUE ↔ COST**: Hiển thị đầy đủ COGS + Fees + Shipping
- ✅ **UNIT ECONOMICS → ACTION**: Metrics per-order để đánh giá
