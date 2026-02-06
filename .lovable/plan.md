
# BLUECORE SYSTEM ARCHITECTURE DOCUMENTATION v1.4.1
## Comprehensive Technical & Business Reference

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

### 1.1 System Philosophy

Bluecore được xây dựng theo 3 nguyên tắc cốt lõi:

| Nguyên tắc | Mô tả |
|------------|-------|
| **Decision-First** | Mọi màn hình phục vụ ra quyết định, không phải xem báo cáo |
| **Single Source of Truth (SSOT)** | Một nguồn dữ liệu duy nhất cho mỗi metric |
| **DB-First Architecture** | Mọi tính toán thực hiện ở database, frontend chỉ hiển thị |

### 1.2 Kiến trúc Tổng quan

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

### 2.2 Total Tables: 53 per Tenant Schema

---

## 3. HOOK ARCHITECTURE

### 3.1 Control Plane (17 hooks) - Direct Supabase

| Category | Hooks | Purpose |
|----------|-------|---------|
| **Auth & Identity** | useAuth, useActiveTenantId, useIsSuperAdmin, useAuthRedirect, useImpersonation, useOnboardingStatus | Authentication & authorization |
| **Tenant Management** | useTenant, useTenantSession, useTenantSchemaStatus, useTenantHealth, useActivityTracker, useCSAlertsSummary | Tenant CRUD & monitoring |
| **Platform Config** | usePlatformModules, usePlatformPlans, usePlatformData, useTenantModules, useCapacitorPushNotifications | Global configurations |

### 3.2 Data Plane (~154 hooks) - useTenantQueryBuilder

| Module | Hooks | Key Examples |
|--------|-------|--------------|
| **FDP (Finance)** | 45+ | useFDPFinanceSSOT, usePLData, useBankData, useInvoiceData, useCashFlowDirect, useWorkingCapitalDaily |
| **MDP (Marketing)** | 25+ | useMDPSSOT, useMDPDataSSOT, useChannelPLSSOT, useChannelBudgets, usePromotions |
| **CDP (Customer)** | 30+ | useCDPEquity, useCDPOverview, useCDPLTVEngine, useCDPInsightFeed, useCDPPopulations |
| **Control Tower (L4)** | 15+ | useAlertInstances, useDecisionCards, useOutcomeRecording, usePendingFollowups, useDecisionEffectiveness |
| **Cross-Module** | 14 | useFDPLockedCosts, useMDPAttributionPush, useCDPCohortCAC, useCDPCreditRisk, useCrossModuleVarianceAlerts |
| **Ingestion/KPI** | 5+ | useIngestionBatches, useDataWatermarks, useKPIDefinitions, useKPITargets |

### 3.3 Deprecated Hooks (12 - backward compat only)

| Hook | Replacement |
|------|-------------|
| useFDPMetrics | useFDPFinanceSSOT |
| useMDPData | useMDPSSOT |
| useFDPAggregatedMetrics | useFDPAggregatedMetricsSSOT |
| useKPIData | useFinanceTruthSnapshot |
| useChannelPL | useChannelPLSSOT |

---

## 4. SCHEMA-PER-TENANT ARCHITECTURE (v1.4.1)

### 4.1 Tiering Strategy

| Tier | Schema Mode | Isolation Level |
|------|-------------|-----------------|
| **SMB** | Shared schema + RLS | Row-level (tenant_id filter) |
| **Mid-market** | Dedicated schema (tenant_{id}) | Schema-level |
| **Enterprise** | Dedicated database instance | Database-level |

### 4.2 Query Flow

```text
Component
    │
    ▼
useTenantQueryBuilder()
    │
    ├── isSchemaProvisioned = true → Use tenant schema (search_path)
    │   └── Table: master_orders, master_customers
    │
    └── isSchemaProvisioned = false → Use public schema + RLS
        └── Table: cdp_orders, cdp_customers
        └── Auto-add: .eq('tenant_id', tenantId)
```

### 4.3 Table Mapping (43+ translations)

| Legacy Name | New Name (Provisioned) |
|-------------|------------------------|
| cdp_orders | master_orders |
| cdp_customers | master_customers |
| cdp_order_items | master_order_items |
| products | master_products |
| decision_cards | decision_cards |
| alert_instances | alert_instances |

---

