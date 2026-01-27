
# TRIỂN KHAI PHASE 2: FINANCIAL REPORTS PAGE - 100% SSOT COMPLIANT

## TÌNH TRẠNG HIỆN TẠI

### Vi phạm còn tồn tại trong `FinancialReportsPage.tsx`:

| Line | Vi phạm | Loại |
|------|---------|------|
| 90-92 | `totalCost = cogs + operatingExpenses` | Client-side calculation |
| 93-95 | `netMarginPercent = ((grossProfit - opex) / netRevenue) * 100` | Client-side calculation |
| 96-98 | `overdueARPercent = (overdueAR / totalAR) * 100` | Client-side calculation |
| 103-135 | Hardcoded targets (30, 10, 15, 30, 40) | Magic numbers |
| 138-189 | `keyInsights` logic với thresholds (>=30, <20, >45, <0, >20) | Business logic trong FE |
| 329-330 | `ratio.value >= ratio.target` | Threshold comparison trong UI |
| 334 | `Math.min((ratio.value / ratio.target) * 100, 100)` | Progress calculation trong UI |

### Cần tạo mới trong Database:

| Object | Mục đích |
|--------|----------|
| `financial_ratio_targets` table | Configurable targets thay magic numbers |
| `v_financial_report_kpis` view | Pre-compute total_cost, net_margin, overdue_ar_pct |
| `v_financial_insights` view | Pre-generate insights với status và descriptions |
| `v_financial_ratios_with_targets` view | Join actual values với targets, pre-calculate is_on_target và progress |

---

## PHASE 2.1: DATABASE MIGRATIONS

### 2.1.1 Table: `financial_ratio_targets`

```sql
CREATE TABLE IF NOT EXISTS public.financial_ratio_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  ratio_code TEXT NOT NULL,  -- 'GROSS_MARGIN', 'NET_MARGIN', 'EBITDA_MARGIN', 'DSO', 'CM'
  ratio_name TEXT NOT NULL,  -- 'Bien loi nhuan gop', etc.
  target_value NUMERIC NOT NULL,
  unit TEXT DEFAULT '%',
  
  -- Thresholds for insight generation
  good_threshold NUMERIC,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  comparison_type TEXT DEFAULT 'gte', -- 'gte' (greater is better) or 'lte' (lower is better)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, ratio_code)
);

-- Seed default targets from financial-constants.ts
INSERT INTO financial_ratio_targets (tenant_id, ratio_code, ratio_name, target_value, unit, good_threshold, warning_threshold, critical_threshold, comparison_type)
SELECT 
  t.id,
  v.ratio_code,
  v.ratio_name,
  v.target_value,
  v.unit,
  v.good_threshold,
  v.warning_threshold,
  v.critical_threshold,
  v.comparison_type
FROM tenants t
CROSS JOIN (VALUES
  ('GROSS_MARGIN', 'Bien loi nhuan gop', 30, '%', 35, 25, 15, 'gte'),
  ('NET_MARGIN', 'Bien loi nhuan rong', 10, '%', 10, 5, 0, 'gte'),
  ('EBITDA_MARGIN', 'EBITDA Margin', 15, '%', 15, 10, 5, 'gte'),
  ('DSO', 'DSO', 30, ' ngay', 30, 45, 60, 'lte'),
  ('CM', 'Contribution Margin', 40, '%', 40, 30, 20, 'gte')
) AS v(ratio_code, ratio_name, target_value, unit, good_threshold, warning_threshold, critical_threshold, comparison_type)
ON CONFLICT (tenant_id, ratio_code) DO NOTHING;
```

### 2.1.2 View: `v_financial_report_kpis`

