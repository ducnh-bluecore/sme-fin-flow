
# KẾ HOẠCH CẢI TIẾN FDP MODULE TỔNG HỢP
## Hợp nhất: CFO Feedback + Technical Improvements + Cost Definition

---

## 1. EXECUTIVE SUMMARY

Plan này hợp nhất 3 nguồn yêu cầu:
1. **CFO Feedback (12 điểm)**: Working Capital methodology, AR labels, Forecast transparency
2. **Technical Improvements (4 điểm)**: Fix DIO, Marketing attribution, EBITDA breakdown, AP alerts
3. **Cost Definition (mới)**: Fixed Cost Baselines + Variable Cost Estimates

### Tổng quan thay đổi

| Nhóm | Số thay đổi | Mức độ rủi ro | Ưu tiên |
|------|-------------|---------------|---------|
| Data Integrity & Labels | 4 | Thấp | P0 - Week 1 |
| Cost Definition Schema | 3 | Trung bình | P0 - Week 1 |
| Forecast Transparency | 3 | Thấp | P1 - Week 2 |
| Expense Categorization | 3 | Trung bình | P1 - Week 2 |
| Sales Projection | 2 | Cao | P2 - Week 3 |
| Alerts & Methodology | 2 | Thấp | P2 - Week 3 |
| Quarterly Mode (Optional) | 1 | Trung bình | P3 - Week 4+ |

**Tổng cộng: 18 thay đổi trong 7 phases**

---

## 2. TIMELINE TỔNG HỢP

```text
WEEK 1 ─────────────────────────────────────────────────────────
│                                                                
│  P0-A: DATA INTEGRITY & LABELS                                
│  ├─ 1. Fix DIO Calculation (annualized COGS, cap 365d)        
│  ├─ 2. AR Aging Labels ("Quá hạn X ngày")                     
│  ├─ 3. Period Labels ("Trailing 90 ngày")                     
│  └─ 4. Add 100% Overdue AP Alert                              
│                                                                
│  P0-B: COST DEFINITION SCHEMA                                 
│  ├─ 5. Create expense_baselines table + RLS                   
│  ├─ 6. Create expense_estimates table + RLS                   
│  └─ 7. Create v_expense_plan_summary view                     
│                                                                
WEEK 2 ─────────────────────────────────────────────────────────
│                                                                
│  P1-A: FORECAST TRANSPARENCY                                  
│  ├─ 8. Rename "AI" → "Rule-Based" Forecast                    
│  ├─ 9. Add formula_settings collection_rate_* columns         
│  └─ 10. Create useCollectionRates hook (dynamic rates)        
│                                                                
│  P1-B: EXPENSE CATEGORIZATION                                 
│  ├─ 11. Create useExpenseBaselines hook + UI Panel            
│  ├─ 12. Create useExpenseEstimates hook + UI Panel            
│  └─ 13. Add "Định nghĩa chi phí" tab to ExpensesPage          
│                                                                
WEEK 3 ─────────────────────────────────────────────────────────
│                                                                
│  P2-A: SALES PROJECTION                                       
│  ├─ 14. Create useSalesProjection hook                        
│  └─ 15. Integrate Sales into Cashflow Forecast                
│                                                                
│  P2-B: ALERTS & METHODOLOGY                                   
│  ├─ 16. Create EBITDA Breakdown Card + useOpExBreakdown       
│  └─ 17. Add Cash Burn Rate methodology tooltips               
│                                                                
WEEK 4+ ────────────────────────────────────────────────────────
│                                                                
│  P3: ADVANCED FEATURES (Optional)                             
│  └─ 18. Quarterly Working Capital Toggle                      
│                                                                
└───────────────────────────────────────────────────────────────
```

---

## 3. PHASE CHI TIẾT

### PHASE 0-A: DATA INTEGRITY & LABELS (Week 1 - Critical)

#### 3.1 Fix DIO Calculation

