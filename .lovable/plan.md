
# KE HOACH FIX: Rolling Forecast Page

## VAN DE PHAT HIEN

### 1. ❌ DUPLICATE KPI CARDS (UI BUG)
Trang hien tai hien thi **6 KPI cards** thay vi 4:
- Lines 126-153: Card "Chênh lệch vs Ngân sách" + "Độ chính xác dự báo"
- Lines 176-226: **DUPLICATE** cua 2 cards nay (copy-paste)

**Screenshot:** Cho thay dung 6 cards: Revenue, Expense, Variance (x2), Accuracy (x2)

### 2. ⚠️ DUPLICATE DATA IN DATABASE
Query cho thay **36 rows** per forecast_type cho Demo Company (nen la 18):
- 18 months × 2 duplicates = 36 rows
- Nguyen nhan: Constraint `tenant_id,forecast_month,forecast_type,category,channel` cho phep duplicates khi `category` va `channel` la NULL (so sanh NULL = NULL luon tra ve false)

### 3. ⚠️ CLIENT-SIDE AGGREGATION (SSOT VIOLATION)
`useRollingForecastSummary()` thuc hien **10+ calculations** trong frontend:
- Lines 79-93: forEach loop tinh totals
- Lines 97-105: Accuracy calculation voi `.reduce()` va `.filter()`
- Lines 107-127: Group by month voi `Map()`

**Vi pham DB-First:** Tat ca aggregations nen o database view.

### 4. ⚠️ MAGIC NUMBERS TRONG FORECAST GENERATION
`useGenerateRollingForecast()` su dung hardcoded values:
- Line 188: `100000000` (Default 100M VND/month)
- Line 194: `80000000` (Default 80M VND/month)
- Line 199: `0.02` (2% monthly growth)
- Line 214: `0.015` (1.5% expense growth)

### 5. ⚠️ MISSING TENANT_ID FILTER
Query trong `useRollingForecasts()` thieu `.eq('tenant_id', tenantId)` filter.

---

## FIX PLAN

### Phase 1: FIX UI (DUPLICATE CARDS) - ~5 phut

**File:** `src/pages/RollingForecastPage.tsx`

**Xoa duplicate cards (lines 176-226):**
```tsx
// XOA: Lines 176-226 (duplicate of lines 126-175)
```

**Grid layout sau fix:**
```tsx
<div className="grid gap-4 md:grid-cols-4">
  {/* Card 1: Total Revenue */}
  {/* Card 2: Total Expense */}
  {/* Card 3: Variance */}
  {/* Card 4: Accuracy */}
</div>
```

### Phase 2: FIX DATABASE CONSTRAINT - ~10 phut

**Problem:** NULL columns trong unique constraint khong ngan duplicate.

**Migration:**

```sql
-- Fix unique constraint to handle NULLs
DROP INDEX IF EXISTS rolling_forecasts_unique_idx;

CREATE UNIQUE INDEX rolling_forecasts_unique_idx 
ON rolling_forecasts (
  tenant_id, 
  forecast_month, 
  forecast_type, 
  COALESCE(category, ''), 
  COALESCE(channel, '')
);

-- Clean up existing duplicates
DELETE FROM rolling_forecasts a
USING rolling_forecasts b
WHERE a.ctid < b.ctid
  AND a.tenant_id = b.tenant_id
  AND a.forecast_month = b.forecast_month
  AND a.forecast_type = b.forecast_type
  AND COALESCE(a.category, '') = COALESCE(b.category, '')
  AND COALESCE(a.channel, '') = COALESCE(b.channel, '');
```

### Phase 3: FIX TENANT_ID FILTER - ~5 phut

**File:** `src/hooks/useRollingForecast.ts`

**Update `useRollingForecasts()`:**
```typescript
// Line 45-48: Them tenant_id filter
const { data, error } = await supabase
  .from('rolling_forecasts')
  .select('*')
  .eq('tenant_id', tenantId)  // <-- ADD THIS
  .order('forecast_month', { ascending: true });
```

### Phase 4: DB-FIRST AGGREGATION (Defer) - ~30 phut

**Tao view:** `v_rolling_forecast_summary`

