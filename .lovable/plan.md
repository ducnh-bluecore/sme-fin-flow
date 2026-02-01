
# Kế hoạch: Tích hợp 18 Screenshots vào Sales Deck PDF

## Tổng quan

Lưu 18 screenshots từ các module Bluecore vào `public/screenshots/` và update các PDF Sales Deck components để hiển thị hình ảnh thực tế của hệ thống.

---

## 1. Danh sách Screenshots đầy đủ

### Batch 1 (10 screenshots trước đó)
| # | User Upload | Target Path | Module | Nội dung |
|---|-------------|-------------|--------|----------|
| 1 | image-299 | `control-tower.png` | Control Tower | Decision Center với Bluecore Scores |
| 2 | image-300 | `decision-detail.png` | Control Tower | Chi tiết Decision Card + AI Advisor |
| 3 | image-301 | `cfo-dashboard.png` | FDP | CFO Dashboard - Financial Position |
| 4 | image-302 | `cash-position.png` | FDP | Real Cash Breakdown (4 categories) |
| 5 | image-303 | `cash-forecast.png` | FDP | Cash Flow Forecast |
| 6 | image-304 | `working-capital.png` | FDP | Working Capital & CCC |
| 7 | image-305 | `risk-dashboard.png` | FDP | Overall Risk Score |
| 8 | image-306 | `expense-management.png` | FDP | Expense Tracking |
| 9 | image-307 | `scenario-planning.png` | FDP | KPI Baseline + What-If |
| 10 | image-308 | `what-if-simulation.png` | FDP | What-If Sliders |

### Batch 2 (8 screenshots mới)
| # | User Upload | Target Path | Module | Nội dung |
|---|-------------|-------------|--------|----------|
| 11 | image-309 | `unit-economics.png` | FDP | Unit Economics + SKU Profitability |
| 12 | image-310 | `sku-cost-breakdown.png` | FDP | Chi tiết phân bổ chi phí modal |
| 13 | image-311 | `cdp-insights.png` | CDP | Insight Catalog với VALUE insights |
| 14 | image-312 | `cdp-customer-verification.png` | CDP | Customer Profile + RFM + Transaction |
| 15 | image-313 | `mdp-profit-attribution.png` | MDP | Profit Attribution + Campaign P&L |
| 16 | image-314 | `mdp-cash-impact.png` | MDP | Cash Impact Analysis per Channel |
| 17 | image-315 | `mdp-risk-alerts.png` | MDP | Marketing Risk Alerts + AI Insights |
| 18 | image-316 | `mdp-decision-center.png` | MDP | Decision Center Modal (Stop/Scale) |

---

## 2. Mapping Screenshots vào Slides

### Sales Deck hiện tại (17 pages)

| Slide | Tên hiện tại | Screenshots thêm | Caption |
|-------|--------------|------------------|---------|
| 5 | FDP Detail | `cfo-dashboard.png` | "CFO Dashboard - Thanh khoản & Vị thế tiền mặt" |
| 5 | (hoặc slide mới) | `unit-economics.png` | "Unit Economics - Contribution Margin per SKU" |
| 6 | MDP Detail | `mdp-profit-attribution.png` | "Profit Attribution - Campaign P&L thực" |
| 6 | (hoặc slide mới) | `mdp-cash-impact.png` | "Cash Impact Analysis per Channel" |
| 7 | CDP Detail | `cdp-customer-verification.png` | "Customer Profile 360° với RFM & LTV" |
| 7 | (hoặc slide mới) | `cdp-insights.png` | "CDP Insight Catalog - 51 insights được theo dõi" |
| 8 | Control Tower | `control-tower.png` | "Control Tower - Decision Cards & Bluecore Scores" |
| 8 | (hoặc slide mới) | `mdp-decision-center.png` | "Decision Center - Scale/Pause/Kill Actions" |
| 9 | Financial Spine | `working-capital.png` | "Working Capital Hub - DSO/DIO/DPO" |

