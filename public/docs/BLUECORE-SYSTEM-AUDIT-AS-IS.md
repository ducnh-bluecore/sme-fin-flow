# BLUECORE DATA PLATFORM - TECHNICAL SYSTEM AUDIT (AS-IS)

> **Audit Date:** 2026-01-23  
> **Last Updated:** 2026-01-23 (Post Security & SSOT Refactor)  
> **Document Type:** System Constitution / Refactoring Baseline  
> **Scope:** Complete code audit of existing implementation  
> **Status:** CURRENT - Reflects security fixes and CDP SSOT improvements

---

## 📋 DOCUMENT CONVENTIONS

| Symbol | Meaning |
|--------|---------|
| ✅ | IMPLEMENTED - Fully functional |
| ⚠️ | PARTIAL / AMBIGUOUS / RISK |
| ❌ | DECLARED BUT NOT IMPLEMENTED |
| 🔴 | SSOT VIOLATION |
| 📍 | COMPUTATION LOCATION |

---

## 1. SYSTEM OVERVIEW (AS-IS)

### 1.1 What the System Actually Does Today

Bluecore is a **multi-tenant financial data platform** for SME/E-commerce businesses. It consists of:

1. **FDP (Financial Data Platform)** - ✅ IMPLEMENTED
   - CFO Dashboard with precomputed metrics
   - Cash flow tracking (direct method)
   - AR/AP management
   - Channel P&L analysis
   - Reconciliation (bank ↔ invoice matching)
   - Scenario planning & budget tracking

2. **MDP (Marketing Data Platform)** - ✅ IMPLEMENTED
   - Two modes: Marketing Mode (execution) + CMO Mode (decision)
   - Profit attribution per campaign
   - Cash impact analysis
   - Channel budget management

3. **Control Tower** - ✅ IMPLEMENTED
   - Alert detection and management
   - Task management
   - Risk appetite configuration
   - Decision cards

4. **CDP (Customer Data Platform)** - ⚠️ PARTIAL
   - Overview with highlight signals
   - Equity snapshot (hardcoded fallback data)
   - Population management
   - Insight registry
   - Many views use hardcoded/mock data

### 1.2 Who Uses It (As Implemented)

| Role | Primary Modules | Actual Access |
|------|-----------------|---------------|
| CEO | Portal, Control Tower CEO, Decision Center | ✅ Implemented |
| CFO | FDP Dashboard, Cash Flow, Reconciliation | ✅ Implemented |
| CMO | MDP CMO Mode, Channel P&L | ✅ Implemented |
| COO | Control Tower COO, Alerts | ✅ Implemented |
| Admin | Admin Dashboard, Tenant Management | ✅ Implemented |

### 1.3 Technology Stack (Verified)

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React + TypeScript | 18.x |
| Build | Vite | 5.x |
| Styling | TailwindCSS + shadcn/ui | 3.x |
| Animation | Framer Motion | - |
| Mobile | Capacitor | - |
| State | React Query (TanStack) | 5.x |
| Backend | Supabase (Lovable Cloud) | - |
| Database | PostgreSQL | 15.x |
| Edge Functions | Deno | - |

---

## 2. ARCHITECTURE & DATA FLOW (AS-IS)

### 2.1 Data Flow Diagram (Actual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ BigQuery │  │ E-comm   │  │ Banking  │  │ Manual   │  │ CSV      │      │
│  │ (Sync)   │  │ APIs     │  │ APIs     │  │ Input    │  │ Import   │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       └─────────────┴─────────────┴─────────────┴─────────────┘            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                      ┌─────────────▼─────────────┐
                      │    EDGE FUNCTIONS         │
                      │  ├─ sync-connector        │
                      │  ├─ sync-bigquery         │
                      │  ├─ sync-ecommerce-data   │
                      │  ├─ detect-alerts         │
                      │  ├─ scheduled-*           │
                      │  └─ batch-import-data     │
                      └─────────────┬─────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                           SUPABASE DATABASE                                  │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │    RAW TABLES       │  │   COMPUTED VIEWS    │  │   SNAPSHOT TABLES   │  │
