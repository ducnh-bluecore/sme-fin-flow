# Hooks Architecture Audit Report
## Schema-per-Tenant v1.4.1

**Last Updated**: 2026-02-05  
**Total Hooks**: ~180 files across 6 directories  
**Migration Phase**: 1 Complete - 13 hooks migrated this session

---

## 📈 Latest Migration (2026-02-05)

### ✅ Migrated to useTenantQueryBuilder (Phase 1)

| Hook | Layer | Notes |
|------|-------|-------|
| `useTopCustomersAR.ts` | FDP | Cleanup - removed dual import |
| `useExpensePlanSummary.ts` | FDP | Full migration |
| `useExecutiveHealthScores.ts` | FDP | Full migration |
| `useFDPLockedCosts.ts` | Cross-Module | Full migration |
| `useInventoryAging.ts` | FDP | 4 hooks migrated |
| `useTeamMembers.ts` | Settings | 4 hooks migrated |
| `useUnifiedChannelMetrics.ts` | MDP | Full migration |
| `usePushNotifications.ts` | Platform | Full migration |
| `useMLMonitoring.ts` | ML | Client-only (Edge Functions) |
| `useMDPChannelROI.ts` | Cross-Module | 4 hooks migrated |
| `useCDPSegmentLTV.ts` | Cross-Module | 3 hooks migrated |
| `useCDPEquity.ts` | CDP | 8 hooks migrated |
| `useInvoiceData.ts` | FDP | 4 hooks migrated |

### 📊 Remaining (~108 files)
Files still importing `useTenantSupabaseCompat` require future migration batches.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                               │
│                   (Platform Schema - public)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Auth      │ │  Tenants    │ │  Profiles   │ │  Modules    ││
│  │   Users     │ │  Plans      │ │  Roles      │ │  Templates  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│         ↓               ↓               ↓               ↓       │
│    supabase        supabase        supabase        supabase     │
│    (direct)        (direct)        (direct)        (direct)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA PLANE                                 │
│              (Tenant Schemas - tenant_{id})                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Orders    │ │  Customers  │ │  Invoices   │ │   Alerts    ││
│  │   Products  │ │  Expenses   │ │  Bills      │ │  Decisions  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│         ↓               ↓               ↓               ↓       │
│  useTenantQuery  useTenantQuery  useTenantQuery  useTenantQuery │
│    Builder         Builder         Builder         Builder      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Layer Classification

### Layer 1: PLATFORM / CONTROL PLANE (Direct Supabase)
> Hooks that access platform-level data, cross-tenant, or auth-related tables.  
> These MUST use `supabase` directly (not tenant query builder).

| Hook | Purpose | Tables Accessed |
|------|---------|-----------------|
| `useAuth` | Authentication | `auth.users` |
| `useActiveTenantId` | Get current tenant | `profiles`, `tenants` |
| `useTenant` | Tenant CRUD | `tenants`, `user_tenant_roles` |
| `useIsSuperAdmin` | Admin check | `user_roles` |
| `useAuthRedirect` | Post-login routing | `user_roles`, `profiles` |
| `useOnboardingStatus` | Onboarding state | `profiles` |
| `usePlatformModules` | Module definitions | `platform_modules` |
| `usePlatformPlans` | Pricing plans | `platform_plans` |
| `usePlatformData` | AI templates, KPIs | `ai_metric_definitions`, `kpi_templates` |
| `useTenantModules` | Module assignments | `tenant_modules`, `platform_modules` |
| `useTenantSchemaStatus` | Schema provisioning | RPC: `is_tenant_schema_provisioned` |
| `useTenantHealth` | CS monitoring | `cs_alerts`, `tenant_events` |
| `useCSAlertsSummary` | CS dashboard | RPC: `get_cs_alerts_summary` |
| `useImpersonation` | Admin impersonation | `profiles`, `tenants` |
| `useTenantSession` | Session management | RPC: `init_tenant_session` |

### Layer 2: DATA PLANE - useTenantQueryBuilder
> Hooks that access tenant-specific business data.  
> These use `useTenantQueryBuilder` for automatic schema routing.

