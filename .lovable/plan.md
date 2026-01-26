
# KẾ HOẠCH HOÀN THÀNH SSOT OPTIMIZATION

## EXECUTIVE SUMMARY

| Metric | Trước | Sau | Thay đổi |
|--------|-------|-----|----------|
| SSOT Violations | 36 queries | 0 | -100% |
| Orphaned Hooks | 7 files | 0 | -7 files |
| External_orders queries (frontend) | 28 | 0 | Blocked by ESLint |

---

## PHASE 2A: XÓA 7 ORPHANED HOOKS

Các hooks không được import ở bất kỳ đâu:

| File | Lý do xóa |
|------|-----------|
| `src/hooks/useAIUsageData.ts` | Consumer (AIUsagePanel) không tồn tại |
| `src/hooks/useAlertEscalation.ts` | Logic đã chuyển sang Edge Functions |
| `src/hooks/useAnalyticsData.ts` | Deprecated, replaced by useFinanceTruthSnapshot |
| `src/hooks/useDecisionAuditLog.ts` | Replaced by unified audit views |
| `src/hooks/useUnifiedChannelMetrics.ts` | Consolidated into useChannelPLSSOT |
| `src/hooks/useWorkingCapitalDaily.ts` | Merged into useWorkingCapital |
| `src/hooks/useFDPAggregatedMetrics.ts` | Replaced by useFDPAggregatedMetricsSSOT |

**Action:** Delete 7 files

---

## PHASE 3: FIX 28 SSOT VIOLATIONS (Frontend)

### Column Mapping Reference

```text
external_orders              → cdp_orders
─────────────────────────────────────────────
total_amount                 → gross_revenue
seller_income                → net_revenue  
cost_of_goods               → cogs
gross_profit                → gross_margin
order_date                  → order_at (timestamp)
customer_phone              → customer_id
platform_fee                → platform_fee (same)
commission_fee              → commission_fee (same)
payment_fee                 → payment_fee (same)
shipping_fee                → shipping_fee (same)
status                      → status (same)
channel                     → channel (same)
```

### 3.1 Hooks cần refactor (15 files, 28 queries)

| File | Queries | Changes |
|------|---------|---------|
| `useVarianceAnalysis.ts` | 3 | `external_orders` → `cdp_orders`, `total_amount` → `gross_revenue`, `order_date` → `order_at` |
| `useChannelAnalytics.ts` | 4 | Already fixed partially, need complete migration |
| `useChannelPL.ts` | 2 | `external_orders` → `cdp_orders`, map all columns |
| `useMDPData.ts` | 1 | `external_orders` → `cdp_orders` |
| `useFDPMetrics.ts` | 1 | `external_orders` → `cdp_orders`, `cost_of_goods` → `cogs` |
| `useMDPSSOT.ts` | 1 | `external_orders` → `cdp_orders` |
| `useWeeklyCashForecast.ts` | 1 | `external_orders` → `cdp_orders`, `order_date` → `order_at` |
| `useScenarioBudgetData.ts` | 1 | `external_orders` → `cdp_orders` |
| `useForecastInputs.ts` | 1 | `external_orders` → `cdp_orders`, `seller_income` → `net_revenue` |
| `useAudienceData.ts` | 1 | `external_orders` → `cdp_orders` |
| `useWhatIfRealData.ts` | 2 | `external_orders` → `cdp_orders`, map columns |
| `useEcommerceReconciliation.ts` | 3 | Special: READ from cdp_orders, WRITE to external_orders (staging update) |
| `useMDPDataReadiness.ts` | 2 | `external_orders` → `cdp_orders` |

### 3.2 Pages/Components cần refactor (2 files)

| File | Changes |
|------|---------|
| `RevenuePage.tsx:149` | `external_orders` → `cdp_orders`, `total_amount` → `gross_revenue` |
| `SKUCostBreakdownDialog.tsx:207` | `external_orders` → `cdp_orders`, map all columns |

