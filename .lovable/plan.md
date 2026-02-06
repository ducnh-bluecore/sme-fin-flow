

# PLAN: VIẾT LẠI E2E TEST SUITE THEO ARCHITECTURE v1.4.2

## 1. VẤN ĐỀ HIỆN TẠI

E2E Test hiện tại sử dụng layer structure **không nhất quán** với Architecture v1.4.2:

```text
HIỆN TẠI (SAI):
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 0-1: Source → products, cdp_customers, cdp_orders            │
│ Layer 2: Computed → cdp_customer_equity_computed                    │
│ Layer 3-4: Cross-Module → fdp_locked_costs, control_tower          │
└─────────────────────────────────────────────────────────────────────┘

ARCHITECTURE v1.4.2 (ĐÚNG):
┌─────────────────────────────────────────────────────────────────────┐
│ L0: Raw/External → external_orders, external_products (Staging)     │
│ L1: Foundation → organizations, organization_members, channel_accounts
│ L1.5: Ingestion → ingestion_batches, data_watermarks               │
│ L2: Master Model → master_orders, master_customers, master_products│
│ L2.5: Events → commerce_events, master_campaigns, master_ad_spend  │
│ L3: KPI → kpi_definitions, kpi_facts_daily, kpi_targets            │
│ L4: Alert/Decision → alert_instances, decision_cards, priority_queue
│ L5: AI Query → ai_conversations, ai_messages                        │
│ L6: Audit → sync_jobs, audit_logs                                   │
│ L10: BigQuery → bigquery_connections, sync_configs                  │
└─────────────────────────────────────────────────────────────────────┘
```

### SAI LẦM CHÍNH:
1. **Đặt Products/Customers vào Layer 0-1** - Đây là Master Model (Layer 2)
2. **Nhầm cdp_orders là Source** - cdp_orders là CDP view, Master Model là master_orders
3. **Bỏ qua Layer 1 (Foundation)** - Không test organizations, members
4. **Bỏ qua Layer 1.5 (Ingestion)** - Không test batches, watermarks
5. **Bỏ qua Layer 2.5 (Events)** - Không test campaigns, ad_spend
6. **Đưa control_tower vào Layer 3-4 chung** - Layer 3 là KPI, Layer 4 là Alert riêng
7. **Còn reference external_orders** - Script 05 tạo external_orders nhưng đã deprecated

---

## 2. CẤU TRÚC E2E TEST MỚI (v1.4.2 COMPLIANT)

### 2.1 File Structure Mới

```text
supabase/e2e-test/
├── README.md                              # Updated architecture docs
├── expected-values.json                   # Updated layer structure
│
├── L0-raw/
│   └── 00-raw-external-data.sql          # (SKIP - Staging only, no test)
│
├── L1-foundation/
│   ├── 01-create-tenant.sql              # Tenant + connectors
│   └── 02-organizations.sql              # Organizations, members, roles
│
├── L1.5-ingestion/
│   └── 03-ingestion-batches.sql          # Batches, watermarks, checkpoints
│
├── L2-master/
│   ├── 04-master-products.sql            # 100 SKUs
│   ├── 05-master-customers.sql           # 500 customers
│   ├── 06-master-orders.sql              # 5,500 orders
│   └── 07-master-order-items.sql         # Order line items
│
├── L2.5-events/
│   ├── 08-commerce-events.sql            # Page views, add to cart, checkout
│   └── 09-marketing-campaigns.sql        # Campaigns, ad accounts, ad spend
│
├── L3-kpi/
│   ├── 10-kpi-definitions.sql            # KPI metadata
│   ├── 11-run-kpi-aggregation.sql        # [DB-First] Compute kpi_facts_daily
│   └── 12-kpi-targets.sql                # Targets vs Actual
│
├── L4-alert/
│   ├── 13-alert-rules.sql                # Alert rule definitions
│   ├── 14-run-alert-detection.sql        # [DB-First] Detect variances
│   └── 15-decision-cards.sql             # Decision cards, outcomes
│
├── verify/
│   ├── 20-verify-layer-integrity.sql     # Layer-by-layer verification
│   └── 21-verify-ui-screens.sql          # Screen-by-screen verification
│
└── cleanup/
    └── 99-cleanup-test-data.sql          # Remove test tenant data
```

### 2.2 Layer Flow Diagram Mới

