
# Kế hoạch: Sửa SKU Cost Breakdown Dialog dùng CDP SSOT

## 1. Vấn đề hiện tại (Root Cause)

### 1.1 Dialog "Chi tiết phân bổ chi phí" không load được data
- **Nguyên nhân**: `SKUCostBreakdownDialog.tsx` đang query `external_order_items` (line 124-140)
- **Kết quả**: Trả về `[]` vì tenant E2E test không có data trong `external_order_items`
- **Data thực tế**: Có sẵn trong `cdp_order_items` + `cdp_orders` (13,200 items cho tenant này)

### 1.2 Mapping SKU sai
- RPC `get_sku_profitability_by_date_range` đã sửa để join `products.id::text = cdp_order_items.product_id`
- Nhưng dialog vẫn query `external_order_items.sku` thay vì lookup qua `products.sku`

## 2. Giải pháp (theo SSOT)

### 2.1 Chuyển SKUCostBreakdownDialog sang CDP-only

```text
TRƯỚC (hiện tại):
external_order_items → external_orders → sku_profitability_cache (fallback)

SAU (SSOT):
cdp_order_items → cdp_orders → products (lookup SKU/name)
```

### 2.2 Tạo RPC mới: `get_sku_cost_breakdown`

Tạo database function để aggregate line-item data từ CDP:

**Input:**
- `p_tenant_id uuid`
- `p_sku text` (products.sku)
- `p_start_date date`
- `p_end_date date`

**Output:**
- `order_id`, `order_number` (từ cdp_orders.order_key)
- `channel`, `order_at`
- `quantity`, `unit_price`, `line_revenue`, `line_cogs`, `line_margin`
- Allocated fees (platform_fee, shipping_fee, other_fees) theo revenue share

**Logic join:**
1. `cdp_order_items.product_id` → match với `products.id::text` hoặc `products.sku`
2. Filter by `products.sku = p_sku`
3. Join `cdp_orders` để lấy channel, fees, order_at

### 2.3 Cập nhật Frontend Hook

Sửa `SKUCostBreakdownDialog.tsx`:
- Thay query `external_order_items` bằng RPC `get_sku_cost_breakdown`
- Remove fallback sang `sku_profitability_cache` (không cần nữa vì RPC trả trực tiếp)
- Giữ nguyên UI components (cards, tabs, table)

## 3. Chi tiết kỹ thuật

### 3.1 Database Migration: Tạo RPC `get_sku_cost_breakdown`

