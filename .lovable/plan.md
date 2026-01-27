

# TỔNG RÀ SOÁT SSOT/FDP - TẤT CẢ CÁC TRANG FDP

## TỔNG QUAN KẾT QUẢ

| Mức độ tuân thủ | Số lượng vi phạm | Mức độ nghiêm trọng |
|-----------------|------------------|---------------------|
| **Các trang SSOT-compliant** | 5/10 trang | ✅ Đạt |
| **Các trang có vi phạm nhẹ** | 3/10 trang | 🟠 Cần sửa |
| **Các trang có vi phạm nặng** | 2/10 trang | 🔴 Critical |

---

## 1. CÁC TRANG ĐÃ TUÂN THỦ SSOT ✅

### 1.1 CFODashboard.tsx ✅
- Sử dụng `useFinanceTruthSnapshot` (canonical hook)
- Không có client-side calculations cho metrics
- Decision Cards chỉ hiển thị precomputed values

### 1.2 CashPositionPage.tsx ✅
- Sử dụng `useFinanceTruthSnapshot` và `useCashRunway`
- Tuân thủ FDP Manifesto Principle #4 (Real Cash)
- Không có calculations trong page

### 1.3 WorkingCapitalHubPage.tsx ✅
- Thin wrapper pattern - chỉ import components
- Logic tính toán nằm trong child components

### 1.4 CashForecastPage.tsx ✅  
- Thin wrapper - delegate to DailyForecastView/WeeklyForecastView
- Không có business logic trong page

### 1.5 BudgetVsActualPage.tsx ✅
- Sử dụng `useScenarioBudgetData` hook
- Không có calculations trong page
- Chỉ hiển thị data từ hook

---

## 2. CÁC TRANG CÓ VI PHẠM NHẸ 🟠

### 2.1 ExpensesPage.tsx
**Vi phạm:**
```typescript
// Line 120-128: Client-side calculations
const prevPeriodExpenses = useMemo(() => {
  if (!monthlySummary || monthlySummary.length < 2) return 0;
  const prev = monthlySummary[monthlySummary.length - 2];
  return prev ? (prev.cogs + prev.operatingExpenses) : 0;  // ⚠️ Addition
}, [monthlySummary]);

const expenseChange = prevPeriodExpenses > 0
  ? ((totalExpenses - prevPeriodExpenses) / prevPeriodExpenses) * 100  // ⚠️ Calculation
  : 0;
```

**Khuyến nghị:** Di chuyển period comparison vào database RPC

---

### 2.2 RiskDashboardPage.tsx
**Vi phạm:**
```typescript
// Lines 133-170: Hardcoded mock data
const stressScenarios = [
  {
    name: 'Mất top 1 khách hàng',
    impact: -25,
    cashImpact: -12500000000,  // ⚠️ Magic number
    probability: 'low',
    ...
  },
  ...
];
```

**Khuyến nghị:** Tạo bảng `stress_scenarios` và fetch từ DB

---

### 2.3 UnitEconomicsPage.tsx
**Vi phạm (trong hook useUnitEconomics):**
```typescript
// Lines 112-119: Client-side per-order calculations
const cogsPerOrder = totalOrders > 0 ? totalCogs / totalOrders : 0;  // ⚠️
const feesPerOrder = totalOrders > 0 ? totalPlatformFees / totalOrders : 0;  // ⚠️
const shippingPerOrder = totalOrders > 0 ? totalShippingFees / totalOrders : 0;  // ⚠️

// Lines 118-120: Client-side customer metrics
const avgOrdersPerCustomer = uniqueCustomers > 0 ? totalOrders / uniqueCustomers : 1;  // ⚠️
const repeatRate = avgOrdersPerCustomer > 1 ? ((avgOrdersPerCustomer - 1) / avgOrdersPerCustomer) * 100 : 0;  // ⚠️

// Line 182: Estimation magic number
newCustomersThisMonth: Math.round(uniqueCustomers * 0.2), // ⚠️ Estimate 20% new
```