**Vấn đề hiện tại:**
- DIO = 1432 ngày (sai logic)
- Logic hiện tại: `v_dio := v_inventory_value / v_daily_cogs`
- Với: `v_daily_cogs = COGS_90d / 90`

**Giải pháp:**
```sql
-- File: supabase/migrations/[NEW]_fix_dio_calculation.sql

-- Use annualized COGS for industry-standard DIO
v_annual_cogs := v_total_cogs * (365.0 / v_days_in_period);

-- Guard against division by zero and cap at 365 days
IF v_annual_cogs > 0 THEN
  v_dio := LEAST((v_inventory_value / v_annual_cogs) * 365, 365);
ELSE
  v_dio := 0;
END IF;

-- Same logic for DPO
IF v_annual_cogs > 0 THEN
  v_dpo := LEAST((v_total_ap / v_annual_cogs) * 365, 365);
ELSE
  v_dpo := 0;
END IF;

-- Recalculate CCC
v_ccc := v_dso + v_dio - v_dpo;
```

**Files thay đổi:**
- `supabase/migrations/[NEW]_fix_dio_calculation.sql`

**Kết quả mong đợi:**
- DIO từ 1432 ngày → ~90-180 ngày
- CCC từ 1218 ngày → ~100-200 ngày

---

#### 3.2 AR Aging Label Clarification

**Vấn đề:** "1-30 ngày" không rõ ràng (từ invoice date hay overdue?)

**Giải pháp:**
```typescript
// File: src/hooks/useDashboardData.ts

// BEFORE:
{ bucket: '1-30 ngày', value: snapshot.arAging30d, color: '...' }

// AFTER:
{ bucket: 'Quá hạn 1-30 ngày', value: snapshot.arAging30d, color: '...' }

// Full mapping:
const arAgingBuckets = [
  { bucket: 'Chưa đến hạn', value: snapshot.arAgingCurrent, color: 'hsl(var(--chart-1))' },
  { bucket: 'Quá hạn 1-30 ngày', value: snapshot.arAging30d, color: 'hsl(var(--chart-2))' },
  { bucket: 'Quá hạn 31-60 ngày', value: snapshot.arAging60d, color: 'hsl(var(--chart-3))' },
  { bucket: 'Quá hạn 61-90 ngày', value: snapshot.arAging90d, color: 'hsl(var(--chart-4))' },
  { bucket: 'Nợ xấu (>90 ngày)', value: arOver90, color: 'hsl(var(--destructive))' },
];
```

**Files thay đổi:**
- `src/hooks/useDashboardData.ts` (lines 189-204)
- `src/components/dashboard/ARAgingChart.tsx` (tooltips)

---

#### 3.3 Period Labels for Working Capital

**Giải pháp:** Thêm Badge "Trailing 90 ngày"
```typescript
// File: src/pages/WorkingCapitalPage.tsx

<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>DSO</CardTitle>
      <Badge variant="outline" className="text-xs">
        Trailing 90 ngày
      </Badge>
    </div>
  </CardHeader>
  ...
</Card>
```

---

#### 3.4 Add 100% Overdue AP Alert

**Giải pháp:**
```sql
-- File: supabase/migrations/[NEW]_add_ap_overdue_alert.sql

-- In detect_real_alerts RPC, add:
IF v_overdue_ap_percent >= 95 THEN
  INSERT INTO alerts (tenant_id, type, title, severity, metadata)
  VALUES (
    p_tenant_id,
    'cash_risk',
    'Công nợ phải trả gần như toàn bộ quá hạn',
    'critical',
    jsonb_build_object(
      'overdue_percent', v_overdue_ap_percent,
      'overdue_amount', v_overdue_ap,
      'total_ap', v_total_ap
    )
  );
END IF;
```

---

### PHASE 0-B: COST DEFINITION SCHEMA (Week 1 - Critical)

#### 3.5 Create `expense_baselines` Table