```sql
CREATE OR REPLACE FUNCTION public.get_sku_cost_breakdown(
  p_tenant_id uuid,
  p_sku text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  order_id uuid,
  order_key text,
  channel text,
  order_at timestamptz,
  quantity integer,
  unit_price numeric,
  line_revenue numeric,
  line_cogs numeric,
  line_margin numeric,
  order_gross_revenue numeric,
  order_platform_fee numeric,
  order_shipping_fee numeric,
  order_other_fees numeric,
  revenue_share_pct numeric,
  allocated_platform_fee numeric,
  allocated_shipping_fee numeric,
  allocated_other_fees numeric,
  gross_profit numeric,
  net_profit numeric,
  margin_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    co.id AS order_id,
    co.order_key,
    co.channel,
    co.order_at,
    coi.qty AS quantity,
    coi.unit_price,
    coi.line_revenue,
    coi.line_cogs,
    coi.line_margin,
    co.gross_revenue AS order_gross_revenue,
    COALESCE(co.platform_fee, 0) AS order_platform_fee,
    COALESCE(co.shipping_fee, 0) AS order_shipping_fee,
    COALESCE(co.other_fees, 0) AS order_other_fees,
    -- Revenue share percentage
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * 100)::numeric, 2)
      ELSE 0
    END AS revenue_share_pct,
    -- Allocated fees
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * COALESCE(co.platform_fee, 0))::numeric, 2)
      ELSE 0
    END AS allocated_platform_fee,
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * COALESCE(co.shipping_fee, 0))::numeric, 2)
      ELSE 0
    END AS allocated_shipping_fee,
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * COALESCE(co.other_fees, 0))::numeric, 2)
      ELSE 0
    END AS allocated_other_fees,
    -- Profit calculations
    COALESCE(coi.line_revenue - coi.line_cogs, 0)::numeric AS gross_profit,
    (COALESCE(coi.line_revenue, 0) 
      - COALESCE(coi.line_cogs, 0)
      - CASE WHEN co.gross_revenue > 0 
          THEN (coi.line_revenue / co.gross_revenue * (COALESCE(co.platform_fee, 0) + COALESCE(co.shipping_fee, 0) + COALESCE(co.other_fees, 0)))
          ELSE 0
        END
    )::numeric AS net_profit,
    -- Margin percent
    CASE WHEN coi.line_revenue > 0 
      THEN ROUND(((coi.line_revenue - coi.line_cogs) / coi.line_revenue * 100)::numeric, 2)
      ELSE 0
    END AS margin_percent
  FROM cdp_order_items coi
  INNER JOIN cdp_orders co ON co.id = coi.order_id AND co.tenant_id = coi.tenant_id
  INNER JOIN products p ON p.tenant_id = coi.tenant_id 
    AND (p.id::text = coi.product_id OR p.sku = coi.product_id)
  WHERE coi.tenant_id = p_tenant_id
    AND p.sku = p_sku
    AND co.order_at::date BETWEEN p_start_date AND p_end_date
  ORDER BY co.order_at DESC
  LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sku_cost_breakdown(uuid, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sku_cost_breakdown(uuid, text, date, date) TO anon;
```

### 3.2 Frontend: Sửa `SKUCostBreakdownDialog.tsx`

**Thay đổi chính:**
1. Remove query `external_order_items`
2. Remove fallback `sku_profitability_cache`
3. Gọi RPC `get_sku_cost_breakdown` thay thế
4. Map response vào interface `OrderBreakdown` hiện có

**Code flow mới:**
```typescript
// 1. Gọi RPC mới
const { data: breakdownData } = await supabase.rpc('get_sku_cost_breakdown', {
  p_tenant_id: tenantId,
  p_sku: sku, // products.sku
  p_start_date: startDateStr,
  p_end_date: endDateStr
});

// 2. Map vào interface hiện có
const breakdowns: OrderBreakdown[] = breakdownData.map(row => ({
  order_number: row.order_key?.slice(0, 8) || row.order_id.slice(0, 8),
  channel: row.channel || 'Unknown',
  order_date: row.order_at,
  quantity: row.quantity,
  unit_price: row.unit_price,
  item_revenue: row.line_revenue,
  // ... các field khác
}));

// 3. Aggregate summary từ breakdowns (giữ nguyên logic hiện tại)
```

## 4. Phạm vi thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/migrations/xxx.sql` | Tạo RPC `get_sku_cost_breakdown` |
| `src/components/dashboard/SKUCostBreakdownDialog.tsx` | Đổi data source sang CDP RPC |

## 5. Không thay đổi

- `get_sku_profitability_by_date_range` (đã sửa, hoạt động tốt)
- `useCachedSKUProfitability` (hook cho list view)
- `SKUProfitabilityAnalysis.tsx` (UI component)
- Các file khác trong Unit Economics

## 6. Kết quả mong đợi

1. **List SKU**: Hiển thị đúng tên sản phẩm (từ `products.name`)
2. **Detail dialog**: Load data từ `cdp_orders` + `cdp_order_items`
3. **Phí phân bổ**: Tính theo revenue share từ order-level fees
4. **SSOT**: Không còn dependency vào `external_orders/items`

## 7. Verification

Sau khi implement:
1. Vào `/unit-economics` → Tab "SKU Profitability"
2. Click vào 1 SKU card
3. Dialog phải hiển thị:
   - Summary cards (Số đơn, Doanh thu, COGS, Lợi nhuận)
   - Tab "Theo kênh" với breakdown
   - Tab "Chi tiết đơn" với danh sách orders
