
# KẾ HOẠCH TỐI ƯU HÓA TRANG BÁO CÁO P&L - PHIÊN BẢN NÂNG CAO

## 1. TÓM TẮT VẤN ĐỀ HIỆN TẠI

| Vấn đề | Vị trí | Mức độ |
|--------|--------|--------|
| Revenue Breakdown = 0đ | `usePLData.ts:187-193` | 🔴 Critical |
| Expense breakdown không chi tiết | `usePLData.ts:118-129` | 🔴 Critical |
| COGS % hiển thị sai (0.6% thay vì 57%) | `PLReportPage.tsx:974` | 🟡 Medium |
| Expense Trend Chart trống | `PLReportPage.tsx:278-290` | 🟡 Medium |
| Category P&L không có dữ liệu | `usePLData.ts:152` | 🟠 Low |
| `usePLData` đã DEPRECATED nhưng vẫn dùng | Hook architecture | 🟠 Low |

---

## 2. GIẢI PHÁP TỐI ƯU

### Phương án A: Sử dụng bảng cache có sẵn (ĐỀ XUẤT)

Hệ thống đã có bảng **`pl_report_cache`** với đầy đủ các trường:
- `invoice_revenue`, `contract_revenue`, `integrated_revenue`
- `opex_salaries`, `opex_rent`, `opex_utilities`, `opex_marketing`, `opex_depreciation`

**Ưu điểm:** Không cần tạo thêm view, tái sử dụng logic đã có.

### Phương án B: Tạo views mới (như plan cũ)

Tạo `v_pl_expense_breakdown` và `v_pl_revenue_by_source`.

**Nhược điểm:** Duplicate logic với `pl_report_cache`.

---

## 3. KẾ HOẠCH THỰC HIỆN CHI TIẾT

### Bước 1: Cập nhật RPC `refresh_pl_cache` để lấy dữ liệu từ `cdp_orders`

Hàm hiện tại dùng `external_orders` (đã deprecated). Cần migrate sang `cdp_orders`:

```sql
-- Trong refresh_pl_cache, thay đổi:
-- FROM external_orders → FROM cdp_orders
-- AND order_date → AND order_at

-- Integrated Revenue = Doanh thu từ các kênh e-commerce
SELECT COALESCE(SUM(net_revenue), 0)
INTO v_integrated_revenue
FROM cdp_orders
WHERE tenant_id = p_tenant_id
  AND channel IN ('Shopee', 'Lazada', 'TikTok Shop', 'TikTok', 'Website')
  AND order_at >= v_start_date
  AND order_at <= v_end_date;
```

### Bước 2: Cập nhật `refresh_pl_cache` để lấy expense từ `finance_expenses_daily`

```sql
-- Lấy expense breakdown từ bảng đã aggregate
SELECT 
  COALESCE(SUM(salary_amount), 0),
  COALESCE(SUM(rent_amount), 0),
  COALESCE(SUM(utilities_amount), 0),
  COALESCE(SUM(marketing_amount), 0),
  COALESCE(SUM(logistics_amount), 0),
  COALESCE(SUM(depreciation_amount), 0),
  COALESCE(SUM(other_amount), 0)
INTO 
  v_opex_salaries, v_opex_rent, v_opex_utilities,
  v_opex_marketing, v_opex_logistics, v_opex_depreciation, v_opex_other
FROM finance_expenses_daily
WHERE tenant_id = p_tenant_id
  AND day >= v_start_date
  AND day <= v_end_date;
```

### Bước 3: Tạo hook mới `usePLReportData` (thay thế deprecated `usePLData`)