```sql
CREATE OR REPLACE VIEW v_financial_report_kpis AS
SELECT 
  s.tenant_id,
  
  -- From snapshot (already SSOT)
  s.net_revenue,
  s.gross_profit,
  s.gross_margin_percent,
  s.ebitda,
  s.ebitda_margin_percent,
  s.contribution_margin,
  s.contribution_margin_percent,
  s.cash_today,
  s.cash_runway_months,
  s.total_ar,
  s.overdue_ar,
  s.dso,
  
  -- PRE-COMPUTED (replacing FE calculations)
  COALESCE(m.cogs, 0) + COALESCE(m.operating_expenses, 0) AS total_cost,
  
  CASE WHEN s.net_revenue > 0 
    THEN ROUND(((s.gross_profit - COALESCE(m.operating_expenses, 0)) / s.net_revenue * 100)::NUMERIC, 1)
    ELSE 0 
  END AS net_margin_percent,
  
  CASE WHEN s.total_ar > 0 
    THEN ROUND((s.overdue_ar / s.total_ar * 100)::NUMERIC, 1)
    ELSE 0 
  END AS overdue_ar_percent,
  
  -- Growth (from monthly summary MoM)
  m.revenue_mom_change,
  m.revenue_yoy_change,
  
  -- Pre-formatted for display
  ROUND(s.net_revenue / 1000000, 1) AS net_revenue_m,
  ROUND(s.gross_profit / 1000000, 1) AS gross_profit_m,
  ROUND((COALESCE(m.cogs, 0) + COALESCE(m.operating_expenses, 0)) / 1000000, 1) AS total_cost_m,
  ROUND(s.cash_today / 1000000, 1) AS cash_today_m,
  
  s.snapshot_at
  
FROM central_metrics_snapshots s
LEFT JOIN LATERAL (
  SELECT 
    cogs, 
    operating_expenses,
    revenue_mom_change,
    revenue_yoy_change
  FROM finance_monthly_summary 
  WHERE tenant_id = s.tenant_id 
  ORDER BY year_month DESC 
  LIMIT 1
) m ON true
WHERE s.snapshot_at = (
  SELECT MAX(snapshot_at) 
  FROM central_metrics_snapshots 
  WHERE tenant_id = s.tenant_id
);
```

### 2.1.3 View: `v_financial_insights`

```sql
CREATE OR REPLACE VIEW v_financial_insights AS
WITH kpis AS (
  SELECT * FROM v_financial_report_kpis
),
targets AS (
  SELECT * FROM financial_ratio_targets
)
SELECT 
  k.tenant_id,
  
  -- Insight 1: Gross Margin
  CASE 
    WHEN k.gross_margin_percent >= t_gm.good_threshold THEN 'success'
    WHEN k.gross_margin_percent >= t_gm.warning_threshold THEN 'warning'
    ELSE 'danger'
  END AS gross_margin_status,
  CASE 
    WHEN k.gross_margin_percent >= t_gm.good_threshold THEN 'Bien loi nhuan gop tot'
    WHEN k.gross_margin_percent >= t_gm.warning_threshold THEN 'Bien loi nhuan gop can cai thien'
    ELSE 'Bien loi nhuan gop thap'
  END AS gross_margin_title,
  FORMAT('Dat %s%%, %s muc tieu chuẩn %s%%', 
    k.gross_margin_percent::TEXT,
    CASE WHEN k.gross_margin_percent >= t_gm.target_value THEN 'cao hon' ELSE 'thap hon' END,
    t_gm.target_value::TEXT
  ) AS gross_margin_description,
  k.gross_margin_percent >= t_gm.good_threshold AS gross_margin_show,
  
  -- Insight 2: DSO
  CASE 
    WHEN k.dso <= t_dso.good_threshold THEN 'success'
    WHEN k.dso <= t_dso.warning_threshold THEN 'warning'
    ELSE 'danger'
  END AS dso_status,
  CASE 
    WHEN k.dso > t_dso.warning_threshold THEN 'DSO cao'
    ELSE NULL
  END AS dso_title,
  CASE 
    WHEN k.dso > t_dso.warning_threshold 
    THEN FORMAT('DSO %s ngay, tien bi ket trong cong no', k.dso::INTEGER::TEXT)
    ELSE NULL
  END AS dso_description,
  k.dso > t_dso.warning_threshold AS dso_show,
  
  -- Insight 3: Net Margin
  CASE 
    WHEN k.net_margin_percent < 0 THEN 'danger'
    WHEN k.net_margin_percent < t_nm.warning_threshold THEN 'warning'
    ELSE 'success'
  END AS net_margin_status,
  CASE 
    WHEN k.net_margin_percent < 0 THEN 'Lo rong'
    ELSE NULL
  END AS net_margin_title,
  CASE 
    WHEN k.net_margin_percent < 0 
    THEN FORMAT('Bien loi nhuan rong %s%%', k.net_margin_percent::TEXT)
    ELSE NULL
  END AS net_margin_description,
  k.net_margin_percent < 0 AS net_margin_show,
  
  -- Insight 4: Overdue AR
  CASE 
    WHEN k.overdue_ar_percent > 20 THEN 'warning'
    ELSE 'success'
  END AS ar_status,
  CASE 
    WHEN k.overdue_ar_percent > 20 THEN 'Cong no qua han cao'
    ELSE NULL
  END AS ar_title,
  CASE 
    WHEN k.overdue_ar_percent > 20 
    THEN FORMAT('%s%% AR dang qua han', k.overdue_ar_percent::TEXT)
    ELSE NULL
  END AS ar_description,
  k.overdue_ar_percent > 20 AS ar_show,
  
  -- Insight 5: Cash Health
  CASE 
    WHEN k.cash_today > k.net_revenue * 0.5 THEN 'success'
    ELSE NULL
  END AS cash_status,
  CASE 
    WHEN k.cash_today > k.net_revenue * 0.5 THEN 'Tinh hinh tien mat khoe'
    ELSE NULL
  END AS cash_title,
  CASE 
    WHEN k.cash_today > k.net_revenue * 0.5 
    THEN FORMAT('Cash buffer doi dao: %s trieu', k.cash_today_m::TEXT)
    ELSE NULL
  END AS cash_description,
  k.cash_today > k.net_revenue * 0.5 AS cash_show
  
FROM kpis k
LEFT JOIN targets t_gm ON k.tenant_id = t_gm.tenant_id AND t_gm.ratio_code = 'GROSS_MARGIN'
LEFT JOIN targets t_dso ON k.tenant_id = t_dso.tenant_id AND t_dso.ratio_code = 'DSO'
LEFT JOIN targets t_nm ON k.tenant_id = t_nm.tenant_id AND t_nm.ratio_code = 'NET_MARGIN';
```

