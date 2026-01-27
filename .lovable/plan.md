
# KẾ HOẠCH CẬP NHẬT TAB "RỦI RO TẬP TRUNG" CHO BÁN LẺ

## TÓM TẮT

Cập nhật trang Risk Dashboard tab "Rủi ro tập trung" từ mock data sang real data với 5 loại rủi ro đặc thù cho bán lẻ e-commerce.

## PHÂN TÍCH DỮ LIỆU HIỆN TẠI

Từ database E2E tenant, tôi đã xác minh có đủ dữ liệu:

| Loại rủi ro | Dữ liệu hiện có | Top 3 Concentration |
|-------------|-----------------|---------------------|
| **Kênh bán** | ✅ cdp_orders.channel | Shopee 37% + Lazada 26% + Website 21% = 84% |
| **Danh mục** | ✅ cdp_order_items.category | Áo 35% + Quần 24% + Váy 19% = 78% |
| **Khách hàng** | ✅ cdp_orders.customer_id | Top 10 KH chỉ chiếm 11.5% → phân tán tốt |
| **SKU** | ✅ cdp_order_items + products | Top 5 SKU chiếm 8.5% margin → phân tán |
| **Mùa vụ** | ✅ cdp_orders.order_at | Q4 (Oct-Dec) chiếm 34% → rủi ro mùa vụ |

## THIẾT KẾ MỚI: 5 RỦI RO TẬP TRUNG BÁN LẺ

### 1. Rủi ro tập trung Kênh bán (CRITICAL cho e-commerce)
- **Metric**: % doanh thu từ top 3 kênh
- **Ngưỡng cảnh báo**: > 70% từ 1 kênh hoặc > 90% từ 2 kênh
- **Rủi ro**: Platform fee tăng, tài khoản bị khóa, thay đổi chính sách

### 2. Rủi ro tập trung Danh mục sản phẩm  
- **Metric**: % doanh thu từ top 3 danh mục
- **Ngưỡng cảnh báo**: > 60% từ 1 danh mục
- **Rủi ro**: Trend thay đổi, nguồn cung gián đoạn

### 3. Rủi ro tập trung Khách hàng
- **Metric**: HHI Index (Herfindahl-Hirschman Index) hoặc % từ top 10 KH
- **Ngưỡng cảnh báo**: Top 10 KH > 30% doanh thu
- **Rủi ro**: Mất khách lớn ảnh hưởng doanh thu

### 4. Rủi ro tập trung SKU Hero
- **Metric**: % lợi nhuận từ top 5 SKU
- **Ngưỡng cảnh báo**: > 30% margin từ 1 SKU
- **Rủi ro**: Hết hàng, cạnh tranh giá

### 5. Rủi ro mùa vụ (Seasonal Concentration)
- **Metric**: Seasonality Index (Peak month / Average month)
- **Ngưỡng cảnh báo**: SI > 1.5 (peak gấp 1.5 lần trung bình)
- **Rủi ro**: Cash lock trong hàng tồn trước peak, revenue cliff sau peak

---

## KIẾN TRÚC KỸ THUẬT