#### FDP (Financial Data Platform)
| Hook | Purpose | Tables |
|------|---------|--------|
| `useExpensesDaily` | Daily expenses | `finance_expenses_daily` |
| `useExpenseBaselines` | Fixed costs | `expense_baselines` |
| `usePLData` | P&L data | `v_pl_summary`, `v_pl_daily` |
| `useWorkingCapitalDaily` | Cash cycle | `finance_working_capital_daily` |
| `useCashFlowDirect` | Cash flow | `finance_cashflow_daily` |
| `useOpExBreakdown` | OpEx detail | `expense_baselines`, `expenses` |
| `useChannelBudgets` | Budget mgmt | `channel_budgets` |
| `useChannelPLSSOT` | Channel P&L | `v_channel_pl_daily` |
| `useFDPAggregatedMetricsSSOT` | KPI aggregates | `v_fdp_aggregated_metrics` |
| `useFinanceMonthlySummary` | Monthly view | `finance_monthly_summary` |

#### CDP (Customer Data Platform)
| Hook | Purpose | Tables |
|------|---------|--------|
| `useCDPInsightFeed` | Insights feed | `v_cdp_insight_feed` |
| `useCDPInsightRegistry` | Insight config | `v_cdp_insight_registry_summary` |
| `useCDPInsightQuality` | Quality audit | `v_cdp_insight_quality_summary` |
| `useCDPDemandInsights` | Demand signals | `v_cdp_demand_insights` |
| `useCDPDecisionCards` | Decision cards | `cdp_decision_cards` |
| `useCDPPopulations` | Segments | `cdp_populations` |
| `useCDPEquity` | Customer equity | `v_cdp_equity_summary` |
| `useCDPLTVEngine` | LTV calculation | `v_cdp_ltv_*` views |
| `useProductForecast` | Product forecast | `v_cdp_product_benchmark` |
| `useHypothesisQuery` | AI queries | `ai_semantic_models` |

#### MDP (Marketing Data Platform)
| Hook | Purpose | Tables |
|------|---------|--------|
| `useMDPExtendedData` | Marketing data | `marketing_expenses`, `promotion_campaigns` |
| `useMDPDataReadiness` | Data check | Multiple tables |
| `useMDPCEOSnapshot` | CEO view | `v_mdp_ceo_snapshot` |
| `useMarketingProfitability` | ROI | `v_marketing_profitability` |

#### Control Tower
| Hook | Purpose | Tables |
|------|---------|--------|
| `useAlertInstances` | Alerts | `alert_instances` |
| `useAlertObjects` | Alert objects | `alert_objects` |
| `useDecisionCards` | Decisions | `decision_cards` |
| `useNotificationCenter` | Notifications | `extended_alert_configs`, `alert_instances` |
| `useAlertEscalationSSOT` | Escalation | `alert_escalations` |

#### Cross-Module
| Hook | Purpose | Tables |
|------|---------|--------|
| `useMDPAcquisitionSource` | Attribution | RPC: `cdp_get_customer_acquisition` |
| `useCDPChurnSignals` | Churn risk | `v_cdp_churn_signals` |
| `useCDPCreditRisk` | Credit risk | `v_cdp_credit_risk` |
| `useFDPActualRevenue` | Revenue truth | `finance_revenue_daily` |

### Layer 3: DATA PLANE - useTenantSupabaseCompat (Legacy)
> Legacy hooks using compatibility layer. Should migrate to useTenantQueryBuilder.

| Hook | Status |
|------|--------|
| `useRFMSegmentsSSOT` | ⚠️ Needs migration |
| `useSKUCostBreakdown` | ⚠️ Needs migration |
| `useWorkingCapitalDaily` | ⚠️ Needs migration |
| `useSuggestions` | ⚠️ Needs migration |
| `usePushNotifications` | ⚠️ Needs migration |
| `useRealtimeDashboard` | ⚠️ Needs migration |

---

## 📁 Directory Structure