### 2.1.4 View: `v_financial_ratios_with_targets`

```sql
CREATE OR REPLACE VIEW v_financial_ratios_with_targets AS
SELECT 
  k.tenant_id,
  t.ratio_code,
  t.ratio_name,
  t.target_value,
  t.unit,
  t.comparison_type,
  
  -- Actual value from KPIs
  CASE t.ratio_code
    WHEN 'GROSS_MARGIN' THEN k.gross_margin_percent
    WHEN 'NET_MARGIN' THEN k.net_margin_percent
    WHEN 'EBITDA_MARGIN' THEN k.ebitda_margin_percent
    WHEN 'DSO' THEN k.dso
    WHEN 'CM' THEN k.contribution_margin_percent
  END AS actual_value,
  
  -- PRE-COMPUTED: is_on_target
  CASE 
    WHEN t.comparison_type = 'gte' AND (
      CASE t.ratio_code
        WHEN 'GROSS_MARGIN' THEN k.gross_margin_percent
        WHEN 'NET_MARGIN' THEN k.net_margin_percent
        WHEN 'EBITDA_MARGIN' THEN k.ebitda_margin_percent
        WHEN 'CM' THEN k.contribution_margin_percent
        ELSE 0
      END
    ) >= t.target_value THEN true
    WHEN t.comparison_type = 'lte' AND k.dso <= t.target_value THEN true
    ELSE false
  END AS is_on_target,
  
  -- PRE-COMPUTED: progress (capped at 100)
  LEAST(
    ROUND(
      CASE t.comparison_type
        WHEN 'gte' THEN (
          CASE t.ratio_code
            WHEN 'GROSS_MARGIN' THEN k.gross_margin_percent
            WHEN 'NET_MARGIN' THEN k.net_margin_percent
            WHEN 'EBITDA_MARGIN' THEN k.ebitda_margin_percent
            WHEN 'CM' THEN k.contribution_margin_percent
            ELSE 0
          END / NULLIF(t.target_value, 0) * 100
        )
        WHEN 'lte' THEN (
          t.target_value / NULLIF(k.dso, 0) * 100
        )
        ELSE 0
      END::NUMERIC, 0
    ),
    100
  ) AS progress_percent
  
FROM v_financial_report_kpis k
JOIN financial_ratio_targets t ON k.tenant_id = t.tenant_id;
```

