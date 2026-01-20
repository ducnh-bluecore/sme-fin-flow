# BLUECORE FDP - COMPLETE SYSTEM REVIEW
> **Financial Data Platform** - Single Source of Truth for CEO/CFO
> Version: 2.0 | Updated: 2026-01-20

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
9. [Test Checklist](#ix-test-checklist)

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

#### Auto-Match Algorithm

```typescript
// Matching criteria (scored 0-100)
1. Amount match (exact: +50, partial: +30)
2. Invoice number in description (+40)
3. Customer name match (+25)
4. Date proximity (≤7 days: +15, ≤30 days: +5)

// Threshold: confidence ≥ 40 → suggest, ≥ 80 → auto-apply
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

## IX. TEST CHECKLIST

### 9.1 Database Tests

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
```

### 9.2 Edge Function Tests

```bash
# 1. Compute cash snapshots
curl -X POST \
  'https://{project-id}.supabase.co/functions/v1/decision-snapshots/compute/cash' \
  -H 'Authorization: Bearer {token}' \
  -d '{"tenantId": "{tenant-uuid}"}'

# 2. Get latest snapshot
curl -X GET \
  'https://{project-id}.supabase.co/functions/v1/decision-snapshots/latest?tenantId={tenant-uuid}&metricCode=cash_today'

# 3. Explain snapshot
curl -X GET \
  'https://{project-id}.supabase.co/functions/v1/decision-snapshots/explain/{snapshot-id}'
```

### 9.3 Hook Tests

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
```

### 9.4 UI Tests

1. **TruthBadge**: Import vào dashboard card, verify hiển thị đúng màu/label
2. **Explain Dialog**: Click info button, verify shows formula + assumptions
3. **Reconciliation Board**: Verify reads from SSOT views
4. **CFO Dashboard**: Verify all metrics load correctly

---

## 📁 FILE LOCATIONS

```
src/
├── hooks/
│   ├── useCentralFinancialMetrics.ts   # SSOT for all financial metrics
│   ├── useReconciliationSSOT.ts        # Reconciliation ledger hooks
│   ├── useDecisionSnapshots.ts         # Decision snapshot hooks
│   ├── useCashConversionCycle.ts       # CCC metrics
│   ├── useCashRunway.ts                # Cash runway
│   ├── usePLData.ts                    # P&L data
│   ├── useInvoiceData.ts               # Invoice CRUD
│   ├── useBillsData.ts                 # Bills CRUD
│   └── useBankData.ts                  # Bank data
│
├── lib/
│   ├── fdp-formulas.ts                 # Locked formulas
│   ├── financial-constants.ts          # Benchmarks, thresholds
│   └── formatters.ts                   # VND formatting
│
├── components/
│   └── dashboard/
│       └── TruthBadge.tsx              # Truth level badge
│
├── pages/
│   ├── Dashboard.tsx                   # CFO Dashboard
│   ├── Reconciliation.tsx              # Reconciliation Hub
│   ├── DecisionCenter.tsx              # Decision Center
│   ├── UnitEconomics.tsx               # Unit Economics
│   └── PLReport.tsx                    # P&L Report

supabase/
├── functions/
│   ├── decision-snapshots/index.ts     # Decision snapshots API
│   ├── detect-alerts/                  # Alert detection
│   └── generate-decision-cards/        # Decision card generation
│
└── migrations/
    ├── ..._reconciliation_ledger.sql   # SSOT ledger tables
    └── ..._decision_snapshots.sql      # Decision snapshots table

public/docs/
├── system-documentation-complete.md    # Full system docs
├── database-schema.md                  # 163 tables reference
└── fdp-complete-system-review.md       # This file
```

---

*Document generated for Bluecore FDP v2.0 - Single Source of Truth*
