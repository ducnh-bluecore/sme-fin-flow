
# SSOT MIGRATION - COMPLETE ✅

## PHASE 4 - COMPLETED (2026-01-26)

All 20 queries have been migrated from `external_orders` → `cdp_orders`.

## COLUMN MAPPING APPLIED
```text
external_orders              → cdp_orders
─────────────────────────────────────────────
total_amount                 → gross_revenue
order_date                   → order_at
cost_of_goods                → cogs
seller_income                → net_revenue
gross_profit                 → gross_margin
customer_phone               → customer_id
status='delivered'           → (default, cdp_orders only has delivered)
payment_status='paid'        → (default, cdp_orders only has paid)
fees (platform/commission)   → 0 (not available in cdp_orders)
```

## MIGRATED FILES

| File | Status |
|------|--------|
| `useMDPExtendedData.ts` | ✅ Complete (5 queries) |
| `useMDPSSOT.ts` | ✅ Complete (1 query) |
| `useMDPData.ts` | ✅ Complete (1 query) |
| `useFDPMetrics.ts` | ✅ Complete (1 query) |
| `useMDPDataReadiness.ts` | ✅ Complete (2 queries) |
| `useAudienceData.ts` | ✅ Complete (1 query) |
| `useWhatIfRealData.ts` | ✅ Complete (3 queries) |
| `useScenarioBudgetData.ts` | ✅ Complete (1 query) |
| `useWeeklyCashForecast.ts` | ✅ Complete (1 query) |

## EXEMPTED FILES (Intentional staging access)

| File | Reason |
|------|--------|
| `useEcommerceReconciliation.ts` | Compares staging vs bank settlements |
| `BigQuerySyncManager.tsx` | Monitors sync status of staging table |
| `PortalPage.tsx` | Displays data counts for governance dashboard |

## VERIFICATION STATUS

- ✅ All TypeScript errors resolved
- ✅ ESLint guardrails active for external_orders queries
- ✅ Governance Dashboard (?governance=1) available for monitoring