```sql
-- File: supabase/migrations/[NEW]_create_expense_baselines.sql

CREATE TABLE IF NOT EXISTS expense_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('salary', 'rent', 'utilities', 'other')),
  name TEXT NOT NULL,
  monthly_amount NUMERIC(15,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_baseline UNIQUE(tenant_id, category, name, effective_from)
);

-- RLS
ALTER TABLE expense_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view baselines"
  ON expense_baselines FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage baselines"
  ON expense_baselines FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
```

---

#### 3.6 Create `expense_estimates` Table

```sql
-- File: supabase/migrations/[NEW]_create_expense_estimates.sql

CREATE TABLE IF NOT EXISTS expense_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  category TEXT NOT NULL CHECK (category IN ('marketing', 'logistics')),
  channel TEXT, -- shopee, lazada, tiktok, meta, google, etc.
  estimated_amount NUMERIC(15,2) NOT NULL,
  actual_amount NUMERIC(15,2),
  variance NUMERIC(15,2) GENERATED ALWAYS AS (actual_amount - estimated_amount) STORED,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'closed')),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_estimate UNIQUE(tenant_id, year, month, category, COALESCE(channel, ''))
);

-- RLS (similar to baselines)
ALTER TABLE expense_estimates ENABLE ROW LEVEL SECURITY;
-- ... policies ...
```

---

#### 3.7 Create `v_expense_plan_summary` View

```sql
-- File: supabase/migrations/[NEW]_create_expense_plan_view.sql

CREATE OR REPLACE VIEW v_expense_plan_summary AS
WITH fixed_costs AS (
  SELECT 
    tenant_id,
    EXTRACT(YEAR FROM CURRENT_DATE)::int AS year,
    EXTRACT(MONTH FROM CURRENT_DATE)::int AS month,
    SUM(monthly_amount) AS total_fixed
  FROM expense_baselines
  WHERE effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  GROUP BY tenant_id
),
variable_costs AS (
  SELECT 
    tenant_id,
    year,
    month,
    SUM(estimated_amount) AS total_estimated,
    SUM(actual_amount) AS total_actual
  FROM expense_estimates
  GROUP BY tenant_id, year, month
)
SELECT 
  COALESCE(f.tenant_id, v.tenant_id) AS tenant_id,
  COALESCE(v.year, f.year) AS year,
  COALESCE(v.month, f.month) AS month,
  COALESCE(f.total_fixed, 0) AS fixed_baseline,
  COALESCE(v.total_estimated, 0) AS variable_estimated,
  COALESCE(v.total_actual, 0) AS variable_actual,
  COALESCE(f.total_fixed, 0) + COALESCE(v.total_estimated, 0) AS total_planned,
  COALESCE(f.total_fixed, 0) + COALESCE(v.total_actual, 0) AS total_actual,
  (COALESCE(v.total_actual, 0) - COALESCE(v.total_estimated, 0)) AS variance
FROM fixed_costs f
FULL OUTER JOIN variable_costs v 
  ON f.tenant_id = v.tenant_id 
  AND f.year = v.year 
  AND f.month = v.month;
```

---

### PHASE 1-A: FORECAST TRANSPARENCY (Week 2)

#### 3.8 Rename "AI" → "Rule-Based" Forecast

**Files thay đổi:**
- `src/hooks/useForecastInputs.ts`:
  ```typescript
  // Line 303
  export type ForecastMethod = 'rule-based' | 'simple';  // was 'ai' | 'simple'
  ```
- `src/components/cashforecast/ForecastMethodToggle.tsx`
- `src/components/cashforecast/DailyForecastView.tsx`

---

#### 3.9 Add Collection Rate Settings

```sql
-- File: supabase/migrations/[NEW]_add_collection_rates.sql

ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS
  collection_rate_current NUMERIC(5,2) DEFAULT 85.00;
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS
  collection_rate_30d NUMERIC(5,2) DEFAULT 70.00;
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS
  collection_rate_60d NUMERIC(5,2) DEFAULT 50.00;
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS
  collection_rate_90d NUMERIC(5,2) DEFAULT 30.00;
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS
  collection_rate_over90 NUMERIC(5,2) DEFAULT 10.00;
```