---

## PHASE 2.2: HOOK LAYER (THIN WRAPPER)

### 2.2.1 Tạo `src/hooks/useFinancialReportData.ts`

```typescript
/**
 * useFinancialReportData - SSOT-Compliant Financial Report Hook
 * 
 * ZERO calculations - fetch precomputed data only
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface FinancialKPIs {
  netRevenue: number;
  netRevenueM: number;
  grossProfit: number;
  grossProfitM: number;
  grossMarginPercent: number;
  totalCost: number;
  totalCostM: number;
  netMarginPercent: number;
  ebitdaMarginPercent: number;
  contributionMarginPercent: number;
  cashToday: number;
  cashTodayM: number;
  cashRunwayMonths: number;
  dso: number;
  totalAR: number;
  overdueAR: number;
  overdueARPercent: number;
  revenueMomChange: number | null;
  revenueYoyChange: number | null;
  snapshotAt: string;
}

export interface FinancialInsight {
  type: 'success' | 'warning' | 'danger';
  title: string;
  description: string;
}

export interface FinancialRatio {
  ratioCode: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  isOnTarget: boolean;
  progress: number;
}

export function useFinancialReportData() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  return useQuery({
    queryKey: ['financial-report-ssot', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const [kpisRes, insightsRes, ratiosRes] = await Promise.all([
        // 1. KPIs with precomputed values
        supabase
          .from('v_financial_report_kpis')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        
        // 2. Pre-generated insights
        supabase
          .from('v_financial_insights')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        
        // 3. Ratios with targets (pre-computed progress)
        supabase
          .from('v_financial_ratios_with_targets')
          .select('*')
          .eq('tenant_id', tenantId),
      ]);

      // Map KPIs - DIRECT mapping, NO calculations
      const kpis: FinancialKPIs | null = kpisRes.data ? {
        netRevenue: Number(kpisRes.data.net_revenue) || 0,
        netRevenueM: Number(kpisRes.data.net_revenue_m) || 0,
        grossProfit: Number(kpisRes.data.gross_profit) || 0,
        grossProfitM: Number(kpisRes.data.gross_profit_m) || 0,
        grossMarginPercent: Number(kpisRes.data.gross_margin_percent) || 0,
        totalCost: Number(kpisRes.data.total_cost) || 0,
        totalCostM: Number(kpisRes.data.total_cost_m) || 0,
        netMarginPercent: Number(kpisRes.data.net_margin_percent) || 0,
        ebitdaMarginPercent: Number(kpisRes.data.ebitda_margin_percent) || 0,
        contributionMarginPercent: Number(kpisRes.data.contribution_margin_percent) || 0,
        cashToday: Number(kpisRes.data.cash_today) || 0,
        cashTodayM: Number(kpisRes.data.cash_today_m) || 0,
        cashRunwayMonths: Number(kpisRes.data.cash_runway_months) || 0,
        dso: Number(kpisRes.data.dso) || 0,
        totalAR: Number(kpisRes.data.total_ar) || 0,
        overdueAR: Number(kpisRes.data.overdue_ar) || 0,
        overdueARPercent: Number(kpisRes.data.overdue_ar_percent) || 0,
        revenueMomChange: kpisRes.data.revenue_mom_change,
        revenueYoyChange: kpisRes.data.revenue_yoy_change,
        snapshotAt: kpisRes.data.snapshot_at,
      } : null;

      // Map Insights - filter only those with show=true
      const insights: FinancialInsight[] = [];
      if (insightsRes.data) {
        const i = insightsRes.data;
        if (i.gross_margin_show && i.gross_margin_title) {
          insights.push({ type: i.gross_margin_status, title: i.gross_margin_title, description: i.gross_margin_description });
        }
        if (i.dso_show && i.dso_title) {
          insights.push({ type: i.dso_status, title: i.dso_title, description: i.dso_description });
        }
        if (i.net_margin_show && i.net_margin_title) {
          insights.push({ type: i.net_margin_status, title: i.net_margin_title, description: i.net_margin_description });
        }
        if (i.ar_show && i.ar_title) {
          insights.push({ type: i.ar_status, title: i.ar_title, description: i.ar_description });
        }
        if (i.cash_show && i.cash_title) {
          insights.push({ type: i.cash_status, title: i.cash_title, description: i.cash_description });
        }
      }

      // Map Ratios - DIRECT mapping
      const ratios: FinancialRatio[] = (ratiosRes.data || []).map(r => ({
        ratioCode: r.ratio_code,
        name: r.ratio_name,
        value: Number(r.actual_value) || 0,
        target: Number(r.target_value) || 0,
        unit: r.unit || '%',
        isOnTarget: Boolean(r.is_on_target),
        progress: Number(r.progress_percent) || 0,
      }));

      return { kpis, insights, ratios };
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
```

