# SSOT Compliance Guide

## Database Governance Layer

Bluecore follows a strict **DB-First** architecture where all business calculations happen in PostgreSQL, not in React.

### Core Principle

```
Hooks = Thin Wrappers
DB Views = Source of Truth
```

### Violation Patterns (FORBIDDEN)

```typescript
// ❌ WRONG: Client-side aggregation
const total = data.reduce((sum, item) => sum + item.amount, 0);

// ❌ WRONG: Filter-reduce chains
const filtered = orders.filter(o => o.status === 'delivered')
                       .reduce((sum, o) => sum + o.amount, 0);

// ❌ WRONG: Silent defaults
const cogs = revenue * 0.55; // No warning to user

// ❌ WRONG: Percentage calculations
const marginPercent = (profit / revenue) * 100;
```

### Correct Patterns (REQUIRED)

```typescript
// ✅ CORRECT: Fetch from precomputed view
const { data } = await supabase
  .from('v_fdp_finance_summary')
  .select('gross_profit, gross_margin_percent')
  .eq('tenant_id', tenantId);

// ✅ CORRECT: Map DB columns to interface (no calculations)
return {
  grossProfit: Number(data.gross_profit) || 0,
  grossMarginPercent: Number(data.gross_margin_percent) || 0,
};

// ✅ CORRECT: Mark estimates explicitly
if (!hasRealCOGS) {
  return createEstimatedMetric(
    revenue * 0.55,
    'rule_of_thumb',
    'No COGS data. Using 55% estimate.',
    25 // confidence score
  );
}
```

## Canonical Hooks

| Module | Canonical Hook | Deprecated Alternative | Status |
|--------|---------------|----------------------|--------|
| FDP | `useFDPFinanceSSOT` | ~~useFDPMetrics~~ | ✅ Migrated |
| FDP | `useFDPPeriodSummary` | ~~useFDPAggregatedMetrics~~ | ✅ Migrated |
| MDP | `useMDPDataSSOT` | ~~useMDPData~~ | ✅ Migrated |
| Channel | `useChannelPLSSOT` | ~~useChannelPL~~ | ✅ Migrated |
| KPI | `useFinanceTruthSnapshot` | ~~useKPIData~~ | ✅ Migrated |
| Control Tower | `useControlTowerAnalyticsSSoT` | N/A | ✅ New |

## Migration Status (Phase 4 Complete)

### Migrated Pages (Phase 1-3)
- `MDPDashboardPage` → useMDPDataSSOT
- `CMOModePage` → useMDPDataSSOT
- `DecisionSupportPage` → useMDPDataSSOT
- `ChannelsPage` → useMDPDataSSOT
- `ROIAnalyticsPage` → useMDPDataSSOT
- `BudgetOptimizerPage` → useMDPDataSSOT
- `CampaignsPage` → useMDPDataSSOT
- `ScenarioPlannerPage` → useMDPDataSSOT
- `ProfitAttributionPage` → useMDPDataSSOT
- `CashImpactPage` → useMDPDataSSOT
- `RiskAlertsPage` → useMDPDataSSOT
- `MarketingModePage` → useMDPDataSSOT
- `RetailScenarioPanel` → useFinanceTruthSnapshot
- `WhatIfSimulationPanel` → useFinanceTruthSnapshot
- `AnalyticsPage (Control Tower)` → useControlTowerAnalyticsSSoT

### Migrated Pages (Phase 4)
- `FunnelPage` → useMDPDataSSOT
- `CustomerLTVPage` → useMDPDataSSOT
- `MarketingModePage` → useMDPDataSSOT (complete)
- `useUnifiedChannelMetrics` → useMDPDataSSOT

## Pre-commit Check

Run before committing:

```bash
npm run lint:ssot
```

This will:
1. Scan all files in `src/hooks/`
2. Detect forbidden patterns
3. Block commit if violations found

## Adding New Metrics

1. **Define in metric_registry table**
   ```sql
   INSERT INTO metric_registry (metric_code, metric_name, formula, source_view, unit, module)
   VALUES ('NEW_METRIC', 'New Metric', 'SUM(amount)', 'v_my_view', 'VND', 'FDP');
   ```

2. **Create/update DB view**
   ```sql
   CREATE OR REPLACE VIEW v_my_view AS
   SELECT tenant_id, SUM(amount) as new_metric
   FROM my_table
   GROUP BY tenant_id;
   ```

3. **Create thin-wrapper hook**
   ```typescript
   export function useNewMetric() {
     const { data: tenantId } = useActiveTenantId();
     
     return useQuery({
       queryKey: ['new-metric', tenantId],
       queryFn: async () => {
         // ONLY FETCH - NO CALCULATIONS
         const { data } = await supabase
           .from('v_my_view')
           .select('new_metric')
           .eq('tenant_id', tenantId);
         
         return Number(data?.new_metric) || 0;
       },
       enabled: !!tenantId,
     });
   }
   ```

## Consistency Checks

The system automatically detects SSOT violations via:

