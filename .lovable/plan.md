
# KE HOACH TONG THE: FIX TAT CA VI PHAM SSOT/DB-FIRST

## TONG QUAN VI PHAM HIEN TAI

| Trang | Muc do | Vi pham chinh |
|-------|--------|---------------|
| ExecutiveSummaryPage | 🔴 CRITICAL | 6 health scores tinh trong FE voi magic numbers (×15, ×2.5, ×4) |
| VarianceAnalysisContent | 🟠 MEDIUM | `variancePct` va `isFavorable()` logic trong FE |
| CashConversionCyclePage | 🟠 MEDIUM | `cccStatus` voi multiplier `* 1.5` trong FE |
| AROperations | 🟡 MINOR | Inline `overdueARPercent` calculation |
| WorkingCapitalPage | 🟡 MINOR | Hardcoded targets (30, 45) trong component |
| ExpensesPage | 🟡 MINOR | `expenseChange` percentage calculation |

---

## PHASE 3: EXECUTIVE SUMMARY PAGE (CRITICAL)

### 3.1 Database Migration

**Table: `health_score_formulas`**
Luu tru cong thuc tinh health scores, thay the HEALTH_FORMULAS object trong FE.

```sql
CREATE TABLE health_score_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  dimension_code TEXT NOT NULL,  -- 'liquidity', 'receivables', etc.
  dimension_name TEXT NOT NULL,  -- 'Thanh khoan', 'Cong no phai thu'
  
  -- Formula parameters
  multiplier NUMERIC NOT NULL,          -- 15, 2.5, 4, etc.
  base_metric TEXT NOT NULL,            -- 'cash_runway_months', 'dso', 'gross_margin'
  formula_type TEXT NOT NULL,           -- 'multiply', 'subtract', 'direct'
  offset_value NUMERIC DEFAULT 0,       -- For DSO: 100 - (dso - 30) * 2
  
  -- Thresholds
  good_threshold NUMERIC NOT NULL,      -- >= 70
  warning_threshold NUMERIC NOT NULL,   -- >= 50
  
  -- Display
  description_template TEXT,            -- 'Cash runway: {value} thang'
  
  UNIQUE(tenant_id, dimension_code)
);
```

**View: `v_executive_health_scores`**
Pre-compute tat ca 6 health scores tu DB.

```sql
CREATE VIEW v_executive_health_scores AS
WITH metrics AS (
  SELECT 
    s.tenant_id,
    s.cash_runway_months,
    s.dso,
    s.gross_margin_percent,
    s.ccc,
    s.ebitda_margin_percent,
    -- Growth: from monthly summary YoY
    COALESCE(m.revenue_yoy_change, 0) as revenue_yoy
  FROM central_metrics_snapshots s
  LEFT JOIN finance_monthly_summary m ON s.tenant_id = m.tenant_id
  WHERE s.snapshot_at = (SELECT MAX(snapshot_at) FROM central_metrics_snapshots WHERE tenant_id = s.tenant_id)
)
SELECT 
  m.tenant_id,
  
  -- Liquidity: min(100, runway * 15)
  LEAST(100, m.cash_runway_months * 15) as liquidity_score,
  CASE WHEN LEAST(100, m.cash_runway_months * 15) >= 70 THEN 'good'
       WHEN LEAST(100, m.cash_runway_months * 15) >= 50 THEN 'warning'
       ELSE 'critical' END as liquidity_status,
  FORMAT('Cash runway: %s thang', m.cash_runway_months) as liquidity_description,
  
  -- Receivables: max(0, 100 - (dso - 30) * 2)
  GREATEST(0, 100 - (m.dso - 30) * 2) as receivables_score,
  CASE WHEN GREATEST(0, 100 - (m.dso - 30) * 2) >= 70 THEN 'good'
       WHEN GREATEST(0, 100 - (m.dso - 30) * 2) >= 50 THEN 'warning'
       ELSE 'critical' END as receivables_status,
  FORMAT('DSO: %s ngay', m.dso) as receivables_description,
  
  -- Profitability: min(100, gross_margin * 2.5)
  LEAST(100, m.gross_margin_percent * 2.5) as profitability_score,
  ...
  
  -- Efficiency: max(0, 100 - ccc)
  GREATEST(0, 100 - m.ccc) as efficiency_score,
  ...
  
  -- Growth: based on YoY
  LEAST(100, GREATEST(0, m.revenue_yoy + 50)) as growth_score,
  ...
  
  -- Stability: min(100, ebitda_margin * 4)
  LEAST(100, m.ebitda_margin_percent * 4) as stability_score,
  ...
  
  -- Overall score (pre-computed average)
  ROUND((liquidity_score + receivables_score + profitability_score + 
         efficiency_score + growth_score + stability_score) / 6) as overall_score,
  
  -- Counts
  (SELECT COUNT(*) FROM ... WHERE status = 'good') as good_count,
  (SELECT COUNT(*) FROM ... WHERE status = 'warning') as warning_count,
  (SELECT COUNT(*) FROM ... WHERE status = 'critical') as critical_count

FROM metrics m;
```

### 3.2 Hook Layer