---

## 3. Chi tiết thay đổi code

### 3.1 Copy Screenshots sang public folder

Copy 18 files từ `user-uploads://` sang `public/screenshots/`:

```
public/
└── screenshots/
    ├── control-tower.png
    ├── decision-detail.png
    ├── cfo-dashboard.png
    ├── cash-position.png
    ├── cash-forecast.png
    ├── working-capital.png
    ├── risk-dashboard.png
    ├── expense-management.png
    ├── scenario-planning.png
    ├── what-if-simulation.png
    ├── unit-economics.png
    ├── sku-cost-breakdown.png
    ├── cdp-insights.png
    ├── cdp-customer-verification.png
    ├── mdp-profit-attribution.png
    ├── mdp-cash-impact.png
    ├── mdp-risk-alerts.png
    └── mdp-decision-center.png
```

### 3.2 Update `FullSystemSalesDeckPDF.tsx`

**Thêm import Image:**
```typescript
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,  // <-- Thêm
} from '@react-pdf/renderer';
```

**Thêm styles cho screenshots:**
```typescript
// Screenshot styles
screenshotContainer: {
  marginVertical: 12,
  alignItems: 'center',
},
screenshot: {
  width: '100%',
  maxHeight: 220,
  objectFit: 'contain',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#e2e8f0',
},
screenshotHalf: {
  width: '48%',
  maxHeight: 160,
  objectFit: 'contain',
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#e2e8f0',
},
screenshotCaption: {
  fontSize: 8,
  color: '#64748b',
  marginTop: 4,
  textAlign: 'center',
  fontStyle: 'italic',
},
```

**Update FDP Detail Page (Slide 5):**
```tsx
const FDPDetailPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>MODULE 1: FDP</Text>
    <Text style={styles.sectionTitle}>Financial Data Platform</Text>
    
    {/* Screenshot: CFO Dashboard */}
    <View style={styles.screenshotContainer}>
      <Image 
        src={`${getBaseUrl()}/screenshots/cfo-dashboard.png`}
        style={styles.screenshot}
      />
      <Text style={styles.screenshotCaption}>
        CFO Dashboard - Thanh khoản & Vị thế tiền mặt thời gian thực
      </Text>
    </View>
    
    {/* Existing feature cards - condensed */}
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
      <View style={[styles.card, { flex: 1, minWidth: 120, padding: 12 }]}>
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.primary }}>Real Cash</Text>
        <Text style={{ fontSize: 8, color: colors.textLight }}>4 loại tiền mặt</Text>
      </View>
      {/* ... more condensed cards */}
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>5 / 17</Text>
    </View>
  </Page>
);
```

**Update MDP Detail Page (Slide 6):**
```tsx
const MDPDetailPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>MODULE 2: MDP</Text>
    <Text style={styles.sectionTitle}>Marketing Data Platform</Text>
    
    {/* Screenshot: Profit Attribution */}
    <View style={styles.screenshotContainer}>
      <Image 
        src={`${getBaseUrl()}/screenshots/mdp-profit-attribution.png`}
        style={styles.screenshot}
      />
      <Text style={styles.screenshotCaption}>
        Profit Attribution - P&L thật cho từng campaign (sau COGS, phí sàn, return)
      </Text>
    </View>
    
    {/* Condensed features */}
    ...
  </Page>
);
```

**Update CDP Detail Page (Slide 7):**
```tsx
const CDPDetailPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>MODULE 3: CDP</Text>
    <Text style={styles.sectionTitle}>Customer Data Platform</Text>
    
    {/* Screenshot: Customer Profile */}
    <View style={styles.screenshotContainer}>
      <Image 
        src={`${getBaseUrl()}/screenshots/cdp-customer-verification.png`}
        style={styles.screenshot}
      />
      <Text style={styles.screenshotCaption}>
        Customer Profile 360° - RFM Scores, LTV, Transaction History
      </Text>
    </View>
    
    ...
  </Page>
);
```