│  │  ├─ external_orders │  │  ├─ fdp_daily_*     │  │  ├─ central_metrics │  │
│  │  ├─ invoices        │  │  ├─ fdp_sku_summary │  │  │    _snapshots    │  │
│  │  ├─ bills           │  │  ├─ v_invoice_*     │  │  ├─ finance_monthly │  │
│  │  ├─ bank_txns       │  │  ├─ ar_aging        │  │  │    _summary      │  │
│  │  ├─ expenses        │  │  ├─ ap_aging        │  │  └─ bluecore_scores │  │
│  │  └─ ...             │  │  └─ v_cdp_*         │  │                     │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                      ┌─────────────▼─────────────┐
                      │    REACT QUERY HOOKS      │
                      │  (Canonical Hooks Layer)  │
                      │  ├─ useFinanceTruthSnapshot│
                      │  ├─ useFDPMetrics         │
                      │  ├─ useMDPData            │
                      │  ├─ useAlertInstances     │
                      │  └─ useCDP*               │
                      └─────────────┬─────────────┘
                                    │
                      ┌─────────────▼─────────────┐
                      │    REACT COMPONENTS       │
                      │    (Pages / UI Layer)     │
                      └───────────────────────────┘
```

### 2.2 Refresh Patterns (Actual)

| Data Type | Pattern | Staleness Threshold |
|-----------|---------|---------------------|
| central_metrics_snapshots | On-demand + stale check | 60 minutes |
| Alert instances | Realtime subscription | Immediate |
| Order data | Query on page load | 5 min staleTime |
| Bank transactions | Query on page load | 30 sec staleTime |
| CDP views | Query on page load | 5 min staleTime |

---

## 3. MODULE-BY-MODULE DOCUMENTATION

### 3.1 FDP - Financial Data Platform

#### 3.1.1 Routes (Verified from App.tsx)

| Route | Page Component | Status |
|-------|----------------|--------|
| `/` | CFODashboard | ✅ |
| `/cash-flow` | CashFlowDirectPage | ✅ |
| `/cash-forecast` | CashForecastPage | ✅ |
| `/unit-economics` | UnitEconomicsPage | ✅ |
| `/channel-pl` | ChannelPLPage | ✅ |
| `/channel-analytics` | ChannelAnalyticsPage | ✅ |
| `/working-capital` | WorkingCapitalHubPage | ✅ |
| `/ar-operations` | AROperations | ✅ |
| `/bills` | BillsPage | ✅ |
| `/reconciliation-hub` | ReconciliationHubPage | ✅ |
| `/scenario` | ScenarioPage | ✅ |
| `/budget` | BudgetVsActualPage | ✅ |
| `/rolling-forecast` | RollingForecastPage | ✅ |
| `/decision-center` | DecisionCenterPage | ✅ |
| `/pl-report` | PLReportPage | ✅ |

#### 3.1.2 Core Hooks (Verified)

| Hook | File | Computes Data? | SSOT Compliant? |
|------|------|----------------|-----------------|
| `useFDPMetrics` | useFDPMetrics.ts | 🔴 YES - Heavy computation | ⚠️ PARTIAL |
| `useFinanceTruthSnapshot` | useFinanceTruthSnapshot.ts | ✅ NO - Fetch only | ✅ YES |
| `useCashRunway` | useCashRunway.ts | ✅ NO - Uses snapshot | ✅ YES |
| `useReconciliationSSOT` | useReconciliationSSOT.ts | ✅ NO - SSOT pattern | ✅ YES |
| `useChannelPL` | useChannelPL.ts | 🔴 YES - Aggregates in hook | ⚠️ PARTIAL |
| `useCentralFinancialMetrics` | useCentralFinancialMetrics.ts | ✅ NO - Deprecated wrapper | ✅ YES |

#### 3.1.3 ⚠️ SSOT VIOLATION: useFDPMetrics

**Location:** `src/hooks/useFDPMetrics.ts`

**Issue:** This hook performs heavy client-side calculations despite being declared as "SSOT":

```typescript
// Lines 251-373: Client-side aggregations
const deliveredOrders = orders.filter(o => o.status === 'delivered');
const totalOrders = deliveredOrders.length;
const orderRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
// ... many more calculations
```

**Impact:** 
- Net Revenue, Gross Profit, Contribution Margin calculated in browser
- Different from `useFinanceTruthSnapshot` which fetches precomputed data
- Two potential sources of truth for same metrics

**Risk Level:** HIGH - Refactoring this hook requires careful migration

---

### 3.2 MDP - Marketing Data Platform

#### 3.2.1 Routes (Verified from App.tsx)

| Route | Page Component | Status |
|-------|----------------|--------|
| `/mdp` | MDPDashboardPage | ✅ |
| `/mdp/marketing` | MarketingModePage | ✅ |
| `/mdp/cmo` | CMOModePage | ✅ |
| `/mdp/campaigns` | CampaignsPage | ✅ |
| `/mdp/channels` | ChannelsPage | ✅ |
| `/mdp/funnel` | FunnelPage | ✅ |
| `/mdp/profit-attribution` | ProfitAttributionPage | ✅ |
| `/mdp/cash-impact` | CashImpactPage | ✅ |
| `/mdp/roi` | ROIAnalyticsPage | ✅ |
| `/mdp/budget-optimizer` | BudgetOptimizerPage | ✅ |
| `/mdp/v2` | MDPV2CEOPage | ✅ |

#### 3.2.2 Core Hook: useMDPData

**Location:** `src/hooks/useMDPData.ts` (895 lines)

**What it does:**
1. Fetches from 8 different tables (campaigns, expenses, orders, channel_fees, etc.)
2. Computes Marketing Performance metrics
3. Computes CMO Mode Profit Attribution
4. Computes Cash Impact per channel
5. Generates Risk Alerts

**⚠️ ISSUES IDENTIFIED:**

1. **Estimated Values (Fallbacks):**
```typescript
// Line 315-317: Estimated impressions/clicks when no real data
const impressions = Math.floor(spend / 5); // Estimated from spend
const clicks = Math.floor(impressions * 0.02); // 2% CTR estimate
const leads = Math.floor(clicks * 0.1); // 10% lead rate estimate
```

2. **COGS Estimation:**
```typescript
// Line 504-507: Fallback to 55% COGS when no real data
cogs = netRevenue * 0.55;
```

3. **Fee Estimation:**
```typescript
// Line 522-523: Fallback to 12% fees
platformFees = netRevenue * 0.12;
```

**Data Quality Indicators (Exposed):**
```typescript
dataQuality: {
  hasRealCOGS: Object.keys(cogsLookup).length > 0,
  hasRealFees: (channelFeesQuery.data?.length || 0) > 0,
  hasRealSettlements: (settlementsQuery.data?.length || 0) > 0,
}
```

---

### 3.3 Control Tower

#### 3.3.1 Routes (Verified)

| Route | Page Component | Status |
|-------|----------------|--------|
| `/control-tower` | Redirect to /control-tower/ceo | ✅ |
| `/control-tower/ceo` | CEOControlTowerPage | ✅ |
| `/control-tower/coo` | COOControlTowerPage | ✅ |
| `/control-tower/alerts` | CTAlertsPage | ✅ |
| `/control-tower/tasks` | CTTasksPage | ✅ |
| `/control-tower/decisions` | CTDecisionsPage | ✅ |
| `/control-tower/situation-room` | CTSituationRoomPage | ✅ |
| `/control-tower/team` | CTTeamPage | ✅ |
| `/control-tower/settings` | CTSettingsPage | ✅ |

#### 3.3.2 Alert System (Verified)

**Alert Detection Flow:**
```
detect-alerts (Edge Function)
       │
       ▼