**Khuyến nghị:** Di chuyển tất cả per-order và customer calculations vào DB view

---

## 3. CÁC TRANG CÓ VI PHẠM NẶNG 🔴

### 3.1 PLReportPage.tsx

**Vi phạm 1: Budget estimations với magic numbers**
```typescript
// Lines 266-274: Hardcoded ratio assumptions
const budgetValues = hasBudgetData ? {
  grossSales: budgetData.ytd.plannedRevenue,
  netSales: budgetData.ytd.plannedRevenue * 0.95, // ⚠️ Magic: 5% returns/discounts
  cogs: budgetData.ytd.plannedRevenue * 0.60, // ⚠️ Magic: 60% COGS ratio
  grossProfit: budgetData.ytd.plannedRevenue * 0.35, // ⚠️ Magic: 35% gross margin
  netIncome: budgetData.ytd.plannedEbitda * 0.80, // ⚠️ Magic: After tax
} : null;
```

**Vi phạm 2: Redundant margin calculations trong UI**
```typescript
// Lines 335-337: Tính lại margin trong UI mặc dù đã có từ hook
extra: `Biên: ${plData.netSales > 0 ? ((plData.grossProfit / plData.netSales) * 100).toFixed(1) : '0'}%`
extra: `Biên: ${plData.netSales > 0 ? ((plData.operatingIncome / plData.netSales) * 100).toFixed(1) : '0'}%`
extra: `Biên: ${plData.netSales > 0 ? ((plData.netIncome / plData.netSales) * 100).toFixed(1) : '0'}%`
```

**Vi phạm 3: Progress bar logic với calculations**
```typescript
// Line 1086: Math operations cho UI rendering
<Progress value={Math.max(0, Math.min((item.value / item.target) * 100, 100))} />
```

---

### 3.2 ExecutiveSummaryPage.tsx

**Vi phạm 1: Complex health score calculations trong UI**
```typescript
// Lines 185-219: Full calculation logic trong component
const calculateDimensions = (): HealthDimension[] => {
  // Liquidity Score
  const liquidityScore = Math.min(100, runwayMonths * 15);  // ⚠️ Formula in FE
  
  // Receivables Health
  const receivablesScore = Math.min(100, Math.max(0, 100 - (dso - 30) * 2));  // ⚠️
  
  // Profitability
  const profitabilityScore = Math.min(100, grossMargin * 2.5);  // ⚠️
  
  // Efficiency
  const efficiencyScore = Math.min(100, Math.max(0, 100 - ccc));  // ⚠️
  
  // Stability
  const stabilityScore = Math.min(100, ebitdaMargin * 4);  // ⚠️
};
```

**Vi phạm 2: Overall score aggregation**
```typescript
// Line 274: .reduce() trong UI
const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
```

**Vi phạm 3: Hardcoded growth score**
```typescript
// Line 213: Magic number
const growthScore = 72; // ⚠️ Sample data - should come from DB
```

---

### 3.3 usePLData.ts (Hook supporting PLReportPage)

**Vi phạm 1: aggregateCacheRows với .reduce()**
```typescript
// Lines 139-175: Full aggregation logic trong FE
function aggregateCacheRows(rows: PLCacheRow[]): PLCacheRow | null {
  return rows.reduce((acc, row) => ({
    gross_sales: (acc.gross_sales || 0) + (row.gross_sales || 0),  // ⚠️
    net_sales: (acc.net_sales || 0) + (row.net_sales || 0),  // ⚠️
    cogs: (acc.cogs || 0) + (row.cogs || 0),  // ⚠️
    // ... 20+ more additions
  }));
}
```

**Vi phạm 2: Margin recalculation**
```typescript
// Lines 259-263: Tính lại margin sau aggregation
cache.gross_margin = cache.gross_profit / cache.net_sales;
cache.operating_margin = cache.operating_income / cache.net_sales;
cache.net_margin = cache.net_income / cache.net_sales;
```

