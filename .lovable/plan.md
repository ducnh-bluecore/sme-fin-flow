

# KẾ HOẠCH: SỬA LỖI P&L KHÔNG LOAD THEO DATE RANGE

## VẤN ĐỀ HIỆN TẠI

| Component | Vấn đề | Mức độ |
|-----------|--------|--------|
| `usePLData` hook | Hardcoded `currentYear = new Date().getFullYear()` - bỏ qua DateRangeContext | 🔴 Critical |
| Query logic | Chỉ query `period_year = 2026`, không filter theo tháng được chọn | 🔴 Critical |
| UI | `QuickDateSelector` + `DateRangeIndicator` hiển thị nhưng không có effect | 🔴 Critical |

### Luồng hiện tại (BROKEN)

```text
User chọn "Tháng này" (DateRangeContext)
        │
        ╳ (Không được sử dụng)
        │
        ▼
usePLData chỉ dùng currentYear = 2026
        │
        ▼
Query: period_year = 2026, period_month IS NULL (yearly aggregate)
        │
        ▼
Hiển thị dữ liệu cả năm, không phải tháng được chọn
```

## DỮ LIỆU HIỆN CÓ

- **Bảng `pl_report_cache`**: Có dữ liệu theo `period_year` + `period_month`
  - Yearly aggregates: `period_month IS NULL`
  - Monthly data: `period_month = 1, 2, 3, ...`
  - E2E Test Company: Có dữ liệu từ 2025-2026

- **Không có cột `period_date`**: Cần tính toán từ `period_year` + `period_month`

---

## GIẢI PHÁP

### Bước 1: Cập nhật `usePLData` hook để integrate DateRangeContext

```typescript
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export function usePLData() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr, dateRange } = useDateRangeForQuery();
  
  // Parse dates để xác định year/month cần query
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  return useQuery({
    // Include date range trong queryKey để trigger refetch
    queryKey: ['pl-data', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      // ...query logic mới
    },
  });
}
```

### Bước 2: Thay đổi query logic theo date range

```typescript
// Nếu filter là 1 tháng cụ thể
if (startYear === endYear && startMonth === endMonth) {
  // Query monthly data cho tháng đó
  const { data: monthlyCache } = await supabase
    .from('pl_report_cache')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('period_year', startYear)
    .eq('period_month', startMonth)
    .maybeSingle();
  
  // Map monthlyCache → PLData
}

// Nếu filter là nhiều tháng (YTD, custom range, etc.)
else {
  // Query monthly data trong range và aggregate
  const { data: monthlyCache } = await supabase
    .from('pl_report_cache')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`period_year.eq.${startYear},period_year.eq.${endYear}`)
    .not('period_month', 'is', null)
    .order('period_year')
    .order('period_month');
  
  // Filter và aggregate các tháng trong range
  const filteredMonths = monthlyCache?.filter(m => {
    const monthDate = new Date(m.period_year, m.period_month - 1, 1);
    return monthDate >= startDate && monthDate <= endDate;
  });
  
  // Sum tất cả các tháng
  const aggregated = filteredMonths?.reduce((acc, m) => ({
    net_sales: acc.net_sales + m.net_sales,
    gross_profit: acc.gross_profit + m.gross_profit,
    // ...other fields
  }), { net_sales: 0, gross_profit: 0, ... });
}
```

### Bước 3: Xử lý comparison data (so sánh với cùng kỳ)

```typescript
// Previous period = cùng kỳ năm trước
const prevStartYear = startYear - 1;
const prevEndYear = endYear - 1;

const { data: prevMonthlyCache } = await supabase
  .from('pl_report_cache')
  .select('*')
  .eq('tenant_id', tenantId)
  .or(`period_year.eq.${prevStartYear},period_year.eq.${prevEndYear}`)
  .not('period_month', 'is', null);

// Filter và aggregate cho previous period
```

---

## FILES CẦN SỬA ĐỔI

| File | Thay đổi |
|------|----------|
| `src/hooks/usePLData.ts` | Integrate DateRangeContext, update query logic |

---

## LOGIC CHI TIẾT

### Xử lý các loại date filter:

| Filter | Logic |
|--------|-------|
| "Tháng này" | Query `period_year = 2026, period_month = 1` |
| "Tháng trước" | Query `period_year = 2025, period_month = 12` |
| "7 ngày" | Query theo tháng hiện tại (không có daily data) |
| "30 ngày" | Query theo tháng hiện tại |
| "90 ngày" | Query 3 tháng gần nhất, aggregate |
| "Năm nay" | Query tất cả tháng của 2026, aggregate |
| "All time" | Query tất cả dữ liệu, aggregate |
| "Custom" | Query theo range, aggregate |

### Helper function để tính toán months trong range:

```typescript
function getMonthsInRange(startDateStr: string, endDateStr: string): Array<{year: number, month: number}> {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const months = [];
  
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}
```

---

## THỨ TỰ THỰC HIỆN

```text
Bước 1: Import useDateRangeForQuery vào usePLData
        │
        ▼
Bước 2: Thêm date parsing logic
        │
        ▼
Bước 3: Update queryKey để include date range
        │
        ▼
Bước 4: Update queryFn để filter theo months
        │
        ▼
Bước 5: Update comparison logic cho previous period
        │
        ▼
Bước 6: Test với các date filter khác nhau
```

---

## KẾT QUẢ MONG ĐỢI

| Filter | Trước | Sau |
|--------|-------|-----|
| "Tháng này" (T1/2026) | 89.5M (cả năm) | 89.5M (chỉ T1) |
| "Năm nay" | 89.5M | 89.5M (T1/2026) |
| "90 ngày" | 89.5M | ~270M (T11+T12/2025 + T1/2026) |
| "Năm ngoái" | 0đ (no data 2025) | 1.2 tỷ (2025 data) |

### Luồng sau khi sửa:

```text
User chọn "Tháng này" (DateRangeContext)
        │
        ▼
useDateRangeForQuery() → startDateStr: "2026-01-01", endDateStr: "2026-01-31"
        │
        ▼
usePLData parses → startYear: 2026, startMonth: 1
        │
        ▼
Query: period_year = 2026, period_month = 1
        │
        ▼
Hiển thị dữ liệu chỉ T1/2026 ✓
```

