
# KẾ HOẠCH: SỬA LỖI TAB "KÊNH BÁN" KHÔNG HIỂN THỊ DỮ LIỆU

## 1. VẤN ĐỀ HIỆN TẠI

| Component | Vấn đề | Mức độ |
|-----------|--------|--------|
| `useAllChannelsPL` hook | Mapping cột sai - mong đợi `total_revenue` nhưng view có `gross_revenue` | 🔴 Critical |
| Column mismatch | Hook expect `total_cogs`, view có `cogs` | 🔴 Critical |
| Date filtering | Hook không filter theo `period` - lấy tất cả data | 🟡 Medium |
| Missing fee columns | View không có `total_platform_fee`, `total_commission_fee` riêng | 🟠 Low |

### Cấu trúc view `v_channel_pl_summary` thực tế

| Cột View | Hook mong đợi | Mapping |
|----------|---------------|---------|
| `gross_revenue` | `total_revenue` | ✅ Map |
| `net_revenue` | - | ✅ Có sẵn |
| `cogs` | `total_cogs` | ✅ Map |
| `contribution_margin` | - | ✅ Có sẵn |
| `cm_percent` | - | ✅ Có sẵn |
| `period` | - | 🔴 Cần filter theo date range |
| `marketing_spend` | - | ✅ Có sẵn |
| ❌ Không có | `total_platform_fee` | Cần tính từ `gross_revenue - net_revenue` |
| ❌ Không có | `total_commission_fee` | Không có |
| ❌ Không có | `total_payment_fee` | Không có |
| ❌ Không có | `total_shipping_fee` | Không có |

---

## 2. GIẢI PHÁP

### Bước 1: Cập nhật interface `ChannelViewRow` để match với view thực tế

```typescript
interface ChannelViewRow {
  channel: string | null;
  period: string;
  order_count: number;
  unique_customers: number;
  gross_revenue: number;   // Changed from total_revenue
  net_revenue: number;
  cogs: number;            // Changed from total_cogs
  gross_margin: number;
  marketing_spend: number;
  contribution_margin: number;
  cm_percent: number;
  roas: number | null;
}
```

### Bước 2: Thêm Date Range filtering

```typescript
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export function useAllChannelsPL() {
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  
  // Query với date filter
  const { data: rawData, error } = await supabase
    .from('v_channel_pl_summary' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('period', startDateStr)
    .lte('period', endDateStr);
}
```

### Bước 3: Cập nhật mapping logic

```typescript
channelSummary.forEach(ch => {
  // Sử dụng đúng tên cột từ view
  existing.totalRevenue += ch.gross_revenue || 0;  // NOT total_revenue
  existing.totalCogs += ch.cogs || 0;              // NOT total_cogs
  
  // Tính fees từ difference giữa gross và net
  const totalFees = (ch.gross_revenue || 0) - (ch.net_revenue || 0);
  existing.totalFees += totalFees;
  
  existing.orderCount += ch.order_count || 0;
  existing.contributionMargin += ch.contribution_margin || 0;
});
```

### Bước 4: Update queryKey để trigger refetch khi date change

```typescript
queryKey: ['all-channels-pl', tenantId, startDateStr, endDateStr]
```

---

## 3. DATA FLOW SAU KHI SỬA

```text
v_channel_pl_summary (View)
│
│ Columns: period, channel, gross_revenue, net_revenue, cogs, contribution_margin
│
└─→ useAllChannelsPL hook
    │
    ├─ Filter by date range (startDateStr, endDateStr)
    │
    ├─ Aggregate by channel (merge same channels)
    │   • totalRevenue = SUM(gross_revenue)
    │   • totalCogs = SUM(cogs)
    │   • totalFees = SUM(gross_revenue - net_revenue)
    │   • grossProfit = totalRevenue - totalCogs
    │
    └─→ PLReportPage "Kênh bán" tab
        │
        └─ Display channel table + charts ✓
```

---

## 4. FILES CẦN SỬA ĐỔI

| File | Thay đổi | Ưu tiên |
|------|----------|---------|
| `src/hooks/useAllChannelsPL.ts` | Fix column mapping, add date range filter | 🔴 High |

---

## 5. CODE CHANGES CHI TIẾT

### `src/hooks/useAllChannelsPL.ts`

**Thay đổi 1: Import DateRangeContext**
```typescript
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
```

**Thay đổi 2: Update hook signature và queryKey**
```typescript
export function useAllChannelsPL() {  // Remove months param - use DateRangeContext
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['all-channels-pl', tenantId, startDateStr, endDateStr],
    // ...
  });
}
```

**Thay đổi 3: Fix interface để match view columns**
```typescript
interface ChannelViewRow {
  channel: string | null;
  period: string;
  order_count: number;
  gross_revenue: number;    // ✅ Đúng tên cột
  net_revenue: number;
  cogs: number;             // ✅ Đúng tên cột
  contribution_margin: number;
  cm_percent: number;
}
```

**Thay đổi 4: Add date filter vào query**
```typescript
const { data: rawData, error } = await supabase
  .from('v_channel_pl_summary' as any)
  .select('*')
  .eq('tenant_id', tenantId)
  .gte('period', startDateStr)
  .lte('period', endDateStr);
```

**Thay đổi 5: Fix aggregation logic**
```typescript
channelSummary.forEach(ch => {
  const existing = channelMap.get(normalizedChannel) || { ... };
  
  existing.totalRevenue += ch.gross_revenue || 0;  // Changed
  existing.totalCogs += ch.cogs || 0;               // Changed
  
  // Fees = gross_revenue - net_revenue
  const periodFees = (ch.gross_revenue || 0) - (ch.net_revenue || 0);
  existing.totalFees += periodFees;
  
  existing.orderCount += ch.order_count || 0;
  existing.contributionMargin += ch.contribution_margin || 0;
  
  channelMap.set(normalizedChannel, existing);
});
```

---

## 6. KẾT QUẢ MONG ĐỢI

### Trước (❌ Broken)
- Tab "Kênh bán" hiển thị "Chưa có dữ liệu kênh bán"
- Hook không mapping đúng columns

### Sau (✅ Fixed)
- Tab "Kênh bán" hiển thị dữ liệu từ các kênh: SHOPEE, LAZADA, TIKTOK, WEBSITE
- Data respects DateRange filter (Tháng này, 90 ngày, etc.)
- Chart và table hiển thị đúng Revenue, Fees, Gross Profit, Margin

| Kênh | Doanh thu | Phí sàn | Lãi gộp | Biên LN |
|------|-----------|---------|---------|---------|
| SHOPEE | 150M | 14M | 63M | 42% |
| LAZADA | 120M | 11M | 50M | 42% |
| TIKTOK | 80M | 7M | 34M | 42% |
| WEBSITE | 73M | 7M | 31M | 42% |

---

## 7. VERIFICATION CHECKLIST

- [ ] Tab "Kênh bán" hiển thị danh sách channels
- [ ] Data thay đổi khi chọn date filter khác
- [ ] Tổng doanh thu kênh = Tổng từ "Từ sàn TMĐT"
- [ ] Chart hiển thị bar chart so sánh channels
- [ ] Table chi tiết hiển thị đầy đủ columns