intelligent_alert_rules (table) ─────────────────┐
       │                                          │
       ▼                                          ▼
risk_appetites (table)              risk_breach_events (table)
       │                                          │
       ▼                                          │
alert_instances (table) ◄─────────────────────────┘
       │
       ▼
useAlertInstances (hook) ─► React Components
```

**Alert Instance Fields (Actual):**
```typescript
interface AlertInstance {
  id: string;
  tenant_id: string;
  alert_type: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string | null;
  current_value: number | null;
  threshold_value: number | null;
  status: 'active' | 'acknowledged' | 'resolved' | 'snoozed';
  impact_amount: number | null;
  deadline_at: string | null;
  linked_decision_card_id: string | null;
  // ... other fields
}
```

#### 3.3.3 Decision Cards System (Verified)

**Tables Used:**
- `decision_cards` - Main card records
- `decision_card_facts` - Card facts (metrics)
- `decision_card_actions` - Available actions
- `decision_card_decisions` - Decision log
- `auto_decision_card_states` - Auto-generated card state persistence
- `decision_audit_log` - Unified audit trail

**Card Types (Actual):**
```typescript
type CardType = 
  | 'GROWTH_SCALE_CHANNEL'
  | 'GROWTH_SCALE_SKU'
  | 'CASH_SURVIVAL'
  | 'INVENTORY_CASH_LOCK'
  | 'OPS_REVENUE_AT_RISK'
  | 'CUSTOMER_PROTECT_OR_AVOID';