```typescript
// src/hooks/usePLReportData.ts
export function usePLReportData() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['pl-report-data', tenantId],
    queryFn: async () => {
      // 1. Fetch từ pl_report_cache
      const { data: cache } = await supabase
        .from('pl_report_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('period_year', { ascending: false })
        .limit(12);
      
      // 2. Aggregate và map dữ liệu
      return {
        plData: mapCacheToPlData(cache),
        revenueBreakdown: {
          invoiceRevenue: sum(cache, 'invoice_revenue'),
          contractRevenue: sum(cache, 'contract_revenue'),
          integratedRevenue: sum(cache, 'integrated_revenue'),
          totalRevenue: sum(cache, 'net_sales'),
        },
        operatingExpenses: {
          salaries: sum(cache, 'opex_salaries'),
          rent: sum(cache, 'opex_rent'),
          utilities: sum(cache, 'opex_utilities'),
          marketing: sum(cache, 'opex_marketing'),
          logistics: sum(cache, 'opex_logistics'),
          // ...
        },
        monthlyTrend: cache?.map(c => ({
          month: `T${c.period_month}`,
          salaries: c.opex_salaries,
          rent: c.opex_rent,
          marketing: c.opex_marketing,
          // ...
        })),
      };
    },
  });
}
```

### Bước 4: Sửa lỗi hiển thị % trong PLReportPage

```typescript
// Line 974: Sửa formatPercent
// Trước:
<span>{formatPercent(plData.cogs / plData.netSales)}</span>

// Sau:
<span>
  {plData.netSales > 0 
    ? `${((plData.cogs / plData.netSales) * 100).toFixed(1)}%` 
    : '0%'}
</span>

// Hoặc tốt hơn - sửa formatPercent để nhận giá trị 0-1:
<span>{formatPercent(plData.cogs / plData.netSales, 1)}</span>
```

### Bước 5: Thêm Logistics vào UI

```typescript
// PLReportPage.tsx - Tab "Chi tiết"
<PLLineItem label="Lương nhân viên" amount={plData.operatingExpenses.salaries} icon={Users} />
<PLLineItem label="Thuê mặt bằng" amount={plData.operatingExpenses.rent} icon={Building} />
<PLLineItem label="Marketing & Quảng cáo" amount={plData.operatingExpenses.marketing} icon={Megaphone} />
<PLLineItem label="Vận chuyển & Logistics" amount={plData.operatingExpenses.logistics} icon={Truck} /> // NEW
<PLLineItem label="Điện, nước, internet" amount={plData.operatingExpenses.utilities} icon={Zap} />
```

### Bước 6: Cập nhật interface PLData

```typescript
// Thêm logistics vào interface
export interface PLData {
  // ... existing fields
  operatingExpenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    logistics: number;  // NEW
    depreciation: number;
    // ...
  };
}
```

---

## 4. CẢI TIẾN BỔ SUNG (BONUS)

### 4.1 Category P&L từ `fdp_channel_summary`

Thêm dữ liệu thực cho tab "Phân tích" bằng cách query từ `fdp_channel_summary`:

```typescript
const categoryData: CategoryPLData[] = channelData.channels.map(ch => ({
  category: ch.channel,
  sales: ch.totalRevenue / 1000000,
  cogs: ch.totalCogs / 1000000,
  margin: ch.grossMargin,
  contribution: ch.revenueShare,
}));
```

### 4.2 Thêm Date Range vào query

Hiện tại `usePLData` không respect DateRangeContext. Cần integrate:

```typescript
const { startDateStr, endDateStr } = useDateRangeForQuery();

// Query với date range
.gte('period_date', startDateStr)
.lte('period_date', endDateStr)
```

### 4.3 Thêm "Doanh thu theo kênh" vào Revenue Breakdown

Thay vì chỉ hiển thị "Từ tích hợp" chung, có thể chi tiết hơn:

```text
┌──────────────────────────────────────────────────┐
│ Chi tiết Doanh thu theo nguồn                    │
├─────────────┬─────────────┬─────────────┬────────┤
│ Từ hóa đơn  │ Từ hợp đồng │ Từ tích hợp │ TỔNG   │
│ 0đ          │ 0đ          │ 340M        │ 340M   │
├─────────────┴─────────────┴─────────────┴────────┤
│ Chi tiết kênh tích hợp:                          │
│ • Shopee: 35% (119M)                             │
│ • Lazada: 25% (85M)                              │
│ • TikTok: 20% (68M)                              │
│ • Website: 20% (68M)                             │
└──────────────────────────────────────────────────┘
```

### 4.4 Thêm Waterfall Chart cho P&L

Thay vì chỉ có bar chart, thêm waterfall chart để trực quan hóa dòng chảy từ Doanh thu → Lợi nhuận:

