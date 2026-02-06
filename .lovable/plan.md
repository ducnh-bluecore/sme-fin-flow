
# PLAN: XOA BO LUONG SSOT VIOLATION (external_orders/external_order_items)

## 1. PHAM VI VAN DE

Hien tai codebase co **2 luong data song song** gay ra SSOT violation:

```text
LUONG SAI (CAN XOA):
┌─────────────────────────────────────────────────────────────────────┐
│ BigQuery/Connectors → external_orders → Hooks/Views → UI           │
│                       external_order_items                          │
│                       (Layer 0 - Staging)                           │
└─────────────────────────────────────────────────────────────────────┘

LUONG DUNG (GIU LAI):
┌─────────────────────────────────────────────────────────────────────┐
│ BigQuery/Connectors → master_orders → cdp_orders → KPI → UI        │
│                       master_order_items   (Layer 2)                │
│                       (Layer 2 - SSOT)                              │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. THONG KE FILES CAN XU LY

### 2.1 HOOKS - TRUC TIEP QUERY external_orders/items (CRITICAL)

| File | Vi pham | Action |
|------|---------|--------|
| `src/hooks/useWhatIfRealData.ts` | Line 113-122: Query `external_order_items` cho SKU analysis | Refactor sang `master_order_items` hoac CDP layer |
| `src/hooks/useMDPSSOT.ts` | Line 103-106: Query `external_order_items` | Refactor sang `master_order_items` |
| `src/hooks/useMDPData.ts` | Line 298-302: Query `external_order_items` | Refactor sang `master_order_items` |
| `src/hooks/useEcommerceReconciliation.ts` | Line 118-122, 213-216, 340: Query/Update `external_orders` | GIU LAI - Day la EXCEPTION cho reconciliation workflow (can staging data) |

### 2.2 EDGE FUNCTIONS - WRITE TO external_orders (CRITICAL)

| File | Vi pham | Action |
|------|---------|--------|
| `supabase/functions/sync-connector/index.ts` | 7 cho upsert vao `external_orders` (lines 275, 485, 768, 954, 1123, 1288, 1498) | Refactor TRUC TIEP vao `master_orders` |
| `supabase/functions/sync-bigquery/index.ts` | Lines 934, 1351, 1387: Query/Upsert `external_orders`, `external_order_items` | Refactor TRUC TIEP vao `master_orders`, `master_order_items` |
| `supabase/functions/sync-ecommerce-data/index.ts` | Line 351: Upsert vao `external_orders` | Refactor TRUC TIEP vao `master_orders` |
| `supabase/functions/batch-import-data/index.ts` | Lines 414, 482, 491: Query/Insert `external_orders`, `external_order_items` | Refactor TRUC TIEP vao `master_orders`, `master_order_items` |

### 2.3 COMPONENTS - REFERENCE external_orders (LOW)

| File | Vi pham | Action |
|------|---------|--------|
| `src/components/warehouse/BigQuerySyncManager.tsx` | Lines 85-86: Count `external_orders`, `external_order_items` cho sync status | OK - chi de monitor staging, khong anh huong SSOT |
| `src/components/warehouse/DataModelManager.tsx` | Line 123-124: TARGET_TABLES config | Update target table names |
| `src/pages/mdp/DataReadinessPage.tsx` | Lines 149-210: Field descriptions cho `external_orders` | Update de reflect master_orders schema |

### 2.4 SQL MIGRATIONS - VIEWS/FUNCTIONS QUERY external_orders (CRITICAL)

Tim thay **28+ migration files** chua views/functions query tu `external_orders`. Danh sach chinh:

| Migration | Vi pham | Action |
|-----------|---------|--------|
| `20260123015130_*.sql` | Nhieu views query `external_orders` | Tao migration moi refactor sang `cdp_orders` |
| `20260124162201_*.sql` | Views tong hop tu `external_orders` | Tao migration moi refactor |
| `20260126061703_*.sql` | Function `fdp_get_*` query `external_orders` | Tao migration moi refactor |
| `20260126062147_*.sql` | RPC query `external_orders` | Tao migration moi refactor |
| `20260122083605_*.sql` | SKU performance query `external_order_items` | Tao migration moi refactor |
| `20260117033830_*.sql` | Order items aggregation | Tao migration moi refactor |
| `20260116111925_*.sql` | Channel daily/monthly views | Tao migration moi refactor |

### 2.5 CONFIG/TYPES (LOW)

| File | Vi pham | Action |
|------|---------|--------|
| `src/lib/dataRequirementsMap.ts` | Line 516: tableName = 'external_order_items' | Update sang `master_order_items` |
| `src/lib/command-center/metric-registry.ts` | Da fix - source_view = 'cdp_orders' | OK - Da SSOT compliant |
| `src/contexts/LanguageContext.tsx` | Line 3407: Comment reference | Update comment |

## 3. PHAN LOAI MUC DO UU TIEN

### P0: CRITICAL - Anh huong truc tiep SSOT

1. **Edge Functions sync** - Chuyen tu external_orders sang master_orders
2. **Hooks query external_orders** - Refactor sang master_orders hoac cdp_orders
3. **SQL views/functions** - Tao migration refactor

### P1: HIGH - Anh huong data flow

4. **DataModelManager** - Update target tables
5. **DataReadinessPage** - Update field descriptions

### P2: LOW - Documentation/Comments

6. **LanguageContext** - Update comments
7. **dataRequirementsMap** - Update table references

## 4. IMPLEMENTATION PHASES

### Phase A: Edge Functions (Sync Layer)

**Muc tieu:** Tat ca data tu BigQuery/Connectors vao TRUC TIEP `master_orders`

```text
TRUOC:
sync-bigquery → external_orders → trigger → master_orders