**File: `src/hooks/useExecutiveHealthScores.ts`**

```typescript
// ZERO calculations - fetch precomputed only
export function useExecutiveHealthScores() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['executive-health-scores', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_executive_health_scores')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      // Direct mapping - NO calculations
      return {
        dimensions: [
          { dimension: 'Thanh khoan', score: data.liquidity_score, status: data.liquidity_status, description: data.liquidity_description },
          { dimension: 'Cong no', score: data.receivables_score, status: data.receivables_status, description: data.receivables_description },
          // ... 4 more dimensions
        ],
        overallScore: data.overall_score,
        goodCount: data.good_count,
        warningCount: data.warning_count,
        criticalCount: data.critical_count,
      };
    },
  });
}
```

### 3.3 UI Refactoring

**File: `ExecutiveSummaryPage.tsx`**

Xoa:
- Lines 56-106: `HEALTH_FORMULAS` object
- Lines 183-271: `calculateDimensions()` function voi magic numbers
- Lines 273-279: `getOverallStatus()` function

Thay bang:
```typescript
const { data: healthData } = useExecutiveHealthScores();

// Direct render - NO calculations
<RadarChart data={healthData?.dimensions} />
<span>{healthData?.overallScore} diem</span>
<div>{healthData?.goodCount} chi so tot</div>
```

---

## PHASE 4: VARIANCE ANALYSIS (MEDIUM)

### 4.1 Database Changes

**Update View: `v_variance_summary`**
Pre-compute `variancePct` va `isFavorable` trong SQL.

```sql
CREATE VIEW v_variance_with_status AS
SELECT 
  *,
  -- Pre-compute variance percentage
  CASE WHEN budget_amount != 0 
    THEN ROUND((variance_to_budget / budget_amount * 100)::NUMERIC, 1)
    ELSE 0 
  END as variance_pct,
  
  -- Pre-compute favorable status
  CASE 
    WHEN category = 'revenue' AND variance_to_budget >= 0 THEN true
    WHEN category != 'revenue' AND variance_to_budget <= 0 THEN true
    ELSE false
  END as is_favorable

FROM variance_analysis;
```

### 4.2 Hook Update

**File: `useVarianceAnalysis.ts`**

Xoa:
- Lines 49: `variancePct` calculation trong `categoryChartData`
- Lines 52-57: `isFavorable()` function

Thay bang:
```typescript
// Data already contains is_favorable and variance_pct from view
const chartData = data.map(v => ({
  ...v,
  variancePct: v.variance_pct,      // From DB
  isFavorable: v.is_favorable,       // From DB
}));
```

### 4.3 UI Update

**File: `VarianceAnalysisContent.tsx`**

Xoa:
- Lines 52-57: `isFavorable()` function

Thay bang:
```typescript
// Use pre-computed is_favorable from data
const favorable = v.is_favorable;  // Boolean from DB
```

---

## PHASE 5: CASH CONVERSION CYCLE (MEDIUM)

### 5.1 Database Changes

**Update View hoac Table: `working_capital_targets`**
Luu CCC thresholds co the cau hinh.

```sql
CREATE TABLE working_capital_targets (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  dso_target NUMERIC DEFAULT 30,
  dpo_target NUMERIC DEFAULT 45,
  dio_target NUMERIC DEFAULT 45,
  ccc_good_multiplier NUMERIC DEFAULT 1.0,      -- <= benchmark
  ccc_warning_multiplier NUMERIC DEFAULT 1.5,   -- <= benchmark * 1.5
  -- > warning = danger
);
```

**Update View: Add CCC status**

```sql
CREATE VIEW v_ccc_with_status AS
SELECT 
  wc.*,
  t.ccc_good_multiplier,
  t.ccc_warning_multiplier,
  
  -- Pre-compute CCC status
  CASE 
    WHEN wc.ccc_days <= t.ccc_benchmark THEN 'good'
    WHEN wc.ccc_days <= t.ccc_benchmark * t.ccc_warning_multiplier THEN 'warning'
    ELSE 'danger'
  END as ccc_status,
  
  -- Pre-compute improvement delta
  wc.ccc_days - t.ccc_benchmark as ccc_improvement

FROM working_capital_metrics wc
JOIN working_capital_targets t ON wc.tenant_id = t.tenant_id;
```

### 5.2 UI Update

**File: `CashConversionCyclePage.tsx`**

Xoa:
- Line 70: `cccStatus = data.ccc <= data.industryBenchmark.ccc ? 'good' : data.ccc <= data.industryBenchmark.ccc * 1.5 ? 'warning' : 'danger'`
- Line 71: `cccImprovement = data.ccc - data.industryBenchmark.ccc`

Thay bang:
```typescript
// Use pre-computed values from hook
const cccStatus = data.cccStatus;        // 'good' | 'warning' | 'danger' from DB
const cccImprovement = data.cccImprovement;  // Number from DB
```

---

## PHASE 6: AR OPERATIONS (MINOR)

### 6.1 Update Snapshot View

**Add to `central_metrics_snapshots` hoac view:**