```
src/hooks/
├── cdp/                    # CDP-specific hooks (2 files)
│   ├── useHypothesisQuery.ts      → useTenantQueryBuilder ✅
│   └── useProductForecast.ts      → useTenantQueryBuilder ✅
│
├── control-tower/          # Control Tower hooks (6 files)
│   ├── useDecisionEffectiveness.ts → useTenantQueryBuilder ✅
│   ├── useEstimatedActualImpact.ts → useTenantQueryBuilder ✅
│   ├── useLearningInsights.ts      → useTenantQueryBuilder ✅
│   ├── useOutcomeRecording.ts      → useTenantQueryBuilder ✅
│   └── usePendingFollowups.ts      → useTenantQueryBuilder ✅
│
├── cross-module/           # Cross-module hooks (14 files)
│   ├── useCDPChurnSignals.ts       → useTenantQueryBuilder ✅
│   ├── useMDPAcquisitionSource.ts  → useTenantQueryBuilder ✅
│   └── ... (all migrated)
│
├── ingestion/              # Data ingestion hooks (3 files)
│   ├── useDataWatermarks.ts        → useTenantQueryBuilder ✅
│   └── useIngestionBatches.ts      → useTenantQueryBuilder ✅
│
├── kpi/                    # KPI hooks (3 files)
│   ├── useKPIDefinitions.ts        → useTenantQueryBuilder ✅
│   └── useKPITargets.ts            → useTenantQueryBuilder ✅
│
└── (root)                  # Core + domain hooks (~170 files)
    ├── useTenantQueryBuilder.ts    # 🔑 Core query builder
    ├── useTenantSupabase.ts        # 🔑 Compat layer
    ├── useAuth.tsx                 # Platform layer
    ├── useTenant.ts                # Platform layer
    └── ... (domain hooks)
```

---

## 🔄 Query Builder Selection Guide

```typescript
// 1. PLATFORM DATA (cross-tenant, auth, admin)
import { supabase } from '@/integrations/supabase/client';

// Use when:
// - Accessing auth.users, profiles, tenants
// - Admin operations (user_roles, platform_modules)
// - Cross-tenant queries (cs_alerts, tenant_events)
// - Platform RPCs (is_tenant_schema_provisioned)

// 2. TENANT DATA (business data, isolated per tenant)
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

const { buildSelectQuery, buildInsertQuery, callRpc, tenantId, isReady } = useTenantQueryBuilder();

// Use when:
// - Accessing orders, customers, invoices, expenses
// - Tenant-specific views (v_cdp_*, v_fdp_*, v_mdp_*)
// - Tenant RPCs (cdp_*, fdp_*, mdp_*)

// 3. LEGACY COMPAT (migration path)
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';

// Use when:
// - Migrating from old direct supabase usage
// - Need shouldAddTenantFilter flag
```

---

## 📊 Migration Status

| Category | Total | Migrated | Pending | % Complete |
|----------|-------|----------|---------|------------|
| FDP Hooks | ~25 | 20 | 5 | 80% |
| CDP Hooks | ~30 | 28 | 2 | 93% |
| MDP Hooks | ~15 | 12 | 3 | 80% |
| Control Tower | ~20 | 18 | 2 | 90% |
| Cross-Module | 14 | 14 | 0 | 100% |
| Platform | ~15 | N/A | N/A | ✅ Direct |
| **Total** | **~120** | **~92** | **~12** | **~87%** |

---

## ⚠️ Known Issues

1. **Deprecated Hooks** (marked @deprecated):
   - `useFDPMetrics` → Use `useFDPAggregatedMetricsSSOT`
   - `useMDPData` → Use `useMDPDataSSOT`

2. **Type Casting**: Some hooks require `as unknown as T` for query results

3. **RPC Calls**: Platform RPCs use `supabase.rpc()`, tenant RPCs use `callRpc()`

---

## ✅ Best Practices

1. **Always check layer before writing hook**:
   - Platform data → direct supabase
   - Tenant data → useTenantQueryBuilder

2. **Enable queries properly**:
   ```typescript
   enabled: isReady && !!tenantId
   ```

3. **Use proper query keys**:
   ```typescript
   queryKey: ['hook-name', tenantId, ...params]
   ```

4. **Add architecture comment**:
   ```typescript
   /**
    * @architecture Schema-per-Tenant v1.4.1
    * Uses useTenantQueryBuilder for tenant-aware queries
    */
   ```