```

---

### 3.4 CDP - Customer Data Platform

#### 3.4.1 Routes (Verified)

| Route | Page Component | Status |
|-------|----------------|--------|
| `/cdp` | CDPOverviewPage | ✅ |
| `/cdp/explore` | CustomerResearchPage | ✅ |
| `/cdp/insights` | InsightsPage | ✅ |
| `/cdp/insights/:code` | InsightDetailPage | ✅ |
| `/cdp/equity` | EquityOverviewPage | ✅ |
| `/cdp/populations` | PopulationsPage | ✅ |
| `/cdp/decisions` | DecisionCardsPage | ✅ |
| `/cdp/confidence` | DataConfidencePage | ✅ |
| `/cdp/audit/:customerId` | CustomerAuditPage | ✅ |

#### 3.4.2 ⚠️ CDP DATA SOURCES - CRITICAL AUDIT

**Hardcoded/Mock Data Found:**

1. **v_cdp_equity_overview** (Migration 20260123010219):
```sql
-- Lines 11-22: HARDCODED VALUES
SELECT 
  t.id as tenant_id,
  45000000000::numeric as total_equity_12m,  -- HARDCODED
  72000000000::numeric as total_equity_24m,  -- HARDCODED
  8100000000::numeric as at_risk_value,      -- HARDCODED
  18.0::numeric as at_risk_percent,          -- HARDCODED
  12.5::numeric as equity_change,            -- HARDCODED
  'up'::text as change_direction,            -- HARDCODED
  NOW() as last_updated