SAU:
sync-bigquery → master_orders (TRUC TIEP)
```

**Files can sua:**
- `sync-bigquery/index.ts`: Update upsert target tu `external_orders` sang `master_orders`
- `sync-connector/index.ts`: Update 7 cho upsert
- `sync-ecommerce-data/index.ts`: Update upsert target
- `batch-import-data/index.ts`: Update insert targets

### Phase B: Hooks Refactor

**Muc tieu:** Tat ca hooks query tu `cdp_orders`/`master_orders` (Layer 2)

| Hook | Hien tai | Moi |
|------|----------|-----|
| useWhatIfRealData | `external_order_items` | `master_order_items` JOIN `master_orders` |
| useMDPSSOT | `external_order_items` | `master_order_items` |
| useMDPData | `external_order_items` | `master_order_items` |

### Phase C: SQL Migration

**Muc tieu:** Tao migration file moi de refactor tat ca views/functions

```sql
-- Migration: Fix SSOT - All views query from master_orders/cdp_orders

-- 1. Drop old views
DROP VIEW IF EXISTS v_channel_daily_summary;
DROP VIEW IF EXISTS v_sku_performance;
-- ...

-- 2. Create new views pointing to master_orders
CREATE OR REPLACE VIEW v_channel_daily_summary AS
SELECT ... FROM master_orders WHERE ...;

CREATE OR REPLACE VIEW v_sku_performance AS
SELECT ... FROM master_order_items WHERE ...;
```

### Phase D: Cleanup Tables (Optional - Sau khi verify)

```sql
-- SAU KHI verify tat ca luong da chuyen sang master_orders
-- Co the xoa external_orders/external_order_items

-- WARNING: Chi chay sau khi E2E test thanh cong
-- DROP TABLE external_order_items;
-- DROP TABLE external_orders;
```

## 5. EXCEPTION - KHONG XOA

| Component | Ly do giu lai |
|-----------|---------------|
| `useEcommerceReconciliation.ts` | Reconciliation workflow CAN staging data de match voi marketplace APIs truoc khi confirm vao master |
| `BigQuerySyncManager.tsx` (count only) | Chi de monitor sync status, khong query business data |

## 6. E2E TEST PLAN ALIGNMENT

Sau khi refactor, data flow cho E2E test se la:

```text
Phase 1: BigQuery Query (baseline metrics)
     ↓
Phase 2: sync-bigquery → master_orders (TRUC TIEP - khong qua external)
     ↓
Phase 3: cdp_run_daily_build() → cdp_customer_equity_computed
     ↓
Phase 4: control_tower_aggregate_signals() → priority_queue
     ↓
Phase 5: UI Verification
```

## 7. TECHNICAL DETAILS

### Schema Mapping Can Update

```text
external_orders         → master_orders
-----------------------------------------
id                      → id
tenant_id               → tenant_id  
external_order_id       → order_key
order_date              → order_at
channel                 → channel
total_amount            → gross_revenue
net_revenue             → net_revenue (NEW)
cost_of_goods           → cogs (NEW)
customer_phone          → customer_id (FK)
status                  → status
platform_fee            → platform_fee
commission_fee          → commission_fee
shipping_fee            → shipping_fee
```

```text
external_order_items    → master_order_items
---------------------------------------------
id                      → id
external_order_id       → master_order_id
sku                     → sku
product_name            → product_name
quantity                → quantity
unit_price              → unit_price
total_amount            → line_total
unit_cogs               → unit_cogs
total_cogs              → line_cogs
gross_profit            → line_margin
```

### Hooks Query Pattern (SAU REFACTOR)

```typescript
// TRUOC (SAI)
const { data } = await client
  .from('external_order_items')
  .select('...')
  .eq('tenant_id', tenantId);

// SAU (DUNG)
const { data } = await buildSelectQuery(
  'master_order_items', // hoac 'cdp_order_items'
  'sku, quantity, unit_price, ...'
)
  .eq('master_order_id', orderId);
```

## 8. CHECKLIST XAC NHAN

Sau khi hoan thanh, verify:

- [ ] `sync-bigquery` ghi truc tiep vao `master_orders`
- [ ] `sync-connector` ghi truc tiep vao `master_orders`
- [x] `useWhatIfRealData` query tu `cdp_order_items` (maps to master_order_items)
- [x] `useMDPSSOT` query tu `cdp_order_items` (maps to master_order_items)
- [x] `useMDPData` query tu `cdp_order_items` (maps to master_order_items)
- [ ] Tat ca SQL views query tu `cdp_orders` hoac `master_orders`
- [ ] E2E test OLV Boutique pass
- [ ] UI screens hien thi dung data

## 9. ESTIMATED EFFORT

| Phase | Files | Estimated Time |
|-------|-------|----------------|
| Phase A: Edge Functions | 4 files | 2-3h |
| Phase B: Hooks | 3 files | 1-2h |
| Phase C: SQL Migration | 1 file (consolidate) | 2-3h |
| Phase D: Testing | - | 2-3h |
| **Total** | **8+ files** | **7-11h** |