## 5. BUSINESS MODULES

### 5.1 FDP - Financial Data Platform (CFO)

**Manifesto:** "Truth > Flexibility" - Không phải phần mềm kế toán, phục vụ quyết định điều hành.

| Feature | Route | Key Hooks |
|---------|-------|-----------|
| Dashboard CFO | `/` | useFinanceTruthSnapshot |
| P&L Report | `/fdp/pl-report` | usePLData |
| Cash Position | `/fdp/cash-position` | useCashFlowDirect |
| AR Operations | `/ar-operations` | useTopCustomersAR |
| Working Capital | `/fdp/working-capital` | useWorkingCapitalDaily |
| Unit Economics | `/unit-economics` | useFDPFinanceSSOT |

**Key Metrics:**
- Net Revenue, Gross Profit, Contribution Margin
- Cash Today, Cash Runway, CCC
- DSO, DPO, DIO

### 5.2 MDP - Marketing Data Platform (CMO)

**Manifesto:** "Profit before Performance. Cash before Clicks."

| Feature | Route | Key Hooks |
|---------|-------|-----------|
| Marketing Hub | `/mdp` | useMDPSSOT |
| CMO Mode | `/mdp/cmo` | useMDPCEOSnapshot |
| Campaigns | `/mdp/campaigns` | usePromotions |
| Channels | `/mdp/channels` | useUnifiedChannelMetrics |
| Budget Optimizer | `/mdp/budget-optimizer` | useChannelBudgets |

**Key Metrics:**
- True ROAS, CPA, CTR, CVR
- Cash at Risk, Cash Conversion
- Contribution Margin by Channel

### 5.3 CDP - Customer Data Platform

**Manifesto:** "Customer as Financial Asset" - Population > Individual, Shift > Snapshot.

| Feature | Route | Key Hooks |
|---------|-------|-----------|
| CDP Overview | `/cdp` | useCDPOverview, useCDPEquity |
| LTV Engine | `/cdp/ltv-engine` | useCDPLTVEngine |
| Insights | `/cdp/insights` | useCDPInsightFeed |
| Explore | `/cdp/explore` | useCDPExplore |
| Populations | `/cdp/populations` | useCDPPopulations |
| Decision Cards | `/cdp/decisions` | useCDPDecisionCards |

**Key Metrics:**
- Total Equity (12M/24M)
- At-Risk Value & %
- Cohort CAC, LTV/CAC Ratio

### 5.4 Control Tower (CEO/COO)

**Manifesto:** "Awareness before Analytics. Action before Reports."

| Feature | Route | Key Hooks |
|---------|-------|-----------|
| Command Center | `/control-tower/command` | useControlTowerSSOT |
| Signals | `/control-tower/signals` | useAlertInstances |
| Queue | `/control-tower/queue` | useDecisionCards |
| Outcomes | `/control-tower/outcomes` | useOutcomeRecording |
| Variance | `/control-tower/variance` | useCrossModuleVarianceAlerts |

**Key Features:**
- Max 5-7 alerts at any time
- Each alert has Owner + Outcome
- Auto-escalation based on severity/overdue

---

## 6. CROSS-MODULE DATA FLYWHEEL

### 6.1 12 Integration Flows

```text
                    CONTROL TOWER
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   ┌───────┐         ┌───────┐         ┌───────┐
   │  FDP  │◄───────►│  MDP  │◄───────►│  CDP  │
   └───────┘         └───────┘         └───────┘

Case 2: FDP → MDP: Locked Costs for Accurate ROAS
Case 3: CDP → MDP: Segment LTV for Max CAC Target
Case 5: MDP → CDP: Attribution for Cohort CAC
Case 7: FDP → CDP: Actuals for Equity Calibration
Case 8: FDP → CDP: AR Aging for Credit Risk Score
Case 11: CT → All: Variance Alert Dispatch
Case 12: All → CT: Priority Queue Aggregate
```

### 6.2 Cross-Module Hooks (14 files)

| Hook | Direction | Purpose |
|------|-----------|---------|
| useFDPLockedCosts | FDP → MDP | Cost data for ROAS |
| useMDPAttributionPush | MDP → CDP | Attribution for CAC |
| useCDPCohortCAC | MDP → CDP | CAC by cohort |
| useCDPRevenueAllocation | CDP → FDP | Equity to forecast |
| useCDPCreditRisk | FDP → CDP | AR aging to risk |
| useCDPSegmentLTV | CDP ← FDP | Segment LTV |
| useMDPChannelROI | MDP → FDP | Channel ROI |
| useCrossModuleVarianceAlerts | All | Cross-module alerts |

