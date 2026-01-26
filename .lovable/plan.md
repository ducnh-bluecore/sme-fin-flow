
# KẾ HOẠCH TỐI ƯU HỆ THỐNG - SSOT REMEDIATION & CLEANUP

## EXECUTIVE SUMMARY

Sau khi audit toàn bộ hệ thống, tôi đã xác định:
- **96 database views** trong schema public
- **160+ hooks** trong thư mục src/hooks
- **13 hooks** vi phạm SSOT (query external_orders)
- **24+ hooks** không được sử dụng hoặc deprecated
- **15+ views** không được sử dụng
- **5 cron jobs** đang chạy nhưng thiếu job cho Finance Snapshot

---

## PHASE 1: XÓA VIEWS KHÔNG SỬ DỤNG

### Views cần XÓA (không có hook nào reference)

| View | Lý do xóa |
|------|-----------|
| `balance_sheet_summary` | Không được query từ hooks |
| `channel_performance_summary` | Replaced by `v_channel_performance` |
| `daily_channel_revenue` | Replaced by `v_channel_daily_revenue` |
| `fdp_channel_summary` | Replaced by `v_channel_pl_summary` |
| `fdp_daily_metrics` | Replaced by `v_fdp_finance_summary` |
| `fdp_expense_summary` | Không được query |
| `fdp_invoice_summary` | Không được query |
| `fdp_monthly_metrics` | Replaced by `v_fdp_finance_summary` |
| `pl_summary` | Deprecated - không query |
| `trial_balance` | Không được query |
| `unified_decision_history` | Replaced by `v_decision_latest` |
| `v_audit_auto_reconcile_evidence` | Không query |
| `v_audit_risk_breaches` | Không query |
| `v_audit_summary` | Không query |
| `v_cdp_data_quality_latest` | Replaced by `v_cdp_data_quality` |
| `v_cdp_overview_stats` | Replaced by `v_cdp_summary_stats` |

**SQL Migration:**
```sql
DROP VIEW IF EXISTS balance_sheet_summary CASCADE;
DROP VIEW IF EXISTS channel_performance_summary CASCADE;
DROP VIEW IF EXISTS daily_channel_revenue CASCADE;
DROP VIEW IF EXISTS fdp_channel_summary CASCADE;
DROP VIEW IF EXISTS fdp_daily_metrics CASCADE;
DROP VIEW IF EXISTS fdp_expense_summary CASCADE;
DROP VIEW IF EXISTS fdp_invoice_summary CASCADE;
DROP VIEW IF EXISTS fdp_monthly_metrics CASCADE;
DROP VIEW IF EXISTS pl_summary CASCADE;
DROP VIEW IF EXISTS trial_balance CASCADE;
DROP VIEW IF EXISTS unified_decision_history CASCADE;
DROP VIEW IF EXISTS v_audit_auto_reconcile_evidence CASCADE;
DROP VIEW IF EXISTS v_audit_risk_breaches CASCADE;
DROP VIEW IF EXISTS v_audit_summary CASCADE;
DROP VIEW IF EXISTS v_cdp_data_quality_latest CASCADE;
DROP VIEW IF EXISTS v_cdp_overview_stats CASCADE;
```

---

## PHASE 2: XÓA HOOKS KHÔNG SỬ DỤNG

### Hooks cần XÓA (không import ở bất kỳ đâu)