- `check_metric_consistency()` - PostgreSQL function
- `ssot_violation_log` - Tracks discrepancies
- `SSOTComplianceDashboard` - UI monitoring

## Reference

- FDP Manifesto Principle #2: SINGLE SOURCE OF TRUTH
- MDP Manifesto: Profit before Performance
- Custom Knowledge: DB-First architecture

## Phase 4 Completion Summary

**Date:** 2025-01-25

### Changes Made
1. **FunnelPage.tsx** - Migrated from `useMDPData` to `useMDPDataSSOT`
2. **CustomerLTVPage.tsx** - Migrated from `useMDPData` to `useMDPDataSSOT`
3. **MarketingModePage.tsx** - Completed migration to `useMDPDataSSOT`
4. **useUnifiedChannelMetrics.ts** - Migrated from `useMDPData` to `useMDPDataSSOT`

### Hook Enhancements
- `useMDPDataSSOT` now exports:
  - `budgetPacingData` (derived from attribution)
  - `totalPlannedBudget` / `totalActualSpend`
  - `rawQueryResults` (for DataQualityIndicator compatibility)
  - `funnelData` (calculated from performance metrics)

## Phase 5: Cleanup (In Progress)

**Date:** 2025-01-25

### Migrated Hooks/Components
- ✅ `useRiskScores.ts` - Replaced `useCentralFinancialMetrics` with `useFinanceTruthSnapshot`
- ✅ `useRiskAlerts.ts` - Removed `useCentralFinancialMetrics`, now uses only `useFinanceTruthSnapshot`
- ✅ `useQuickWins.ts` - Replaced `useCentralFinancialMetrics` with `useFinanceTruthSnapshot`
- ✅ `RealCashBreakdown.tsx` - Migrated to `useFinanceTruthSnapshot`
- ✅ `PerformancePage.tsx` - Replaced `usePerformanceData` with `useFinanceTruthSnapshot`
- ✅ `PendingDecisionCards.tsx` - Fixed React.forwardRef warning

### Phase 5b Migrated (2025-01-25)
- ✅ `ExecutiveSummaryPage.tsx` - Replaced `useCentralFinancialMetrics` with `useFinanceTruthSnapshot`
- ✅ `AROperations.tsx` - Replaced `useCentralFinancialMetrics` with `useFinanceTruthSnapshot`
- ✅ `ScenarioHubPage.tsx` - Replaced `useCentralFinancialMetrics` with `useFinanceTruthSnapshot`
- ✅ `ScenarioPlanner.tsx` - Replaced `useCentralFinancialMetrics` with `useFinanceTruthSnapshot`
- ✅ `useRollingForecast.ts` - Replaced `useCentralFinancialMetrics` with `useFinanceTruthSnapshot`

### Remaining Migration Tasks (Low Priority)
- `useFinancialAnalysisData.ts` - Contains client-side calculations (needs DB RPC)
- `ChannelPLPage.tsx` - Uses `useChannelPL`
- `PLReportPage.tsx` - Uses `usePLData`

## Phase 6: SSOT Views Migration (2026-01-26)

### Issue Identified
FDP views were reading from `external_orders` / `external_order_items` (Layer 0) while CDP uses `cdp_orders` / `cdp_order_items` (Layer 2). This violated SSOT principle.

### Fix Applied
All FDP/MDP views now read from `cdp_orders` / `cdp_order_items` (Layer 2) as Single Source of Truth.

### Migrated Views
| View | Old Source | New Source | Status |
|------|------------|------------|--------|
| `fdp_sku_summary` | `external_order_items` | `cdp_order_items` | ✅ Fixed |
| `channel_performance_summary` | `external_orders` | `cdp_orders` | ✅ Fixed |
| `daily_channel_revenue` | `external_orders` | `cdp_orders` | ✅ Fixed |
| `fdp_channel_summary` | `external_orders` | `cdp_orders` | ✅ Fixed |
| `fdp_daily_metrics` | `external_orders` | `cdp_orders` | ✅ Fixed |
| `fdp_monthly_metrics` | `external_orders` | `cdp_orders` | ✅ Fixed |
| `v_cdp_data_quality` | `external_orders` | `cdp_orders` | ✅ Fixed |

### Migrated RPCs
| Function | Old Source | New Source | Status |
|----------|------------|------------|--------|
| `get_control_tower_summary` | `external_orders` | `cdp_orders` | ✅ Fixed |
| `get_sku_profitability_by_date_range` | `external_order_items` | `cdp_order_items` | ✅ Fixed |
| `compute_central_metrics_snapshot` | `external_orders` | `cdp_orders` | ✅ Fixed |

### Architecture After Fix
```
                          external_orders/items (Layer 0 - Raw)
                                    │
                                    ▼ (sync + compute via cdp_run_daily_build)
                          cdp_orders/items (Layer 2 - Computed SSOT)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            FDP Views                          CDP Views
            (fdp_sku_summary,                  (v_cdp_customer_research,
             fdp_daily_metrics...)              v_cdp_ltv_rules...)
```