```sql
CREATE VIEW v_rolling_forecast_summary AS
WITH aggregates AS (
  SELECT 
    tenant_id,
    forecast_type,
    SUM(original_budget) as total_budget,
    SUM(current_forecast) as total_forecast,
    SUM(actual_amount) as total_actual,
    SUM(variance_amount) as total_variance
  FROM rolling_forecasts
  GROUP BY tenant_id, forecast_type
),
by_month AS (
  SELECT 
    tenant_id,
    forecast_month,
    SUM(CASE WHEN forecast_type IN ('revenue', 'cash_inflow') 
        THEN current_forecast ELSE 0 END) as revenue,
    SUM(CASE WHEN forecast_type IN ('expense', 'cash_outflow') 
        THEN current_forecast ELSE 0 END) as expense
  FROM rolling_forecasts
  GROUP BY tenant_id, forecast_month
),
accuracy AS (
  SELECT 
    tenant_id,
    CASE 
      WHEN COUNT(*) FILTER (WHERE actual_amount > 0) > 0 THEN
        AVG(
          GREATEST(0, 1 - ABS(current_forecast - actual_amount) / NULLIF(actual_amount, 0)) * 100
        ) FILTER (WHERE actual_amount > 0)
      ELSE 0 
    END as forecast_accuracy
  FROM rolling_forecasts
  GROUP BY tenant_id
)
SELECT 
  a.tenant_id,
  MAX(CASE WHEN a.forecast_type = 'revenue' THEN a.total_forecast END) as total_revenue_forecast,
  MAX(CASE WHEN a.forecast_type = 'expense' THEN a.total_forecast END) as total_expense_forecast,
  SUM(a.total_variance) as total_variance,
  acc.forecast_accuracy,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'month', m.forecast_month,
      'revenue', m.revenue,
      'expense', m.expense,
      'netCash', m.revenue - m.expense
    ) ORDER BY m.forecast_month
  ) as by_month_data
FROM aggregates a
JOIN accuracy acc ON a.tenant_id = acc.tenant_id
LEFT JOIN by_month m ON a.tenant_id = m.tenant_id
GROUP BY a.tenant_id, acc.forecast_accuracy;
```

**Update hook to thin wrapper:**
```typescript
export function useRollingForecastSummary() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['rolling-forecast-summary', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_rolling_forecast_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      // Direct mapping - NO calculations
      return {
        totalBudget: data?.total_revenue_forecast || 0,
        totalForecast: data?.total_revenue_forecast || 0,
        totalVariance: data?.total_variance || 0,
        forecastAccuracy: data?.forecast_accuracy || 0,
        byType: {
          revenue: { forecast: data?.total_revenue_forecast || 0 },
          expense: { forecast: data?.total_expense_forecast || 0 },
        },
        byMonth: data?.by_month_data || [],
      };
    },
    enabled: !!tenantId,
  });
}
```

### Phase 5: MOVE MAGIC NUMBERS TO CONFIG (Optional) - ~15 phut

**Tao table:** `forecast_config`

```sql
CREATE TABLE forecast_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  default_monthly_revenue NUMERIC DEFAULT 100000000,
  default_monthly_expense NUMERIC DEFAULT 80000000,
  revenue_growth_rate NUMERIC DEFAULT 0.02,
  expense_growth_rate NUMERIC DEFAULT 0.015,
  high_confidence_months INT DEFAULT 3,
  medium_confidence_months INT DEFAULT 9
);
```

---

## THU TU UU TIEN

| Phase | Priority | Effort | Van de |
|-------|----------|--------|--------|
| 1 | 🔴 HIGH | 5 min | UI bug - duplicate cards |
| 3 | 🔴 HIGH | 5 min | Wrong tenant data |
| 2 | 🟠 MEDIUM | 10 min | Database duplicates |
| 4 | 🟡 LOW | 30 min | SSOT compliance |
| 5 | 🟢 OPTIONAL | 15 min | Config table |

---

## FILES THAY DOI

| File | Action |
|------|--------|
| `src/pages/RollingForecastPage.tsx` | Xoa duplicate cards (lines 176-226) |
| `src/hooks/useRollingForecast.ts` | Them tenant_id filter |
| `supabase/migrations/xxx.sql` | Fix unique constraint + cleanup duplicates |
| `supabase/migrations/xxx.sql` | Create `v_rolling_forecast_summary` view (Phase 4) |

---

## TAC DONG SAU FIX

| Metric | Truoc | Sau |
|--------|-------|-----|
| KPI Cards | 6 (duplicate) | 4 (correct) |
| Data accuracy | Wrong tenant mixed | Correct tenant only |
| DB duplicates | 36 rows/type | 18 rows/type |
| Client calculations | 10+ | 0 (DB-First) |
