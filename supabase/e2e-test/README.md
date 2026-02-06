# E2E Test Suite - Bluecore Platform v1.4.2

## 📋 Overview

E2E Test Suite aligned with **Architecture v1.4.2 10-Layer Structure**.
Tests the complete data flow from Foundation → Master Model → KPI → Alert/Decision.

## 🏗️ Architecture v1.4.2 Layers

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ L1 FOUNDATION: tenants, organizations, organization_members, channel_accounts│
├─────────────────────────────────────────────────────────────────────────────┤
│ L1.5 INGESTION: ingestion_batches, data_watermarks, connector_integrations  │
├─────────────────────────────────────────────────────────────────────────────┤
│ L2 MASTER MODEL (SSOT): master_orders, master_customers, master_products    │
├─────────────────────────────────────────────────────────────────────────────┤
│ L2.5 EVENTS: commerce_events, master_campaigns, master_ad_spend             │
├─────────────────────────────────────────────────────────────────────────────┤
│ L3 KPI: kpi_definitions, kpi_facts_daily, kpi_targets                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ L4 ALERT/DECISION: alert_instances, decision_cards, priority_queue          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Flow

```text
L1 Foundation (Setup)
       │
       ▼
L1.5 Ingestion (Batches, Watermarks)
       │
       ▼
L2 Master Model (SSOT: Orders, Customers, Products)
       │
       ▼ compute_kpi_facts_daily()
L2.5 Events & Marketing
       │
       ▼
L3 KPI (Aggregated Facts, Targets)
       │
       ▼ detect_threshold_breaches()
L4 Alert & Decision (Alerts, Cards, Queue)
```

---

## 📊 Test Data Summary

| Layer | Table | Count | Notes |
|-------|-------|-------|-------|
| L1 | tenants | 1 | E2E Test Company |
| L1 | organizations | 1 | OLV Boutique |
| L1 | organization_members | 3 | owner, admin, analyst |
| L1 | channel_accounts | 4 | Shopee, Lazada, TikTok, Website |
| L1.5 | ingestion_batches | 4 | 1 per channel |
| L1.5 | data_watermarks | 4 | Sync tracking |
| L2 | master_products | 100 | 5 categories |
| L2 | master_customers | 500 | 4 tiers |
| L2 | master_orders | 5,500 | 25 months, 4 channels |
| L2 | master_order_items | ~12,100 | 2.2 items/order |
| L2.5 | commerce_events | ~27,500 | 5 events/order |
| L2.5 | master_campaigns | 50 | 25 months × 2 |
| L3 | kpi_definitions | 20 | Revenue, COGS, Margin, etc |
| L3 | kpi_facts_daily | ~760 | Aggregated daily |
| L3 | kpi_targets | 100 | 20 KPIs × 5 periods |
| L4 | alert_instances | 5-15 | Auto-generated |
| L4 | decision_cards | 10-20 | Actionable items |

### Key Metrics (Expected)

| Metric | Expected Value | Tolerance |
|--------|----------------|-----------|
| Total Orders | 5,500 | 2% |
| Gross Revenue | ~₫2.7B VND | 10% |
| Net Revenue | ~₫2.35B VND | 10% |
| COGS % | 53% | 3% |
| Total Customers | 500 | 0% |
| Active Customers (90d) | ~350 | 10% |

---

## 📁 File Structure

```text
supabase/e2e-test/
├── README.md                           # This file
├── expected-values.json                # Machine-readable expected values
│
├── L1-foundation/
│   ├── 01-create-tenant.sql           # Tenant + connectors
│   └── 02-organizations.sql           # Organizations, members, roles
│
├── L1.5-ingestion/
│   └── 03-ingestion-batches.sql       # Batches, watermarks
│
├── L2-master/
│   ├── 04-master-products.sql         # 100 SKUs
│   ├── 05-master-customers.sql        # 500 customers  
│   ├── 06-master-orders.sql           # 5,500 orders
│   └── 07-master-order-items.sql      # Order line items
│
├── L2.5-events/
│   ├── 08-commerce-events.sql         # Page views, add to cart, checkout
│   └── 09-marketing-campaigns.sql     # Campaigns, ad spend
│
├── L3-kpi/
│   ├── 10-kpi-definitions.sql         # KPI metadata
│   ├── 11-run-kpi-aggregation.sql     # [DB-First] Compute kpi_facts_daily
│   └── 12-kpi-targets.sql             # Targets vs Actual
│
├── L4-alert/
│   ├── 13-alert-rules.sql             # Alert rule definitions
│   ├── 14-run-alert-detection.sql     # [DB-First] Detect variances
│   └── 15-decision-cards.sql          # Decision cards, outcomes
│
├── verify/
│   ├── 20-verify-layer-integrity.sql  # Layer-by-layer verification
│   └── 21-verify-ui-screens.sql       # Screen-by-screen verification
│
└── cleanup/
    └── 99-cleanup-test-data.sql       # Remove test tenant data
```