```text
L1 FOUNDATION (Setup)
┌──────────────────────────────────────────────────────────────────────────────┐
│ tenant: E2E Test Company                                                      │
│ organization: OLV Boutique                                                    │
│ members: owner, admin, analyst                                                │
│ channel_accounts: Shopee, Lazada, TikTok Shop, Website                        │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        ▼
L1.5 INGESTION
┌──────────────────────────────────────────────────────────────────────────────┐
│ ingestion_batches: 4 batches (1 per channel)                                 │
│ data_watermarks: 4 watermarks with last_sync timestamps                      │
│ connector_integrations: 4 active integrations                                │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        ▼
L2 MASTER MODEL (SSOT)
┌──────────────────────────────────────────────────────────────────────────────┐
│ master_products: 100 SKUs (5 categories)                                     │
│ master_customers: 500 customers (4 tiers)                                    │
│ master_orders: 5,500 orders (25 months, 4 channels)                          │
│ master_order_items: ~12,100 items (2.2 items/order)                          │
│ master_payments: 5,500 payments                                              │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        ▼
L2.5 EVENTS & MARKETING
┌──────────────────────────────────────────────────────────────────────────────┐
│ commerce_events: ~27,500 events (5 events/order)                             │
│ master_ad_accounts: 4 accounts (1 per channel)                               │
│ master_campaigns: 50 campaigns (25 months x 2)                               │
│ master_ad_spend: 100 spend records                                           │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        ▼ compute_kpi_facts_daily()
L3 KPI (AGGREGATED)
┌──────────────────────────────────────────────────────────────────────────────┐
│ kpi_definitions: 20 definitions (Revenue, COGS, Margin, CAC, LTV, etc)       │
│ kpi_facts_daily: ~760 rows (25 months x 30 days, aggregated)                 │
│ kpi_targets: 100 targets (20 KPIs x 5 periods)                               │
│ kpi_thresholds: 60 thresholds (20 KPIs x 3 severity levels)                  │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        ▼ detect_threshold_breaches()
L4 ALERT & DECISION
┌──────────────────────────────────────────────────────────────────────────────┐
│ alert_rules: 15 rules (based on KPI thresholds)                              │
│ alert_instances: 5-15 active alerts                                          │
│ decision_cards: 10-20 cards (actionable items)                               │
│ priority_queue: 5-10 prioritized items                                       │
│ evidence_logs: Linked evidence for each alert                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT THAY ĐỔI

### 3.1 README.md Mới

```text
# E2E Test Suite - Bluecore Platform v1.4.2

## Architecture

