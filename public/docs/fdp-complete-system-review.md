# BLUECORE FDP - COMPLETE SYSTEM REVIEW
> **Financial Data Platform** - Single Source of Truth for CEO/CFO
> Version: 3.1 | Updated: 2026-01-20
> **Governance Patch v3.1 Applied** - SSOT Views Fix, Auto-Apply Disabled, Metric Normalization

---

## 📋 MỤC LỤC

1. [Triết lý FDP](#i-triết-lý-fdp-manifesto)
2. [Kiến trúc tổng quan](#ii-kiến-trúc-tổng-quan)
3. [Database Schema (40+ tables)](#iii-database-schema)
4. [SSOT Ledger System](#iv-ssot-ledger-system)
5. [Hooks & Business Logic](#v-hooks--business-logic)
6. [Edge Functions](#vi-edge-functions)
7. [UI Components](#vii-ui-components)
8. [Công thức & Constants](#viii-công-thức--constants)
9. [Risk Appetite & Governance](#ix-risk-appetite--governance)
10. [Investor Disclosure & Stress Testing](#x-investor-disclosure--stress-testing)
11. [Test Checklist](#xi-test-checklist)

---

## I. TRIẾT LÝ FDP (MANIFESTO)

### 10 Nguyên tắc bất biến

| # | Nguyên tắc | Mô tả |
|---|------------|-------|
| 1 | **FDP ≠ Kế toán** | Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế |
| 2 | **SSOT** | 1 Net Revenue, 1 CM, 1 Cash Position. Không có phiên bản khác |
| 3 | **Truth > Flexibility** | Không tự định nghĩa metric, không chỉnh công thức |
| 4 | **Real Cash** | Phân biệt: Đã về / Sẽ về / Nguy cơ không về / Bị khóa |
| 5 | **Revenue ↔ Cost** | Mọi doanh thu đều đi kèm chi phí |
| 6 | **Unit Economics → Action** | SKU lỗ + khóa cash + tăng risk → STOP |
| 7 | **Today's Decision** | Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng |
| 8 | **Surface Problems** | Không làm đẹp số, chỉ ra vấn đề sớm |
| 9 | **Feed Control Tower** | FDP là nguồn sự thật, Control Tower hành động |
| 10 | **Final Test** | Nếu không khiến quyết định rõ hơn → FDP thất bại |

---

## II. KIẾN TRÚC TỔNG QUAN

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FDP ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐   │
│  │   EVIDENCE      │   │     LEDGER      │   │         TRUTH           │   │
│  │   (Immutable)   │──▶│  (Append-only)  │──▶│   (Views/Snapshots)     │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────────────┘   │
│                                                                             │
│  • bank_transactions     • reconciliation_links    • v_invoice_settled_*   │
│  • invoices              • settlement_allocations  • v_bank_txn_match_*    │
│  • bills                 • decision_snapshots      • v_decision_latest     │
│  • external_orders                                                          │
│  • expenses                                                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          HOOKS LAYER                                 │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ useCentralFinancialMetrics   │ useReconciliationSSOT                │   │
│  │ useCashConversionCycle       │ useDecisionSnapshots                 │   │
│  │ useCashRunway                │ useInvoiceData / useBillsData        │   │
│  │ usePLData                    │ useWorkingCapital                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          UI LAYER                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ CFO Dashboard  │ Decision Center  │ Reconciliation  │ P&L Report    │   │
│  │ Unit Economics │ Cash Forecast    │ Working Capital │ Channel PL    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
External Sources           FDP Database              SSOT Views              UI
─────────────────         ─────────────             ──────────            ────
                          
Shopee/Lazada  ─────┐     external_orders           
TikTok/Meta    ─────┼────▶external_order_items ───▶ fdp_* views
Google Ads     ─────┘     expenses                  
                          
Bank APIs      ─────────▶ bank_transactions ───────▶ v_bank_txn_match_state ──▶ Reconciliation
                          bank_accounts    ────────▶ cash_position             Board
                          
Accounting     ─────────▶ invoices ─────────┐       
System         ─────────▶ bills    ─────────┼──────▶ v_invoice_settled_* ──────▶ AR/AP Aging
                          payments ─────────┘       
                          
                          reconciliation_links ────▶ v_invoice_settled_status ─▶ CFO Dashboard
                          decision_snapshots  ─────▶ v_decision_latest ────────▶ TruthBadge
```

---

## III. DATABASE SCHEMA

### 3.1 Tổng quan (40+ tables liên quan FDP)

| Category | Tables | Mô tả |
|----------|--------|-------|
| Core Accounting | 18 | GL, Journal, Invoice, Bill, Payment |
| Banking & Cash | 10 | Bank accounts, transactions, cash flow |
| SSOT Ledger | 4 | reconciliation_links, settlement_allocations, decision_snapshots |
| Working Capital | 5 | AR, AP, Inventory metrics |
| Reporting | 8 | P&L cache, scenarios, forecasts |
| Analytics | 6 | FDP views, channel analytics |

---

### 3.2 FINANCIAL ACCOUNTING TABLES

#### Chart of Accounts & Journals

| Table | Mô tả | Key Fields |
|-------|-------|------------|
| `gl_accounts` | Hệ thống tài khoản | account_code, account_name, account_type, balance |
| `journal_entries` | Bút toán chính | entry_date, description, status, total_debit, total_credit |
| `journal_entry_lines` | Chi tiết bút toán | gl_account_id, debit, credit |
| `financial_periods` | Kỳ kế toán | period_name, start_date, end_date, is_closed |

#### Accounts Receivable (AR)

| Table | Mô tả | Key Fields |
|-------|-------|------------|
| `customers` | Khách hàng | name, email, phone, credit_limit |
| `invoices` | Hóa đơn bán | invoice_number, total_amount, paid_amount, status, due_date |
| `invoice_items` | Chi tiết hóa đơn | quantity, unit_price, amount, tax_rate |
| `payments` | Thanh toán nhận | amount, payment_date, payment_method |

#### Accounts Payable (AP)

| Table | Mô tả | Key Fields |
|-------|-------|------------|
| `vendors` | Nhà cung cấp | name, payment_terms, credit_limit |
| `bills` | Hóa đơn mua | bill_number, total_amount, paid_amount, status, due_date |
| `bill_items` | Chi tiết bill | quantity, unit_price, amount |
| `vendor_payments` | Thanh toán NCC | amount, payment_date |

#### Views

| View | Mô tả |
|------|-------|
| `ar_aging` | Phân tích tuổi nợ phải thu (0-30, 31-60, 61-90, 90+) |
| `ap_aging` | Phân tích tuổi nợ phải trả |
| `trial_balance` | Bảng cân đối thử |
| `balance_sheet_summary` | Tổng hợp Balance Sheet |
| `pl_summary` | Tổng hợp P&L |

---

### 3.3 BANKING & CASH TABLES

| Table | Mô tả | Key Fields |
|-------|-------|------------|
| `bank_accounts` | Tài khoản ngân hàng | bank_name, account_number, current_balance, status |
| `bank_transactions` | Giao dịch | amount, transaction_type (credit/debit), transaction_date, description |
| `cash_forecasts` | Dự báo dòng tiền | forecast_date, inflow, outflow, closing_balance |
| `cash_flow_daily` | Cash flow hàng ngày | flow_date, opening/closing_balance, inflows, outflows |
| `cash_flow_direct` | Cash flow trực tiếp | operating/investing/financing activities |

| View | Mô tả |
|------|-------|
| `cash_position` | Vị thế tiền mặt hiện tại (tổng hợp bank_accounts) |

---

### 3.4 ORDERS & REVENUE TABLES

| Table | Mô tả | Key Fields |
|-------|-------|------------|
| `external_orders` | Đơn hàng từ sàn TMĐT | order_number, total_amount, platform_fee, shipping_fee, status |
| `external_order_items` | Chi tiết đơn | sku, quantity, unit_price, unit_cogs, gross_profit |
| `revenues` | Doanh thu định kỳ | amount, revenue_type, source, start_date |
| `revenue_entries` | Ghi nhận doanh thu | entry_date, amount |

---

### 3.5 EXPENSES TABLES

| Table | Mô tả | Key Fields |
|-------|-------|------------|
| `expenses` | Chi phí | amount, expense_date, category (cogs/marketing/logistics/salary/...) |
| `marketing_expenses` | Chi phí marketing | channel, spend, clicks, impressions |

**Expense Categories:**
- `cogs` - Cost of Goods Sold
- `marketing` - Variable: Marketing spend
- `logistics` - Variable: Shipping costs
- `salary` - Fixed: Lương
- `rent` - Fixed: Thuê mặt bằng
- `utilities` - Fixed: Điện nước
- `depreciation` - Khấu hao
- `interest` - Lãi vay
- `tax` - Thuế

---

### 3.6 PRODUCTS & INVENTORY

| Table | Mô tả | Key Fields |
|-------|-------|------------|
| `products` | **SSOT** for pricing | sku, unit_price, unit_cost |
| `product_metrics` | Aggregated metrics | sales_velocity, contribution_margin, profitability_score |
| `inventory_levels` | Mức tồn kho | quantity, warehouse_id |

---

### 3.7 FDP VIEWS

| View | Mô tả | Key Columns |
|------|-------|-------------|
| `fdp_daily_metrics` | Metrics hàng ngày | revenue, cogs, gross_profit, orders_count |
| `fdp_monthly_metrics` | Metrics hàng tháng | aggregated monthly data |
| `fdp_channel_summary` | Tổng hợp theo kênh | channel, revenue, margin, fees |
| `fdp_sku_summary` | Tổng hợp theo SKU | sku, revenue, cogs, margin, velocity |
| `fdp_expense_summary` | Tổng hợp chi phí | category, amount |
| `fdp_invoice_summary` | Tổng hợp hóa đơn | status, count, amount |

---

## IV. SSOT LEDGER SYSTEM

### 4.1 Reconciliation Ledger

#### `reconciliation_links` (Core Ledger)

```sql
CREATE TABLE public.reconciliation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Evidence reference
  bank_transaction_id UUID NULL,        -- NULL = manual payment (OPTION A)
  settlement_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND',
  settlement_date DATE NOT NULL,
  
  -- Target
  target_type TEXT NOT NULL DEFAULT 'invoice',
  target_id UUID NOT NULL,              -- invoice_id or bill_id
  
  -- Match metadata
  match_type TEXT NOT NULL,             -- manual | exact | probabilistic | aggregate
  confidence NUMERIC NOT NULL,          -- 0-100
  match_evidence JSONB NOT NULL DEFAULT '{}',
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Void (NEVER DELETE)
  is_voided BOOLEAN NOT NULL DEFAULT false,
  void_reason TEXT,
  voided_at TIMESTAMPTZ
);
```

**SSOT Constraint:**
```sql
CHECK (
  (match_type = 'manual' AND bank_transaction_id IS NULL) OR
  (match_type <> 'manual' AND bank_transaction_id IS NOT NULL)
)
```

#### `settlement_allocations` (Partial Payments)

```sql
CREATE TABLE public.settlement_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reconciliation_link_id UUID NOT NULL REFERENCES reconciliation_links(id),
  allocated_amount NUMERIC NOT NULL,
  allocation_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4.2 SSOT Views for Reconciliation

#### `v_invoice_settled_paid`
```sql
-- Tính paid_amount từ ledger (thay thế invoices.paid_amount)
SELECT 
  i.id AS invoice_id,
  i.total_amount,
  COALESCE(SUM(rl.settlement_amount) FILTER (WHERE NOT rl.is_voided), 0) AS settled_paid_amount,
  i.total_amount - settled_paid_amount AS remaining_amount
FROM invoices i
LEFT JOIN reconciliation_links rl ON rl.target_id = i.id AND rl.target_type = 'invoice'
GROUP BY i.id;
```

#### `v_invoice_settled_status`
```sql
-- Derive status từ paid amount
SELECT 
  *,
  CASE 
    WHEN settled_paid_amount >= total_amount THEN 'paid'
    WHEN settled_paid_amount > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS settled_status,
  'settled' AS truth_level
FROM v_invoice_settled_paid;
```

#### `v_bank_txn_match_state`
```sql
-- Tính match state từ ledger (thay thế bank_transactions.match_status)
SELECT 
  bt.id AS bank_transaction_id,
  bt.amount AS bank_amount,
  COALESCE(SUM(rl.settlement_amount) FILTER (WHERE NOT rl.is_voided), 0) AS matched_amount,
  bt.amount - matched_amount AS unmatched_amount,
  CASE 
    WHEN matched_amount = 0 THEN 'unmatched'
    WHEN matched_amount < bt.amount THEN 'partially_matched'
    ELSE 'matched'
  END AS match_state
FROM bank_transactions bt
LEFT JOIN reconciliation_links rl ON rl.bank_transaction_id = bt.id
GROUP BY bt.id;
```

---

### 4.3 Decision Snapshots

#### `decision_snapshots` (CFO Metrics Ledger)

```sql
CREATE TABLE public.decision_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Metric identity
  metric_code TEXT NOT NULL,              -- 'cash_today', 'cash_flow_today', 'cash_next_7d'
  metric_version INT NOT NULL DEFAULT 1,
  
  -- Dimension
  entity_type TEXT NOT NULL DEFAULT 'tenant',
  entity_id UUID NULL,
  dimensions JSONB NOT NULL DEFAULT '{}', -- {"currency":"VND"}
  
  -- Value
  value NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND',
  
  -- Truth classification
  truth_level TEXT NOT NULL,              -- 'settled' | 'provisional'
  authority TEXT NOT NULL,                -- 'BANK' | 'MANUAL' | 'RULE' | 'ACCOUNTING'
  confidence NUMERIC(5,2) NOT NULL DEFAULT 100,
  
  -- Temporal
  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Explainability
  derived_from JSONB NOT NULL DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_id UUID REFERENCES decision_snapshots(id)
);
```

#### Truth Level Rules

| truth_level | Allowed authorities | Ví dụ |
|-------------|---------------------|-------|
| `settled` | BANK, MANUAL, ACCOUNTING, GATEWAY, CARRIER | cash_today, cash_flow_today |
| `provisional` | RULE only | cash_next_7d (forecast) |

#### `v_decision_latest`
```sql
-- Lấy snapshot mới nhất cho mỗi metric
SELECT DISTINCT ON (tenant_id, metric_code, entity_type, entity_id, dimensions)
  *
FROM decision_snapshots
ORDER BY tenant_id, metric_code, entity_type, entity_id, dimensions, as_of DESC, created_at DESC;
```

---

### 4.4 Backfilled Data

| Source | Target | Count | Match Type |
|--------|--------|-------|------------|
| Legacy invoices (paid_amount > 0) | reconciliation_links | 214 | manual |

---

## V. HOOKS & BUSINESS LOGIC

### 5.1 Core Financial Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useCentralFinancialMetrics` | useCentralFinancialMetrics.ts | **SSOT** cho tất cả metrics tài chính |
| `useCashRunway` | useCashRunway.ts | Cash runway calculation |
| `useCashConversionCycle` | useCashConversionCycle.ts | DSO, DIO, DPO, CCC |
| `usePLData` | usePLData.ts | P&L Statement data |
| `useWorkingCapital` | useWorkingCapital.ts | Working capital metrics |

### 5.2 SSOT Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useReconciliationSSOT` | useReconciliationSSOT.ts | Reconciliation ledger operations |
| `useDecisionSnapshots` | useDecisionSnapshots.ts | Decision snapshots operations |
| `useInvoiceSettledStatus` | useReconciliationSSOT.ts | Read from v_invoice_settled_status |
| `useBankTxnMatchState` | useReconciliationSSOT.ts | Read from v_bank_txn_match_state |

### 5.3 Data Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useInvoiceData` | useInvoiceData.ts | Invoice CRUD |
| `useBillsData` | useBillsData.ts | Bills CRUD |
| `useBankData` | useBankData.ts | Bank accounts & transactions |
| `useChannelAnalytics` | useChannelAnalytics.ts | Channel performance |
| `useProductMetrics` | useProductMetrics.ts | SKU metrics from products table |

---

### 5.4 `useCentralFinancialMetrics` - SSOT Hook

**Location:** `src/hooks/useCentralFinancialMetrics.ts`

#### Output Interface

```typescript
interface CentralFinancialMetrics {
  // Cash Conversion Cycle
  dso: number;              // Days Sales Outstanding
  dpo: number;              // Days Payable Outstanding  
  dio: number;              // Days Inventory Outstanding
  ccc: number;              // Cash Conversion Cycle = DSO + DIO - DPO

  // Profitability
  grossMargin: number;      // (Net Revenue - COGS) / Net Revenue %
  contributionMargin: number; // (Net Revenue - COGS - Variable Costs) / Net Revenue %
  ebitda: number;           
  ebitdaMargin: number;     
  netProfit: number;        
  netProfitMargin: number;  
  operatingMargin: number;  

  // Revenue
  totalRevenue: number;     
  netRevenue: number;       
  cogs: number;             
  grossProfit: number;      
  contributionProfit: number;
  
  // Working Capital
  totalAR: number;          
  overdueAR: number;        
  totalAP: number;          
  inventory: number;        
  workingCapital: number;   

  // Cash
  cashOnHand: number;       
  cashFlow: number;         
  cashNext7Days: number;    // Forecast

  // Metadata
  lastUpdated: string;
  industryBenchmark: { ... };
}
```

#### Data Sources

| Metric | Source Tables |
|--------|---------------|
| Revenue | invoices, external_orders, revenues |
| COGS | external_order_items.total_cogs, expenses (category='cogs') |
| Variable Costs | external_orders (platform_fee, shipping_fee), expenses (marketing, logistics) |
| Fixed Opex | expenses (salary, rent, utilities, other) |
| AR | invoices (unpaid) |
| AP | bills (unpaid) |
| Cash | bank_accounts.current_balance |

#### Cache Strategy

1. Check `dashboard_kpi_cache` (TTL: 15 minutes)
2. If fresh + date range matches → return cached
3. If stale → calculate real-time + update cache

---

### 5.5 `useReconciliationSSOT` - Ledger Hook

**Location:** `src/hooks/useReconciliationSSOT.ts`

#### Read Hooks

| Hook | Source | Output |
|------|--------|--------|
| `useInvoiceSettledStatus()` | v_invoice_settled_status | InvoiceSettledStatus[] |
| `useBankTxnMatchState()` | v_bank_txn_match_state | BankTxnMatchState[] |
| `useReconciliationLinks()` | reconciliation_links | ReconciliationLink[] |

#### Write Hooks

| Hook | Operation | Validation |
|------|-----------|------------|
| `useCreateReconciliationLink()` | INSERT | manual → no bank_txn_id |
| `useVoidReconciliationLink()` | UPDATE is_voided=true | Never delete |

#### Auto-Match Algorithm (v3.1 GOVERNANCE FIX)

```typescript
// Matching criteria (scored 0-100)
1. Amount match (exact: +50, partial: +30)
2. Invoice number in description (+40)
3. Customer name match (+25)
4. Date proximity (≤7 days: +15, ≤30 days: +5)

// GOVERNANCE v3.1: Auto-apply DISABLED
// All matches are now SUGGESTIONS ONLY
// Ledger writes require explicit user confirmation or Guardrails path

// OLD (removed): confidence ≥ 80 → auto-apply ❌
// NEW: confidence ≥ 40 → suggest, user must confirm ✅
```

---

### 5.6 `useDecisionSnapshots` - Metrics Snapshot Hook

**Location:** `src/hooks/useDecisionSnapshots.ts`

#### Hooks

| Hook | Purpose |
|------|---------|
| `useLatestSnapshot(metricCode)` | Get latest snapshot from v_decision_latest |
| `useCashSnapshots()` | Get all 3 cash metrics + staleness check |
| `useComputeCashSnapshots()` | Trigger edge function to compute |
| `useSnapshotExplanation(id)` | Get explanation from edge function |
| `useCreateSnapshot()` | Manually create snapshot |

---

## VI. EDGE FUNCTIONS

### 6.1 Overview

| Function | Path | Purpose |
|----------|------|---------|
| decision-snapshots | /decision-snapshots/* | Decision snapshot CRUD + compute |
| detect-alerts | /detect-alerts | Detect financial alerts |
| generate-decision-cards | /generate-decision-cards | Generate decision cards |
| analyze-financial-data | /analyze-financial-data | AI financial analysis |
| risk-appetite | /risk-appetite/* | Board-defined risk appetite management |
| investor-disclosure | /investor-disclosure/* | Investor risk disclosure generation |
| risk-stress-test | /risk-stress-test/* | Risk appetite stress testing |
| board-scenarios | /board-scenarios/* | Board scenario simulation |

---

### 6.2 `decision-snapshots` Edge Function

**Location:** `supabase/functions/decision-snapshots/index.ts`

#### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /snapshots | Create new snapshot |
| GET | /latest | Get latest snapshot |
| GET | /explain/:id | Explain snapshot derivation |
| POST | /compute/cash | Compute & write 3 cash metrics |
| GET | /check-stale | Check staleness |

#### POST `/compute/cash` - Logic

| Metric | Truth Level | Authority | Formula |
|--------|-------------|-----------|---------|
| `cash_today` | settled | BANK | SUM(bank_accounts.current_balance) |
| `cash_flow_today` | settled | BANK | credits - debits (today) |
| `cash_next_7d` | provisional | RULE | cash_today + (15%×AR) + (80%×weekly_sales) - (20%×AP) |

#### `derived_from` Example (cash_next_7d)

```json
{
  "assumptions": [
    { "factor": "ar_collection_rate", "value": 0.15, "description": "15% of AR collected in 7 days" },
    { "factor": "sales_collection_rate", "value": 0.80, "description": "80% of weekly sales collected" },
    { "factor": "ap_payment_rate", "value": 0.20, "description": "20% of AP paid in 7 days" }
  ],
  "inputs": {
    "cash_today": 1000000000,
    "total_ar": 500000000,
    "weekly_sales": 200000000,
    "total_ap": 300000000
  },
  "formula": "cash_today + (AR * 0.15) + (weekly_sales * 0.80) - (AP * 0.20)",
  "sources": ["bank_accounts", "invoices", "external_orders", "bills"]
}
```

---

### 6.3 `risk-appetite` Edge Function

**Location:** `supabase/functions/risk-appetite/index.ts`

#### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /configs | List all risk appetite configurations |
| POST | /configs | Create new risk appetite configuration |
| PUT | /configs/:id | Update configuration |
| GET | /configs/:id | Get specific configuration |
| GET | /rules | Get rules for a configuration |
| POST | /rules | Create/update rules |
| GET | /current-status | Get current risk status vs thresholds |
| POST | /check-breaches | Check for threshold breaches |

#### Risk Metrics (v3.1 NORMALIZED - snake_case)

| Metric Code | Description | Default Threshold |
|-------------|-------------|-------------------|
| ar_overdue_ratio | % AR quá hạn | ≤ 15% |
| auto_reconciliation_rate | % tự động đối soát | ≥ 80% |
| ml_accuracy | % độ chính xác ML | ≥ 95% |
| cash_runway_days | Số ngày cash runway | ≥ 90 |
| dso_days | Days Sales Outstanding | ≤ 45 |
| gross_margin | Gross margin % | ≥ 25% |
| false_auto_rate | % lỗi tự động | ≤ 1% |
| guardrail_block_rate | % bị chặn bởi Guardrail | ≤ 10% |

> **GOVERNANCE v3.1**: All metric codes MUST be snake_case lowercase.
> See `src/lib/metric-normalization.ts` for utilities.

---

### 6.4 `investor-disclosure` Edge Function

**Location:** `supabase/functions/investor-disclosure/index.ts`

#### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /generate | Generate disclosure from risk appetite |
| POST | /save | Save disclosure draft |
| PUT | /:id/approve | Approve disclosure |
| PUT | /:id/publish | Publish to investor portal |
| GET | /list | List all disclosures |
| GET | /:id | Get specific disclosure |

#### Disclosure Output Format

```json
{
  "summary": "Board-approved narrative...",
  "key_risks": {
    "arRisk": {
      "metric": "Overdue receivables",
      "value": "12%",
      "withinAppetite": true
    },
    "automationRisk": {
      "metric": "Automated reconciliations", 
      "value": "38%",
      "withinAppetite": true
    }
  },
  "mitigations": [
    {
      "risk": "ar_overdue_ratio",
      "control": "Automated collection reminders",
      "effectiveness": "high"
    }
  ]
}
```

---

### 6.5 `risk-stress-test` Edge Function

**Location:** `supabase/functions/risk-stress-test/index.ts`

#### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /simulate | Run stress test simulation |
| POST | /preview | Preview impact without saving |
| GET | /history | Get stress test history |
| GET | /:id | Get specific test result |

#### Simulation Output

```json
{
  "autoReconciliationRate": {
    "current": 38,
    "simulated": 21,
    "delta": -17
  },
  "approvalsRequired": {
    "current": 12,
    "simulated": 47,
    "delta": 35
  },
  "riskExposure": {
    "current": 1200000000,
    "simulated": 700000000,
    "delta": -500000000
  }
}
```

---

### 6.6 `board-scenarios` Edge Function

**Location:** `supabase/functions/board-scenarios/index.ts`

#### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /simulate | Run scenario simulation |
| POST | /compare | Compare multiple scenarios |
| GET | /list | List all scenarios |
| GET | /templates | Get scenario templates |
| PUT | /:id/archive | Archive scenario |
| GET | /:id | Get specific scenario |

#### Scenario Types

| Type | Description | Parameters |
|------|-------------|------------|
| revenue_shock | Revenue decrease | shock_percent (e.g., -20%) |
| ar_delay | AR collection delay | delay_days (e.g., +15 days) |
| cost_inflation | Cost increase | inflation_percent (e.g., +10%) |
| automation_pause | Disable automation | duration_days |

#### Scenario Output

```json
{
  "projected_outcomes": [
    {
      "metric": "cash_position",
      "baseline": 5000000000,
      "projected": 3800000000,
      "change_percent": -24
    }
  ],
  "risk_breaches": [
    {
      "rule_name": "Minimum Cash Runway",
      "breached": true,
      "threshold": 90,
      "projected_value": 65
    }
  ],
  "control_impacts": [
    {
      "control": "auto_reconciliation",
      "impact": "reduced",
      "reason": "Lower volume"
    }
  ]
}
```

---

## VII. UI COMPONENTS

### 7.1 Dashboard Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CFODashboard` | pages/Dashboard.tsx | Main CFO dashboard |
| `FinancialTruthCard` | components/dashboard/ | Net Revenue, CM, Cash display |
| `KPICard` | components/dashboard/ | Individual KPI display |
| `TruthBadge` | components/dashboard/TruthBadge.tsx | SETTLED/PROVISIONAL badge |
| `CashForecastChart` | components/dashboard/ | Cash forecast visualization |
| `ARAgingChart` | components/dashboard/ | AR aging analysis |

### 7.2 Reconciliation Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ReconciliationBoard` | components/reconciliation/ | Main reconciliation UI |
| `ReconciliationItem` | components/reconciliation/ | Single match item |
| `AutoMatchPanel` | components/reconciliation/ | Auto-match suggestions |

### 7.3 Decision Center Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DecisionCard` | components/decision-center/ | Decision card display |
| `DecisionActions` | components/decision-center/ | Decide/Dismiss/Snooze |
| `BluecoreScoresPanel` | components/decision-center/ | Health scores |

---

### 7.4 `TruthBadge` Component

**Location:** `src/components/dashboard/TruthBadge.tsx`

#### Props

```typescript
interface TruthBadgeProps {
  truthLevel: 'settled' | 'provisional';
  authority: string;
  confidence?: number;
  snapshotId?: string | null;
  showExplain?: boolean;
  size?: 'sm' | 'md';
}
```

#### Display

| Truth Level | Color | Icon | Label Example |
|-------------|-------|------|---------------|
| `settled` | Emerald (green) | ✓ CheckCircle | SETTLED (BANK) |
| `provisional` | Amber | ⏱ Clock | PROVISIONAL (RULE) |

#### Explain Dialog

Shows when clicking info button:
- Metric name & value
- Authority & timestamp
- Formula used
- Assumptions (for provisional)
- Evidence (for settled)
- Data sources

---

## VIII. CÔNG THỨC & CONSTANTS

### 8.1 Formula Library

**Location:** `src/lib/fdp-formulas.ts`

#### Core Formulas

| Formula | Definition | Thresholds |
|---------|------------|------------|
| **Net Revenue** | Gross Revenue - Returns - Discounts - Platform Fees | > 0 |
| **Gross Margin** | (Net Revenue - COGS) / Net Revenue × 100% | Critical < 15%, Warning < 25% |
| **Contribution Margin** | (Net Revenue - COGS - Variable Costs) / Net Revenue × 100% | Critical < 0%, Warning < 10% |
| **DSO** | AR / Daily Sales | Warning > 45d, Critical > 60d |
| **DIO** | Inventory / Daily COGS | Warning > 60d, Critical > 90d |
| **DPO** | AP / Daily COGS | Warning < 30d (paying too fast) |
| **CCC** | DSO + DIO - DPO | Warning > 60d, Critical > 90d |
| **Cash Runway** | Cash / Monthly Burn | Critical < 3 months |
| **LTV:CAC** | LTV / CAC | Critical < 1, Warning < 2 |
| **ROAS** | Revenue / Marketing Spend | Critical < 1, Warning < 2 |

#### Variable vs Fixed Costs

| Type | Items |
|------|-------|
| **Variable Costs** | Platform Fees + Shipping + Marketing |
| **Fixed Costs (Opex)** | Salary + Rent + Utilities + Other |

---

### 8.2 Financial Constants

**Location:** `src/lib/financial-constants.ts`

#### Industry Benchmarks

```typescript
const INDUSTRY_BENCHMARKS = {
  dso: 35,           // Days
  dio: 45,           // Days
  dpo: 40,           // Days
  ccc: 40,           // Days
  grossMargin: 35,   // %
  ebitdaMargin: 15,  // %
  roas: 4.0,         // x
  ltvCacRatio: 3.0,  // x
};
```

#### Metric Bounds (Constraints)

```typescript
const METRIC_BOUNDS = {
  dso: { min: 0, max: 365 },
  dio: { min: 0, max: 180 },
  dpo: { min: 0, max: 180 },
  ccc: { min: -100, max: 365 },
  grossMargin: { min: -100, max: 100 },
  contributionMargin: { min: -100, max: 100 },
};
```

#### Fallback Ratios (when no data)

```typescript
const FALLBACK_RATIOS = {
  cogs: 0.65,          // 65% of revenue
  opex: 0.20,          // 20% of revenue
  depreciation: 0.018, // 1.8% of revenue
  tax: 0.20,           // 20% effective rate
};
```

---

### 8.3 Cash Forecast Formula

```
Cash Next 7 Days = Cash Today 
                 + (15% × AR)           // Expected collections
                 + (80% × Weekly Sales) // Expected sales inflow
                 - (20% × AP)           // Expected payments
```

---

## IX. RISK APPETITE & GOVERNANCE

### 9.1 Risk Appetite Configuration

**Database Tables:**

| Table | Purpose |
|-------|---------|
| `risk_appetite_configs` | Board-defined risk appetite versions |
| `risk_appetite_rules` | Individual risk thresholds |
| `risk_breach_events` | Historical breach records |

#### Risk Appetite Config Schema

```sql
CREATE TABLE risk_appetite_configs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  version INT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, archived
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Risk Appetite Rules Schema

```sql
CREATE TABLE risk_appetite_rules (
  id UUID PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES risk_appetite_configs(id),
  metric_code TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  threshold_type TEXT NOT NULL, -- max, min, range
  threshold_value NUMERIC NOT NULL,
  warning_threshold NUMERIC,
  severity TEXT DEFAULT 'warning', -- info, warning, critical
  is_enabled BOOLEAN DEFAULT true
);
```

### 9.2 Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useRiskAppetites` | useRiskAppetite.ts | List all risk appetite configs |
| `useRiskAppetiteRules` | useRiskAppetite.ts | Get rules for a config |
| `useRiskStatus` | useRiskAppetite.ts | Current status vs thresholds |
| `useCheckBreaches` | useRiskAppetite.ts | Detect threshold breaches |
| `useCreateRiskAppetite` | useRiskAppetite.ts | Create new config |
| `useActivateRiskAppetite` | useRiskAppetite.ts | Activate a config |

### 9.3 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `RiskAppetiteConfig` | components/risk/ | Configure risk thresholds |
| `RiskStatusDashboard` | components/risk/ | Current risk status |
| `RiskBreachHistory` | components/risk/ | Historical breaches |

---

## X. INVESTOR DISCLOSURE & STRESS TESTING

### 10.1 Investor Risk Disclosures

**Database Table:**

```sql
CREATE TABLE investor_risk_disclosures (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  risk_appetite_version INT NOT NULL,
  disclosure_period_start DATE NOT NULL,
  disclosure_period_end DATE NOT NULL,
  summary TEXT NOT NULL,
  key_risks JSONB NOT NULL,
  mitigations JSONB NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, approved, published
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.2 Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useGenerateDisclosure` | useInvestorDisclosure.ts | Generate from risk appetite |
| `useDisclosureList` | useInvestorDisclosure.ts | List disclosures |
| `useSaveDisclosure` | useInvestorDisclosure.ts | Save draft |
| `useApproveDisclosure` | useInvestorDisclosure.ts | Board approval |
| `usePublishDisclosure` | useInvestorDisclosure.ts | Publish to investor portal |

### 10.3 Risk Stress Testing

**Database Table:**

```sql
CREATE TABLE risk_stress_tests (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  base_risk_appetite_id UUID NOT NULL,
  simulated_risk_appetite JSONB NOT NULL,
  impact_summary JSONB NOT NULL,
  simulated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL
);
```

### 10.4 Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useRunStressTest` | useStressTest.ts | Run simulation |
| `usePreviewStressTest` | useStressTest.ts | Preview without saving |
| `useStressTestHistory` | useStressTest.ts | Historical tests |

### 10.5 Board Scenarios

**Database Table:**

```sql
CREATE TABLE board_scenarios (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL,
  assumptions JSONB NOT NULL,
  projected_outcomes JSONB NOT NULL,
  risk_breaches JSONB NOT NULL,
  control_impacts JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL
);
```

### 10.6 Scenario Types

| Type | Description | Use Case |
|------|-------------|----------|
| `revenue_shock` | Revenue decrease simulation | "What if sales drop 20%?" |
| `ar_delay` | AR collection delay | "What if customers pay 15 days later?" |
| `cost_inflation` | Cost increase | "What if costs increase 10%?" |
| `automation_pause` | Disable automation | "What if we pause auto-recon?" |

### 10.7 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `InvestorRiskDisclosure` | components/investor/ | Generate & manage disclosures |
| `RiskStressTestConsole` | components/stress-test/ | Slider-based threshold testing |
| `BoardScenarioRoom` | components/scenarios/ | Scenario simulation & comparison |

---

## XI. TEST CHECKLIST

### 11.1 Database Tests

```sql
-- 1. Verify SSOT tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('reconciliation_links', 'settlement_allocations', 'decision_snapshots');

-- 2. Verify backfilled data
SELECT COUNT(*) FROM reconciliation_links WHERE match_type = 'manual';
-- Expected: 214

-- 3. Verify views work
SELECT * FROM v_invoice_settled_status LIMIT 5;
SELECT * FROM v_bank_txn_match_state LIMIT 5;
SELECT * FROM v_decision_latest LIMIT 5;

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('reconciliation_links', 'decision_snapshots');

-- 5. Verify risk appetite tables
SELECT * FROM risk_appetite_configs LIMIT 5;
SELECT * FROM risk_appetite_rules LIMIT 5;

-- 6. Verify investor disclosure tables
SELECT * FROM investor_risk_disclosures LIMIT 5;
SELECT * FROM risk_stress_tests LIMIT 5;
SELECT * FROM board_scenarios LIMIT 5;
```

### 11.2 Edge Function Tests

```bash
# 1. Compute cash snapshots
curl -X POST \
  'https://{project-id}.supabase.co/functions/v1/decision-snapshots/compute/cash' \
  -H 'Authorization: Bearer {token}' \
  -d '{"tenantId": "{tenant-uuid}"}'

# 2. Get latest snapshot
curl -X GET \
  'https://{project-id}.supabase.co/functions/v1/decision-snapshots/latest?tenantId={tenant-uuid}&metricCode=cash_today'

# 3. Risk appetite status
curl -X GET \
  'https://{project-id}.supabase.co/functions/v1/risk-appetite/current-status?tenantId={tenant-uuid}'

# 4. Generate investor disclosure
curl -X POST \
  'https://{project-id}.supabase.co/functions/v1/investor-disclosure/generate' \
  -H 'Authorization: Bearer {token}' \
  -d '{"tenantId": "{tenant-uuid}", "periodStart": "2026-01-01", "periodEnd": "2026-03-31"}'

# 5. Run stress test
curl -X POST \
  'https://{project-id}.supabase.co/functions/v1/risk-stress-test/simulate' \
  -H 'Authorization: Bearer {token}' \
  -d '{"tenantId": "{tenant-uuid}", "simulatedChanges": [...]}'

# 6. Run board scenario
curl -X POST \
  'https://{project-id}.supabase.co/functions/v1/board-scenarios/simulate' \
  -H 'Authorization: Bearer {token}' \
  -d '{"tenantId": "{tenant-uuid}", "scenarioName": "Revenue Shock", "scenarioType": "revenue_shock", "assumptions": {"shock_percent": -20}}'
```

### 11.3 Hook Tests

```typescript
// 1. Central Financial Metrics
const { data } = useCentralFinancialMetrics();
console.log(data.grossMargin, data.ccc, data.cashOnHand);

// 2. Reconciliation SSOT
const { data: invoiceStatus } = useInvoiceSettledStatus();
const { data: bankState } = useBankTxnMatchState();

// 3. Decision Snapshots
const { data: cashMetrics } = useCashSnapshots();
console.log(cashMetrics.cashToday, cashMetrics.isStale);

// 4. Risk Appetite
const { data: appetites } = useRiskAppetites();
const { data: status } = useRiskStatus();

// 5. Investor Disclosure
const generateDisclosure = useGenerateDisclosure();
const { data: disclosures } = useDisclosureList();

// 6. Stress Testing
const runStressTest = useRunStressTest();
const { data: history } = useStressTestHistory();

// 7. Board Scenarios
const runScenario = useRunScenario();
const { data: scenarios } = useScenarioList();
```

### 11.4 UI Tests

1. **TruthBadge**: Import vào dashboard card, verify hiển thị đúng màu/label
2. **Explain Dialog**: Click info button, verify shows formula + assumptions
3. **Reconciliation Board**: Verify reads from SSOT views
4. **CFO Dashboard**: Verify all metrics load correctly
5. **Risk Appetite Config**: Verify can create/edit/activate configs
6. **Investor Disclosure**: Verify generate/approve/publish flow
7. **Stress Test Console**: Verify slider adjustments update preview
8. **Board Scenario Room**: Verify scenario comparison works

---

## XII. GOVERNANCE PATCH v3.1 SUMMARY

### A. SSOT Views Fix (CRITICAL)

| View | Problem Fixed | Solution |
|------|---------------|----------|
| `v_invoice_settled_paid` | Used `settlement_amount` from links | Now uses `SUM(allocated_amount)` from allocations |
| `v_bank_txn_match_state` | Failed on negative amounts (debits) | Now uses `ABS(amount)` and allocation-based matching |

### B. Auto-Apply Disabled (MANDATORY)

```typescript
// ❌ OLD (REMOVED - Governance violation)
if (confidence >= 80) {
  await createLink.mutateAsync(...); // Direct ledger write
}

// ✅ NEW (v3.1 - Governance compliant)
if (confidence >= 40) {
  createSuggestion(); // Suggest only
  // Ledger writes ONLY via:
  // 1. User explicit confirmation (applyMatch)
  // 2. Guardrails auto-confirm path (with audit)
}
```

### C. Metric Code Normalization

| Old Code | New Code (snake_case) |
|----------|----------------------|
| AR_OVERDUE_RATIO | ar_overdue_ratio |
| AUTO_RECON_RATE | auto_reconciliation_rate |
| FALSE_AUTO_RATE | false_auto_rate |
| CASH_RUNWAY_DAYS | cash_runway_days |

**Utility:** `src/lib/metric-normalization.ts`

### D. Scenario Isolation

Scenario & stress test outputs:
- ✅ Stored in `board_scenarios.projected_outcomes` (JSON)
- ❌ NEVER written to `decision_snapshots` with `truth_level = settled/provisional`
- All scenario responses include `isSimulation: true, truthLevel: 'simulated'`

### E. Investor Disclosure Sanitization

**BLOCKED fields:**
- Customer names
- Invoice numbers
- Bank references
- Transaction IDs
- Email addresses

**Allowed (bucketed):**
- Ratios and percentages
- Buckets (">6 months", "$500K-$1M")
- Status ("within appetite", "breached")

---

## 📁 FILE LOCATIONS

```
src/
├── hooks/
│   ├── useCentralFinancialMetrics.ts   # SSOT for all financial metrics
│   ├── useReconciliationSSOT.ts        # Reconciliation ledger hooks (v3.1 fixed)
│   ├── useDecisionSnapshots.ts         # Decision snapshot hooks
│   ├── useCashConversionCycle.ts       # CCC metrics
│   ├── useCashRunway.ts                # Cash runway
│   ├── usePLData.ts                    # P&L data
│   ├── useInvoiceData.ts               # Invoice CRUD
│   ├── useBillsData.ts                 # Bills CRUD
│   ├── useBankData.ts                  # Bank data
│   ├── useRiskAppetite.ts              # Risk appetite management
│   ├── useInvestorDisclosure.ts        # Investor disclosure
│   ├── useStressTest.ts                # Stress testing
│   └── useBoardScenarios.ts            # Board scenarios
│
├── lib/
│   ├── fdp-formulas.ts                 # Locked formulas
│   ├── financial-constants.ts          # Benchmarks, thresholds
│   ├── metric-normalization.ts         # v3.1: Metric code normalization
│   └── formatters.ts                   # VND formatting
│
├── components/
│   ├── dashboard/
│   │   └── TruthBadge.tsx              # Truth level badge
│   ├── risk/
│   │   ├── RiskAppetiteConfig.tsx      # Risk appetite configuration
│   │   ├── RiskStatusDashboard.tsx     # Current risk status
│   │   └── RiskBreachHistory.tsx       # Breach history
│   ├── investor/
│   │   └── InvestorRiskDisclosure.tsx  # Investor disclosure UI
│   ├── stress-test/
│   │   └── RiskStressTestConsole.tsx   # Stress test console
│   └── scenarios/
│       └── BoardScenarioRoom.tsx       # Board scenario room
│
├── pages/
│   ├── Dashboard.tsx                   # CFO Dashboard
│   ├── Reconciliation.tsx              # Reconciliation Hub
│   ├── DecisionCenter.tsx              # Decision Center
│   ├── UnitEconomics.tsx               # Unit Economics
│   ├── PLReport.tsx                    # P&L Report
│   ├── ExpensesPage.tsx                # Expenses management
│   ├── RevenuePage.tsx                 # Revenue management
│   ├── RiskDashboardPage.tsx           # Risk dashboard
│   └── BoardReportsPage.tsx            # Board reports

supabase/
├── functions/
│   ├── decision-snapshots/index.ts     # Decision snapshots API
│   ├── detect-alerts/                  # Alert detection
│   ├── generate-decision-cards/        # Decision card generation
│   ├── risk-appetite/index.ts          # Risk appetite management
│   ├── investor-disclosure/index.ts    # Investor disclosure (v3.1 sanitization)
│   ├── risk-stress-test/index.ts       # Stress testing
│   └── board-scenarios/index.ts        # Board scenarios (v3.1 isolation)
│
└── migrations/
    ├── ..._reconciliation_ledger.sql   # SSOT ledger tables
    ├── ..._ssot_views_v31.sql          # v3.1 fixed views
    ├── ..._decision_snapshots.sql      # Decision snapshots table
    ├── ..._risk_appetite.sql           # Risk appetite tables
    ├── ..._investor_disclosures.sql    # Investor disclosure tables
    └── ..._board_scenarios.sql         # Board scenarios tables

public/docs/
├── system-documentation-complete.md    # Full system docs
├── database-schema.md                  # 163+ tables reference
└── fdp-complete-system-review.md       # This file
```

---

## 📊 SYSTEM SUMMARY

### Platform Modules

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **FDP** | Financial Data Platform | SSOT metrics, P&L, Cash Flow, Working Capital |
| **MDP** | Marketing Data Platform | Profit attribution, Cash impact, ROI |
| **Control Tower** | Operations | Alerts, Tasks, KPI monitoring |
| **CDP** | Customer Data Platform | Customer insights (planned) |

### Governance Controls (v3.1)

| Control | Status | Enforcement |
|---------|--------|-------------|
| Auto-Apply Disabled | ✅ Active | Hooks block direct ledger writes |
| Metric Normalization | ✅ Active | snake_case required |
| Scenario Isolation | ✅ Active | Never pollutes truth tables |
| Disclosure Sanitization | ✅ Active | PII/transaction details blocked |
| SSOT Views Fixed | ✅ Active | Allocation-based accuracy |

### Navigation Structure

| Section | Routes | Description |
|---------|--------|-------------|
| CFO Overview | /dashboard, /cash-forecast, /working-capital-hub | Core financial dashboards |
| Strategy & Decision | /executive-summary, /capital-allocation, /risk-dashboard | Strategic planning |
| Financial Reports | /pl-report, /financial-reports, /expenses, /revenue | Reporting |
| AR/AP | /invoice/tracking, /ar-operations, /bills, /reconciliation | Receivables & Payables |
| Data Hub | /data-hub, /data-warehouse, /chart-of-accounts, /bank-connections | Data management |
| Admin | /tenant, /rbac, /audit-log | Administration |

### Key Integrations

| Integration | Type | Status |
|-------------|------|--------|
| Shopee/Lazada | E-commerce | Active |
| TikTok/Meta Ads | Marketing | Active |
| Bank APIs | Banking | Active |
| Google BigQuery | Data Warehouse | Active |

---

*Document generated for Bluecore FDP v3.1 - Financial Governance Operating System*
*Governance Patch v3.1 Applied: SSOT correctness, Auto-apply disabled, Metric normalization*
*Last updated: 2026-01-20*