```text
Revenue (340M) → -COGS (194M) → Gross Profit (146M) → -OPEX (398M) → Net Income (-252M)
```

### 4.5 Thêm Export PDF/Excel cải tiến

Hiện tại nút "Xuất báo cáo" chưa có logic. Có thể thêm:

```typescript
const handleExport = async (format: 'pdf' | 'excel') => {
  const reportData = {
    period: { start: startDate, end: endDate },
    plData,
    revenueBreakdown,
    monthlyData,
  };
  
  if (format === 'excel') {
    // Sử dụng xlsx library đã có
    const wb = XLSX.utils.book_new();
    // ...
  }
};
```

---

## 5. FILES CẦN SỬA ĐỔI

| File | Thay đổi | Ưu tiên |
|------|----------|---------|
| `supabase/migrations/[timestamp]_update_pl_cache.sql` | Update RPC refresh_pl_cache | 🔴 High |
| `src/hooks/usePLData.ts` | Query pl_report_cache, map expense/revenue breakdown | 🔴 High |
| `src/pages/PLReportPage.tsx` | Fix formatPercent, add Logistics row, channel detail | 🔴 High |
| `src/hooks/usePLReportData.ts` | (Optional) New hook thay thế deprecated usePLData | 🟡 Medium |
| `src/lib/formatters.ts` | Fix formatPercent để handle 0-1 range | 🟡 Medium |

---

## 6. THỨ TỰ THỰC HIỆN

```text
Phase 1: Database ─────────────────────────────────
│
│  Step 1: Update refresh_pl_cache RPC
│          ├─ Migrate external_orders → cdp_orders
│          ├─ Add integrated_revenue từ cdp_orders
│          └─ Add expense breakdown từ finance_expenses_daily
│
│  Step 2: Trigger refresh để populate data
│          └─ SELECT refresh_pl_cache(tenant_id, 2025, NULL);
│
Phase 2: Hook ─────────────────────────────────────
│
│  Step 3: Update usePLData
│          ├─ Query pl_report_cache
│          ├─ Map revenueBreakdown từ cache
│          └─ Map operatingExpenses từ cache
│
Phase 3: UI ───────────────────────────────────────
│
│  Step 4: Fix PLReportPage
│          ├─ Fix COGS % calculation
│          ├─ Add Logistics row
│          └─ Update expense trend data mapping
│
│  Step 5: (Optional) Add Channel detail to revenue breakdown
│
└──────────────────────────────────────────────────
```

---

## 7. KẾT QUẢ MONG ĐỢI

### Trước vs Sau

| Metric | Trước | Sau |
|--------|-------|-----|
| Revenue Breakdown | 0đ / 0đ / 0đ | 0đ / 0đ / 340M |
| Expense Breakdown | Only Marketing + Other | Salary, Rent, Marketing, Logistics, Utilities, Other |
| COGS % | 0.6% (sai) | 57.1% (đúng) |
| Expense Trend Chart | Trống | Stacked area chart với categories |
| Category P&L | Trống | Dữ liệu từ channels |

### Data Flow sau tối ưu

```text
┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
│   cdp_orders    │────▶│  pl_report_cache│────▶│  usePLData     │
│ (SSOT Orders)   │     │  (Precomputed)  │     │  (Hook)        │
└─────────────────┘     └─────────────────┘     └────────────────┘
                               ▲                        │
┌─────────────────┐            │                        ▼
│ finance_expenses│────────────┘               ┌────────────────┐
│ _daily          │                            │ PLReportPage   │
└─────────────────┘                            │ (UI)           │
                                               └────────────────┘
```

---

## 8. VERIFICATION CHECKLIST

- [ ] `pl_report_cache` có dữ liệu với `invoice_revenue`, `integrated_revenue`
- [ ] `pl_report_cache` có `opex_salaries`, `opex_rent`, `opex_logistics`
- [ ] Tab "Tổng quan" hiển thị Revenue Breakdown != 0
- [ ] Tab "Chi tiết" hiển thị expense breakdown đầy đủ
- [ ] COGS % hiển thị đúng (~57%)
- [ ] Expense Trend Chart có dữ liệu theo categories
- [ ] Tab "Phân tích" hiển thị Category P&L từ channels