---

#### 3.10 Create `useCollectionRates` Hook

```typescript
// File: src/hooks/useCollectionRates.ts

export interface CollectionRates {
  current: number;      // Default 85%
  days30: number;       // Default 70%
  days60: number;       // Default 50%
  days90: number;       // Default 30%
  over90: number;       // Default 10%
  source: 'db' | 'default';
}

export function useCollectionRates(): { rates: CollectionRates; isLoading: boolean } {
  const { data: tenantId } = useActiveTenantId();
  
  const { data, isLoading } = useQuery({
    queryKey: ['collection-rates', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('formula_settings')
        .select('collection_rate_*')
        .eq('tenant_id', tenantId)
        .single();
      return data;
    },
    enabled: !!tenantId,
  });

  const rates: CollectionRates = {
    current: data?.collection_rate_current ?? 85,
    days30: data?.collection_rate_30d ?? 70,
    days60: data?.collection_rate_60d ?? 50,
    days90: data?.collection_rate_90d ?? 30,
    over90: data?.collection_rate_over90 ?? 10,
    source: data ? 'db' : 'default',
  };

  return { rates, isLoading };
}
```

---

### PHASE 1-B: EXPENSE CATEGORIZATION (Week 2)

#### 3.11 Create `useExpenseBaselines` Hook + UI

```typescript
// File: src/hooks/useExpenseBaselines.ts

export interface ExpenseBaseline {
  id: string;
  category: 'salary' | 'rent' | 'utilities' | 'other';
  name: string;
  monthlyAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
}

export function useExpenseBaselines() {
  // Query, create, update, delete mutations
  // Returns: baselines[], totalMonthlyFixed, byCategory
}
```

```typescript
// File: src/components/expenses/FixedCostDefinitionPanel.tsx

export function FixedCostDefinitionPanel() {
  const { baselines, totalMonthlyFixed, byCategory } = useExpenseBaselines();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Chi phí cố định hàng tháng</CardTitle>
          <Button size="sm"><Plus /> Thêm</Button>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(totalMonthlyFixed)}</p>
      </CardHeader>
      <CardContent>
        {/* Group by category: Salary, Rent, Utilities, Other */}
        {Object.entries(byCategory).map(([category, items]) => (
          <CategoryGroup key={category} category={category} items={items} />
        ))}
      </CardContent>
    </Card>
  );
}
```

---

#### 3.12 Create `useExpenseEstimates` Hook + UI

```typescript
// File: src/hooks/useExpenseEstimates.ts

export interface ExpenseEstimate {
  id: string;
  year: number;
  month: number;
  category: 'marketing' | 'logistics';
  channel: string | null;
  estimatedAmount: number;
  actualAmount: number | null;
  variance: number | null;
  status: 'draft' | 'locked' | 'closed';
}

export function useExpenseEstimates(year?: number, month?: number) {
  // Query, create, update, sync mutations
  // Returns: estimates[], totalEstimated, totalActual, totalVariance
}

export function useSyncActualExpenses() {
  // RPC: sync_actual_expenses_to_estimates
  // Auto-fill actual_amount from expenses/marketing_expenses tables
}
```

```typescript
// File: src/components/expenses/VariableCostEstimatePanel.tsx

export function VariableCostEstimatePanel() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { estimates, totalEstimated, totalActual, totalVariance } = useExpenseEstimates(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1
  );
  const syncActual = useSyncActualExpenses();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tạm tính chi phí biến đổi</CardTitle>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </CardHeader>
      <CardContent>
        {/* Marketing by channel: Shopee, TikTok, Meta, Google */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Tạm tính</TableHead>
              <TableHead>Thực tế</TableHead>
              <TableHead>Chênh lệch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.filter(e => e.category === 'marketing').map(est => (
              <EstimateRow key={est.id} estimate={est} />
            ))}
          </TableBody>
        </Table>
        
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => syncActual.mutate()}>
            <RefreshCw /> Đồng bộ thực tế
          </Button>
          <Button variant="outline">
            <Lock /> Khóa tháng
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

#### 3.13 Add "Định nghĩa chi phí" Tab to ExpensesPage

```typescript
// File: src/pages/ExpensesPage.tsx