FROM tenants t;
```

2. **v_cdp_equity_distribution** (Migration 20260123010219):
```sql
-- Lines 26-49: HARDCODED FALLBACK SEGMENTS
WITH fallback_segments AS (
  SELECT 
    t.id as tenant_id,
    'top10' as segment_id,
    'TOP10 (Cao nhất)' as segment_name,
    'tier' as segment_type,
    22500000000::numeric as equity,          -- HARDCODED
    50::numeric as share_percent,            -- HARDCODED
    ...
)
```

3. **v_cdp_equity_drivers** (Migration 20260123010219):
```sql
-- Lines 52-74: HARDCODED DRIVERS
WITH fallback_drivers AS (
  SELECT 
    t.id as tenant_id, 'driver_1' as driver_id, 'Churn rate tăng' as factor,
    'Tỷ lệ khách hàng rời bỏ tăng 15% trong 30 ngày qua' as description,
    -2500000000::numeric as impact,          -- HARDCODED
    ...
)
```

**Actual CDP Tables (Verified Exist):**
- `cdp_customers`
- `cdp_orders`
- `cdp_refunds`
- `cdp_customer_metrics_rolling`
- `cdp_segment_membership_daily`
- `cdp_cohort_membership_daily`
- `cdp_insight_registry`
- `cdp_insight_events`
- `cdp_decision_cards`

**CDP Views Using Real Data:**
- `v_cdp_customer_audit` - ✅ Queries from cdp_orders
- `v_cdp_data_quality` - ⚠️ Needs verification

---

## 4. METRICS & SSOT AUDIT

### 4.1 Net Revenue

| Source | Location | Formula | SSOT? |
|--------|----------|---------|-------|
| useFDPMetrics | Hook (client) | `grossRevenue - platformFees - returns - discounts` | 🔴 NO |
| central_metrics_snapshots | DB Table | Precomputed by `compute_central_metrics_snapshot()` | ✅ YES |
| useFinanceTruthSnapshot | Hook | Fetches from central_metrics_snapshots | ✅ YES |
| fdp_daily_metrics | DB View | `SUM(total_amount)` from orders | 🔴 DIFFERENT |

**⚠️ CONFLICT:** Net Revenue is computed in 3 different places with potentially different values.

### 4.2 Contribution Margin

| Source | Location | Formula |
|--------|----------|---------|
| useFDPMetrics | Hook | `netRevenue - COGS - shipping - marketing` |
| useMDPData.profitAttribution | Hook | `netRevenue - cogs - platformFees - logistics - payment - return - adSpend` |
| fdp_daily_metrics | DB View | `total_amount - cogs - all_fees` |

**⚠️ CONFLICT:** Different formulas, different variable costs included.

### 4.3 DSO (Days Sales Outstanding)

| Source | Location | Formula |
|--------|----------|---------|
| central_metrics_snapshots.dso | DB | Precomputed |
| useFinanceTruthSnapshot.dso | Hook | Direct fetch |
| useCentralFinancialMetrics.dso | Hook | Maps from snapshot |
| working_capital_metrics.dso_days | DB Table | Per-day calculation |

**Status:** ✅ SSOT via central_metrics_snapshots

### 4.4 Cash Runway

| Source | Location | Formula |
|--------|----------|---------|
| central_metrics_snapshots.cash_runway_months | DB | Precomputed |
| useCashRunway | Hook | Uses snapshot + monthly summary fallback |

**Status:** ✅ SSOT with fallback logic

### 4.5 ROAS (Return on Ad Spend)

| Source | Location | Formula |
|--------|----------|---------|
| useFDPMetrics.marketing.roas | Hook | `orderRevenue / totalMarketingSpend` |
| useMDPData.marketingModeSummary.overall_roas | Hook | `total_revenue / total_spend` |
| useMDPData.profitAttribution.profit_roas | Hook | `contribution_margin / ad_spend` |

**⚠️ CONFLICT:** Three different ROAS calculations with different meanings:
1. Revenue ROAS (marketing mode)
2. Profit ROAS (CMO mode)
3. FDP ROAS (unified hook)

---

## 5. DATABASE SCHEMA AUDIT

### 5.1 Total Tables Count

**Verified:** 302 tables (from schema query)

### 5.2 Core Transaction Tables

| Table | Purpose | Key Fields | RLS |
|-------|---------|------------|-----|
| `external_orders` | Order headers | id, tenant_id, channel, total_amount, status, order_date | ✅ |
| `external_order_items` | Order line items | id, external_order_id, sku, quantity, total_amount, total_cogs | ✅ |
| `invoices` | AR invoices | id, tenant_id, total_amount, paid_amount, status, due_date | ✅ |
| `bills` | AP bills | id, tenant_id, total_amount, paid_amount, status, due_date | ✅ |
| `bank_accounts` | Bank registry | id, tenant_id, bank_name, account_number, current_balance | ✅ |
| `bank_transactions` | Bank statements | id, bank_account_id, amount, transaction_date, description | ✅ |
| `expenses` | General expenses | id, tenant_id, category, amount, expense_date | ✅ |
| `revenues` | Contract revenue | id, tenant_id, amount, start_date | ✅ |

### 5.3 Precomputed/Snapshot Tables

| Table | Purpose | Refresh Method |
|-------|---------|----------------|
| `central_metrics_snapshots` | All CEO/CFO metrics | `compute_central_metrics_snapshot()` RPC |
| `central_metric_facts` | Grain-level breakdowns | Same RPC |
| `finance_monthly_summary` | Monthly aggregates | Same RPC |
| `bluecore_scores` | Executive scores | Manual/calculated |
| `dashboard_kpi_cache` | Dashboard cache | `refresh_dashboard_kpi_cache()` RPC |

### 5.4 Views (Partial List - Key Views)

| View | Purpose | Source Tables |
|------|---------|---------------|
| `fdp_daily_metrics` | Daily order aggregates | external_orders |
| `fdp_monthly_metrics` | Monthly order aggregates | external_orders |
| `fdp_sku_summary` | SKU profitability | external_order_items |
| `fdp_channel_summary` | Channel aggregates | external_orders |
| `v_invoice_settled_status` | Invoice SSOT | reconciliation_links, invoices |
| `v_bank_txn_match_state` | Bank txn SSOT | reconciliation_links, bank_transactions |
| `v_customer_ar_summary` | Customer AR | invoices |
| `ar_aging` | AR aging buckets | invoices |
| `ap_aging` | AP aging buckets | bills |
| `v_cdp_customer_audit` | Customer audit | cdp_customers, cdp_orders |
| `v_cdp_equity_overview` | CDP equity | ⚠️ HARDCODED |
| `v_cdp_equity_snapshot` | CDP snapshot | ⚠️ HARDCODED |

---

## 6. EDGE FUNCTIONS INVENTORY

### 6.1 Security Standard (UPDATED 2026-01-23)

**Location:** `supabase/functions/_shared/auth.ts`

All Edge Functions now follow a standardized security pattern:

| Function Type | Auth Method | Description |
|--------------|-------------|-------------|
| User-facing | `requireAuth(req)` | Validates JWT, extracts userId/tenantId |
| Scheduled/System | `requireServiceRole(req)` | Validates SUPABASE_SERVICE_ROLE_KEY |

### 6.2 Functions Using requireAuth (User-Facing) ✅

| Function | Purpose |
|----------|---------|
| `decision-advisor` | AI decision advisor |
| `board-summary` | Board summary generation |
| `board-scenarios` | Board scenario analysis |
| `decision-snapshots` | Decision snapshot capture |
| `approvals` | Approval workflows |
| `exceptions` | Exception handling |
| `audit` | Audit logging |
| `investor-disclosure` | Investor reports |
| `ml-monitoring` | ML model monitoring |
| `ml-reconciliation` | ML reconciliation |
| `risk-appetite` | Risk appetite config |
| `risk-stress-test` | Stress test analysis |
| `auto-measure-outcomes` | Outcome measurement |
| `whatif-chat` | What-if AI chat |
| `reconciliation-kpis` | Reconciliation KPIs |
| `reconciliation-suggestions` | Reconciliation AI |

### 6.3 Functions Using requireServiceRole (Scheduled/System) ✅

| Function | Purpose |
|----------|---------|
| `detect-alerts` | Alert detection for tenant |
| `detect-cross-domain-alerts` | Cross-domain alert detection |
| `scheduled-detect-alerts` | Scheduled alert detection |
| `scheduled-cdp-build` | CDP daily build |
| `process-scheduled-notifications` | Scheduled notifications |
| `process-alert-notifications` | Alert notifications |
| `generate-decision-cards` | Decision card generation |
| `sync-connector` | Connector sync |
| `batch-import-data` | Bulk data import |
| `suggest-data-models` | Data model AI |
| `sync-bigquery` | BigQuery sync |
| `sync-ecommerce-data` | E-commerce sync |

### 6.4 Functions with verify_jwt=false (Public APIs)

| Function | Purpose | Security Notes |
|----------|---------|----------------|
| `bigquery-list` | BigQuery schema listing | Reads only, no tenant data |
| `bigquery-realtime` | BigQuery realtime | Uses service account |
| `mongodb-query` | MongoDB queries | Uses connection string |
| `get-vapid-key` | Push notification key | Public key only |
| `send-fcm-notification` | FCM notifications | Internal use |
| `send-notification` | General notifications | Internal use |
| `inventory-recommendations` | AI recommendations | Public callable |
| `optimize-channel-budget` | Budget optimization | Public callable |
| `create-tenant-with-owner` | Tenant creation | Admin-only logic inside |

### 6.5 Auth Helper Functions

```typescript
// supabase/functions/_shared/auth.ts

