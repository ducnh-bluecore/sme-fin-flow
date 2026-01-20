# BLUECORE SSOT IMPLEMENTATION REVIEW
> Version: 1.0 | Updated: 2026-01-20

Tài liệu tổng hợp toàn bộ schema, hooks, functions của hệ thống SSOT để review trước khi test.

---

## 📊 TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SSOT ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌─────────────────┐     ┌────────────────────┐    │
│  │  EVIDENCE   │     │     LEDGER      │     │       TRUTH        │    │
│  │ (Immutable) │────▶│  (Append-only)  │────▶│   (Views/Reads)    │    │
│  └─────────────┘     └─────────────────┘     └────────────────────┘    │
│                                                                         │
│  • bank_transactions   • reconciliation_links   • v_invoice_settled_*  │
│  • invoices            • settlement_allocations • v_bank_txn_match_*   │
│  • payments            • decision_snapshots     • v_decision_latest    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Nguyên tắc cốt lõi:
1. **Evidence ≠ Truth** - Không update source tables
2. **Append-only** - Chỉ INSERT, không UPDATE/DELETE
3. **Explainability** - Mọi số liệu có thể giải thích nguồn gốc
4. **Authority levels** - Phân biệt BANK/MANUAL/RULE

---

## 🗄️ PART 1: DATABASE SCHEMA

### 1.1 Reconciliation Ledger Tables

#### `reconciliation_links` (Core Ledger)
```sql
CREATE TABLE public.reconciliation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Evidence reference
  bank_transaction_id UUID NULL,        -- NULL = manual payment
  settlement_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND',
  settlement_date DATE NOT NULL,
  
  -- Target
  target_type TEXT NOT NULL DEFAULT 'invoice',
  target_id UUID NOT NULL,
  
  -- Match metadata
  match_type TEXT NOT NULL CHECK (match_type IN ('manual', 'exact', 'probabilistic', 'aggregate')),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  match_evidence JSONB NOT NULL DEFAULT '{}',
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Void (never delete)
  is_voided BOOLEAN NOT NULL DEFAULT false,
  void_reason TEXT,
  voided_at TIMESTAMPTZ
);
```

**Constraint quan trọng:**
- `match_type = 'manual'` → `bank_transaction_id IS NULL`
- `match_type != 'manual'` → `bank_transaction_id IS NOT NULL`

#### `settlement_allocations` (Partial Payments)
```sql
CREATE TABLE public.settlement_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reconciliation_link_id UUID NOT NULL REFERENCES reconciliation_links(id),
  allocated_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 1.2 Decision Snapshots Table

#### `decision_snapshots` (CFO Metrics Ledger)
```sql
CREATE TABLE public.decision_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Metric identity
  metric_code TEXT NOT NULL,              -- 'cash_today', 'cash_flow_today', 'cash_next_7d'
  metric_version INT NOT NULL DEFAULT 1,  -- Bump when formula changes
  
  -- Dimension
  entity_type TEXT NOT NULL DEFAULT 'tenant',
  entity_id UUID NULL,
  dimensions JSONB NOT NULL DEFAULT '{}',  -- e.g. {"currency":"VND"}
  
  -- Value
  value NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND',
  
  -- Truth classification
  truth_level TEXT NOT NULL CHECK (truth_level IN ('settled', 'provisional')),
  authority TEXT NOT NULL CHECK (authority IN ('BANK','MANUAL','RULE','ACCOUNTING','GATEWAY','CARRIER')),
  confidence NUMERIC(5,2) NOT NULL DEFAULT 100,
  
  -- Temporal
  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Explainability
  derived_from JSONB NOT NULL DEFAULT '{}',
  calculation_hash TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_id UUID REFERENCES decision_snapshots(id)
);
```

**Truth Level Rules:**
| truth_level | Allowed authorities |
|-------------|---------------------|
| `settled` | BANK, MANUAL, ACCOUNTING, GATEWAY, CARRIER |
| `provisional` | RULE only |

---

### 1.3 SSOT Views

#### `v_invoice_settled_paid`
Tính paid_amount từ ledger thay vì đọc trực tiếp `invoices.paid_amount`

```sql
CREATE VIEW v_invoice_settled_paid AS
SELECT 
  i.id AS invoice_id,
  i.tenant_id,
  i.invoice_number,
  i.total_amount,
  COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) AS settled_paid_amount