---

## PHASE 2.3: UI LAYER (DISPLAY ONLY)

### Refactor `FinancialReportsPage.tsx`

**Xóa hoàn toàn:**
- Lines 90-98: `totalCost`, `netMarginPercent`, `overdueARPercent` calculations
- Lines 101-135: `financialRatios` useMemo với hardcoded targets
- Lines 138-189: `keyInsights` useMemo với threshold logic

**Thay thế bằng:**
```typescript
import { useFinancialReportData } from '@/hooks/useFinancialReportData';

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState('analytics');
  const { data, isLoading } = useFinancialReportData();
  const { data: monthlySummary } = useFinanceMonthlySummary({ months: 12 });

  // NO calculations - all values from hook
  const kpis = data?.kpis;
  const insights = data?.insights || [];
  const ratios = data?.ratios || [];

  // Chart data mapping only
  const monthlyChartData = useMemo(() => {
    if (!monthlySummary || monthlySummary.length === 0) return [];
    return monthlySummary.map(m => ({
      month: m.yearMonth,
      revenue: m.netRevenue,
      profit: m.grossProfit,
      cogs: m.cogs,
    }));
  }, [monthlySummary]);

  return (
    <>
      {/* Hero KPIs - direct from kpis object */}
      <Card>
        <p>{kpis?.netRevenueM} trieu</p>
        {kpis?.revenueMomChange && (
          <p className="text-success">+{kpis.revenueMomChange.toFixed(1)}% MoM</p>
        )}
      </Card>

      <Card>
        <p>{kpis?.totalCostM} trieu</p>  {/* Pre-computed in DB */}
      </Card>

      {/* Insights - pre-generated from DB */}
      {insights.map((insight, idx) => (
        <InsightCard key={idx}
          type={insight.type}  // 'success'|'warning'|'danger' from DB
          title={insight.title}
          description={insight.description}
        />
      ))}

      {/* Ratios - all pre-computed */}
      {ratios.map((ratio) => (
        <Card key={ratio.ratioCode}>
          <Badge variant={ratio.isOnTarget ? 'default' : 'secondary'}>
            {ratio.isOnTarget ? 'Dat' : 'Chua dat'}  {/* Boolean from DB */}
          </Badge>
          <Progress value={ratio.progress} />  {/* Pre-calculated, capped at 100 */}
        </Card>
      ))}
    </>
  );
}
```

---

## CHECKLIST TUÂN THỦ SAU KHI HOÀN THÀNH

| Yêu cầu | Trước | Sau |
|---------|-------|-----|
| Client-side calculations | 3 (lines 90-98) | 0 |
| Magic numbers | 5 (30, 10, 15, 30, 40) | 0 (from DB table) |
| Business logic trong FE | keyInsights useMemo | 0 (in v_financial_insights) |
| Progress calculations | Math.min(...) | 0 (pre-computed) |
| Threshold comparisons | >= checks | 0 (is_on_target from DB) |

---

## FILES THAY ĐỔI

| File | Action |
|------|--------|
| `supabase/migrations/xxx.sql` | Create table + 3 views |
| `src/hooks/useFinancialReportData.ts` | Create (thin wrapper) |
| `src/pages/FinancialReportsPage.tsx` | Refactor (remove all calculations) |
| `src/integrations/supabase/types.ts` | Auto-updated |

---

## THỜI GIAN ƯỚC TÍNH

| Phase | Tasks | Effort |
|-------|-------|--------|
| 2.1 | Database migrations | ~15 phút |
| 2.2 | Hook implementation | ~10 phút |
| 2.3 | UI refactoring | ~15 phút |
| **Total** | | **~40 phút** |