// Add new tab after existing "Xu hướng" tab (around line 330)
<Tabs defaultValue="overview" className="space-y-4">
  <TabsList>
    <TabsTrigger value="overview">Tổng quan</TabsTrigger>
    <TabsTrigger value="trend">Xu hướng</TabsTrigger>
    <TabsTrigger value="definitions">Định nghĩa chi phí</TabsTrigger>  {/* NEW */}
  </TabsList>

  {/* ... existing TabsContent ... */}

  <TabsContent value="definitions" className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-2">
      <FixedCostDefinitionPanel />
      <VariableCostEstimatePanel />
    </div>
    
    {/* Budget vs Actual Summary */}
    <BudgetVsActualSummary />
  </TabsContent>
</Tabs>
```

---

### PHASE 2-A: SALES PROJECTION (Week 3)

#### 3.14 Create `useSalesProjection` Hook

```typescript
// File: src/hooks/useSalesProjection.ts

export interface SalesProjection {
  dailyBaseRevenue: number;      // From 90-day average
  projectedDailyRevenue: number; // With growth factor
  growthRate: number;            // Monthly growth %
  growthSource: 'historical' | 'manual' | 'scenario';
  confidenceLevel: 'high' | 'medium' | 'low';
  settlementDelay: number;       // T+14 for eCommerce
}

export function useSalesProjection() {
  const { data: snapshot } = useFinanceTruthSnapshot();
  const { data: settings } = useFormulaSettings();
  
  const dailyAverage = (snapshot?.netRevenue || 0) / 90;
  const growthRate = settings?.monthly_revenue_growth || 0;
  
  return {
    dailyBaseRevenue: dailyAverage,
    projectedDailyRevenue: dailyAverage * (1 + growthRate / 100),
    growthRate,
    growthSource: settings?.monthly_revenue_growth ? 'manual' : 'historical',
    confidenceLevel: 'medium',
    settlementDelay: 14, // eCommerce T+14
  };
}
```

---

#### 3.15 Integrate Sales into Cashflow Forecast

```typescript
// File: src/hooks/useForecastInputs.ts

// Update generateForecast function (around line 306)
export function generateForecast(
  inputs: ForecastInputs, 
  days: number = 90, 
  method: ForecastMethod = 'rule-based',
  salesProjection?: SalesProjection  // NEW PARAM
) {
  // ...existing code...

  for (let i = 0; i < days; i++) {
    // Expected inflows
    let inflow = 0;
    
    // ...existing AR collection logic...

    // NEW: Add projected sales revenue (with settlement delay)
    if (salesProjection && i >= salesProjection.settlementDelay) {
      const netRevenueAfterFees = salesProjection.projectedDailyRevenue * 0.80; // 80% after platform fees
      inflow += netRevenueAfterFees;
    }
    
    // ...rest of function...
  }
}
```

---

### PHASE 2-B: ALERTS & METHODOLOGY (Week 3)

#### 3.16 Create EBITDA Breakdown Card

```typescript
// File: src/hooks/useOpExBreakdown.ts

export interface OpExBreakdown {
  salary: number;
  rent: number;
  utilities: number;
  other: number;
  total: number;
}

export function useOpExBreakdown() {
  // Query v_opex_breakdown view
}
```

```typescript
// File: src/components/fdp/EBITDABreakdownCard.tsx