### 3.3 Files giữ nguyên (staging count)

| File | Reason |
|------|--------|
| `BigQuerySyncManager.tsx:84` | Displays staging table count (external_orders) for sync monitoring |
| `PortalPage.tsx:214` | Checks if external_orders has data (sync status) |

---

## PHASE 3B: FIX EDGE FUNCTIONS (3 files)

| File | Queries | Changes |
|------|---------|---------|
| `detect-cross-domain-alerts/index.ts` | 2 | `external_orders` → `cdp_orders` |
| `analyze-contextual/index.ts` | 1 | `external_orders` → `cdp_orders` |
| `decision-snapshots/index.ts` | 1 | `external_orders` → `cdp_orders` |

**Edge Functions giữ nguyên (writes to staging):**
- `batch-import-data/index.ts` - INSERT to external_orders
- `sync-ecommerce-data/index.ts` - UPSERT to external_orders
- `sync-bigquery/index.ts` - UPSERT to external_orders

---

## CHI TIẾT KỸ THUẬT

### useVarianceAnalysis.ts (3 queries)

```typescript
// BEFORE (lines 211-217, 228-234, 244-250)
const { data: orders } = await supabase
  .from('external_orders')
  .select('total_amount')
  .eq('tenant_id', tenantId)
  .eq('status', 'delivered')
  .gte('order_date', format(periodStart, 'yyyy-MM-dd'))
  .lte('order_date', format(periodEnd, 'yyyy-MM-dd'));

// AFTER
const { data: orders } = await supabase
  .from('cdp_orders')
  .select('gross_revenue')
  .eq('tenant_id', tenantId)
  .eq('status', 'delivered')
  .gte('order_at', format(periodStart, 'yyyy-MM-dd'))
  .lte('order_at', format(periodEnd, 'yyyy-MM-dd'));

// Also update calculation:
// orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0)
// → orders?.reduce((sum, o) => sum + (o.gross_revenue || 0), 0)
```

### useChannelPL.ts (2 queries)

```typescript
// BEFORE (lines 88-94)
const { data: orders } = await supabase
  .from('external_orders')
  .select('*')
  .eq('tenant_id', tenantId)
  .ilike('channel', `%${normalizedChannel}%`)
  .gte('order_date', startDate.toISOString())
  .lte('order_date', endDate.toISOString());

// AFTER
const { data: orders } = await supabase
  .from('cdp_orders')
  .select('*')
  .eq('tenant_id', tenantId)
  .ilike('channel', `%${normalizedChannel}%`)
  .gte('order_at', startDate.toISOString())
  .lte('order_at', endDate.toISOString());
```

### useMDPSSOT.ts (1 query)

```typescript
// BEFORE (lines 151-157)
const { data, error } = await supabase
  .from('external_orders')
  .select('id, channel, status, total_amount, payment_status, order_date, shipping_fee')
  .eq('tenant_id', tenantId)
  .gte('order_date', startDateStr)
  .lte('order_date', endDateStr)
  .limit(50000);

// AFTER
const { data, error } = await supabase
  .from('cdp_orders')
  .select('id, channel, status, gross_revenue, payment_status, order_at, shipping_fee')
  .eq('tenant_id', tenantId)
  .gte('order_at', startDateStr)
  .lte('order_at', endDateStr)
  .limit(50000);

// Update interface/usage:
// total_amount → gross_revenue
// order_date → order_at
```

### useEcommerceReconciliation.ts (Special Case)

```typescript
// READ queries: Change to cdp_orders
const { data } = await supabase
  .from('cdp_orders') // Changed from external_orders
  .select('id, external_order_id, order_number, ...')
  .eq('tenant_id', tenantId);

// WRITE query (line 377): KEEP external_orders
// This updates staging table which triggers sync to cdp_orders
const { error } = await supabase
  .from('external_orders') // KEEP - updates staging
  .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
  .in('id', orderIds);
```