FROM invoices i
LEFT JOIN reconciliation_links rl 
  ON rl.target_type = 'invoice' 
  AND rl.target_id = i.id
GROUP BY i.id, i.tenant_id, i.invoice_number, i.total_amount;
```

#### `v_invoice_settled_status`
Derive invoice status từ paid amount

```sql
CREATE VIEW v_invoice_settled_status AS
SELECT 
  *,
  total_amount - settled_paid_amount AS remaining_amount,
  CASE 
    WHEN settled_paid_amount >= total_amount THEN 'paid'
    WHEN settled_paid_amount > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS settled_status,
  'settled' AS truth_level
FROM v_invoice_settled_paid;
```

#### `v_bank_txn_match_state`
Tính match state của bank transactions từ ledger

```sql
CREATE VIEW v_bank_txn_match_state AS
SELECT 
  bt.id AS bank_transaction_id,
  bt.tenant_id,
  bt.amount AS bank_amount,
  bt.transaction_date,
  bt.description,
  bt.reference,
  COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) AS matched_amount,
  bt.amount - COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) AS unmatched_amount,
  CASE 
    WHEN COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) = 0 THEN 'unmatched'
    WHEN COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) < bt.amount THEN 'partially_matched'
    ELSE 'matched'
  END AS match_state,
  COUNT(rl.id) FILTER (WHERE rl.is_voided = false) AS link_count
FROM bank_transactions bt
LEFT JOIN reconciliation_links rl 
  ON rl.bank_transaction_id = bt.id
GROUP BY bt.id, bt.tenant_id, bt.amount, bt.transaction_date, bt.description, bt.reference;
```

#### `v_decision_latest`
Lấy snapshot mới nhất cho mỗi metric + dimension

```sql
CREATE VIEW v_decision_latest AS
SELECT DISTINCT ON (
  tenant_id,
  metric_code,
  entity_type,
  COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
  dimensions
)
  *
FROM decision_snapshots
ORDER BY
  tenant_id,
  metric_code,
  entity_type,
  COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
  dimensions,
  as_of DESC,
  created_at DESC;
```

---

### 1.4 RLS Policies

Tất cả tables đều có RLS enabled với pattern:

```sql
-- SELECT
CREATE POLICY "tenant_select" ON table_name
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- INSERT
CREATE POLICY "tenant_insert" ON table_name
FOR INSERT WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- UPDATE (chỉ cho void operation)
CREATE POLICY "tenant_update" ON reconciliation_links
FOR UPDATE USING (...)
WITH CHECK (is_voided = true);  -- Chỉ cho phép void, không update khác
```

---

### 1.5 Backfill Data

**214 legacy invoices** đã được backfill vào `reconciliation_links`:
- `match_type = 'manual'`
- `bank_transaction_id = NULL`
- `currency = 'VND'`
- `confidence = 100`

---

## 🪝 PART 2: REACT HOOKS

### 2.1 `useReconciliationSSOT.ts`

**Location:** `src/hooks/useReconciliationSSOT.ts`

#### Read Hooks (from SSOT Views)

| Hook | Source | Purpose |
|------|--------|---------|
| `useInvoiceSettledStatus()` | `v_invoice_settled_status` | Get invoice paid status from ledger |
| `useBankTxnMatchState()` | `v_bank_txn_match_state` | Get bank txn match state from ledger |
| `useReconciliationLinks()` | `reconciliation_links` | Get ledger entries |

#### Write Hooks (to SSOT Ledger)

| Hook | Target | Purpose |
|------|--------|---------|
| `useCreateReconciliationLink()` | `reconciliation_links` | Create match (INSERT only) |
| `useVoidReconciliationLink()` | `reconciliation_links` | Void match (UPDATE is_voided=true) |

#### Composite Hook

| Hook | Purpose |
|------|---------|
| `useAutoMatchSSOT()` | Auto-matching algorithm using SSOT views |

**Key Features:**
- `findMatches()` - Algorithm tìm matches dựa trên amount, invoice number, customer name, date
- `runAutoMatch(autoApply)` - Chạy auto-match, option tự động apply high confidence (≥80%)
- `applyMatch(match)` - Apply single match vào ledger
- `getStats()` - Thống kê reconciliation từ SSOT views

---

### 2.2 `useDecisionSnapshots.ts`

**Location:** `src/hooks/useDecisionSnapshots.ts`

#### Types
```typescript
interface DecisionSnapshot {
  id: string;
  tenant_id: string;
  metric_code: string;           // 'cash_today', 'cash_flow_today', 'cash_next_7d'
  metric_version: number;
  entity_type: string;
  entity_id: string | null;
  dimensions: Record<string, unknown>;
  value: number;
  currency: string;
  truth_level: 'settled' | 'provisional';
  authority: 'BANK' | 'MANUAL' | 'RULE' | 'ACCOUNTING' | 'GATEWAY' | 'CARRIER';
  confidence: number;
  as_of: string;
  derived_from: {
    evidence?: Array<{ type: string; id: string; ... }>;
    assumptions?: Array<{ factor: string; value: number; description: string }>;
    formula?: string;
    sources?: string[];
    inputs?: Record<string, number>;
    calculation?: Record<string, number>;
  };
  created_at: string;
  supersedes_id: string | null;
}

