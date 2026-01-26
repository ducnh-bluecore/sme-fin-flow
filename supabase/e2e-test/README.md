# E2E Test Suite - Bluecore Platform

## 📋 Tổng quan

Bộ test data và scripts để kiểm tra toàn bộ data flow từ Source → CDP → Computed → Cross-Module → Control Tower.

### 🏗️ DB-First Architecture

Test suite này tuân theo nguyên tắc **DB-First Architecture**:
- **Layer 0-1 (Source)**: Chỉ INSERT raw data (products, customers, orders)
- **Layer 2+ (Computed)**: GỌI FUNCTIONS để tự động tính toán, KHÔNG INSERT trực tiếp

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 0-1: SOURCE DATA (INSERT)                                 │
│   products → cdp_customers → cdp_orders → cdp_order_items       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ cdp_run_daily_build()
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: COMPUTED (AUTO-GENERATED)                              │
│   cdp_customer_metrics_daily ← cdp_build_customer_metrics_daily │
│   cdp_customer_metrics_rolling ← cdp_build_customer_metrics_rolling
│   cdp_customer_equity_computed ← cdp_build_customer_equity      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ cross_module_run_daily_sync()
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3-4: CROSS-MODULE & CONTROL TOWER (AUTO-GENERATED)        │
│   cdp_segment_ltv_for_mdp ← CDP Segment LTV Sync                │
│   cdp_customer_cohort_cac ← MDP Attribution                     │
│   cross_domain_variance_alerts ← detect_cross_domain_variance   │
│   control_tower_priority_queue ← control_tower_aggregate_signals│
└─────────────────────────────────────────────────────────────────┘
```

### Tenant Test
- **ID**: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`
- **Name**: E2E Test Company
- **Plan**: Pro

### Test Period
- **Start**: 01/01/2026
- **End**: 26/01/2027
- **Duration**: 13 tháng

---

## 📊 Data Summary

| Layer | Table | Row Count | Notes |
|-------|-------|-----------|-------|
| 0 | products | 100 | 5 categories |
| 1 | cdp_customers | 500 | 4 tiers |
| 1 | cdp_orders | 3,000 | 4 channels |
| 1 | cdp_order_items | ~6,600 | 2.2 items/order |
| 2 | cdp_customer_equity_computed | 500 | Auto-computed |
| 3 | fdp_locked_costs | 13 | Monthly locked |
| 3 | cdp_segment_ltv_for_mdp | 4 | 4 segments |
| 4 | control_tower_priority_queue | 5-15 | Auto-generated |

### Key Metrics (Expected)
| Metric | Expected Value |
|--------|----------------|
| Total Revenue | ~₫1.58B VND |
| Total COGS | ~₫0.84B VND |
| COGS % | ~53% |
| Total Equity 12M | ~₫1.23B VND |
| Active Customers | ~325 |

---

## 🚀 Cách chạy

### Full Pipeline
```sql
-- Step 1: Tạo Tenant + Connectors
\i 00-create-test-tenant.sql

-- Step 2: Insert Source Data (Layer 0-1)
\i 01-products.sql
\i 02-customers.sql
\i 03-orders.sql
\i 04-order-items.sql
\i 05-external-orders.sql

-- Step 3: Run Compute Functions (Layer 2) - DB-First
\i 06-run-compute-pipeline.sql

-- Step 4: FDP Locked Costs (Layer 3 input)
\i 07-fdp-locked-costs.sql

-- Step 5: Run Cross-Module Sync (Layer 3-4) - DB-First
\i 08-run-cross-module-sync.sql

-- Step 6: Verify All Expected Values
\i 09-verify-expected.sql
\i 10-comprehensive-verify.sql
```

### Verify Only
```sql
\i 10-comprehensive-verify.sql
```

---

## 📁 File Structure

```
supabase/e2e-test/
├── README.md                       # This file
├── EXPECTED-VALUES-ALL-SCREENS.md  # UI expected values
├── expected-values.json            # Machine-readable expected values
│
├── 00-create-test-tenant.sql       # Create tenant + connectors
├── 01-products.sql                 # 100 SKUs (Layer 0)
├── 02-customers.sql                # 500 customers (Layer 1)
├── 03-orders.sql                   # 3,000 orders (Layer 1)
├── 04-order-items.sql              # ~6,600 items (Layer 1)
├── 05-external-orders.sql          # Source layer sync
│
├── 06-run-compute-pipeline.sql     # [DB-First] Run CDP compute functions
├── 07-fdp-locked-costs.sql         # FDP locked costs (computed from orders)
├── 08-run-cross-module-sync.sql    # [DB-First] Run cross-module sync
│
├── 09-verify-expected.sql          # Quick verification
└── 10-comprehensive-verify.sql     # Full verification suite
```

---

## ✅ Expected Verification Output

```
═══════════════════════════════════════════════════════════════════════
                    E2E TEST VERIFICATION REPORT                        
                    Tenant: E2E Test Company                            
═══════════════════════════════════════════════════════════════════════

LAYER      │ TOTAL │ PASSED │ FAILED │ WARNINGS
───────────┼───────┼────────┼────────┼─────────
L0_SOURCE  │   1   │   1    │   0    │    0
L1_CDP     │   5   │   5    │   0    │    0
L2_COMPUTED│   2   │   2    │   0    │    0
L3_CROSS   │   3   │   3    │   0    │    0
L4_TOWER   │   2   │   2    │   0    │    0
───────────┼───────┼────────┼────────┼─────────
OVERALL    │  13   │  13    │   0    │    0

✅ ALL CHECKS PASSED
```

---

## 🔑 Key Principles

### 1. DB-First Architecture
- Source data (Layer 0-1): INSERT trực tiếp
- Computed data (Layer 2+): GỌI FUNCTIONS, không INSERT

### 2. Tenant Isolation
Tất cả data được filter theo `tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'`

### 3. Idempotent Scripts
Mỗi script có `DELETE` statement đầu tiên để có thể chạy lại nhiều lần

### 4. Functions Used
| Function | Layer | Purpose |
|----------|-------|---------|
| `cdp_run_daily_build` | 2 | Master pipeline for CDP metrics |
| `cdp_build_customer_metrics_daily` | 2 | Daily customer KPIs |
| `cdp_build_customer_metrics_rolling` | 2 | Rolling window metrics |
| `cdp_build_customer_equity` | 2 | Customer equity calculation |
| `cross_module_run_daily_sync` | 3-4 | Cross-module data flows |
| `detect_cross_domain_variance` | 4 | Variance detection |
| `control_tower_aggregate_signals` | 4 | Priority queue population |

---

## 🔧 Troubleshooting

### Functions Not Found
Scripts có fallback logic. Nếu function không tồn tại, sẽ chạy direct SQL thay thế.

### Computed Tables Empty
Kiểm tra source data đã được insert chưa bằng:
```sql
SELECT COUNT(*) FROM cdp_orders WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
```

### Variance Alerts Empty
Cần chạy `07-fdp-locked-costs.sql` trước `08-run-cross-module-sync.sql`

---

## 📝 Notes

1. **Date Handling**: Order dates được generate trong range 01/2026 - 01/2027 để phù hợp với CURRENT_DATE logic.

2. **Tolerances**: Một số metrics có tolerance cao (10-20%) do randomization.

3. **Fallbacks**: Scripts có comprehensive fallback logic nếu database functions chưa tồn tại.
