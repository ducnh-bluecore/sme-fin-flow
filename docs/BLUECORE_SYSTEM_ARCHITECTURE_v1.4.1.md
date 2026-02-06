# BLUECORE SYSTEM ARCHITECTURE DOCUMENTATION v1.4.1
## Comprehensive Technical & Business Reference

**Version:** 1.4.1  
**Last Updated:** 2026-02-06  
**Author:** Bluecore Engineering Team

---

## TABLE OF CONTENTS

1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Data Architecture (10-Layer)](#2-data-architecture-10-layer)
3. [Hook Architecture](#3-hook-architecture)
4. [Schema-per-Tenant Architecture](#4-schema-per-tenant-architecture-v141)
5. [Business Modules](#5-business-modules)
6. [Cross-Module Data Flywheel](#6-cross-module-data-flywheel)
7. [Command Center Contracts](#7-command-center-contracts)
8. [Edge Functions](#8-edge-functions-46-functions)
9. [Security Model](#9-security-model)
10. [File Structure](#10-file-structure)
11. [Statistics Summary](#11-statistics-summary)
12. [Documentation Index](#12-documentation-index)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

### 1.1 System Philosophy

Bluecore được xây dựng theo 3 nguyên tắc cốt lõi:

| Nguyên tắc | Mô tả |
|------------|-------|
| **Decision-First** | Mọi màn hình phục vụ ra quyết định, không phải xem báo cáo |
| **Single Source of Truth (SSOT)** | Một nguồn dữ liệu duy nhất cho mỗi metric |
| **DB-First Architecture** | Mọi tính toán thực hiện ở database, frontend chỉ hiển thị |

### 1.2 Core Manifestos

#### FDP MANIFESTO
> **TRUTH > FLEXIBILITY**
- FDP KHÔNG PHẢI PHẦN MỀM KẾ TOÁN - Phục vụ CEO/CFO điều hành
- SINGLE SOURCE OF TRUTH - 1 Net Revenue, 1 Contribution Margin, 1 Cash Position
- REAL CASH - Phân biệt: Cash đã về / sẽ về / có nguy cơ không về
- UNIT ECONOMICS → ACTION - SKU lỗ + khóa cash → phải nói STOP

#### MDP MANIFESTO
> **PROFIT BEFORE PERFORMANCE. CASH BEFORE CLICKS.**
- MDP KHÔNG PHẢI MARTECH - Đo lường GIÁ TRỊ TÀI CHÍNH THẬT của Marketing
- PROFIT ATTRIBUTION không phải Click Attribution
- Marketing đốt tiền → MDP phải phát hiện

#### CONTROL TOWER MANIFESTO
> **AWARENESS BEFORE ANALYTICS. ACTION BEFORE REPORTS.**
- Max 5-7 alerts tại mọi thời điểm
- Mỗi alert phải có: Owner + Outcome + Deadline
- Không alert → không vấn đề (im lặng có chủ đích)

### 1.3 Kiến Trúc Tổng Quan

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PLATFORM LAYER                                       │
│                         (Authentication & Tenant Management)                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│   AuthProvider → TenantProvider → DateRangeProvider → LanguageProvider           │
└───────────────────────────────┬─────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  CONTROL      │       │     DATA      │       │   PLATFORM    │
│   PLANE       │       │    PLANE      │       │   SCHEMA      │
│  (17 hooks)   │       │  (~154 hooks) │       │  (AI/Config)  │
│               │       │               │       │               │
│  • useAuth    │       │  • FDP (45+)  │       │ ai_metric_def │
│  • useTenant  │       │  • MDP (25+)  │       │ kpi_templates │
│  • useRoles   │       │  • CDP (30+)  │       │ alert_rules   │
│               │       │  • L4 (15+)   │       │               │
└───────┬───────┘       └───────┬───────┘       └───────────────┘
        │                       │
        │  supabase (direct)    │  useTenantQueryBuilder
        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE LAYER                                       │
│  ┌───────────────────────────┐    ┌───────────────────────────────────────────┐  │
│  │      PUBLIC SCHEMA        │    │         TENANT SCHEMAS                    │  │
│  │  • profiles               │    │  tenant_{id}                              │  │
│  │  • tenants                │    │  • master_orders, master_customers        │  │
│  │  • tenant_users           │    │  • decision_cards, alert_instances        │  │
│  │  • platform_modules       │    │  • kpi_facts_daily, ai_conversations      │  │
│  └───────────────────────────┘    └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State Management | TanStack Query v5, React Context |
| UI Components | Radix UI, shadcn/ui |
| Backend | Supabase (PostgreSQL 15+) |
| Edge Functions | Deno, TypeScript |
| Mobile | Capacitor (iOS/Android) |
| Charts | Recharts |
| Forms | React Hook Form, Zod |

---

## 2. DATA ARCHITECTURE (10-LAYER)

### 2.1 Layer Diagram

```text
LAYER 0: EXTERNAL/RAW DATA
┌──────────────────────────────────────────────────────────────────────────────┐
│ external_orders │ external_products │ Shopee/Lazada/TikTok API Connectors    │
│ (Staging Only - NO FRONTEND ACCESS)                                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ trigger_sync_external_to_cdp
LAYER 1: FOUNDATION (ORG/MEMBERS)
┌──────────────────────────────────────────────────────────────────────────────┐
│ organizations │ organization_members │ user_roles │ channel_accounts         │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
LAYER 1.5: INGESTION
┌──────────────────────────────────────────────────────────────────────────────┐
│ ingestion_batches │ data_watermarks │ sync_checkpoints │ connector_integ.    │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
LAYER 2: MASTER MODEL (SSOT SOURCE TABLES)
┌──────────────────────────────────────────────────────────────────────────────┐
│ master_orders │ master_customers │ master_products │ master_payments         │
│ master_refunds │ master_inventory │ master_costs │ master_suppliers          │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
LAYER 2.5: EVENTS & MARKETING
┌──────────────────────────────────────────────────────────────────────────────┐
│ commerce_events │ master_ad_accounts │ master_campaigns │ master_ad_spend    │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
LAYER 3: KPI (AGGREGATED METRICS)
┌──────────────────────────────────────────────────────────────────────────────┐
│ kpi_definitions │ kpi_facts_daily │ kpi_targets │ kpi_thresholds             │
│ central_metrics_snapshots │ dashboard_kpi_cache                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
LAYER 4: ALERT & DECISION (CONTROL TOWER)
┌──────────────────────────────────────────────────────────────────────────────┐
│ alert_rules │ alert_instances │ decision_cards │ card_actions │ evidence_logs │
│ priority_queue │ variance_alerts │ decision_outcomes                         │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
LAYER 5: AI QUERY
┌──────────────────────────────────────────────────────────────────────────────┐
│ ai_conversations │ ai_messages │ ai_query_history │ ai_favorites │ ai_insights│
│ product_forecasts │ customer_segments │ hypothesis_queries                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
LAYER 6: AUDIT
┌──────────────────────────────────────────────────────────────────────────────┐
│ sync_jobs │ sync_errors │ audit_logs │ event_logs                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
LAYER 10: BIGQUERY INTEGRATION
┌──────────────────────────────────────────────────────────────────────────────┐
│ bigquery_connections │ bigquery_sync_configs │ query_cache │ sync_watermarks │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Details

| Layer | Purpose | Tables | Access Pattern |
|-------|---------|--------|----------------|
| L0 | Raw staging | external_* | Edge functions only |
| L1 | Org structure | organizations, members | useTenantQueryBuilder |
| L1.5 | Data ingestion | batches, watermarks | Edge functions + hooks |
| L2 | Master data | master_orders, master_customers | useTenantQueryBuilder |
| L2.5 | Events/Marketing | commerce_events, campaigns | useTenantQueryBuilder |
| L3 | KPIs | kpi_facts_daily | useTenantQueryBuilder |
| L4 | Decisions | alert_instances, decision_cards | useTenantQueryBuilder |
| L5 | AI | ai_conversations | useTenantQueryBuilder |
| L6 | Audit | sync_jobs, audit_logs | useTenantQueryBuilder |
| L10 | BigQuery | bigquery_connections | useTenantQueryBuilder |

### 2.3 Total Tables: 53 per Tenant Schema

---

## 3. HOOK ARCHITECTURE

### 3.1 Control Plane (17 hooks) - Direct Supabase

These hooks access `public` schema or cross-tenant data. They use `supabase` client directly.

| Category | Hooks | Purpose |
|----------|-------|---------|
| **Auth & Identity** | `useAuth`, `useActiveTenantId`, `useIsSuperAdmin`, `useAuthRedirect`, `useImpersonation`, `useOnboardingStatus` | Authentication & authorization |
| **Tenant Management** | `useTenant`, `useTenantSession`, `useTenantSchemaStatus`, `useTenantHealth`, `useActivityTracker`, `useCSAlertsSummary` | Tenant CRUD & monitoring |
| **Platform Config** | `usePlatformModules`, `usePlatformPlans`, `usePlatformData`, `useTenantModules`, `useCapacitorPushNotifications` | Global configurations |

#### Control Plane Code Pattern
```typescript
// Control Plane hooks use supabase directly
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  // Direct supabase access for auth.users
  const { data } = await supabase.auth.getUser();
}

export function useTenant() {
  // Direct supabase access for public.tenants
  const { data } = await supabase
    .from('tenants')
    .select('*');
}
```

### 3.2 Data Plane (~154 hooks) - useTenantQueryBuilder

These hooks access tenant-specific business data. They use `useTenantQueryBuilder` for automatic schema routing.

| Module | Count | Key Hooks |
|--------|-------|-----------|
| **FDP (Finance)** | 45+ | `useFDPFinanceSSOT`, `usePLData`, `useBankData`, `useInvoiceData`, `useCashFlowDirect`, `useWorkingCapitalDaily`, `useExpensesDaily`, `useExpenseBaselines`, `useOpExBreakdown`, `useFDPAggregatedMetricsSSOT` |
| **MDP (Marketing)** | 25+ | `useMDPSSOT`, `useMDPDataSSOT`, `useChannelPLSSOT`, `useChannelBudgets`, `usePromotions`, `useMDPExtendedData`, `useMDPCEOSnapshot`, `useMarketingProfitability`, `useUnifiedChannelMetrics` |
| **CDP (Customer)** | 30+ | `useCDPEquity`, `useCDPOverview`, `useCDPLTVEngine`, `useCDPInsightFeed`, `useCDPPopulations`, `useCDPDemandInsights`, `useCDPDecisionCards`, `useProductForecast`, `useHypothesisQuery` |
| **Control Tower (L4)** | 15+ | `useAlertInstances`, `useDecisionCards`, `useOutcomeRecording`, `usePendingFollowups`, `useDecisionEffectiveness`, `useLearningInsights`, `useEstimatedActualImpact`, `useNotificationCenter`, `useAlertEscalationSSOT` |
| **Cross-Module** | 14 | `useFDPLockedCosts`, `useMDPAttributionPush`, `useCDPCohortCAC`, `useCDPCreditRisk`, `useCrossModuleVarianceAlerts`, `useCDPChurnSignals`, `useMDPChannelROI`, `useCDPSegmentLTV` |
| **Ingestion/KPI** | 5+ | `useIngestionBatches`, `useDataWatermarks`, `useKPIDefinitions`, `useKPITargets` |

#### Data Plane Code Pattern
```typescript
// Data Plane hooks use useTenantQueryBuilder
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export function useCDPEquity() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-equity', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('v_cdp_equity_summary', '*');
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });
}
```

### 3.3 Deprecated Hooks (12 - backward compat only)

| Deprecated Hook | Replacement | Reason |
|-----------------|-------------|--------|
| `useFDPMetrics` | `useFDPFinanceSSOT` | SSOT consolidation |
| `useMDPData` | `useMDPSSOT` | SSOT consolidation |
| `useFDPAggregatedMetrics` | `useFDPAggregatedMetricsSSOT` | SSOT consolidation |
| `useKPIData` | `useFinanceTruthSnapshot` | SSOT consolidation |
| `useChannelPL` | `useChannelPLSSOT` | SSOT consolidation |
| `useCDPMetrics` | `useCDPOverview` | SSOT consolidation |
| `useMarketingData` | `useMDPDataSSOT` | SSOT consolidation |
| `useAlerts` | `useAlertInstances` | Naming convention |
| `useDecisions` | `useDecisionCards` | Naming convention |
| `useCustomerEquity` | `useCDPEquity` | Module prefix |
| `useLTVData` | `useCDPLTVEngine` | Module prefix |
| `useInsightFeed` | `useCDPInsightFeed` | Module prefix |

---

## 4. SCHEMA-PER-TENANT ARCHITECTURE (v1.4.1)

### 4.1 Tiering Strategy

| Tier | Schema Mode | Isolation Level | Use Case |
|------|-------------|-----------------|----------|
| **SMB** | Shared schema + RLS | Row-level (`tenant_id` filter) | Small businesses, startups |
| **Mid-market** | Dedicated schema (`tenant_{id}`) | Schema-level | Growing companies |
| **Enterprise** | Dedicated database instance | Database-level | Large enterprises, regulated industries |

### 4.2 Query Flow Diagram

```text
Component
    │
    ▼
useTenantQueryBuilder()
    │
    ├── Check: isSchemaProvisioned
    │
    ├── TRUE → Use tenant schema (search_path = tenant_{id})
    │   └── Table: master_orders, master_customers
    │   └── No tenant_id filter needed (schema isolation)
    │
    └── FALSE → Use public schema + RLS
        └── Table: cdp_orders, cdp_customers
        └── Auto-add: .eq('tenant_id', tenantId)
```

### 4.3 Table Mapping (43+ translations)

The `tableMapping.ts` utility handles legacy-to-new table name translations:

| Legacy Name (Public) | New Name (Tenant Schema) |
|----------------------|--------------------------|
| `cdp_orders` | `master_orders` |
| `cdp_customers` | `master_customers` |
| `cdp_order_items` | `master_order_items` |
| `products` | `master_products` |
| `cdp_payments` | `master_payments` |
| `cdp_refunds` | `master_refunds` |
| `inventory` | `master_inventory` |
| `suppliers` | `master_suppliers` |
| `v_cdp_equity_summary` | `v_customer_equity_summary` |
| `v_cdp_ltv_segments` | `v_customer_ltv_segments` |

### 4.4 Session Initialization

```typescript
// tenantClient.ts
export async function initTenantSession(tenantId: string) {
  // 1. Check if schema is provisioned
  const { data: isProvisioned } = await supabase
    .rpc('is_tenant_schema_provisioned', { p_tenant_id: tenantId });

  // 2. If provisioned, set search_path
  if (isProvisioned) {
    await supabase.rpc('set_tenant_search_path', { p_tenant_id: tenantId });
  }

  // 3. Set session context
  await supabase.rpc('set_current_tenant', { p_tenant_id: tenantId });

  return { isProvisioned };
}
```

---

## 5. BUSINESS MODULES

### 5.1 FDP - Financial Data Platform (CFO)

**Manifesto:** "Truth > Flexibility" - Không phải phần mềm kế toán, phục vụ quyết định điều hành.

#### Routes & Features

| Feature | Route | Key Hooks | Description |
|---------|-------|-----------|-------------|
| Dashboard CFO | `/` | `useFinanceTruthSnapshot` | Executive overview |
| P&L Report | `/fdp/pl-report` | `usePLData` | Profit & Loss analysis |
| Cash Position | `/fdp/cash-position` | `useCashFlowDirect` | Real-time cash status |
| AR Operations | `/ar-operations` | `useTopCustomersAR` | Accounts receivable |
| Working Capital | `/fdp/working-capital` | `useWorkingCapitalDaily` | Cash cycle management |
| Unit Economics | `/unit-economics` | `useFDPFinanceSSOT` | SKU-level profitability |
| Bank Connections | `/bank-connections` | `useBankData` | Bank integrations |

#### Key Metrics

| Metric | Source View | Grain |
|--------|-------------|-------|
| Net Revenue | `v_pl_daily` | daily |
| Gross Profit | `v_pl_daily` | daily |
| Contribution Margin | `v_pl_daily` | daily |
| Cash Today | `finance_cashflow_daily` | daily |
| Cash Runway | `v_cash_runway` | daily |
| CCC (Cash Conversion Cycle) | `finance_working_capital_daily` | daily |
| DSO (Days Sales Outstanding) | `finance_working_capital_daily` | daily |
| DPO (Days Payable Outstanding) | `finance_working_capital_daily` | daily |
| DIO (Days Inventory Outstanding) | `finance_working_capital_daily` | daily |

### 5.2 MDP - Marketing Data Platform (CMO)

**Manifesto:** "Profit before Performance. Cash before Clicks."

#### Routes & Features

| Feature | Route | Key Hooks | Description |
|---------|-------|-----------|-------------|
| Marketing Hub | `/mdp` | `useMDPSSOT` | Marketing overview |
| CMO Mode | `/mdp/cmo` | `useMDPCEOSnapshot` | CMO executive view |
| Campaigns | `/mdp/campaigns` | `usePromotions` | Campaign management |
| Channels | `/mdp/channels` | `useUnifiedChannelMetrics` | Channel performance |
| Budget Optimizer | `/mdp/budget-optimizer` | `useChannelBudgets` | Budget allocation |
| Promotions | `/mdp/promotions` | `usePromotions` | Promotion tracking |

#### Key Metrics

| Metric | Source View | Grain |
|--------|-------------|-------|
| True ROAS | `v_marketing_profitability` | channel/daily |
| CPA (Cost Per Acquisition) | `v_mdp_channel_metrics` | channel/daily |
| CTR (Click-Through Rate) | `v_mdp_channel_metrics` | channel/daily |
| CVR (Conversion Rate) | `v_mdp_channel_metrics` | channel/daily |
| Cash at Risk | `v_mdp_cash_at_risk` | channel |
| Contribution Margin by Channel | `v_channel_pl_daily` | channel/daily |

### 5.3 CDP - Customer Data Platform

**Manifesto:** "Customer as Financial Asset" - Population > Individual, Shift > Snapshot.

#### Routes & Features

| Feature | Route | Key Hooks | Description |
|---------|-------|-----------|-------------|
| CDP Overview | `/cdp` | `useCDPOverview`, `useCDPEquity` | Customer equity dashboard |
| LTV Engine | `/cdp/ltv-engine` | `useCDPLTVEngine` | Lifetime value analysis |
| Insights | `/cdp/insights` | `useCDPInsightFeed` | AI-generated insights |
| Explore | `/cdp/explore` | `useCDPExplore` | Data exploration |
| Populations | `/cdp/populations` | `useCDPPopulations` | Segment management |
| Decision Cards | `/cdp/decisions` | `useCDPDecisionCards` | Customer decisions |

#### Key Metrics

| Metric | Source View | Grain |
|--------|-------------|-------|
| Total Equity (12M) | `v_cdp_equity_summary` | tenant |
| Total Equity (24M) | `v_cdp_equity_summary` | tenant |
| At-Risk Value | `v_cdp_equity_summary` | tenant |
| At-Risk % | `v_cdp_equity_summary` | tenant |
| Cohort CAC | `v_cdp_cohort_cac` | cohort/monthly |
| LTV/CAC Ratio | `v_cdp_ltv_cac_ratio` | cohort |
| Churn Risk Score | `v_cdp_churn_signals` | customer |

### 5.4 Control Tower (CEO/COO)

**Manifesto:** "Awareness before Analytics. Action before Reports."

#### Routes & Features

| Feature | Route | Key Hooks | Description |
|---------|-------|-----------|-------------|
| Command Center | `/control-tower/command` | `useControlTowerSSOT` | Main control view |
| Signals | `/control-tower/signals` | `useAlertInstances` | Active alerts |
| Queue | `/control-tower/queue` | `useDecisionCards` | Decision queue |
| Outcomes | `/control-tower/outcomes` | `useOutcomeRecording` | Outcome tracking |
| Variance | `/control-tower/variance` | `useCrossModuleVarianceAlerts` | Cross-module alerts |

#### Key Features

| Feature | Description |
|---------|-------------|
| Max 5-7 Alerts | Intentional limit to focus on critical issues |
| Owner Assignment | Every alert must have an owner |
| Outcome Tracking | Every decision must have recorded outcome |
| Auto-Escalation | Based on severity/overdue threshold |
| Cross-Module Alerts | Detects issues spanning FDP/MDP/CDP |

---

## 6. CROSS-MODULE DATA FLYWHEEL

### 6.1 Integration Flow Diagram

```text
                    CONTROL TOWER
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   ┌───────┐         ┌───────┐         ┌───────┐
   │  FDP  │◄───────►│  MDP  │◄───────►│  CDP  │
   └───────┘         └───────┘         └───────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                    CROSS-MODULE
                    (14 hooks)
```

### 6.2 12 Integration Cases

| Case | Flow | Purpose | Hook |
|------|------|---------|------|
| 2 | FDP → MDP | Locked Costs for Accurate ROAS | `useFDPLockedCosts` |
| 3 | CDP → MDP | Segment LTV for Max CAC Target | `useCDPSegmentLTV` |
| 5 | MDP → CDP | Attribution for Cohort CAC | `useMDPAttributionPush` |
| 7 | FDP → CDP | Actuals for Equity Calibration | `useFDPActualRevenue` |
| 8 | FDP → CDP | AR Aging for Credit Risk Score | `useCDPCreditRisk` |
| 9 | CDP → FDP | Customer Equity for Revenue Forecast | `useCDPRevenueAllocation` |
| 10 | MDP → FDP | Channel ROI for Budget Decisions | `useMDPChannelROI` |
| 11 | CT → All | Variance Alert Dispatch | `useCrossModuleVarianceAlerts` |
| 12 | All → CT | Priority Queue Aggregate | `usePendingDecisions` |

### 6.3 Cross-Module Hooks (14 files)

| Hook | Direction | Purpose |
|------|-----------|---------|
| `useFDPLockedCosts` | FDP → MDP | Cost data for ROAS calculation |
| `useMDPAttributionPush` | MDP → CDP | Attribution data for CAC |
| `useCDPCohortCAC` | MDP → CDP | CAC by customer cohort |
| `useCDPRevenueAllocation` | CDP → FDP | Equity to revenue forecast |
| `useCDPCreditRisk` | FDP → CDP | AR aging to credit risk |
| `useCDPSegmentLTV` | CDP ← FDP | Segment LTV values |
| `useMDPChannelROI` | MDP → FDP | Channel ROI metrics |
| `useCrossModuleVarianceAlerts` | All | Cross-module alerts |
| `useCDPChurnSignals` | CDP | Churn risk indicators |
| `useFDPActualRevenue` | FDP → All | Actual revenue truth |

---

## 7. COMMAND CENTER CONTRACTS

### 7.1 Three Mandatory Contracts

#### 1. Metric Contract (Source of Truth)

```typescript
interface MetricContract {
  metric_code: string;        // Unique identifier
  source_view: string;        // Database view name
  grain: 'daily' | 'weekly' | 'monthly';
  domain: 'FDP' | 'MDP' | 'CDP' | 'CT';
  version: string;            // Semantic versioning
  is_actionable: boolean;     // Can trigger decisions
  calculation_logic: string;  // SQL or description
}
```

#### 2. Evidence Contract (Auditability)

```typescript
interface EvidenceContract {
  as_of_timestamp: string;    // Data timestamp
  source_tables: string[];    // Tables used
  data_quality_flags: {
    completeness: number;     // 0-1
    freshness_hours: number;  // Hours since last update
    accuracy_score: number;   // 0-1
  };
  confidence_score: number;   // 0-1
}
```

#### 3. Decision Contract (Standardized Structure)

```typescript
interface DecisionContract {
  domain: 'FDP' | 'MDP' | 'CDP' | 'CT';
  entity_type: string;        // 'customer' | 'product' | 'campaign'
  entity_id: string;          // Specific entity reference
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  owner_role: string;         // Role responsible
  facts: Fact[];              // Supporting facts
  actions: Action[];          // Available actions
  evidence: Evidence;         // Audit trail
}
```

### 7.2 Escalation Rules

```text
Auto-escalate to Control Tower when:
┌────────────────────────────────────────────────────┐
│ 1. Severity >= CRITICAL                            │
│ 2. Overdue by >= 4 hours                          │
│ 3. Impact >= 100,000,000 VND                      │
│ 4. Owner unresponsive for >= 2 hours              │
│ 5. Related alerts count >= 3                       │
└────────────────────────────────────────────────────┘
```

---

## 8. EDGE FUNCTIONS (46 functions)

### 8.1 By Category

| Category | Functions | Description |
|----------|-----------|-------------|
| **AI/Analysis** | `analyze-contextual`, `analyze-financial-data`, `decision-advisor`, `generate-insights`, `hypothesis-query` | AI-powered analysis |
| **CDP** | `cdp-qa`, `scheduled-cdp-build`, `calculate-ltv`, `segment-customers` | Customer data processing |
| **Sync** | `sync-bigquery`, `sync-ecommerce-data`, `scheduled-sync`, `sync-bank-data` | Data synchronization |
| **Alerts** | `detect-alerts`, `detect-cross-domain-alerts`, `process-alert-notifications`, `escalate-alerts` | Alert management |
| **Tenant** | `create-tenant-self`, `provision-tenant-schema`, `migrate-tenant-data`, `clone-tenant-template` | Tenant operations |
| **Decisions** | `generate-decision-cards`, `decision-snapshots`, `auto-measure-outcomes`, `record-outcome` | Decision tracking |
| **Notifications** | `send-email`, `send-push-notification`, `process-webhooks` | Notification delivery |
| **Reports** | `generate-pdf-report`, `export-data`, `schedule-report` | Report generation |

### 8.2 Key Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `detect-alerts` | Scheduled (5min) | Scan for threshold breaches |
| `generate-decision-cards` | Alert triggered | Create decision cards from alerts |
| `auto-measure-outcomes` | Scheduled (daily) | Measure decision outcomes |
| `sync-bigquery` | Scheduled (hourly) | Sync data to BigQuery |
| `provision-tenant-schema` | On tenant upgrade | Create dedicated schema |

---

## 9. SECURITY MODEL

### 9.1 Dual-Level Isolation

```text
┌─────────────────────────────────────────────────────────────────┐
│                     SCHEMA ISOLATION                             │
│            (tenant_id → tenant_{id} schema)                      │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    RLS POLICIES                          │   │
│   │         (org_id/brand_id within schema)                  │   │
│   │                                                          │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │              SESSION CONTEXT                     │   │   │
│   │   │   app.current_tenant, app.current_org            │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Access Pattern by Layer

| Layer | Access Method | Filter | Example |
|-------|---------------|--------|---------|
| Control Plane | `supabase` (direct) | No tenant filter | `useAuth`, `useTenant` |
| Data Plane | `useTenantQueryBuilder` | Auto tenant filter/schema | `useCDPEquity`, `usePLData` |
| Platform Tables | `supabase` (direct) | Cross-tenant allowed | `usePlatformModules` |

### 9.3 RLS Policy Pattern

```sql
-- Example RLS policy for tenant isolation
CREATE POLICY "tenant_isolation" ON master_orders
FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant', true)::uuid
);

-- Example RLS policy for org/brand isolation within tenant
CREATE POLICY "org_isolation" ON master_orders
FOR ALL
USING (
  org_id = current_setting('app.current_org', true)::uuid
);
```

---

## 10. FILE STRUCTURE

```text
src/
├── hooks/                    # ~180 files
│   ├── cdp/                  # CDP-specific (2 files)
│   │   ├── useHypothesisQuery.ts
│   │   └── useProductForecast.ts
│   ├── control-tower/        # Control Tower (6 files)
│   │   ├── useDecisionEffectiveness.ts
│   │   ├── useEstimatedActualImpact.ts
│   │   ├── useLearningInsights.ts
│   │   ├── useOutcomeRecording.ts
│   │   ├── usePendingFollowups.ts
│   │   └── index.ts
│   ├── cross-module/         # Cross-module bridges (14 files)
│   │   ├── useCDPChurnSignals.ts
│   │   ├── useCDPCreditRisk.ts
│   │   ├── useFDPLockedCosts.ts
│   │   ├── useMDPChannelROI.ts
│   │   └── ... (10 more)
│   ├── ingestion/            # Data ingestion (3 files)
│   │   ├── useDataWatermarks.ts
│   │   ├── useIngestionBatches.ts
│   │   └── index.ts
│   ├── kpi/                  # KPI management (3 files)
│   │   ├── useKPIDefinitions.ts
│   │   ├── useKPITargets.ts
│   │   └── index.ts
│   └── (root)                # Core + domain hooks (~150 files)
│       ├── useTenantQueryBuilder.ts    # 🔑 Core query builder
│       ├── useTenantSupabase.ts        # 🔑 Compat layer
│       ├── useAuth.tsx                 # Platform layer
│       ├── useTenant.ts                # Platform layer
│       ├── useFDPFinanceSSOT.ts        # FDP SSOT
│       ├── useMDPSSOT.ts               # MDP SSOT
│       ├── useCDPEquity.ts             # CDP SSOT
│       └── ...
├── pages/                    # ~70 pages
│   ├── admin/                # Super admin pages
│   ├── cdp/                  # Customer platform
│   ├── control-tower/        # Control Tower views
│   ├── fdp/                  # Finance platform
│   ├── mdp/                  # Marketing platform
│   └── onboarding/           # Onboarding flow
├── components/               # ~40 component directories
│   ├── cdp/                  # CDP components
│   ├── control-tower/        # Control Tower components
│   ├── dashboard/            # Dashboard components
│   ├── fdp/                  # FDP components
│   ├── mdp/                  # MDP components
│   └── ui/                   # Shared UI components
├── contexts/                 # React contexts (5 files)
│   ├── AuthContext.tsx
│   ├── TenantContext.tsx
│   ├── DateRangeContext.tsx
│   ├── LanguageContext.tsx
│   └── ThemeContext.tsx
├── lib/                      # Utilities
│   ├── command-center/       # Federated Command Center
│   ├── tableMapping.ts       # Schema translation
│   └── utils.ts              # General utilities
└── integrations/
    └── supabase/
        ├── client.ts         # Auto-generated
        ├── types.ts          # Auto-generated
        └── tenantClient.ts   # Tenant session management
```

---

## 11. STATISTICS SUMMARY

| Category | Count |
|----------|-------|
| Total Hooks | ~183 |
| Control Plane Hooks | 17 |
| Data Plane Hooks | ~154 |
| Deprecated Hooks | 12 |
| Edge Functions | 46 |
| Pages | ~70 |
| Tables per Tenant | 53 |
| Cross-Module Flows | 12 |
| Command Center Domains | 4 (FDP, MDP, CDP, CT) |

### Component Breakdown

| Component Type | Count |
|----------------|-------|
| React Components | ~200 |
| Custom Hooks | ~183 |
| Context Providers | 5 |
| Edge Functions | 46 |
| Database Views | 50+ |
| RLS Policies | 100+ |

---

## 12. DOCUMENTATION INDEX

| Document | Location | Purpose |
|----------|----------|---------|
| Hooks Layer Audit | `docs/HOOKS_LAYER_AUDIT.md` | Hook classification by layer |
| Hooks Architecture Audit | `docs/HOOKS_ARCHITECTURE_AUDIT.md` | Migration status tracking |
| System Data Architecture | `docs/SYSTEM-DATA-ARCHITECTURE-2026-01-27.md` | Data flow & metrics |
| Dependency Architecture | `docs/DEPENDENCY-ARCHITECTURE.md` | Layer dependencies |
| Cross-Module Flywheel | `docs/CROSS-MODULE-FLYWHEEL-PLAN.md` | Integration flows |
| Governance Protocol | `docs/GOVERNANCE-PROTOCOL.md` | Change management |
| SSOT Compliance | `docs/SSOT-COMPLIANCE.md` | DB-First rules |
| System Features | `docs/SYSTEM_FEATURES_DOCUMENTATION.md` | Feature descriptions |

---

## APPENDIX A: Quick Reference

### A.1 Hook Selection Guide

```text
Need to access...
│
├── Auth/User data?
│   └── Use supabase directly (Control Plane)
│
├── Tenant management?
│   └── Use supabase directly (Control Plane)
│
├── Platform config (modules, plans)?
│   └── Use supabase directly (Control Plane)
│
└── Business data (orders, customers, etc.)?
    └── Use useTenantQueryBuilder (Data Plane)
```

### A.2 Common Query Patterns

```typescript
// Control Plane query
const { data } = await supabase
  .from('tenants')
  .select('*')
  .eq('id', tenantId);

// Data Plane query
const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
const { data } = await buildSelectQuery('master_orders', '*')
  .gte('order_date', startDate)
  .lte('order_date', endDate);
```

### A.3 Route Reference

| Module | Base Route | Key Pages |
|--------|------------|-----------|
| FDP | `/fdp` | `/fdp/pl-report`, `/fdp/cash-position` |
| MDP | `/mdp` | `/mdp/cmo`, `/mdp/campaigns` |
| CDP | `/cdp` | `/cdp/ltv-engine`, `/cdp/insights` |
| Control Tower | `/control-tower` | `/control-tower/command`, `/control-tower/queue` |
| Admin | `/admin` | `/admin/tenants`, `/admin/users` |

---

**Document Version:** 1.4.1  
**Last Updated:** 2026-02-06  
**Maintained By:** Bluecore Engineering Team
