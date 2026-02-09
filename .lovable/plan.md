

# Fix: Knowledge Snapshot thiếu tên sản phẩm

## Vấn đề

Khi hỏi "Top 10 sản phẩm bán chạy nhất", AI chỉ hiển thị mã SKU (SER00130, SP020502...) mà không có tên sản phẩm. Nguyên nhân:

1. Các SKU bắt đầu bằng SER*, SP*, SCT* (chiếm phần lớn doanh thu) **không tồn tại** trong bảng `products`
2. Cột `product_name` trong `cdp_order_items` cũng NULL cho các SKU này (dữ liệu KiotViet backfill bị thiếu)
3. Hàm `buildTopProducts` chỉ JOIN với bảng `products` qua SKU, nên không tìm được tên

## Giải pháp (2 bước)

### Bước 1: Cải thiện `buildTopProducts` để lấy tên từ mọi nguồn có thể

Sửa `supabase/functions/build-knowledge-snapshots/index.ts`:

- Khi query `cdp_order_items`, thêm cột `product_name` vào SELECT
- Khi aggregate, ưu tiên: `products.name` > `cdp_order_items.product_name` > SKU code
- Đồng thời tăng limit query lên (hiện tại chỉ lấy 1000 items, không đủ đại diện cho toàn bộ dữ liệu 190K+ items)

### Bước 2: Backfill tên sản phẩm cho các SKU bị thiếu

Tạo một RPC hoặc migration để cập nhật `product_name` trong `cdp_order_items` từ BigQuery source (bảng `bdm_kov_OrderLineItems` có cột `Productname`). Việc này đảm bảo các lần build snapshot sau đều có tên.

## Technical Details

### File: `supabase/functions/build-knowledge-snapshots/index.ts`

**Thay đổi hàm `buildTopProducts` (dòng 77-121):**

1. Query `cdp_order_items` thêm cột `product_name`:
```typescript
.select('sku, product_name, qty, line_revenue')
```

2. Thay đổi logic aggregate để lưu product_name từ order items:
```typescript
skuAgg[item.sku] = {
  qty: 0, revenue: 0,
  name: prod?.name || item.product_name || item.sku,  // thêm fallback
  category: prod?.category || 'N/A',
};
```

3. Thay vì lấy 1000 items (chỉ cover ~0.5% data), dùng approach khác: query aggregate trực tiếp từ DB bằng RPC hoặc view để lấy top products chính xác hơn.

### New migration: Tạo view `v_top_products_30d`

Tạo một view pre-aggregated trong DB để `buildTopProducts` không cần scan toàn bộ order items:

```sql
CREATE OR REPLACE VIEW v_top_products_30d AS
SELECT 
  oi.tenant_id,
  oi.sku,
  COALESCE(p.name, MAX(oi.product_name), oi.sku) as product_name,
  COALESCE(p.category, MAX(oi.category)) as category,
  SUM(oi.qty) as total_qty,
  SUM(oi.line_revenue) as total_revenue,
  COUNT(DISTINCT oi.order_id) as order_count
FROM cdp_order_items oi
LEFT JOIN products p ON oi.sku = p.sku AND oi.tenant_id = p.tenant_id
WHERE oi.line_revenue > 0
GROUP BY oi.tenant_id, oi.sku, p.name, p.category
ORDER BY total_revenue DESC;
```

### Thay đổi `buildTopProducts` dùng view mới:

```typescript
async function buildTopProducts(supabase, tenantId) {
  const { data: rows } = await supabase
    .from('v_top_products_30d')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(20);
  
  // Format trực tiếp từ view - không cần JOIN thủ công
  const top20 = (rows || []).map((r, i) => ({
    rank: i + 1,
    sku: r.sku,
    name: r.product_name,
    category: r.category,
    qty: r.total_qty,
    revenue: r.total_revenue,
    orderCount: r.order_count,
  }));
  
  const lines = top20.map(p => 
    `${p.rank}. ${p.name} (${p.sku}): ${fmtNum(p.qty)} sp, ${fmtVND(p.revenue)}, ${p.orderCount} đơn`
  );
  const summary_text = `=== TOP 20 SẢN PHẨM (theo doanh thu) ===\n${lines.join('\n')}`;
  
  return { snapshot_type: 'top_products', data: { top20 }, summary_text };
}
```

### Kết quả mong đợi

Thay vì:
```
1. 22207100 - 22207100: 11 đơn, 270.8 triệu
2. SER00130 - SER00130: 10 đơn, 221.9 triệu
```

Sẽ hiển thị:
```
1. Hàng bán Franchise (22207100): 11 sp, 270.8 triệu, 11 đơn
2. SER00130 (SER00130): 10 sp, 221.9 triệu  -- vẫn hiện SKU nếu chưa có tên
```

### Lưu ý: Dữ liệu gốc thiếu tên

Nhiều SKU bắt đầu bằng SER*/SP*/SCT* (likely dịch vụ/service từ KiotViet) không có `product_name` trong cả `cdp_order_items` lẫn `products`. Để fix triệt để, cần backfill tên từ BigQuery source (`bdm_kov_OrderLineItems.Productname`) - đây là bước riêng ngoài scope fix này.