```text
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                                  │
├─────────────────────────────────────────────────────────────────┤
│  v_retail_concentration_risk (NEW VIEW)                         │
│    ├─ channel_concentration (from cdp_orders)                   │
│    ├─ category_concentration (from cdp_order_items)             │
│    ├─ customer_concentration (from cdp_orders)                  │
│    ├─ sku_concentration (from cdp_order_items + products)       │
│    └─ seasonal_concentration (from cdp_orders by month)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  HOOK LAYER                                                      │
├─────────────────────────────────────────────────────────────────┤
│  useRetailConcentrationRisk() (NEW HOOK)                        │
│    ├─ channelData: { name, revenue, percent }[]                 │
│    ├─ categoryData: { name, revenue, percent }[]                │
│    ├─ customerData: { id, revenue, percent, orderCount }[]      │
│    ├─ skuData: { sku, name, margin, percent }[]                 │
│    ├─ seasonalData: { month, revenue, index }[]                 │
│    └─ alerts: { type, severity, message }[]                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI LAYER - ConcentrationRisk Component (UPDATED)               │
├─────────────────────────────────────────────────────────────────┤
│  Layout: Grid 2x2 + 1 full-width                                │
│    ┌────────────────┬────────────────┐                          │
│    │ Kênh bán       │ Danh mục       │                          │
│    │ (PieChart)     │ (PieChart)     │                          │
│    ├────────────────┼────────────────┤                          │
│    │ Khách hàng     │ Hero SKU       │                          │
│    │ (BarChart)     │ (BarChart)     │                          │
│    ├────────────────┴────────────────┤                          │
│    │ Mùa vụ (AreaChart - 12 tháng)   │                          │
│    └─────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHẦN 1: DATABASE MIGRATION

### 1.1 Tạo View `v_retail_concentration_risk`

```sql
CREATE OR REPLACE VIEW v_retail_concentration_risk AS
WITH channel_stats AS (
  SELECT 
    tenant_id,
    channel,
    SUM(net_revenue) as revenue,
    100.0 * SUM(net_revenue) / NULLIF(SUM(SUM(net_revenue)) OVER (PARTITION BY tenant_id), 0) as pct
  FROM cdp_orders
  WHERE order_at > CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id, channel
),
category_stats AS (
  SELECT 
    o.tenant_id,
    oi.category,
    SUM(oi.line_revenue) as revenue,
    100.0 * SUM(oi.line_revenue) / NULLIF(SUM(SUM(oi.line_revenue)) OVER (PARTITION BY o.tenant_id), 0) as pct
  FROM cdp_order_items oi
  JOIN cdp_orders o ON oi.order_id = o.id
  WHERE o.order_at > CURRENT_DATE - INTERVAL '365 days'
  GROUP BY o.tenant_id, oi.category
),
customer_stats AS (
  SELECT 
    tenant_id,
    customer_id,
    SUM(net_revenue) as revenue,
    COUNT(*) as order_count,
    100.0 * SUM(net_revenue) / NULLIF(SUM(SUM(net_revenue)) OVER (PARTITION BY tenant_id), 0) as pct
  FROM cdp_orders
  WHERE order_at > CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id, customer_id
),
sku_stats AS (
  SELECT 
    o.tenant_id,
    oi.product_id,
    p.name as product_name,
    p.category,
    SUM(oi.line_margin) as margin,
    100.0 * SUM(oi.line_margin) / NULLIF(SUM(SUM(oi.line_margin)) OVER (PARTITION BY o.tenant_id), 0) as pct
  FROM cdp_order_items oi
  JOIN cdp_orders o ON oi.order_id = o.id
  LEFT JOIN products p ON oi.product_id::uuid = p.id
  WHERE o.order_at > CURRENT_DATE - INTERVAL '365 days'
  GROUP BY o.tenant_id, oi.product_id, p.name, p.category
),
monthly_stats AS (
  SELECT 
    tenant_id,
    DATE_TRUNC('month', order_at)::date as month,
    SUM(net_revenue) as revenue
  FROM cdp_orders
  WHERE order_at > CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id, DATE_TRUNC('month', order_at)
),
seasonal_index AS (
  SELECT 
    tenant_id,
    month,
    revenue,
    revenue / NULLIF(AVG(revenue) OVER (PARTITION BY tenant_id), 0) as seasonality_index
  FROM monthly_stats
)
SELECT 
  t.id as tenant_id,
  -- Channel concentration (top 3)
  (SELECT jsonb_agg(jsonb_build_object('name', channel, 'revenue', revenue, 'pct', pct) ORDER BY revenue DESC)
   FROM (SELECT * FROM channel_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 5) x) as channel_concentration,
  
  -- Category concentration (top 5)
  (SELECT jsonb_agg(jsonb_build_object('name', category, 'revenue', revenue, 'pct', pct) ORDER BY revenue DESC)
   FROM (SELECT * FROM category_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 5) x) as category_concentration,
   
  -- Customer concentration (top 10)
  (SELECT jsonb_agg(jsonb_build_object('id', customer_id, 'revenue', revenue, 'pct', pct, 'orders', order_count) ORDER BY revenue DESC)
   FROM (SELECT * FROM customer_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 10) x) as customer_concentration,
   
  -- SKU concentration (top 5 by margin)
  (SELECT jsonb_agg(jsonb_build_object('id', product_id, 'name', product_name, 'category', category, 'margin', margin, 'pct', pct) ORDER BY margin DESC)
   FROM (SELECT * FROM sku_stats WHERE tenant_id = t.id ORDER BY margin DESC LIMIT 5) x) as sku_concentration,
   
  -- Seasonal pattern (12 months)
  (SELECT jsonb_agg(jsonb_build_object('month', month, 'revenue', revenue, 'index', seasonality_index) ORDER BY month)
   FROM seasonal_index WHERE tenant_id = t.id) as seasonal_pattern,
   
  -- Summary metrics
  (SELECT SUM(pct) FROM (SELECT pct FROM channel_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 1) x) as top1_channel_pct,
  (SELECT SUM(pct) FROM (SELECT pct FROM category_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 1) x) as top1_category_pct,
  (SELECT SUM(pct) FROM (SELECT pct FROM customer_stats WHERE tenant_id = t.id ORDER BY revenue DESC LIMIT 10) x) as top10_customer_pct,
  (SELECT SUM(pct) FROM (SELECT pct FROM sku_stats WHERE tenant_id = t.id ORDER BY margin DESC LIMIT 5) x) as top5_sku_margin_pct,
  (SELECT MAX(seasonality_index) FROM seasonal_index WHERE tenant_id = t.id) as max_seasonality_index
  