| Layer | Tables | Script | Purpose |
|-------|--------|--------|---------|
| L0 | external_* | SKIP | Staging only, không test |
| L1 | organizations, members | 01, 02 | Foundation setup |
| L1.5 | ingestion_batches | 03 | Data pipeline tracking |
| L2 | master_orders, master_customers | 04-07 | SSOT Master Model |
| L2.5 | commerce_events, campaigns | 08-09 | Events & Marketing |
| L3 | kpi_facts_daily, kpi_targets | 10-12 | KPI aggregation |
| L4 | alert_instances, decision_cards | 13-15 | Control Tower |
```

### 3.2 expected-values.json Mới

```json
{
  "meta": {
    "version": "3.0",
    "architecture": "v1.4.2 10-Layer"
  },
  "layer_1_foundation": {
    "tenants": { "count": 1 },
    "organizations": { "count": 1 },
    "organization_members": { "count": 3 },
    "channel_accounts": { "count": 4 }
  },
  "layer_1_5_ingestion": {
    "ingestion_batches": { "count": 4 },
    "data_watermarks": { "count": 4 }
  },
  "layer_2_master": {
    "master_products": { "count": 100 },
    "master_customers": { "count": 500 },
    "master_orders": { "count": 5500 },
    "master_order_items": { "count": 12100 }
  },
  "layer_2_5_events": {
    "commerce_events": { "count": 27500 },
    "master_campaigns": { "count": 50 }
  },
  "layer_3_kpi": {
    "kpi_definitions": { "count": 20 },
    "kpi_facts_daily": { "count_min": 700 },
    "kpi_targets": { "count": 100 }
  },
  "layer_4_alert": {
    "alert_instances": { "count_range": [5, 15] },
    "decision_cards": { "count_range": [10, 20] },
    "priority_queue": { "count_range": [5, 10] }
  }
}
```

### 3.3 Scripts Thay Đổi

| Old Script | New Script | Thay Đổi |
|------------|------------|----------|
| 00-create-test-tenant.sql | L1-foundation/01-create-tenant.sql | Giữ nguyên |
| 01-products.sql | L2-master/04-master-products.sql | Đổi table: products → master_products |
| 02-customers.sql | L2-master/05-master-customers.sql | Đổi table: cdp_customers → master_customers |
| 03-orders.sql | L2-master/06-master-orders.sql | Đổi table: cdp_orders → master_orders |
| 04-order-items.sql | L2-master/07-master-order-items.sql | Đổi table: cdp_order_items → master_order_items |
| 05-external-orders.sql | (DELETED) | XÓA - Không còn external_orders flow |
| 06-run-compute-pipeline.sql | L3-kpi/11-run-kpi-aggregation.sql | Đổi logic: CDP → KPI aggregation |
| 07-fdp-locked-costs.sql | L3-kpi/12-kpi-targets.sql | Đổi table: fdp_locked_costs → kpi_targets |
| 08-run-cross-module-sync.sql | L4-alert/14-run-alert-detection.sql | Đổi logic: Cross-module → Alert detection |
| 09-verify-expected.sql | verify/20-verify-layer-integrity.sql | Rewrite theo layer mới |
| 10-comprehensive-verify.sql | verify/21-verify-ui-screens.sql | Update table references |

---

## 4. EXPECTED VALUES CHÍNH

### L2 Master Model

| Metric | Expected | Tolerance |
|--------|----------|-----------|
| Total Orders | 5,500 | 2% |
| Total Gross Revenue | ~₫2.7B VND | 10% |
| Total Net Revenue | ~₫2.35B VND | 10% |
| COGS % | 53% | 3% |
| Total Customers | 500 | 0% |
| Active Customers (90d) | ~350 | 10% |

### L3 KPI

| Metric | Expected | Source |
|--------|----------|--------|
| Revenue KPI Facts | 760+ rows | Aggregated from master_orders |
| AOV Daily | ~₫430K | Computed |
| Monthly Margin | ~₫380M | Computed |

### L4 Control Tower

| Metric | Expected | Range |
|--------|----------|-------|
| Alert Instances | 5-15 | Auto-generated |
| Decision Cards | 10-20 | Auto-generated |
| Priority Queue | 5-10 | Highest severity |

---

## 5. KẾ HOẠCH THỰC HIỆN

### Phase 1: Tạo Structure Mới (1h)
- Tạo folder structure mới
- Tạo README.md v3.0
- Tạo expected-values.json v3.0

### Phase 2: Migrate Existing Scripts (2h)
- L1: 01, 02 (Foundation)
- L1.5: 03 (Ingestion - NEW)
- L2: 04-07 (Master Model - migrate from cdp_* to master_*)

### Phase 3: Tạo Scripts Mới (2h)
- L2.5: 08, 09 (Events & Marketing - NEW)
- L3: 10-12 (KPI - rewrite từ CDP equity sang KPI facts)
- L4: 13-15 (Alert - rewrite từ cross-module sang alert detection)

### Phase 4: Verification Scripts (1h)
- 20-verify-layer-integrity.sql (Layer-by-layer)
- 21-verify-ui-screens.sql (Screen mapping)

### Phase 5: Delete Old Scripts (0.5h)
- Xóa 05-external-orders.sql
- Archive old scripts

### Total Estimated: 6-7 hours

---

## 6. TABLE MAPPING CHI TIẾT

```text
OLD TABLE (E2E cũ)          → NEW TABLE (v1.4.2)
─────────────────────────────────────────────────
products                    → master_products
cdp_customers              → master_customers  
cdp_orders                 → master_orders
cdp_order_items            → master_order_items
external_orders            → (DELETED)
external_order_items       → (DELETED)
cdp_customer_equity_computed → kpi_facts_daily (aggregated)
fdp_locked_costs           → kpi_targets
cdp_segment_ltv_for_mdp    → kpi_facts_daily (segment)
cdp_customer_cohort_cac    → kpi_facts_daily (cohort)
cross_domain_variance_alerts → alert_instances
control_tower_priority_queue → priority_queue
```

---

## 7. VERIFICATION OUTPUT MỚI

```text
═══════════════════════════════════════════════════════════════════════
                E2E TEST VERIFICATION - ARCHITECTURE v1.4.2             
═══════════════════════════════════════════════════════════════════════

LAYER       │ TOTAL │ PASSED │ FAILED │ WARNINGS
────────────┼───────┼────────┼────────┼─────────
L1_FOUND    │   4   │   4    │   0    │    0
L1.5_INGEST │   2   │   2    │   0    │    0
L2_MASTER   │   6   │   6    │   0    │    0
L2.5_EVENTS │   3   │   3    │   0    │    0
L3_KPI      │   5   │   5    │   0    │    0
L4_ALERT    │   4   │   4    │   0    │    0
────────────┼───────┼────────┼────────┼─────────
OVERALL     │  24   │  24    │   0    │    0

✅ ALL LAYERS VERIFIED - ARCHITECTURE v1.4.2 COMPLIANT
```

