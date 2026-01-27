
# Kế hoạch: Fix & Nâng cấp trang ROI Khuyến mãi

## 1. Phân tích vấn đề

### Root Cause: HOOK QUERY SAI BẢNG

| Bảng | Records (E2E) | Được sử dụng bởi |
|------|--------------|------------------|
| `promotions` | **0 rows** | ❌ `usePromotions.ts` (TRỐNG!) |
| `promotion_campaigns` | **10 rows** | ✅ `useMDPDataSSOT`, `useMDPData` |

### Dữ liệu thực tế trong `promotion_campaigns`:

| Campaign | Channel | Chi phí | Doanh thu | ROAS | Status |
|----------|---------|---------|-----------|------|--------|
| New Year Sale - Google | Google Ads | 12M | 72M | 6.00x | Active |
| Christmas 2024 - Facebook | Facebook Ads | 11.5M | 52M | 4.52x | Completed |
| Tet 2025 - Facebook | Facebook Ads | 8.5M | 48M | 5.65x | Active |
| Black Friday - Google | Google Ads | 7.8M | 42M | 5.38x | Completed |
| ... (6 campaigns nữa) | | | | | |
| **Tổng** | | **~61.5M** | **~316M** | **~5.14x** | |

**Kết luận**: Trang `/promotion-roi` cần được refactor để sử dụng `promotion_campaigns` thay vì `promotions`.

---

## 2. Giải pháp đề xuất

### Bước 1: Refactor hook `usePromotions.ts`

Thay đổi bảng nguồn từ `promotions` → `promotion_campaigns` và mapping fields tương ứng:

```text
Field Mapping:
├── promotion_name → campaign_name
├── actual_spend → actual_cost
├── actual_revenue → total_revenue
├── actual_orders → total_orders
└── (thêm) impressions, clicks, ctr, roas có sẵn trong bảng
```

### Bước 2: Cập nhật `PromotionROIPage.tsx`

Tận dụng data phong phú hơn từ `promotion_campaigns`:
- Hiển thị **impressions, clicks, CTR** - metrics marketing quan trọng
- Sử dụng **ROAS đã tính sẵn** trong DB thay vì tính client-side
- Thêm **Decision Cards** theo FDP Manifesto

### Bước 3: Thêm Value-Add Insights

Nâng cấp UI với các insights theo Bluecore Control Tower Manifesto:

```text
Decision Cards:
├── Campaign cần KILL: ROAS < 2x → đang đốt tiền
├── Campaign cần SCALE: ROAS > 6x + margin tốt
├── Budget Efficiency: Tổng ngân sách vs thực chi
└── Channel Performance: So sánh Facebook vs Google vs TikTok
```

---

## 3. Chi tiết kỹ thuật

### usePromotions.ts - Refactor

```typescript
// Thay đổi interface để match promotion_campaigns
export interface Promotion {
  id: string;
  tenant_id: string;
  campaign_name: string;      // Đổi từ promotion_name
  campaign_type: string | null;
  channel: string | null;
  start_date: string;
  end_date: string;
  budget: number;
  actual_cost: number;        // Đổi từ actual_spend
  total_orders: number;
  total_revenue: number;
  total_discount_given: number;
  status: string;
  // Marketing metrics có sẵn
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
  acos: number;
  platform_icon: string | null;
}

export const usePromotions = () => {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['promotion-campaigns', tenantId],  // Đổi queryKey
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_campaigns')  // Đổi table
        .select('*')
        .eq('tenant_id', tenantId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as Promotion[];
    },
    enabled: !!tenantId,
  });
};

// Cập nhật usePromotionROI để tính toán từ data mới
export const usePromotionROI = () => {
  const { data: campaigns = [], isLoading } = usePromotions();

  const roiData = campaigns.map(camp => ({
    promotion: camp,
    totalRevenue: camp.total_revenue,
    totalDiscount: camp.total_discount_given || 0,
    totalOrders: camp.total_orders,
    roi: camp.actual_cost > 0 
      ? ((camp.total_revenue - camp.actual_cost) / camp.actual_cost) * 100 
      : 0,
    roas: camp.roas || (camp.actual_cost > 0 ? camp.total_revenue / camp.actual_cost : 0),
    costPerOrder: camp.total_orders > 0 ? camp.actual_cost / camp.total_orders : 0,
    // Marketing metrics
    impressions: camp.impressions || 0,
    clicks: camp.clicks || 0,
    ctr: camp.ctr || 0,
    acos: camp.acos || 0,
  }));

  // Tính summary
  const summary = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalSpend: campaigns.reduce((sum, c) => sum + (c.actual_cost || 0), 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + (c.total_revenue || 0), 0),
    totalOrders: campaigns.reduce((sum, c) => sum + (c.total_orders || 0), 0),
    avgROAS: roiData.length > 0 
      ? roiData.reduce((sum, r) => sum + r.roas, 0) / roiData.length 
      : 0,
    topPerformer: [...roiData].sort((a, b) => b.roas - a.roas)[0],
    worstPerformer: [...roiData].sort((a, b) => a.roas - b.roas)[0],
  };

  return { campaigns, roiData, summary, isLoading };
};
```