```sql
-- In compute_central_metrics_snapshot RPC
overdue_ar_percent := CASE WHEN total_ar > 0 
  THEN ROUND((overdue_ar / total_ar * 100)::NUMERIC, 1)
  ELSE 0 END;
```

### 6.2 UI Update

**File: `AROperations.tsx`**

Xoa:
- Line 310: `${((kpi.overdueAR / kpi.totalAR) * 100).toFixed(1)}%`
- Line 317-319: DSO comparison with hardcoded 45

Thay bang:
```typescript
// Use pre-computed from snapshot
subtitle={kpi.totalAR > 0 ? `${snapshot.overdueARPercent}% ${t('ar.ofTotalAR')}` : undefined}

// Use target from DB
trend={kpi.totalAR > 0 ? { value: kpi.dso - snapshot.dsoTarget, label: `vs target ${snapshot.dsoTarget}d` } : undefined}
```

---

## PHASE 7: WORKING CAPITAL PAGE (MINOR)

### 7.1 Database: Targets Table

Da co trong Phase 5 (`working_capital_targets`). Them seed data:

```sql
INSERT INTO working_capital_targets (tenant_id, dso_target, dpo_target, dio_target)
SELECT id, 30, 45, 45 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
```

### 7.2 UI Update

**File: `WorkingCapitalPage.tsx`**

Xoa:
- Lines 48-51: Hardcoded targets `target: current?.target_dso || 30`
- Lines 57-71: `cccChartData` voi hardcoded targets

Thay bang:
```typescript
// Use targets from summary (pre-fetched from DB)
const cccData = [
  { name: 'DSO', days: current?.dso_days, target: summary?.targets?.dso },
  { name: 'DIO', days: current?.dio_days, target: summary?.targets?.dio },
  { name: 'DPO', days: current?.dpo_days, target: summary?.targets?.dpo },
];
```

---

## PHASE 8: EXPENSES PAGE (MINOR)

### 8.1 Update Hook

**File: `useExpensesSummary`** - Them `expenseChange` pre-computed.

```sql
-- In v_expenses_summary view
expense_change_percent := CASE WHEN prior_period > 0 
  THEN ROUND(((current_period - prior_period) / prior_period * 100)::NUMERIC, 1)
  ELSE 0 END;
```

### 8.2 UI Update

**File: `ExpensesPage.tsx`**

Xoa:
- Lines 120-128: `prevPeriodExpenses` va `expenseChange` calculation

Thay bang:
```typescript
// Use pre-computed from summary
const expenseChange = expensesSummary?.expenseChangePercent || 0;
```

---

## FILES THAY DOI TONG KET

| Phase | File | Action |
|-------|------|--------|
| 3 | `supabase/migrations/xxx.sql` | Create `health_score_formulas` + `v_executive_health_scores` |
| 3 | `src/hooks/useExecutiveHealthScores.ts` | Create (thin wrapper) |
| 3 | `src/pages/ExecutiveSummaryPage.tsx` | Refactor (remove 200+ lines) |
| 4 | `supabase/migrations/xxx.sql` | Update variance views |
| 4 | `src/hooks/useVarianceAnalysis.ts` | Remove `isFavorable()` |
| 4 | `src/components/performance/VarianceAnalysisContent.tsx` | Use `is_favorable` from DB |
| 5 | `supabase/migrations/xxx.sql` | Create `working_capital_targets` + view |
| 5 | `src/pages/CashConversionCyclePage.tsx` | Use `cccStatus` from DB |
| 6 | `supabase/migrations/xxx.sql` | Add `overdue_ar_percent` to snapshot |
| 6 | `src/pages/AROperations.tsx` | Use pre-computed percentage |
| 7 | `src/pages/WorkingCapitalPage.tsx` | Use targets from DB |
| 8 | `src/pages/ExpensesPage.tsx` | Use `expenseChangePercent` from DB |

---

## CHECKLIST TUAN THU SAU HOAN THANH

| Metric | Truoc | Sau |
|--------|-------|-----|
| Client-side calculations | 15+ | 0 |
| Magic numbers | 20+ (×15, ×2.5, 30, 45, 1.5) | 0 (all in DB) |
| Threshold comparisons trong FE | 10+ | 0 |
| `isFavorable()` trong FE | 2 | 0 |
| Hardcoded targets | 8+ | 0 (from `*_targets` tables) |

---

## THOI GIAN UOC TINH

| Phase | Effort |
|-------|--------|
| Phase 3: Executive Summary | ~45 phut |
| Phase 4: Variance Analysis | ~20 phut |
| Phase 5: CCC Page | ~25 phut |
| Phase 6: AR Operations | ~10 phut |
| Phase 7: Working Capital | ~10 phut |
| Phase 8: Expenses | ~10 phut |
| **Tong** | **~2 gio** |

---

## THU TU THUC HIEN

1. **Phase 3** (Critical) - Executive Summary: Uu tien cao nhat vi co nhieu magic numbers va business logic
2. **Phase 5** (Medium) - CCC: Tao `working_capital_targets` table dung chung
3. **Phase 4** (Medium) - Variance: Nhanh vi chi can update view
4. **Phases 6-8** (Minor) - Chay song song vi doc lap