---

## 🚀 How to Run

### Full Pipeline

```sql
-- Phase 1: Foundation & Ingestion (L1, L1.5)
\i L1-foundation/01-create-tenant.sql
\i L1-foundation/02-organizations.sql
\i L1.5-ingestion/03-ingestion-batches.sql

-- Phase 2: Master Model (L2)
\i L2-master/04-master-products.sql
\i L2-master/05-master-customers.sql
\i L2-master/06-master-orders.sql
\i L2-master/07-master-order-items.sql

-- Phase 3: Events & Marketing (L2.5)
\i L2.5-events/08-commerce-events.sql
\i L2.5-events/09-marketing-campaigns.sql

-- Phase 4: KPI Aggregation (L3) - DB-First
\i L3-kpi/10-kpi-definitions.sql
\i L3-kpi/11-run-kpi-aggregation.sql
\i L3-kpi/12-kpi-targets.sql

-- Phase 5: Alert Detection (L4) - DB-First
\i L4-alert/13-alert-rules.sql
\i L4-alert/14-run-alert-detection.sql
\i L4-alert/15-decision-cards.sql

-- Verification
\i verify/20-verify-layer-integrity.sql
```

### Verify Only

```sql
\i verify/20-verify-layer-integrity.sql
```

### Cleanup

```sql
\i cleanup/99-cleanup-test-data.sql
```

---

## 🧪 Test Tenant

| Property | Value |
|----------|-------|
| Tenant ID | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` |
| Name | E2E Test Company |
| Slug | e2e-test-company |
| Plan | Pro |
| Test Period | 01/2024 - 01/2027 |

---

## ✅ Expected Verification Output

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

---

## 🔑 Key Principles

### 1. DB-First Architecture
- Source data (L1-L2): INSERT directly
- Computed data (L3+): CALL FUNCTIONS, don't INSERT

### 2. Tenant Isolation
All data filtered by `tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'`

### 3. Idempotent Scripts
Each script has `DELETE` statement first for re-runnability

### 4. SSOT Tables
| Old Table | New Table (SSOT) |
|-----------|------------------|
| cdp_orders | master_orders |
| cdp_customers | master_customers |
| products | master_products |
| cdp_order_items | master_order_items |

### 5. Functions Used

| Function | Layer | Purpose |
|----------|-------|---------|
| `compute_kpi_facts_daily` | L3 | Aggregate order data to KPI facts |
| `detect_threshold_breaches` | L4 | Generate alert instances |
| `populate_priority_queue` | L4 | Prioritize alerts for Control Tower |

---

## 🔧 Troubleshooting

### Functions Not Found
Scripts have fallback logic. If function doesn't exist, direct SQL runs instead.

### Master Tables Empty
Check connector_integrations first:
```sql
SELECT * FROM connector_integrations 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
```

### KPI Facts Empty
Run aggregation manually:
```sql
SELECT compute_kpi_facts_daily('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', CURRENT_DATE);
```

---

## 📝 Migration from Legacy E2E

| Old Script | New Script | Change |
|------------|------------|--------|
| 00-create-test-tenant.sql | L1-foundation/01-create-tenant.sql | Keep |
| 01-products.sql | L2-master/04-master-products.sql | Table rename |
| 02-customers.sql | L2-master/05-master-customers.sql | Table rename |
| 03-orders.sql | L2-master/06-master-orders.sql | Table rename |
| 04-order-items.sql | L2-master/07-master-order-items.sql | Table rename |
| 05-external-orders.sql | *(DELETED)* | Deprecated |
| 06-run-compute-pipeline.sql | L3-kpi/11-run-kpi-aggregation.sql | Logic change |
| 07-fdp-locked-costs.sql | L3-kpi/12-kpi-targets.sql | Table change |
| 09-verify-expected.sql | verify/20-verify-layer-integrity.sql | Rewrite |
| 10-comprehensive-verify.sql | verify/21-verify-ui-screens.sql | Update refs |
