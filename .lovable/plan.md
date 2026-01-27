

# KẾ HOẠCH TỔNG HỢP: SỬA "CƠ CẤU CHI PHÍ" VÀ "LỢI NHUẬN DANH MỤC"

## TỔNG QUAN VẤN ĐỀ

| Section | Vấn đề | Mức độ |
|---------|--------|--------|
| **Cơ cấu Chi phí so với Doanh thu** | Margin format sai (decimal thay vì %), màu sai cho số âm | 🔴 Critical |
| **Lợi nhuận theo danh mục sản phẩm** | Table trống vì `categoryData = []` | 🔴 Critical |

---

## PHẦN 1: SỬA "CƠ CẤU CHI PHÍ SO VỚI DOANH THU"

### 1.1 Vấn đề hiện tại

| Metric | Hiển thị sai | Giá trị đúng | Nguyên nhân |
|--------|--------------|--------------|-------------|
| Biên lợi nhuận hoạt động | -97.0% | -179.0% | DB lưu decimal (-1.79), hook không ×100 |
| Biên lợi nhuận ròng | -77.6% | -143.0% | Tương tự |
| Lợi nhuận ròng box | Màu xanh | Màu đỏ | Hardcode `text-success` |

### 1.2 Giải pháp

**File: `src/hooks/usePLData.ts`** - Normalize margin ×100

```typescript
// Dòng ~326, ~342, ~348 - Khi map single-month cache
grossMargin: (cache.gross_margin || 0) * 100,
operatingMargin: (cache.operating_margin || 0) * 100,
netMargin: (cache.net_margin || 0) * 100,
```

**File: `src/pages/PLReportPage.tsx`** - Conditional styling cho Lợi nhuận ròng

```typescript
// Dòng ~1120-1130
<div className={cn(
  "mt-6 p-4 rounded-lg border",
  plData.netIncome >= 0 
    ? "bg-success/10 border-success/20" 
    : "bg-destructive/10 border-destructive/20"
)}>
  <p className={cn(
    "text-sm font-medium",
    plData.netIncome >= 0 ? "text-success" : "text-destructive"
  )}>Lợi nhuận ròng</p>
  <p className={cn(
    "text-2xl font-bold",
    plData.netIncome >= 0 ? "text-success" : "text-destructive"
  )}>{formatPercent(plData.netMargin)}</p>
</div>
```

---

## PHẦN 2: SỬA "LỢI NHUẬN THEO DANH MỤC SẢN PHẨM"

### 2.1 Vấn đề hiện tại

```typescript
// usePLData.ts dòng ~399
const categoryData: CategoryPLData[] = [];  // ← Luôn trả về rỗng!
```

### 2.2 Dữ liệu có sẵn trong Database

| Category | Doanh thu | COGS | Biên LN |
|----------|-----------|------|---------|
| lifestyle | 129.8M | 77.9M | 40.0% |
| others | 128.6M | 77.2M | 40.0% |
| beauty | 128.5M | 77.1M | 40.0% |
| accessories | 127.2M | 76.3M | 40.0% |
| fashion | 126.7M | 76.0M | 40.0% |
| home | 125.8M | 75.5M | 40.0% |
| electronics | 125.1M | 75.0M | 40.0% |
| sports | 124.1M | 74.5M | 40.0% |

### 2.3 Giải pháp

**Bước 1: Tạo Database View**

```sql
CREATE OR REPLACE VIEW v_category_pl_summary AS
SELECT 
  oi.tenant_id,
  DATE_TRUNC('month', o.order_at)::DATE as period,
  COALESCE(oi.category, 'Không phân loại') as category,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.line_revenue) as total_revenue,
  SUM(oi.line_cogs) as total_cogs,
  SUM(oi.line_revenue) - SUM(oi.line_cogs) as gross_profit,
  CASE 
    WHEN SUM(oi.line_revenue) > 0 
    THEN ((SUM(oi.line_revenue) - SUM(oi.line_cogs)) / SUM(oi.line_revenue) * 100)
    ELSE 0 
  END as margin_percent
FROM cdp_order_items oi
JOIN cdp_orders o ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
GROUP BY oi.tenant_id, DATE_TRUNC('month', o.order_at), oi.category;
```

**Bước 2: Update Hook - `src/hooks/usePLData.ts`**

```typescript
// Thêm query lấy category data
const { data: categoryRows } = await supabase
  .from('v_category_pl_summary' as any)
  .select('*')
  .eq('tenant_id', tenantId)
  .gte('period', startDateStr)
  .lte('period', endDateStr);

// Aggregate và map thành CategoryPLData
const categoryAgg = new Map<string, { revenue: number; cogs: number }>();
(categoryRows || []).forEach(row => {
  const existing = categoryAgg.get(row.category) || { revenue: 0, cogs: 0 };
  existing.revenue += row.total_revenue || 0;
  existing.cogs += row.total_cogs || 0;
  categoryAgg.set(row.category, existing);
});

const totalCatRevenue = [...categoryAgg.values()].reduce((s, c) => s + c.revenue, 0);

const categoryData: CategoryPLData[] = [...categoryAgg.entries()]
  .map(([category, data]) => ({
    category,
    sales: data.revenue / 1000000,
    cogs: data.cogs / 1000000,
    margin: data.revenue > 0 
      ? Number(((data.revenue - data.cogs) / data.revenue * 100).toFixed(1))
      : 0,
    contribution: totalCatRevenue > 0
      ? Number((data.revenue / totalCatRevenue * 100).toFixed(1))
      : 0,
  }))
  .sort((a, b) => b.sales - a.sales);  // Sort by revenue desc
```