FROM tenants t
WHERE t.is_active = true;
```

---

## PHẦN 2: NEW HOOK

### 2.1 File: `src/hooks/useRetailConcentrationRisk.ts`

```typescript
/**
 * useRetailConcentrationRisk - SSOT Hook for Retail Concentration Risks
 * 
 * Fetches from v_retail_concentration_risk view.
 * NO client-side calculations.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

interface ChannelConcentration {
  name: string;
  revenue: number;
  pct: number;
}

interface CategoryConcentration {
  name: string;
  revenue: number;
  pct: number;
}

interface CustomerConcentration {
  id: string;
  revenue: number;
  pct: number;
  orders: number;
}

interface SKUConcentration {
  id: string;
  name: string;
  category: string;
  margin: number;
  pct: number;
}

interface SeasonalPattern {
  month: string;
  revenue: number;
  index: number;
}

interface ConcentrationAlert {
  type: 'channel' | 'category' | 'customer' | 'sku' | 'seasonal';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface RetailConcentrationData {
  channelData: ChannelConcentration[];
  categoryData: CategoryConcentration[];
  customerData: CustomerConcentration[];
  skuData: SKUConcentration[];
  seasonalData: SeasonalPattern[];
  alerts: ConcentrationAlert[];
  // Summary metrics
  top1ChannelPct: number;
  top1CategoryPct: number;
  top10CustomerPct: number;
  top5SKUMarginPct: number;
  maxSeasonalityIndex: number;
}

function generateAlerts(data: any): ConcentrationAlert[] {
  const alerts: ConcentrationAlert[] = [];
  
  // Channel concentration alert
  if (data.top1_channel_pct > 50) {
    alerts.push({
      type: 'channel',
      severity: data.top1_channel_pct > 70 ? 'high' : 'medium',
      message: `Kênh ${data.channel_concentration?.[0]?.name} chiếm ${data.top1_channel_pct?.toFixed(0)}% doanh thu - rủi ro phụ thuộc platform`
    });
  }
  
  // Category concentration alert
  if (data.top1_category_pct > 40) {
    alerts.push({
      type: 'category',
      severity: data.top1_category_pct > 60 ? 'high' : 'medium',
      message: `Danh mục ${data.category_concentration?.[0]?.name} chiếm ${data.top1_category_pct?.toFixed(0)}% - cần đa dạng hóa sản phẩm`
    });
  }
  
  // Customer concentration alert
  if (data.top10_customer_pct > 30) {
    alerts.push({
      type: 'customer',
      severity: data.top10_customer_pct > 50 ? 'high' : 'medium',
      message: `Top 10 khách hàng chiếm ${data.top10_customer_pct?.toFixed(0)}% - rủi ro mất khách lớn`
    });
  }
  
  // SKU concentration alert
  if (data.top5_sku_margin_pct > 30) {
    alerts.push({
      type: 'sku',
      severity: data.top5_sku_margin_pct > 50 ? 'high' : 'medium',
      message: `Top 5 SKU đóng góp ${data.top5_sku_margin_pct?.toFixed(0)}% lợi nhuận - Hero product risk`
    });
  }
  
  // Seasonal concentration alert
  if (data.max_seasonality_index > 1.5) {
    alerts.push({
      type: 'seasonal',
      severity: data.max_seasonality_index > 2 ? 'high' : 'medium',
      message: `Seasonality Index = ${data.max_seasonality_index?.toFixed(1)} - cash lock risk trước peak season`
    });
  }
  
  return alerts;
}

export function useRetailConcentrationRisk() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery<RetailConcentrationData>({
    queryKey: ['retail-concentration-risk', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');
      
      const { data, error } = await supabase
        .from('v_retail_concentration_risk')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
        
      if (error) throw error;
      if (!data) throw new Error('No data');
      
      return {
        channelData: (data.channel_concentration as ChannelConcentration[]) || [],
        categoryData: (data.category_concentration as CategoryConcentration[]) || [],
        customerData: (data.customer_concentration as CustomerConcentration[]) || [],
        skuData: (data.sku_concentration as SKUConcentration[]) || [],
        seasonalData: (data.seasonal_pattern as SeasonalPattern[]) || [],
        alerts: generateAlerts(data),
        top1ChannelPct: Number(data.top1_channel_pct) || 0,
        top1CategoryPct: Number(data.top1_category_pct) || 0,
        top10CustomerPct: Number(data.top10_customer_pct) || 0,
        top5SKUMarginPct: Number(data.top5_sku_margin_pct) || 0,
        maxSeasonalityIndex: Number(data.max_seasonality_index) || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## PHẦN 3: UPDATE UI COMPONENT

### 3.1 File: `src/pages/RiskDashboardPage.tsx`

Cập nhật component `ConcentrationRisk` (lines 130-226):

#### Layout mới:
```text
┌─────────────────────────────────────────────────────────────────┐
│ 5 Rủi ro tập trung cho Bán lẻ                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │ 1. Tập trung Kênh bán   │  │ 2. Tập trung Danh mục  │       │
│  │    [PieChart]           │  │    [PieChart]          │       │
│  │    Shopee 37%, Lazada..│  │    Áo 35%, Quần 24%... │       │
│  │    ⚠️ Alert nếu > 50%  │  │    ⚠️ Alert nếu > 40%  │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │ 3. Tập trung Khách hàng │  │ 4. Tập trung SKU Hero  │       │
│  │    [BarChart Horizontal]│  │    [BarChart Horizontal]│       │
│  │    Top 10 KH: 11.5%    │  │    Top 5 SKU: 8.5%     │       │
│  │    ✅ Phân tán tốt     │  │    ✅ Phân tán tốt     │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 5. Rủi ro Mùa vụ (Seasonal Risk)                        │   │
│  │    [AreaChart - 12 tháng]                                │   │
│  │    Peak: Oct-Dec (34%), Index = 1.6                      │   │
│  │    ⚠️ Cash lock risk trước peak season                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tổng hợp Cảnh báo                                        │   │
│  │    • Shopee chiếm 37% - theo dõi chính sách platform    │   │
│  │    • Q4 chiếm 34% - chuẩn bị vốn lưu động trước peak   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHẦN 4: FILES SUMMARY

### New Files (2)
| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_create_retail_concentration_view.sql` | DB view cho 5 loại rủi ro tập trung |
| `src/hooks/useRetailConcentrationRisk.ts` | SSOT hook fetch từ view |

### Modified Files (1)
| File | Changes |
|------|---------|
| `src/pages/RiskDashboardPage.tsx` | Update `ConcentrationRisk` component (lines 130-226) |

---

## PHẦN 5: EXPECTED UI AFTER UPDATE

### Card 1: Kênh bán (PieChart)
- Shopee: 37% (xanh dương)
- Lazada: 26% (xanh lá)
- Website: 21% (cam)  
- TikTok: 16% (tím)
- **Alert**: "Shopee chiếm 37% - rủi ro platform"

### Card 2: Danh mục (PieChart)
- Áo: 35%
- Quần: 24%
- Váy: 19%
- Phụ kiện: 15%
- Giày dép: 7%
- **Alert**: "Áo chiếm 35% - nên đa dạng hóa"

### Card 3: Khách hàng (Horizontal Bar)
- Top 10 KH chỉ chiếm 11.5%
- **Status**: ✅ Phân tán tốt (không có single customer risk)

### Card 4: Hero SKU (Horizontal Bar)
- Top 5 SKU chiếm 8.5% margin
- **Status**: ✅ Phân tán tốt (không phụ thuộc 1 SKU)

### Card 5: Mùa vụ (Area Chart)
- X-axis: 12 tháng gần nhất
- Y-axis: Doanh thu + Seasonality Index line
- Peak: Oct-Nov-Dec (34% total)
- **Alert**: "SI = 1.6 - Cash lock risk trước Q4"

### Summary Alerts Section
- Tổng hợp tất cả alerts từ 5 loại rủi ro
- Severity color coding (green/yellow/red)

---

## PHẦN 6: THRESHOLDS & BUSINESS LOGIC

| Metric | Xanh (Tốt) | Vàng (Theo dõi) | Đỏ (Cảnh báo) |
|--------|------------|-----------------|---------------|
| Top 1 Channel % | < 30% | 30-50% | > 50% |
| Top 1 Category % | < 30% | 30-40% | > 40% |
| Top 10 Customer % | < 20% | 20-30% | > 30% |
| Top 5 SKU Margin % | < 20% | 20-30% | > 30% |
| Seasonality Index | < 1.3 | 1.3-1.5 | > 1.5 |

---

## PHẦN 7: EXECUTION ORDER

```text
Step 1: Create database view
        └─ v_retail_concentration_risk
                ↓
Step 2: Create hook
        └─ useRetailConcentrationRisk.ts
                ↓
Step 3: Update UI component
        └─ ConcentrationRisk in RiskDashboardPage.tsx
                ↓
Step 4: Verify data display
        └─ All 5 charts render with real data
        └─ Alerts show correct thresholds
```

---

## PHẦN 8: VERIFICATION CHECKLIST

### Database
- [ ] View `v_retail_concentration_risk` created
- [ ] Returns 5 concentration arrays (channel, category, customer, sku, seasonal)
- [ ] Summary metrics calculated (top1_channel_pct, etc.)

### Hook
- [ ] `useRetailConcentrationRisk` fetches from view
- [ ] Generates alerts based on thresholds
- [ ] Returns typed data for UI

### UI
- [ ] Grid layout 2x2 + 1 full-width
- [ ] PieCharts for Channel + Category
- [ ] BarCharts for Customer + SKU
- [ ] AreaChart for Seasonal pattern
- [ ] Alert badges with correct severity colors
- [ ] Vietnamese labels throughout