---

## 7. COMMAND CENTER CONTRACTS

### 7.1 Three Mandatory Contracts

1. **Metric Contract**: Source of Truth
   - metric_code, source_view, grain, domain
   - version tracking, is_actionable flag

2. **Evidence Contract**: Auditability
   - as_of_timestamp, source_tables
   - data_quality_flags, confidence_score

3. **Decision Contract**: Standardized Structure
   - domain, entity_type, entity_id
   - severity, status, owner_role
   - facts[], actions[], evidence

### 7.2 Escalation Rules

```text
Auto-escalate to Control Tower when:
- Severity >= CRITICAL
- Overdue by >= 4 hours
- Impact >= 100,000,000 VND
```

---

## 8. EDGE FUNCTIONS (46 functions)

| Category | Functions |
|----------|-----------|
| **AI/Analysis** | analyze-contextual, analyze-financial-data, decision-advisor |
| **CDP** | cdp-qa, scheduled-cdp-build |
| **Sync** | sync-bigquery, sync-ecommerce-data, scheduled-sync |
| **Alerts** | detect-alerts, detect-cross-domain-alerts, process-alert-notifications |
| **Tenant** | create-tenant-self, provision-tenant-schema, migrate-tenant-data |
| **Decisions** | generate-decision-cards, decision-snapshots, auto-measure-outcomes |

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

### 9.2 Access Pattern

| Layer | Access Method | Filter |
|-------|---------------|--------|
| Control Plane | supabase (direct) | No tenant filter |
| Data Plane | useTenantQueryBuilder | Auto tenant filter/schema |
| Platform Tables | supabase (direct) | Cross-tenant allowed |

---

## 10. FILE STRUCTURE

```text
src/
├── hooks/                    # ~180 files
│   ├── cdp/                  # CDP-specific (2 files)
│   ├── control-tower/        # Control Tower (6 files)
│   ├── cross-module/         # Cross-module bridges (14 files)
│   ├── ingestion/            # Data ingestion (3 files)
│   ├── kpi/                  # KPI management (3 files)
│   └── (root)                # Core + domain hooks (~150 files)
├── pages/                    # ~70 pages
│   ├── admin/                # Super admin pages
│   ├── cdp/                  # Customer platform
│   ├── control-tower/        # Control Tower views
│   ├── fdp/                  # Finance platform
│   ├── mdp/                  # Marketing platform
│   └── onboarding/           # Onboarding flow
├── components/               # ~40 component directories
├── contexts/                 # React contexts (5 files)
├── lib/                      # Utilities
│   ├── command-center/       # Federated Command Center
│   └── tableMapping.ts       # Schema translation
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

---

## 12. DOCUMENTATION INDEX

| Document | Purpose |
|----------|---------|
| `docs/HOOKS_LAYER_AUDIT.md` | Hook classification by layer |
| `docs/HOOKS_ARCHITECTURE_AUDIT.md` | Migration status tracking |
| `docs/SYSTEM-DATA-ARCHITECTURE-2026-01-27.md` | Data flow & metrics |
| `docs/DEPENDENCY-ARCHITECTURE.md` | Layer dependencies |
| `docs/CROSS-MODULE-FLYWHEEL-PLAN.md` | Integration flows |
| `docs/GOVERNANCE-PROTOCOL.md` | Change management |
| `docs/SSOT-COMPLIANCE.md` | DB-First rules |
| `docs/SYSTEM_FEATURES_DOCUMENTATION.md` | Feature descriptions |

---

## IMPLEMENTATION PLAN

Tôi sẽ tạo file documentation chi tiết tại:

**`docs/BLUECORE_SYSTEM_ARCHITECTURE_v1.4.1.md`**

File này sẽ bao gồm:
1. Tất cả nội dung trên với định dạng Markdown chuẩn
2. ASCII diagrams cho mọi kiến trúc
3. Bảng tra cứu nhanh cho hooks, routes, tables
4. Cross-references giữa các sections
5. Index tìm kiếm theo keyword