**Update Control Tower Page (Slide 8):**
```tsx
const ControlTowerPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <Text style={styles.eyebrowLabelWhite}>MODULE 4: CONTROL TOWER</Text>
    <Text style={styles.sectionTitleWhite}>Trung Tâm Điều Hành</Text>
    
    {/* Two screenshots side by side */}
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Image 
          src={`${getBaseUrl()}/screenshots/control-tower.png`}
          style={[styles.screenshotHalf, { width: '100%' }]}
        />
        <Text style={[styles.screenshotCaption, { color: 'rgba(255,255,255,0.7)' }]}>
          Bluecore Scores™ & Decision Cards
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Image 
          src={`${getBaseUrl()}/screenshots/mdp-decision-center.png`}
          style={[styles.screenshotHalf, { width: '100%' }]}
        />
        <Text style={[styles.screenshotCaption, { color: 'rgba(255,255,255,0.7)' }]}>
          Decision Center - Scale/Pause/Kill
        </Text>
      </View>
    </View>
    
    ...
  </Page>
);
```

### 3.3 Update `FullSystemSalesDeckPDF_EN.tsx`

Apply tương tự với English captions:
- "CFO Dashboard - Real-time Liquidity & Cash Position"
- "Profit Attribution - True P&L for each campaign"
- "Customer Profile 360° - RFM Scores, LTV, Transaction History"
- "Control Tower - Bluecore Scores & Decision Cards"

---

## 4. Kết quả mong đợi

### Trước (Text-only slides)
```
┌────────────────────────────────────┐
│  MODULE 1: FDP                     │
│  Financial Data Platform           │
│                                    │
│  ┌────────────┐  ┌────────────┐   │
│  │ CFO        │  │ Real Cash  │   │
│  │ Dashboard  │  │ Breakdown  │   │
│  │ (text)     │  │ (text)     │   │
│  └────────────┘  └────────────┘   │
│                                    │
│  bluecore.vn                    5  │
└────────────────────────────────────┘
```

### Sau (Với Screenshot)
```
┌────────────────────────────────────┐
│  MODULE 1: FDP                     │
│  Financial Data Platform           │
│                                    │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │   [CFO Dashboard Screenshot] │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│  CFO Dashboard - Thanh khoản...    │
│                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Cash  │ │Unit  │ │Work. │       │
│  │Real  │ │Econ  │ │Cap   │       │
│  └──────┘ └──────┘ └──────┘       │
│                                    │
│  bluecore.vn                    5  │
└────────────────────────────────────┘
```

---

## 5. Files cần thay đổi

| File | Action | Mô tả |
|------|--------|-------|
| `public/screenshots/` | CREATE | Folder mới cho 18 screenshots |
| 18 image files | COPY | Copy từ user-uploads sang public |
| `FullSystemSalesDeckPDF.tsx` | UPDATE | Thêm Image import + screenshot styles + update 4 slide pages |
| `FullSystemSalesDeckPDF_EN.tsx` | UPDATE | Tương tự với English captions |

---

## 6. Layout Guidelines

### Screenshot sizing trong A4 page

| Loại | Width | Max Height | Dùng cho |
|------|-------|------------|----------|
| Full width | 100% | 220px | 1 screenshot/slide |
| Half width | 48% | 160px | 2 screenshots side-by-side |
| Thumbnail | 30% | 120px | 3+ screenshots/slide |

### Caption styling
- Font size: 8pt
- Color: #64748b (text-light) 
- Italic style
- Centered alignment

---

## 7. Ước tính thời gian

| Task | Thời gian |
|------|-----------|
| Copy 18 screenshots | 5 phút |
| Update FullSystemSalesDeckPDF.tsx | 45 phút |
| Update FullSystemSalesDeckPDF_EN.tsx | 30 phút |
| Test PDF generation | 15 phút |
| **Tổng** | **~1.5 giờ** |