export function EBITDABreakdownCard() {
  const { data: breakdown } = useOpExBreakdown();
  const { data: snapshot } = useFinanceTruthSnapshot();
  
  const grossProfit = snapshot?.grossProfit || 0;
  const ebitda = grossProfit - (breakdown?.total || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>EBITDA Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span>Lợi nhuận gộp</span>
          <span className="font-medium">{formatCurrency(grossProfit)}</span>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Lương nhân viên</span>
            <span>-{formatCurrency(breakdown?.salary)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Thuê mặt bằng</span>
            <span>-{formatCurrency(breakdown?.rent)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Điện nước</span>
            <span>-{formatCurrency(breakdown?.utilities)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Chi phí khác</span>
            <span>-{formatCurrency(breakdown?.other)}</span>
          </div>
        </div>
        <Separator />
        <div className="flex justify-between font-bold">
          <span>EBITDA</span>
          <span className={ebitda >= 0 ? 'text-green-600' : 'text-destructive'}>
            {formatCurrency(ebitda)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

#### 3.17 Add Cash Burn Rate Methodology Tooltips

```typescript
// File: src/hooks/useCashRunway.ts

// Add to return object:
return {
  ...existingData,
  burnCalculationMethod: 'historical_6m_average',
  burnDescription: 'Trung bình chi phí hàng tháng (COGS + Chi phí hoạt động) trong 6 tháng gần nhất. Không bao gồm marketing và chi phí một lần.',
};
```

```typescript
// File: src/components/dashboard/CashRunwayCard.tsx

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center gap-1">
        <span>Chi phí TB/tháng</span>
        <Info className="h-3 w-3 text-muted-foreground" />
      </div>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      <p className="font-medium">Cách tính:</p>
      <p className="text-sm text-muted-foreground">{burnDescription}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### PHASE 3: QUARTERLY MODE (Week 4+ - Optional)

#### 3.18 Quarterly Working Capital Toggle

```typescript
// File: src/hooks/useWorkingCapitalMode.ts

type WorkingCapitalMode = 'trailing_90d' | 'last_quarter' | 'ytd';

export function useWorkingCapitalMode() {
  const [mode, setMode] = useState<WorkingCapitalMode>('trailing_90d');
  
  const periodDates = useMemo(() => {
    const now = new Date();
    switch (mode) {
      case 'last_quarter':
        return getLastCompletedQuarter(now);
      case 'ytd':
        return { start: `${now.getFullYear()}-01-01`, end: format(now, 'yyyy-MM-dd') };
      default:
        return { start: format(subDays(now, 90), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
    }
  }, [mode]);
  
  return { mode, setMode, periodDates };
}
```

---

## 4. DEPENDENCY FLOW

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  NEW TABLES:                                                             │
│  ├─ expense_baselines (Fixed Costs)                                     │
│  └─ expense_estimates (Variable Estimates)                              │
│                                                                          │
│  NEW VIEWS:                                                              │
│  ├─ v_expense_plan_summary                                              │
│  └─ v_opex_breakdown                                                    │
│                                                                          │
│  MODIFIED RPC:                                                           │
│  ├─ compute_central_metrics_snapshot (Fix DIO formula)                  │
│  └─ detect_real_alerts (Add AP overdue rule)                            │
│                                                                          │
│  MODIFIED TABLE:                                                         │
│  └─ formula_settings (Add collection_rate_* columns)                    │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           HOOKS LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  NEW HOOKS:                                                              │
│  ├─ useExpenseBaselines (CRUD for Fixed Costs)                          │
│  ├─ useExpenseEstimates (CRUD for Variable)                             │
│  ├─ useExpensePlanSummary (Aggregated view)                             │
│  ├─ useCollectionRates (Dynamic collection %)                           │
│  ├─ useSalesProjection (Revenue forecast)                               │
│  └─ useOpExBreakdown (EBITDA detail)                                    │
│                                                                          │
│  MODIFIED HOOKS:                                                         │
│  ├─ useDashboardData (AR Aging labels)                                  │
│  ├─ useForecastInputs (Fixed/Variable + Sales)                          │
│  ├─ useFinanceTruthSnapshot (DIO/CCC updated)                           │
│  └─ useCashRunway (Burn methodology)                                    │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  NEW COMPONENTS:                                                         │
│  ├─ FixedCostDefinitionPanel                                            │
│  ├─ VariableCostEstimatePanel                                           │
│  ├─ AddFixedCostDialog                                                  │
│  ├─ AddEstimateDialog                                                   │
│  ├─ BudgetVsActualChart                                                 │
│  ├─ EBITDABreakdownCard                                                 │
│  └─ SalesAssumptionsPanel                                               │
│                                                                          │
│  MODIFIED COMPONENTS:                                                    │
│  ├─ ARAgingChart (Labels)                                               │
│  ├─ DailyForecastView (Method label, Sales)                             │
│  ├─ ForecastMethodToggle (Rule-based label)                             │
│  ├─ InputSummaryPanel (Fixed/Variable breakdown)                        │
│  └─ CashRunwayCard (Methodology tooltip)                                │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PAGE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  MAJOR CHANGES:                                                          │
│  ├─ ExpensesPage (New "Định nghĩa chi phí" tab)                         │
│  ├─ CashForecastPage (Sales projection, Fixed/Variable)                 │
│  └─ WorkingCapitalPage (Period labels, Quarterly toggle)                │
│                                                                          │
│  MODERATE CHANGES:                                                       │
│  ├─ CFODashboard (DIO fix, EBITDA card)                                 │
│  └─ ExecutiveSummaryPage (Updated health scores)                        │
│                                                                          │
│  MINOR CHANGES:                                                          │
│  ├─ AlertsPage (AP overdue alert)                                       │
│  └─ SettingsPage (Collection rate settings)                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. IMPACT MATRIX

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        IMPACT BY PAGE/FEATURE                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ExpensesPage             ████████████████████████  24/24 (Phase 1B)   │
│  CashForecastPage         ████████████████████      20/24 (Phase 1A,2A)│
│  DailyForecastView        ████████████████████      20/24 (Phase 1A,2A)│
│  WorkingCapitalPage       ████████████████          16/24 (Phase 0A,3) │
│  CFODashboard             ████████████              12/24 (Phase 0A,2B)│
│  ExecutiveSummaryPage     ████████                  8/24  (Phase 0A,2B)│
│  SettingsPage             ██████                    6/24  (Phase 1A)   │
│  ARAgingChart             ████                      4/24  (Phase 0A)   │
│  AlertsPage               ██                        2/24  (Phase 0A)   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. FILES SUMMARY

### New Files (15)

| File | Purpose |
|------|---------|
| `supabase/migrations/[1]_fix_dio_calculation.sql` | Cap DIO, annualized COGS |
| `supabase/migrations/[2]_create_expense_baselines.sql` | Fixed cost schema |
| `supabase/migrations/[3]_create_expense_estimates.sql` | Variable estimate schema |
| `supabase/migrations/[4]_create_expense_plan_view.sql` | Summary view |
| `supabase/migrations/[5]_add_collection_rates.sql` | formula_settings columns |
| `supabase/migrations/[6]_add_ap_overdue_alert.sql` | Alert rule |
| `src/hooks/useExpenseBaselines.ts` | Fixed cost CRUD |
| `src/hooks/useExpenseEstimates.ts` | Variable estimate CRUD |
| `src/hooks/useExpensePlanSummary.ts` | Budget vs Actual |
| `src/hooks/useCollectionRates.ts` | Dynamic collection % |
| `src/hooks/useSalesProjection.ts` | Revenue forecast |
| `src/hooks/useOpExBreakdown.ts` | EBITDA detail |
| `src/components/expenses/FixedCostDefinitionPanel.tsx` | Fixed cost UI |
| `src/components/expenses/VariableCostEstimatePanel.tsx` | Variable cost UI |
| `src/components/fdp/EBITDABreakdownCard.tsx` | EBITDA breakdown |

### Modified Files (10)

| File | Changes |
|------|---------|
| `src/pages/ExpensesPage.tsx` | Add "Định nghĩa chi phí" tab |
| `src/hooks/useDashboardData.ts` | AR Aging labels |
| `src/hooks/useForecastInputs.ts` | Fixed/Variable split, Sales, Type rename |
| `src/hooks/useCashRunway.ts` | Burn methodology |
| `src/pages/WorkingCapitalPage.tsx` | Period labels |
| `src/components/cashforecast/DailyForecastView.tsx` | Rule-based label, Sales |
| `src/components/cashforecast/ForecastMethodToggle.tsx` | Label update |
| `src/components/cashforecast/InputSummaryPanel.tsx` | Fixed/Variable display |
| `src/components/dashboard/ARAgingChart.tsx` | Tooltip labels |
| `src/components/dashboard/CashRunwayCard.tsx` | Methodology tooltip |

---

## 7. RISK ASSESSMENT

| Phase | Thay đổi | Rủi ro | Mitigation |
|-------|----------|--------|------------|
| **0A** | Fix DIO | Thấp | Test with real data, verify CCC |
| **0A** | AR Labels | Rất thấp | Visual QA only |
| **0A** | AP Alert | Thấp | Additive alert |
| **0B** | expense_baselines | Thấp | New table, no migration needed |
| **0B** | expense_estimates | Thấp | New table, no migration needed |
| **1A** | Collection Rates | Trung bình | Default = current behavior |
| **1B** | Expense UI | Thấp | New tab, isolated |
| **2A** | Sales Projection | **Cao** | New methodology, extensive testing |
| **2B** | EBITDA Card | Thấp | Additive component |
| **3** | Quarterly Mode | Trung bình | Date edge cases |

---

## 8. TESTING CHECKLIST

### Week 1 (Phase 0)
- [ ] DIO ≤ 365 days sau fix
- [ ] CCC reasonable (100-300 days)
- [ ] AR Aging labels hiển thị "Quá hạn X ngày"
- [ ] Period badge "Trailing 90 ngày"
- [ ] expense_baselines table created + RLS
- [ ] expense_estimates table created + RLS
- [ ] AP overdue alert triggers at 95%

### Week 2 (Phase 1)
- [ ] "Rule-based" label hiển thị đúng
- [ ] Collection rates từ DB được áp dụng
- [ ] FixedCostDefinitionPanel CRUD hoạt động
- [ ] VariableCostEstimatePanel CRUD hoạt động
- [ ] "Định nghĩa chi phí" tab visible

### Week 3 (Phase 2)
- [ ] Sales projection integrated
- [ ] T+14 delay applied correctly
- [ ] EBITDA breakdown shows categories
- [ ] Burn rate tooltip shows methodology

---

## 9. SUCCESS METRICS

| Metric | Before | Target |
|--------|--------|--------|
| DIO Value | 1432 days | ≤365 days |
| AR Labels | Ambiguous | "Quá hạn X ngày" |
| Forecast Label | "AI" | "Theo quy tắc" |
| Expense Source | is_recurring flag | Baselines + Estimates |
| EBITDA Transparency | 1 number | Full breakdown |
| Overdue AP Alert | None | Triggers at 95% |
| Sales in Forecast | None | Integrated with T+14 |

---

## 10. ROLLBACK PLAN

| Phase | Rollback Method |
|-------|-----------------|
| **0A-DIO** | Revert migration |
| **0A-Labels** | Revert hook change |
| **0B-Tables** | DROP TABLE IF EXISTS |
| **1A-Rates** | Remove columns, use defaults |
| **1B-UI** | Remove tab, components |
| **2A-Sales** | Remove hook, revert forecast |
| **2B-EBITDA** | Remove component |