interface CashMetrics {
  cashToday: number;
  cashFlowToday: number;
  cashNext7d: number;
  snapshots: {
    cash_today?: DecisionSnapshot;
    cash_flow_today?: DecisionSnapshot;
    cash_next_7d?: DecisionSnapshot;
  };
  isStale: boolean;
  lastUpdated: string | null;
}
```

#### Hooks

| Hook | Purpose |
|------|---------|
| `useLatestSnapshot(metricCode)` | Get latest snapshot for a metric from `v_decision_latest` |
| `useCashSnapshots()` | Get all 3 cash metrics with staleness check (15 min threshold) |
| `useComputeCashSnapshots()` | Trigger edge function to compute & write snapshots |
| `useSnapshotExplanation(snapshotId)` | Get explanation from edge function |
| `useCreateSnapshot()` | Manually create a snapshot |

---

## ⚡ PART 3: EDGE FUNCTION

### `decision-snapshots`

**Location:** `supabase/functions/decision-snapshots/index.ts`

#### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/snapshots` | Create new snapshot (append-only) |
| GET | `/latest` | Get latest snapshot by metricCode |
| GET | `/explain/:id` | Get explanation for a snapshot |
| POST | `/compute/cash` | Compute & write 3 cash metrics |
| GET | `/check-stale` | Check if snapshots are stale |

#### POST `/snapshots` - Request
```json
{
  "tenantId": "uuid",
  "metricCode": "cash_today",
  "metricVersion": 1,
  "entityType": "tenant",
  "entityId": null,
  "dimensions": { "currency": "VND" },
  "value": 123456789,
  "currency": "VND",
  "truthLevel": "settled",
  "authority": "BANK",
  "confidence": 100,
  "asOf": "2026-01-20T10:00:00Z",
  "derivedFrom": { ... }
}
```

**Validation:**
- `truthLevel = 'provisional'` → `authority` MUST be `'RULE'`
- `truthLevel = 'settled'` → `authority` MUST be in `['BANK', 'MANUAL', 'ACCOUNTING', 'GATEWAY', 'CARRIER']`

#### POST `/compute/cash` - Logic

Computes 3 snapshots:

| Metric | Truth Level | Authority | Formula |
|--------|-------------|-----------|---------|
| `cash_today` | settled | BANK | `SUM(bank_accounts.current_balance)` |
| `cash_flow_today` | settled | BANK | `credits - debits` (today) |
| `cash_next_7d` | provisional | RULE | `cash_today + (15%×AR) + (80%×weekly_sales) - (20%×AP)` |

