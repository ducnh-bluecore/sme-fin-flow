

# Kế hoạch: Bổ sung Nội dung Sales Deck theo Tài liệu Mới

## Tình trạng hiện tại

Sau khi rà soát toàn bộ `FullSystemSalesDeckPDF.tsx` (1628 dòng, 17 slides), tôi xác định các phần CẦN BỔ SUNG:

| Nội dung | Hiện tại | Tài liệu mới | Trạng thái |
|----------|----------|--------------|------------|
| 3 Con số cốt lõi | Co nhung chua co cong thuc | Cong thuc minh bach | CAN THEM |
| ROAS Illusion (4.0x → 0.9x) | CHUA CO | Co trong tai lieu | CAN THEM |
| So sanh Elton Data + PangoCDP | So sanh Excel/PowerBI/Custom | 5-layer comparison | CAN CAP NHAT |
| Pricing (1.5-4tr/thang) | CHUA CO | Co chi tiet | CAN THEM |
| ROI Guarantee (3 ty VND) | CHUA CO | Co cam ket | CAN THEM |
| Market Size TAM (30 nghin ty) | CHUA CO | 3 ICP segments | CAN THEM |
| Trial 14 ngay mien phi | CHUA CO | CTA moi | CAN THEM vao CTA |

---

## Cac thay doi chi tiet

### 1. SLIDE MOI: ROAS Illusion (sau MDP, truoc CDP)

Slide minh hoa su khac biet giua ROAS bao cao vs Profit ROAS thuc:

```
+------------------------------------------+
|  REALITY CHECK                            |
|  "Marketing thang, Finance lo"            |
|                                           |
|  +-- Reported ROAS --+  +-- Reality --+   |
|  |    4.0x           |  |   0.9x      |   |
|  |    (Shopee Ads)   |  |   LO TIEN   |   |
|  +-------------------+  +-------------+   |
|                                           |
|  Breakdown:                               |
|  - Gross Revenue:   100%                  |
|  - Platform fee:    -12%                  |
|  - COGS:            -45%                  |
|  - Shipping:        -8%                   |
|  - Returns:         -12%                  |
|  - Payment fee:     -3%                   |
|  = Profit:          20% → ROAS 0.9x       |
|                                           |
|  "2.4 ty VND/nam mat trong im lang"       |
+------------------------------------------+
```

### 2. CAP NHAT: Competitive Comparison (Elton + Pango)

Thay bang so sanh hien tai (Excel/PowerBI/Custom) bang:

| Layer | Bluecore | Elton Data | PangoCDP |
|-------|----------|------------|----------|
| Data Ingestion | 35 native VN connectors tu tao Data Warehouse | Can Data Warehouse rieng (BigQuery) + data engineer | Can tracking setup (pixel/API) |
| Data Model | Financial Truth dong goi san (Net Revenue, Real Cash, Profit ROAS) | Raw data sach, tu build business logic (SQL/dbt) | Customer Truth: 360 profile + segments |
| Output | Control Tower: Alert co Owner/Deadline/Impact VND | Dataset sach, tu build dashboard BI | Segments + automation campaigns |
| Deployment | 1-2 tuan live | 3-6 thang (warehouse + pipeline) | 2-3 thang (tracking + identity) |
| Chi phi | Co dinh 1.5-4tr/thang | Data eng 40tr/thang + BigQuery 20tr/nam | Vai ngan USD/thang |

### 3. SLIDE MOI: Pricing & ROI Guarantee

```
+------------------------------------------+
|  CHI PHI & ROI                            |
|                                           |
|  PRICING (co dinh, khong tinh volume):    |
|  +------------------+---------------------+
|  | Marketing Plan   | 1.5 trieu/thang    |
|  | Ecommerce Plan   | 3 trieu/thang      |
|  | Combo CEO        | 4 trieu/thang      |
|  +------------------+---------------------+
|  | Setup BigQuery   | 40 trieu (1 lan)   |
|  +------------------+---------------------+
|                                           |
|  ROI BAO DAM:                             |
|  +---------------------------------------+
|  | Toi thieu 3 TY VND gia tri            |
|  | trong thang dau tien                  |
|  |                                       |
|  | Khong tim thay gia tri?               |
|  | → HOAN TIEN 100%                      |
|  +---------------------------------------+
|                                           |
|  Trial 14 ngay mien phi                   |
+------------------------------------------+
```

### 4. BO SUNG: Cong thuc FDP minh bach

Them vao slide FDP:

```typescript
// 3 cong thuc cot loi
Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees
Contribution Margin = Net Revenue - COGS - Variable Costs  
Real Cash = Bank Balance - Pending Payables - Locked Inventory + Confirmed AR
```

### 5. CAP NHAT: CTA Page

Them cac thong tin:
- Trial 14 ngay mien phi
- Demo voi data that: hellobluecore.vn
- ROI guarantee: 3 ty VND hoac hoan tien