### RevenuePage.tsx

```typescript
// BEFORE (lines 148-153)
const { data, error } = await supabase
  .from("external_orders")
  .select("integration_id, total_amount, status, channel, order_date")
  .eq('tenant_id', tenantId)
  .gte('order_date', start)
  .lte('order_date', end);

// AFTER
const { data, error } = await supabase
  .from("cdp_orders")
  .select("integration_id, gross_revenue, status, channel, order_at")
  .eq('tenant_id', tenantId)
  .gte('order_at', start)
  .lte('order_at', end);
```

### detect-cross-domain-alerts Edge Function

```typescript
// BEFORE (lines 221-234)
supabase
  .from('external_orders')
  .select('total_amount, status, order_date, shipping_status')
  .eq('tenant_id', tenantId)
  .gte('order_date', sevenDaysAgo.toISOString())
  .lt('order_date', now.toISOString()),

// AFTER
supabase
  .from('cdp_orders')
  .select('gross_revenue, status, order_at, shipping_status')
  .eq('tenant_id', tenantId)
  .gte('order_at', sevenDaysAgo.toISOString())
  .lt('order_at', now.toISOString()),
```

---

## EXECUTION ORDER

### Step 1: Delete Orphaned Hooks (7 files)
```text
DELETE: src/hooks/useAIUsageData.ts
DELETE: src/hooks/useAlertEscalation.ts
DELETE: src/hooks/useAnalyticsData.ts
DELETE: src/hooks/useDecisionAuditLog.ts
DELETE: src/hooks/useUnifiedChannelMetrics.ts
DELETE: src/hooks/useWorkingCapitalDaily.ts
DELETE: src/hooks/useFDPAggregatedMetrics.ts
```

### Step 2: Fix SSOT Violations - Hooks (15 files)
Refactor in order of dependency (less dependent first):
1. `useMDPDataReadiness.ts`
2. `useForecastInputs.ts`
3. `useWeeklyCashForecast.ts`
4. `useScenarioBudgetData.ts`
5. `useVarianceAnalysis.ts`
6. `useAudienceData.ts`
7. `useMDPData.ts`
8. `useMDPSSOT.ts`
9. `useFDPMetrics.ts`
10. `useChannelPL.ts`
11. `useChannelAnalytics.ts`
12. `useWhatIfRealData.ts`
13. `useEcommerceReconciliation.ts`

### Step 3: Fix SSOT Violations - Pages (2 files)
1. `RevenuePage.tsx`
2. `SKUCostBreakdownDialog.tsx`

### Step 4: Fix Edge Functions (3 files)
1. `detect-cross-domain-alerts/index.ts`
2. `analyze-contextual/index.ts`
3. `decision-snapshots/index.ts`

### Step 5: Update ssot.ts exports
Remove deprecated exports for deleted hooks.

---

## VERIFICATION CHECKLIST

After completion:

1. **ESLint Check:**
```bash
npm run lint
# Expected: 0 errors for external_orders in frontend
```

2. **Governance Dashboard** (`?governance=1`):
- All health checks PASS
- No REGRESSION warnings
- FDP Revenue = MDP Revenue = CDP Revenue

3. **Build Check:**
```bash
npm run build
# Expected: No TypeScript errors
```

4. **Runtime Test:**
- Portal loads without errors
- FDP Revenue page shows data
- MDP Campaigns page shows data
- CDP Equity page shows data

---

## ESTIMATED IMPACT

| Metric | Value |
|--------|-------|
| Files deleted | 7 |
| Files modified | 20 |
| Lines changed | ~200 |
| SSOT Compliance | 100% |
| Build time improvement | ~5% (less code) |

---

## ROLLBACK PLAN

If issues occur:
1. All changes are in single commit
2. Can revert via Git
3. ESLint rule can be downgraded back to "warn"
4. Edge functions auto-deploy, but can rollback via Supabase dashboard