### PromotionROIPage.tsx - Nâng cấp UI

```text
Cấu trúc mới:
├── Hero KPI Strip (4 cards)
│   ├── Tổng chiến dịch: 10 (5 active)
│   ├── Tổng chi phí: 61.5M VND
│   ├── Tổng doanh thu: 316M VND
│   └── ROAS trung bình: 5.14x
│
├── Decision Cards (NEW!)
│   ├── 🔴 Campaign cần dừng: Low Performer (ROAS 2.5x)
│   ├── 🟢 Campaign nên scale: Email Nurture (ROAS 8.0x)
│   └── 📊 Budget utilization: 82% đã sử dụng
│
├── Channel Performance (Bar Chart)
│   ├── Facebook: 3 campaigns, 166M revenue
│   ├── Google: 3 campaigns, 122M revenue
│   ├── TikTok: 2 campaigns, 40M revenue
│   └── Email: 2 campaigns, 16M revenue
│
├── Marketing Funnel Metrics (NEW!)
│   ├── Impressions: 3.24M
│   ├── Clicks: 48K (CTR: 1.48%)
│   └── Orders: 872 (CVR: 1.8%)
│
└── Campaign Detail Table
    ├── Columns: Name, Channel, Status, Spend, Revenue, ROAS, CTR, Orders
    └── Action: Filter by status, sort by ROAS
```

### Component mới: PromotionDecisionCards.tsx

```text
Hiển thị 3 insights hành động:
1. CAMPAIGN CẦN DỪNG (ROAS < 3x)
   - Campaign name + ROAS + Tổng lỗ tiềm ẩn
   - Button: "Xem chi tiết" | "Tạm dừng"

2. CAMPAIGN NÊN SCALE (ROAS > 6x)
   - Campaign name + ROAS + Tiềm năng tăng trưởng
   - Button: "Tăng ngân sách"

3. BUDGET EFFICIENCY
   - Tổng ngân sách: XXM | Đã chi: YYM
   - % sử dụng với progress bar
   - Cảnh báo nếu > 90% hoặc < 50%
```

---

## 4. Tệp tin cần thay đổi

| File | Thay đổi | Mục đích |
|------|----------|----------|
| `src/hooks/usePromotions.ts` | Refactor query `promotion_campaigns` + cập nhật interface | Fix empty state |
| `src/pages/PromotionROIPage.tsx` | Cập nhật để dùng data mới + thêm marketing metrics | Show real data |
| `src/components/promotion/PromotionDecisionCards.tsx` | Component mới - Decision insights | Value-add |
| `src/contexts/LanguageContext.tsx` | Thêm translation keys mới | i18n support |

---

## 5. Kết quả mong đợi

### Trước:
- Tổng chương trình: 0
- Tổng chi phí: 0₫
- Tổng doanh thu: 0₫
- ROAS: 0.00x

### Sau:
| KPI | Giá trị |
|-----|---------|
| Tổng chiến dịch | 10 (5 active) |
| Tổng chi phí | ~61.5M VND |
| Tổng doanh thu | ~316M VND |
| ROAS trung bình | ~5.14x |
| Impressions | ~3.24M |
| Clicks | ~48K |
| CTR trung bình | ~1.48% |

### Decision Cards hiển thị:
- 🔴 **Cần dừng**: "Low Performer - Google" (ROAS 2.5x)
- 🟢 **Nên scale**: "Email Nurture Q1" (ROAS 8.0x)
- 📊 **Budget**: 82% đã sử dụng (~61.5M / 75M)

---

## 6. Tuân thủ Bluecore Manifesto

### FDP Manifesto:
- ✅ **SINGLE SOURCE OF TRUTH**: Dùng `promotion_campaigns` - nguồn SSOT của MDP
- ✅ **REVENUE ↔ COST**: Mỗi campaign hiển thị cả chi phí và doanh thu
- ✅ **SURFACE PROBLEMS**: Flag campaign ROAS < 3x màu đỏ

### Control Tower Manifesto:
- ✅ **ĐIỀU GÌ SAI**: Decision cards chỉ rõ campaign cần xử lý
- ✅ **MẤT BAO NHIÊU TIỀN**: Hiển thị tổn thất tiềm ẩn nếu tiếp tục chạy
- ✅ **ÉP HÀNH ĐỘNG**: Nút "Tạm dừng" / "Tăng ngân sách" ngay trên card

### MDP Manifesto:
- ✅ **PROFIT BEFORE PERFORMANCE**: Hiển thị ROI/Contribution trước CTR/Impressions
- ✅ **CASH BEFORE CLICKS**: Tính chi phí thực (actual_cost) không phải budget
- ✅ **ĐƠN GIẢN HOÁ ATTRIBUTION**: ROAS đã tính sẵn trong DB, không magic AI