// For user-initiated requests with JWT
export async function requireAuth(req: Request): Promise<SecureContext | Response>

// For scheduled/internal functions with service role
export function requireServiceRole(req: Request): { supabase: SupabaseClient } | Response

// Validate tenant access
export function validateTenantAccess(requestedTenantId: string, userTenantId: string): boolean
```

---

## 7. HOOKS INVENTORY (COMPLETE)

### 7.1 Canonical SSOT Hooks

| Hook | Purpose | Computes? |
|------|---------|-----------|
| `useFinanceTruthSnapshot` | Finance metrics SSOT | NO |
| `useFinanceMonthlySummary` | Monthly summary | NO |
| `useFinanceTruthFacts` | Grain-level facts | NO |
| `useReconciliationSSOT` | Reconciliation SSOT | NO |
| `useWorkingCapitalDaily` | Working capital | NO |

### 7.2 ⚠️ Hooks That Compute (SSOT Risk)

| Hook | Computes What |
|------|---------------|
| `useFDPMetrics` | Net Revenue, CM, ROAS, AOV, CAC, LTV |
| `useMDPData` | Profit Attribution, Cash Impact, Funnel, Alerts |
| `useChannelPL` | Channel P&L aggregations |
| `useBluecoreScores` | All Bluecore Scores |
| `useRiskScores` | Risk score calculations |
| `useRiskAlerts` | Risk alert generation |
| `useCashConversionCycle` | CCC derivations |

### 7.3 Deprecated Hooks (Marked in Code)

| Hook | Replacement |
|------|-------------|
| `useCentralFinancialMetrics` | useFinanceTruthSnapshot |
| `useFinancialMetrics` | useCentralFinancialMetrics |
| `useKPIData` | useFinanceTruthSnapshot |
| `useCustomersData` | Precomputed views |

---

## 8. GAP & RISK REGISTER (UPDATED 2026-01-23)

### 8.1 ❌ DECLARED BUT NOT IMPLEMENTED

| Feature | Location | Status |
|---------|----------|--------|
| CDP Real-time Equity | v_cdp_equity_* views | ⚠️ Still uses hardcoded fallback in DB views |
| CDP Population Metrics | mv_cdp_* materialized views | Schema exists, data uncertain |
| Bluecore Scores persistence | bluecore_scores table | Calculated in hook, not persisted |
| ML Reconciliation | ml-reconciliation edge function | Exists but uncertain usage |

### 8.2 ⚠️ SSOT VIOLATIONS (PARTIALLY FIXED)

| Metric | Status | Notes |
|--------|--------|-------|
| Net Revenue | ⚠️ PARTIAL | useFDPMetrics deprecated, useFinanceTruthSnapshot canonical |
| Contribution Margin | ⚠️ PARTIAL | Different formulas in FDP vs MDP hooks |
| ROAS | ⚠️ PARTIAL | Three definitions still exist (Revenue, Profit, FDP) |
| Customer Count | ✅ FIXED | Now uses central_metrics_snapshots |

**Deprecated Hooks (Do Not Use):**
- `useFDPMetrics` → Use `useFDPFinanceSSOT` or `useFinanceTruthSnapshot`
- `useMDPData` → Use `useMDPSSOT`
- `useCentralFinancialMetrics` → Use `useFinanceTruthSnapshot`

### 8.3 ✅ SECURITY FIXES COMPLETED (2026-01-23)

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| Edge Functions without auth | ✅ FIXED | Added requireAuth/requireServiceRole to all user-facing and scheduled functions |
| Tenant isolation | ✅ FIXED | JWT claims used for tenant_id extraction |
| Cross-tenant access | ✅ FIXED | validateTenantAccess helper implemented |

### 8.4 ⚠️ DATA QUALITY RISKS (PARTIALLY MITIGATED)

| Risk | Status | Mitigation |
|------|--------|------------|
| COGS Estimation (55% fallback) | ⚠️ EXISTS | useMDPData still uses silent fallback |
| Fee Estimation (12% fallback) | ⚠️ EXISTS | useMDPData still uses silent fallback |
| Impression/Click Estimation | ⚠️ EXISTS | useMDPData derives from spend |
| CDP Hardcoded Data | ⚠️ EXISTS | DB views still return static values |
| Cash Forecast estimation labels | ✅ FIXED | Added "(Dự báo)" label to estimated values |

### 8.5 ⚠️ AREAS DANGEROUS TO REFACTOR

| Area | Reason | Risk Level |
|------|--------|------------|
| useFDPMetrics | 600+ lines, many consumers, complex formulas | HIGH |
| useMDPData | 900+ lines, two modes, many derived metrics | HIGH |
| Reconciliation | SSOT pattern is correct but complex | MEDIUM |
| Alert Detection | Multiple edge functions, scheduled jobs | MEDIUM |
| Decision Cards | Auto-generated + DB-stored cards, complex flow | MEDIUM |

### 8.6 ⚠️ AMBIGUOUS OWNERSHIP (IDENTIFIED)

| Feature | Current Owner | Recommended Owner |
|---------|---------------|-------------------|
| Bluecore Scores | useBluecoreScores hook | DB-computed (RPC/view) |
| Risk Alerts | useRiskAlerts hook | detect-alerts function |
| CDP Insights | Mixed (hook + views) | DB views only |
| Channel Revenue | FDP + MDP both compute | Single DB view |
| Customer LTV | FDP + CDP both compute | CDP only |

---

## 9. DATA CONSISTENCY POINTS

### 9.1 Where Data Can Become Inconsistent

1. **Order Status Changes**
   - `external_orders.status` can change after metrics are computed
   - Snapshot may not reflect latest status

2. **Reconciliation Links**
   - Invoice `paid_amount` is derived from `reconciliation_links`
   - Race condition if link created while view is queried

3. **CDP Metrics Rolling**
   - `cdp_customer_metrics_rolling` needs scheduled refresh
   - Stale data if refresh fails

4. **Alert Detection**
   - `detect-alerts` runs on schedule
   - New breaches may exist between runs

### 9.2 Where Numbers May Silently Change

1. **useFDPMetrics** recalculates on every render
2. **useMDPData** recalculates on every render
3. **Snapshots** can be stale (60-minute threshold)
4. **CDP views** with hardcoded data will never reflect real changes

---

## 10. APPENDIX: FILE REFERENCES

### 10.1 Key Files for Refactoring

```
src/hooks/
├── useFDPMetrics.ts          # 600 lines - SSOT risk
├── useMDPData.ts             # 895 lines - Complex computation
├── useFinanceTruthSnapshot.ts # Canonical SSOT hook
├── useReconciliationSSOT.ts  # SSOT reconciliation pattern
├── useAlertInstances.ts      # Alert CRUD
├── useDecisionCards.ts       # Decision cards CRUD
├── useCDPOverview.ts         # CDP overview hooks
└── useBluecoreScores.ts      # Score calculations

supabase/functions/
├── detect-alerts/            # Alert detection logic
├── scheduled-detect-alerts/  # Scheduled alert job
├── generate-decision-cards/  # Card generation
└── scheduled-cdp-build/      # CDP build job

public/docs/
├── DB_FIRST_REFACTOR_COMPLETE.md  # DB-first migration docs
└── hooks-documentation.md         # Hook documentation
```

---

**END OF AUDIT DOCUMENT**

*This document reflects the actual state of the codebase as of 2026-01-23.*
*Use this as the baseline for any refactoring or governance decisions.*