**Vi phạm 3: YoY change calculation**
```typescript
// Lines 363-366: calcChange function
const calcChange = (current: number, previous: number): number => {
  if (!previous || previous === 0) return 0;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));  // ⚠️
};
```

**Vi phạm 4: Category data aggregation**
```typescript
// Lines 408-414: .forEach() aggregation
(categoryRows || []).forEach((row: any) => {
  const existing = categoryAgg.get(row.category) || { revenue: 0, cogs: 0 };
  existing.revenue += Number(row.total_revenue) || 0;  // ⚠️
  existing.cogs += Number(row.total_cogs) || 0;  // ⚠️
  categoryAgg.set(row.category, existing);
});

// Line 416: .reduce() for total
const totalCatRevenue = [...categoryAgg.values()].reduce((s, c) => s + c.revenue, 0);  // ⚠️
```

---

## 4. TỔNG HỢP VI PHẠM THEO LOẠI

| Loại vi phạm | Số lượng | Files ảnh hưởng |
|--------------|----------|-----------------|
| `.reduce()` aggregation | 4 | usePLData.ts, ExecutiveSummaryPage.tsx |
| `.forEach()` aggregation | 2 | usePLData.ts, useUnitEconomics.ts |
| Margin calculations (`/ * 100`) | 6 | usePLData.ts, PLReportPage.tsx |
| Magic numbers (hardcoded ratios) | 8 | PLReportPage.tsx, ExecutiveSummaryPage.tsx, RiskDashboardPage.tsx |
| YoY/Period change calculations | 2 | usePLData.ts, ExpensesPage.tsx |
| Score/index calculations | 5 | ExecutiveSummaryPage.tsx |

---

## 5. KẾ HOẠCH SỬA ĐỀ XUẤT

### Giai đoạn 1: Critical (usePLData + PLReportPage)

| Bước | Thay đổi | Độ ưu tiên |
|------|----------|------------|
| 1.1 | Tạo RPC `get_pl_aggregated` để thay thế `aggregateCacheRows` | 🔴 Critical |
| 1.2 | Tạo RPC `get_pl_comparison` để thay thế `calcChange` | 🔴 Critical |
| 1.3 | Update `v_category_pl_summary` với pre-computed margin/contribution | 🔴 Critical |
| 1.4 | Refactor `usePLData.ts` thành thin wrapper | 🔴 Critical |
| 1.5 | Xóa redundant calculations trong PLReportPage UI | 🟠 High |

### Giai đoạn 2: High (ExecutiveSummaryPage)

| Bước | Thay đổi | Độ ưu tiên |
|------|----------|------------|
| 2.1 | Tạo view `v_financial_health_scores` với pre-computed scores | 🟠 High |
| 2.2 | Tạo hook `useFinancialHealthScores` | 🟠 High |
| 2.3 | Xóa `calculateDimensions()` function | 🟠 High |

### Giai đoạn 3: Medium (Other pages)

| Bước | Thay đổi | Độ ưu tiên |
|------|----------|------------|
| 3.1 | Xóa magic numbers trong PLReportPage budgetValues | 🟡 Medium |
| 3.2 | Tạo bảng `stress_scenarios` cho RiskDashboard | 🟡 Medium |
| 3.3 | Di chuyển per-order calculations vào DB view | 🟡 Medium |

---

## 6. ESTIMATED IMPACT

**Sau khi hoàn thành Giai đoạn 1:**
- usePLData.ts: Giảm từ ~500 lines xuống ~150 lines
- PLReportPage.tsx: Xóa 3 redundant calculations
- Tuân thủ 100% SSOT cho P&L module

**Sau khi hoàn thành tất cả:**
- 10/10 FDP pages SSOT-compliant
- Không còn `.reduce()`, `.forEach()` trong hooks
- Không còn magic numbers (hoặc được đánh dấu rõ ràng với EstimationBadge)