**Bước 3: Update UI - `src/pages/PLReportPage.tsx`**

```typescript
// Thêm empty state cho table
<TableBody>
  {categoryData.length === 0 ? (
    <TableRow>
      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
        Chưa có dữ liệu danh mục sản phẩm
      </TableCell>
    </TableRow>
  ) : (
    categoryData.map((cat) => (
      <TableRow key={cat.category}>
        <TableCell className="font-medium capitalize">{cat.category}</TableCell>
        <TableCell className="text-right">{formatCurrency(cat.sales * 1000000)}</TableCell>
        <TableCell className="text-right text-muted-foreground">{formatCurrency(cat.cogs * 1000000)}</TableCell>
        <TableCell className="text-right">
          <Badge variant={cat.margin >= 30 ? 'default' : 'secondary'}>{cat.margin}%</Badge>
        </TableCell>
        <TableCell className="text-right">{cat.contribution}%</TableCell>
      </TableRow>
    ))
  )}
</TableBody>
```

---

## DATA FLOW TỔNG HỢP

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLOW 1: MARGIN FIX                              │
├─────────────────────────────────────────────────────────────────────────┤
│ pl_report_cache                                                         │
│ ├─ operating_margin = -1.79 (decimal)                                   │
│ └─ net_margin = -1.43 (decimal)                                         │
│          │                                                              │
│          ▼                                                              │
│ usePLData hook: * 100                                                   │
│ ├─ operatingMargin = -179 ✅                                            │
│ └─ netMargin = -143 ✅                                                  │
│          │                                                              │
│          ▼                                                              │
│ PLReportPage: formatPercent(-179) = "-179.0%" ✅                        │
│ Box color: text-destructive (vì netIncome < 0) ✅                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       FLOW 2: CATEGORY DATA                             │
├─────────────────────────────────────────────────────────────────────────┤
│ cdp_order_items + cdp_orders                                            │
│          │                                                              │
│          ▼                                                              │
│ v_category_pl_summary (NEW VIEW)                                        │
│ GROUP BY tenant, period, category                                       │
│          │                                                              │
│          ▼                                                              │
│ usePLData hook: query + aggregate                                       │
│ categoryData = [{ category, sales, cogs, margin, contribution }]        │
│          │                                                              │
│          ▼                                                              │
│ PLReportPage: Table với 8 categories ✅                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## DANH SÁCH FILES CẦN SỬA

| Thứ tự | File/Action | Thay đổi | Ưu tiên |
|--------|-------------|----------|---------|
| 1 | **Database Migration** | Tạo view `v_category_pl_summary` | 🔴 Critical |
| 2 | `src/hooks/usePLData.ts` | ×100 margins + query category data | 🔴 Critical |
| 3 | `src/pages/PLReportPage.tsx` | Conditional styling + table empty state | 🟠 High |

---

## KẾT QUẢ MONG ĐỢI

### Section "Cơ cấu Chi phí"

| Metric | Trước | Sau |
|--------|-------|-----|
| Biên lợi nhuận hoạt động | -97.0% (sai) | -179.0% (đúng) |
| Biên lợi nhuận ròng | -77.6% (sai) | -143.0% (đúng) |
| Lợi nhuận ròng box | Màu xanh | Màu đỏ |

### Section "Lợi nhuận danh mục"

| Trước | Sau |
|-------|-----|
| Table trống | 8 categories với đầy đủ data |

| Danh mục | Doanh thu | Biên LN | Đóng góp |
|----------|-----------|---------|----------|
| Lifestyle | 129.8M | 40.0% | 12.7% |
| Others | 128.6M | 40.0% | 12.6% |
| Beauty | 128.5M | 40.0% | 12.6% |
| ... | ... | ... | ... |

---

## VERIFICATION CHECKLIST

### Cơ cấu Chi phí
- [ ] operatingMargin hiển thị đúng (-179.0%)
- [ ] netMargin hiển thị đúng (-143.0%)
- [ ] Lợi nhuận ròng box màu đỏ khi âm
- [ ] Progress bars không crash với negative values

### Lợi nhuận danh mục
- [ ] View `v_category_pl_summary` được tạo
- [ ] Table hiển thị 8 categories
- [ ] Margin % đúng (~40%)
- [ ] Contribution % tổng = 100%
- [ ] Data thay đổi theo date filter
- [ ] Empty state hiển thị khi không có data