| Hook | Lý do xóa |
|------|-----------|
| `useABTestingData.ts` | Không có UI import |
| `useAIUsageData.ts` | Không có component sử dụng |
| `useAlertDataSources.ts` | Orphaned sau refactor Control Tower |
| `useAlertEscalation.ts` | Logic đã chuyển vào Edge Functions |
| `useAlertRuleRecipients.ts` | Orphaned |
| `useAllChannelsPL.ts` | Replaced by `useChannelPLSSOT` |
| `useCapacitorPushNotifications.ts` | Mobile không active |
| `useCapexProjects.ts` | Không có feature page |
| `useCashConversionCycle.ts` | Calculation moved to DB RPCs |
| `useControlTowerAnalytics.ts` | Replaced by `useControlTowerSSOT` |
| `useCreditDebitNotes.ts` | Không sử dụng trong UI |
| `useDashboardCache.ts` | Replaced by `useFinanceTruthSnapshot` |
| `useDecisionAnalyses.ts` | Replaced by `useDecisionFlow` |
| `useDecisionAuditLog.ts` | Replaced by unified audit views |
| `useDecisionThresholds.ts` | Logic moved to `metric_registry` |
| `useFinanceTruthFacts.ts` | Deprecated wrapper |
| `useMonteCarloData.ts` | Replaced by direct RPC calls |
| `useQuickWins.ts` | Replaced by `useFinanceTruthSnapshot` |
| `useSupplierPayments.ts` | Replaced by AP/Bills hooks |
| `useUnifiedChannelMetrics.ts` | Consolidated into `useChannelPLSSOT` |
| `useUnitEconomics.ts` | Calculations moved to views |
| `useWorkingCapitalDaily.ts` | Merged into `useWorkingCapital` |
| `useFDPAggregatedMetrics.ts` | Replaced by `useFDPAggregatedMetricsSSOT` |
| `useAnalyticsData.ts` | Deprecated |

---

## PHASE 3: FIX HOOKS VI PHẠM SSOT (Query external_orders)

### 13 Hooks/Components cần refactor

| File | Thay đổi |
|------|----------|
| `useVarianceAnalysis.ts:211-217` | `external_orders` → `cdp_orders` |
| `useChannelPL.ts:88-94` | `external_orders` → `cdp_orders` |
| `useWhatIfRealData.ts:104-110` | `external_orders` → `cdp_orders` |
| `useAudienceData.ts:162-168` | `external_orders` → `cdp_orders` |
| `useMDPData.ts:246-252` | `external_orders` → `cdp_orders` |
| `useFDPMetrics.ts:204-210` | `external_orders` → `cdp_orders` |
| `useWeeklyCashForecast.ts:111-117` | `external_orders` → `cdp_orders` |
| `useScenarioBudgetData.ts:153-159` | `external_orders` → `cdp_orders` |
| `useForecastInputs.ts:121-126` | `external_orders` → `cdp_orders` |
| `useMDPSSOT.ts:151-157` | `external_orders` → `cdp_orders` |
| `RevenuePage.tsx:148-153` | `external_orders` → `cdp_orders` |
| `SKUCostBreakdownDialog.tsx:206-212` | `external_orders` → `cdp_orders` |
| `BigQuerySyncManager.tsx:84` | Giữ nguyên (staging count) |

**Column Mapping khi refactor:**
```text
external_orders.total_amount     → cdp_orders.gross_revenue
external_orders.seller_income    → cdp_orders.net_revenue
external_orders.cost_of_goods    → cdp_orders.cogs
external_orders.order_date       → cdp_orders.order_at
external_orders.customer_phone   → cdp_orders.customer_id
external_orders.gross_profit     → cdp_orders.gross_margin
```

---

## PHASE 4: TẠO CRON JOB CHO FINANCE SNAPSHOT

### Hiện tại có 5 cron jobs:
1. `cdp_daily_all_tenants` - 19:15 daily
2. `cdp-daily-build` - 02:00 daily
3. `generate-decision-cards-daily` - 06:00 daily
4. `scheduled-detect-alerts-every-15min` - */15 * * * *
5. `sync-ecommerce-data-every-15min` - 5,20,35,50 * * * *

### Cần thêm:
- `refresh-finance-snapshot` - Chạy `compute_central_metrics_snapshot` daily
- `refresh-dashboard-cache` - Chạy `refresh_dashboard_kpi_cache` every 30 min

**SQL để thêm cron jobs:**
```sql
-- 1. Finance Snapshot - Daily at 03:00
SELECT cron.schedule(
  'refresh-finance-snapshot-daily',
  '0 3 * * *',
  $$
  SELECT compute_central_metrics_snapshot(tenant_id, current_date)
  FROM tenants WHERE is_active = true;
  $$
);

-- 2. Dashboard Cache - Every 30 minutes
SELECT cron.schedule(
  'refresh-dashboard-cache-30min',
  '*/30 * * * *',
  $$
  SELECT refresh_dashboard_kpi_cache();
  $$
);
```

