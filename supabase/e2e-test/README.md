# E2E Test Suite - Bluecore Platform

## 📋 Tổng quan

Bộ test data và scripts để kiểm tra toàn bộ data flow từ Source → CDP → Computed → Cross-Module → Control Tower.

### Tenant Test
- **ID**: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`
- **Name**: E2E Test Company
- **Plan**: Pro

### Test Period
- **Start**: 01/01/2024
- **End**: 26/01/2026
- **Duration**: 25 tháng

---

## 🏗️ Kiến trúc Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 0: SOURCE DATA                                            │
│   products (100) → external_orders (5,500)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: CDP SYNC                                               │
│   cdp_customers (500) → cdp_orders (5,500) → cdp_order_items    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: COMPUTED TABLES                                        │
│   cdp_customer_equity_computed → cdp_customer_metrics_rolling   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: CROSS-MODULE FLOWS                                     │
│   FDP ↔ MDP ↔ CDP                                               │
│   fdp_locked_costs, cdp_segment_ltv, cdp_customer_cohort_cac    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: CONTROL TOWER                                          │
│   cross_domain_variance_alerts → control_tower_priority_queue   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Expected Values

> **Chi tiết đầy đủ**: Xem file `EXPECTED-VALUES-ALL-SCREENS.md` và `expected-values.json`

### Summary
| Metric | Expected Value |
|--------|----------------|
| Total Orders | 5,500 |
| Total Customers | 500 |
| Total Revenue | ₫2.35B VND |
| Total Equity 12M | ₫1.23B VND |
| COGS % | 53% |
| Cross-Module Rows | 100+ |
| Control Tower Alerts | 7-12 |

---

## 🚀 Cách chạy

### Step 1: Tạo Tenant
```sql
\i 00-create-test-tenant.sql
```

### Step 2: Insert Source Data
```sql
\i 01-products.sql
\i 02-customers.sql
\i 03-orders.sql
\i 04-order-items.sql
\i 05-external-orders.sql
```

### Step 3: Run Computed Functions
```sql
\i 06-run-computed.sql
```

### Step 4: Populate Cross-Module Data
```sql
\i 07-fdp-locked-costs.sql
\i 08-cross-module-sync.sql
```

### Step 5: Verify
```sql
\i 09-verify-expected.sql
```

---

## ✅ Verification Output

Sau khi chạy `09-verify-expected.sql`, bạn sẽ thấy:

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

## 🔧 Troubleshooting

### Lỗi Foreign Key
Nếu gặp lỗi foreign key khi insert orders, kiểm tra:
- Customers đã được insert chưa
- Customer IDs mapping có đúng không

### Computed Functions Not Found
Một số functions có thể chưa tồn tại. Script đã có fallback logic tự động.

### Variance Cao Hơn Expected
Do data được generate với randomization, một số metrics có thể variance cao hơn expected. Check `tolerance_percent` trong results.

---

## 📁 File Structure

```
supabase/e2e-test/
├── README.md                    # This file
├── 00-create-test-tenant.sql    # Create tenant + connectors
├── 01-products.sql              # 100 SKUs
├── 02-customers.sql             # 500 customers
├── 03-orders.sql                # 5,500 orders
├── 04-order-items.sql           # ~12,000 items
├── 05-external-orders.sql       # Source layer data
├── 06-run-computed.sql          # Run CDP functions
├── 07-fdp-locked-costs.sql      # 25 months FDP data
├── 08-cross-module-sync.sql     # Cross-module flows
├── 09-verify-expected.sql       # Verification queries
└── expected-values.json         # Machine-readable expected values
```

---

## 📝 Notes

1. **Tenant Isolation**: Tất cả data được filter theo `tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'` để không ảnh hưởng đến data production.

2. **Idempotent**: Mỗi script có `DELETE` statement đầu tiên để có thể chạy lại nhiều lần.

3. **Deterministic**: Data được generate với patterns cố định để reproducible testing.

4. **Tolerances**: Một số metrics có tolerance cao (10-20%) do randomization trong generation.