**`derived_from` for `cash_next_7d`:**
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
  "calculation": {
    "ar_collection": 75000000,
    "sales_inflow": 160000000,
    "ap_payment": 60000000
  },
  "formula": "cash_today + (AR * 0.15) + (weekly_sales * 0.80) - (AP * 0.20)",
  "sources": ["bank_accounts", "invoices", "external_orders", "bills"],
  "window_days": 7
}
```

---

## 🎨 PART 4: UI COMPONENTS

### `TruthBadge.tsx`

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
| Truth Level | Color | Icon | Label |
|-------------|-------|------|-------|
| `settled` | Green (emerald) | ✓ CheckCircle | `SETTLED (BANK)` |
| `provisional` | Amber | ⏱ Clock | `PROVISIONAL (RULE)` |

#### Explain Dialog
Khi click button Info:
- Hiển thị metric name, value, authority
- Hiển thị formula
- Hiển thị assumptions (cho provisional)
- Hiển thị evidence (cho settled)
- Hiển thị data sources

---

## 📋 PART 5: TEST CHECKLIST

### Database Tests
```sql
-- 1. Verify reconciliation_links exists and has backfilled data
SELECT COUNT(*) FROM reconciliation_links WHERE match_type = 'manual';
-- Expected: 214

-- 2. Verify views work
SELECT * FROM v_invoice_settled_status LIMIT 5;
SELECT * FROM v_bank_txn_match_state LIMIT 5;

-- 3. Verify decision_snapshots table exists
SELECT * FROM decision_snapshots LIMIT 1;

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('reconciliation_links', 'settlement_allocations', 'decision_snapshots');
```

### Edge Function Tests
```bash
# 1. Compute cash snapshots
curl -X POST \
  'https://{project-id}.supabase.co/functions/v1/decision-snapshots/compute/cash' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{"tenantId": "{tenant-uuid}"}'

# 2. Get latest snapshot
curl -X GET \
  'https://{project-id}.supabase.co/functions/v1/decision-snapshots/latest?tenantId={tenant-uuid}&metricCode=cash_today' \
  -H 'Authorization: Bearer {token}'

# 3. Explain snapshot
curl -X GET \
  'https://{project-id}.supabase.co/functions/v1/decision-snapshots/explain/{snapshot-id}' \
  -H 'Authorization: Bearer {token}'
```

### UI Tests
1. Import `TruthBadge` vào dashboard card
2. Pass snapshot data vào component
3. Verify badge hiển thị đúng màu/label
4. Click Explain button → verify dialog shows details

---

## 🔐 SECURITY CHECKLIST

- [x] RLS enabled on all tables
- [x] Policies use `tenant_users` for access control
- [x] No direct UPDATE on source tables (invoices, bank_transactions)
- [x] Only void operation allowed on reconciliation_links
- [x] Edge function validates truth_level/authority constraints
- [x] Service role key used in edge function, not exposed to client

---

## 📈 FUTURE ENHANCEMENTS

1. **Auto-refresh**: Trigger `compute/cash` khi data thay đổi
2. **Historical snapshots**: Query lịch sử metric theo thời gian
3. **More metrics**: DSO, DIO, DPO, CCC với cùng pattern
4. **Webhook notifications**: Alert khi metric vượt threshold
5. **Audit trail UI**: Hiển thị lịch sử thay đổi

---

## 📁 FILE LOCATIONS SUMMARY

```
src/
├── hooks/
│   ├── useReconciliationSSOT.ts    # Reconciliation ledger hooks
│   └── useDecisionSnapshots.ts     # Decision snapshots hooks
├── components/
│   └── dashboard/
│       └── TruthBadge.tsx          # Truth level badge + explain dialog

supabase/
├── functions/
│   └── decision-snapshots/
│       └── index.ts                # Edge function API
└── migrations/
    ├── ..._reconciliation.sql      # Reconciliation tables + views
    └── ..._decision_snapshots.sql  # Decision snapshots table + view

public/
└── docs/
    └── ssot-implementation-review.md  # This file
```