---

## PHASE 5: TẠO BASE METRICS VIEW (SSOT LAYER)

Tạo 1 view trung gian làm nguồn chung cho tất cả modules:

```sql
CREATE OR REPLACE VIEW v_base_order_metrics AS
SELECT 
  tenant_id,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as unique_customers,
  SUM(gross_revenue) as gross_revenue,
  SUM(net_revenue) as net_revenue,
  SUM(cogs) as total_cogs,
  SUM(gross_margin) as gross_profit,
  SUM(platform_fee) as total_platform_fees,
  SUM(shipping_fee) as total_shipping_fees,
  AVG(net_revenue) as avg_order_value
FROM cdp_orders
GROUP BY tenant_id;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cdp_orders_tenant_metrics 
ON cdp_orders(tenant_id, order_at, net_revenue, gross_margin);
```

---

## PHASE 6: UPGRADE ESLINT RULE THÀNH ERROR

Chuyển ESLint warning thành error để block hoàn toàn:

```javascript
// eslint.config.js
"no-restricted-syntax": ["error", {  // Changed from "warn" to "error"
  "selector": "CallExpression[callee.property.name='from'][arguments.0.value='external_orders']",
  "message": "⛔ SSOT VIOLATION: Query cdp_orders instead. external_orders is staging-only."
}],
```

---

## SUMMARY ACTIONS

| Phase | Công việc | Files thay đổi |
|-------|-----------|----------------|
| 1 | Xóa 16 unused views | 1 migration |
| 2 | Xóa 24 unused hooks | 24 file deletions |
| 3 | Fix 12 SSOT violations | 12 file edits |
| 4 | Tạo 2 cron jobs | 1 migration |
| 5 | Tạo v_base_order_metrics | 1 migration |
| 6 | Upgrade ESLint rule | 1 config edit |

**Tổng cộng:** ~40 file changes

---

## KẾT QUẢ MONG ĐỢI

Sau khi hoàn thành:

1. **Database Views:** Giảm từ 96 → 80 views (xóa 16 redundant)
2. **Hooks:** Giảm từ 160+ → 136 hooks (xóa 24 orphaned)
3. **SSOT Compliance:** 100% hooks query từ cdp_orders
4. **Automated Jobs:** Finance Snapshot + Dashboard Cache tự động refresh
5. **Governance:** ESLint error block mọi vi phạm SSOT mới
6. **Performance:** Base Metrics View pre-computed tất cả aggregations

---

## VERIFICATION CHECKLIST

Sau khi apply changes, chạy:

1. **Governance Dashboard** (`?governance=1`):
   - Không còn REGRESSION warnings
   - FDP Revenue = CDP Revenue = Channel Revenue

2. **ESLint Check:**
   ```bash
   npm run lint
   # Should have 0 errors for external_orders queries
   ```

3. **Cron Job Verification:**
   ```sql
   SELECT * FROM cron.job ORDER BY jobname;
   -- Should show 7 active jobs
   ```

---

## CHI TIẾT KỸ THUẬT

### Phase 1: Migration xóa views
```sql
-- supabase/migrations/cleanup_unused_views.sql
-- Drop views không được reference

DROP VIEW IF EXISTS balance_sheet_summary CASCADE;
DROP VIEW IF EXISTS channel_performance_summary CASCADE;
DROP VIEW IF EXISTS daily_channel_revenue CASCADE;
DROP VIEW IF EXISTS fdp_channel_summary CASCADE;
DROP VIEW IF EXISTS fdp_daily_metrics CASCADE;
DROP VIEW IF EXISTS fdp_expense_summary CASCADE;
DROP VIEW IF EXISTS fdp_invoice_summary CASCADE;
DROP VIEW IF EXISTS fdp_monthly_metrics CASCADE;
DROP VIEW IF EXISTS pl_summary CASCADE;
DROP VIEW IF EXISTS trial_balance CASCADE;
DROP VIEW IF EXISTS unified_decision_history CASCADE;
DROP VIEW IF EXISTS v_audit_auto_reconcile_evidence CASCADE;
DROP VIEW IF EXISTS v_audit_risk_breaches CASCADE;
DROP VIEW IF EXISTS v_audit_summary CASCADE;
DROP VIEW IF EXISTS v_cdp_data_quality_latest CASCADE;
DROP VIEW IF EXISTS v_cdp_overview_stats CASCADE;

COMMENT ON SCHEMA public IS 'SSOT Cleanup: Removed 16 redundant views on 2026-01-26';
```