---

## Cau truc slide sau update (17 → 20 slides)

| # | Slide | Trang thai |
|---|-------|------------|
| 1 | Cover | Giu nguyen |
| 2 | 3 Pillars | Giu nguyen |
| 3 | Hidden Cost | Giu nguyen |
| 4 | Ecosystem Overview | Giu nguyen |
| 5 | FDP Detail | CAP NHAT: Them cong thuc |
| 6 | MDP Detail (3 screenshots) | Giu nguyen |
| 7 | ROAS Illusion | MOI |
| 8 | CDP + Control Tower | Giu nguyen |
| 9 | Financial Spine | Giu nguyen |
| 10 | Competitor vs Elton/Pango | CAP NHAT |
| 11-14 | Use Cases 1-4 | Giu nguyen |
| 15 | Why Bluecore | Giu nguyen |
| 16 | Pricing & ROI | MOI |
| 17 | Manifesto | Giu nguyen |
| 18 | Architecture | Giu nguyen |
| 19 | CTA | CAP NHAT |

---

## Phan ky thuat

### Files can thay doi

| File | Thay doi |
|------|----------|
| `src/components/sales-deck/FullSystemSalesDeckPDF.tsx` | Them 2 pages moi, cap nhat 3 pages |
| `src/components/sales-deck/FullSystemSalesDeckPDF_EN.tsx` | Tuong tu voi English |

### Code changes

#### 1. Them data constant moi

```typescript
// ROAS Illusion breakdown
const roasBreakdown = [
  { label: 'Gross Revenue', value: '100%', color: 'primary' },
  { label: 'Platform fee (san)', value: '-12%', color: 'danger' },
  { label: 'COGS (gia von)', value: '-45%', color: 'danger' },
  { label: 'Shipping', value: '-8%', color: 'danger' },
  { label: 'Returns', value: '-12%', color: 'danger' },
  { label: 'Payment fee', value: '-3%', color: 'danger' },
  { label: 'Profit', value: '20%', color: 'accent' },
];

// Competitor comparison moi
const newCompetitiveComparison = [
  {
    layer: 'Data Ingestion',
    bluecore: '35 native VN connectors, tu tao Data Warehouse',
    elton: 'Can Data Warehouse rieng (BigQuery) + data engineer',
    pango: 'Can tracking setup (pixel/API) + identity resolution',
  },
  // ... 4 layers khac
];

// Pricing
const pricingPlans = [
  { name: 'Marketing Plan', price: '1.5 trieu', desc: 'MDP focus' },
  { name: 'Ecommerce Plan', price: '3 trieu', desc: 'FDP + MDP' },
  { name: 'Combo CEO', price: '4 trieu', desc: 'Full 5 modules' },
];
```

#### 2. Them page components moi

```typescript
// ROASIllusionPage - Minh hoa 4.0x → 0.9x
const ROASIllusionPage = () => (
  <Page size="A4" style={styles.page}>
    {/* ROAS comparison + breakdown table */}
  </Page>
);

// PricingROIPage - Chi phi va cam ket
const PricingROIPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    {/* Pricing table + ROI guarantee box */}
  </Page>
);
```

#### 3. Cap nhat Document component

```typescript
<Document>
  <CoverPage />
  <PillarsPage />
  <HiddenCostPage />
  <EcosystemOverviewPage />
  <FDPDetailPage />     {/* Updated with formulas */}
  <MDPDetailPage />
  <ROASIllusionPage />  {/* NEW */}
  <CDPControlTowerPage />
  <DataWarehousePage />
  <CompetitiveAdvantagesPage />  {/* Updated: Elton + Pango */}
  <UseCasePage1 />
  <UseCasePage2 />
  <UseCasePage3 />
  <UseCasePage4 />
  <WhyBluecorePage />
  <PricingROIPage />    {/* NEW */}
  <ManifestoPage />
  <ArchitecturePage />
  <CTAPage />           {/* Updated with trial */}
</Document>
```

---

## Uoc tinh thoi gian

| Task | Thoi gian |
|------|-----------|
| Them ROASIllusionPage | 20 phut |
| Them PricingROIPage | 15 phut |
| Cap nhat CompetitiveAdvantagesPage | 25 phut |
| Bo sung formulas vao FDPDetailPage | 10 phut |
| Cap nhat CTAPage | 10 phut |
| Cap nhat page numbers | 5 phut |
| Update English version | 40 phut |
| **Tong** | **~2 gio** |

---

## Ket qua mong doi

Sau khi hoan thanh, Sales Deck se co:
- 20 slides (them 3 slides moi)
- ROAS Illusion de thuyet phuc CMO
- Bang so sanh Elton Data + PangoCDP de dinh vi ro rang
- Pricing minh bach voi ROI guarantee 3 ty VND
- Cong thuc FDP de CEO/CFO hieu logic