### Phase 2: File deletions
```text
src/hooks/useABTestingData.ts
src/hooks/useAIUsageData.ts
src/hooks/useAlertDataSources.ts
src/hooks/useAlertEscalation.ts
src/hooks/useAlertRuleRecipients.ts
src/hooks/useAllChannelsPL.ts
src/hooks/useCapacitorPushNotifications.ts
src/hooks/useCapexProjects.ts
src/hooks/useCashConversionCycle.ts
src/hooks/useControlTowerAnalytics.ts
src/hooks/useCreditDebitNotes.ts
src/hooks/useDashboardCache.ts
src/hooks/useDecisionAnalyses.ts
src/hooks/useDecisionAuditLog.ts
src/hooks/useDecisionThresholds.ts
src/hooks/useFinanceTruthFacts.ts
src/hooks/useMonteCarloData.ts
src/hooks/useQuickWins.ts
src/hooks/useSupplierPayments.ts
src/hooks/useUnifiedChannelMetrics.ts
src/hooks/useUnitEconomics.ts
src/hooks/useWorkingCapitalDaily.ts
src/hooks/useFDPAggregatedMetrics.ts
src/hooks/useAnalyticsData.ts
```

### Phase 3: Hook refactoring pattern
```typescript
// BEFORE (SSOT Violation):
const { data } = await supabase
  .from('external_orders')
  .select('total_amount, order_date')
  .eq('tenant_id', tenantId);

// AFTER (SSOT Compliant):
const { data } = await supabase
  .from('cdp_orders')
  .select('net_revenue, order_at')
  .eq('tenant_id', tenantId);
```

### Phase 4: Cron jobs migration
```sql
-- Enable pg_cron and pg_net if not already
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Finance Snapshot Daily
SELECT cron.schedule(
  'refresh-finance-snapshot-daily',
  '0 3 * * *',
  $$
  DO $$
  DECLARE
    t_id UUID;
  BEGIN
    FOR t_id IN SELECT id FROM tenants WHERE is_active = true
    LOOP
      PERFORM compute_central_metrics_snapshot(t_id, current_date);
    END LOOP;
  END $$;
  $$
);

-- Dashboard Cache Every 30 min
SELECT cron.schedule(
  'refresh-dashboard-cache-30min',
  '*/30 * * * *',
  $$
  SELECT refresh_dashboard_kpi_cache();
  $$
);
```

### Phase 5: Base Metrics View
```sql
CREATE OR REPLACE VIEW v_base_order_metrics WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as unique_customers,
  SUM(COALESCE(gross_revenue, 0)) as gross_revenue,
  SUM(COALESCE(net_revenue, 0)) as net_revenue,
  SUM(COALESCE(cogs, 0)) as total_cogs,
  SUM(COALESCE(gross_margin, 0)) as gross_profit,
  SUM(COALESCE(platform_fee, 0)) as total_platform_fees,
  SUM(COALESCE(shipping_fee, 0)) as total_shipping_fees,
  CASE WHEN COUNT(*) > 0 
    THEN SUM(COALESCE(net_revenue, 0)) / COUNT(*) 
    ELSE 0 
  END as avg_order_value
FROM cdp_orders
GROUP BY tenant_id;

COMMENT ON VIEW v_base_order_metrics IS 'SSOT Base Layer: Single source for all order aggregations across FDP/MDP/CDP';
```

### Phase 6: ESLint upgrade
```javascript
// eslint.config.js - Line 47-50
"no-restricted-syntax": ["error", {
  "selector": "CallExpression[callee.property.name='from'][arguments.0.value='external_orders']",
  "message": "⛔ SSOT VIOLATION: Query cdp_orders instead. external_orders is staging-only (auto-synced via trigger)."
}],
```
