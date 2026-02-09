

# Refactor Inventory Allocation Engine theo SOP 2 vong (V1 + V2)

## Hien trang & Van de

### Audit hien tai

**Database (12 bang inv_*):**
- `inv_stores`: co tier (S/A/B/C), region, location_type -- OK
- `inv_family_codes`: co category, season -- **THIEU** collection_id, is_core_hero
- `inv_sku_fc_mapping`: co sku, fc_id, size, color -- **THIEU** is_core_hero flag
- `inv_state_positions`: co on_hand, reserved, safety_stock -- **THIEU** snapshot_id, size_run_group
- `inv_state_demand`: co sales_velocity, avg_daily_sales -- **THIEU** customer_orders_qty, store_orders_qty, lost_sales_qty, forecast_week_qty
- `inv_constraint_registry`: 16 keys -- **THIEU** cac key SOP: v1_min_store_stock_by_total_sku, cw_reserved_min_by_total_sku, cw_core_hero_min_per_sku, v2_priority_order
- **THIEU HOAN TOAN**: `inv_collections`, `inv_state_size_integrity`

**Edge Function:**
- Hien tai la 1 vong WoC-based (shortage < 2w -> push, surplus > 6w -> lateral)
- **Khong co** V1 (phu nen theo BST/tier) va V2 (chia theo nhu cau CH)
- Hardcode: avg_price = 250k, logistics = 15k/20k/45k
- min_cntt = fixed so (hien la 5), khong theo bang total SKU
- Khong check size integrity (no_broken_size flag co nhung engine khong enforce)

### 5 van de chinh (tu audit cua ban)

| # | Van de | Hien trang | Can lam |
|---|--------|-----------|---------|
| A | 1 vong thay vi 2 vong SOP | WoC threshold only | V1 phu nen + V2 chia chi tiet |
| B | min_cntt = fixed | 1 so co dinh (5) | Bang theo total SKU + core/hero >= 15/SKU |
| C | Le size chi o FC level | Flag nhung khong enforce | Them inv_state_size_integrity, engine check truoc khi chia |
| D | Hardcode cost/price | 250k, 15k, 20k, 45k trong code | Chuyen vao constraint_registry theo region/carrier |
| E | Thieu BST scope | Khong co collection_id | Them inv_collections, filter scope trong engine |

---

## Giai phap: 4 buoc

### Buoc 1: Database Migration — Them bang & cot thieu

**1a. Bang moi: `inv_collections`**
```text
id, tenant_id, collection_code, collection_name, air_date, 
is_new_collection, season, created_at
```

**1b. Bang moi: `inv_state_size_integrity`**
```text
id, tenant_id, snapshot_date, fc_id, store_id,
total_sizes_expected, total_sizes_available,
is_full_size_run (boolean), missing_sizes (jsonb),
created_at
```

**1c. Them cot vao bang hien co:**

| Bang | Cot them | Ly do |
|------|----------|-------|
| `inv_family_codes` | `collection_id (uuid, nullable)`, `is_core_hero (boolean, default false)` | Gan BST, danh dau Core/Hero |
| `inv_sku_fc_mapping` | `is_core_hero (boolean, default false)` | Core/Hero o level SKU |
| `inv_state_demand` | `customer_orders_qty (int, default 0)`, `store_orders_qty (int, default 0)`, `lost_sales_qty (int, default 0)`, `forecast_week_qty (numeric, nullable)` | V2 priority data |
| `inv_state_positions` | `snapshot_id (text, nullable)` | Lien ket voi snapshot de audit |
| `inv_allocation_runs` | `run_type (text, default 'V1')` | Phan biet V1/V2/rebalance |
| `inv_allocation_recommendations` | `stage (text, default 'V1')`, `constraint_checks (jsonb, nullable)`, `explain_text (text, nullable)` | Giai thich va audit tung dong |

**1d. Them constraint keys moi vao `inv_constraint_registry`:**

| Key | Value JSON | Scope |
|-----|-----------|-------|
| `v1_min_store_stock_by_total_sku` | `{"ranges": [{"max_sku": 50, "min_qty": 2}, {"max_sku": 100, "min_qty": 3}, {"max_sku": 200, "min_qty": 4}, {"max_sku": 9999, "min_qty": 5}]}` | by_tier |
| `cw_reserved_min_by_total_sku` | `{"ranges": [{"max_sku": 50, "min_pcs": 5}, {"max_sku": 100, "min_pcs": 10}, {"max_sku": 200, "min_pcs": 15}, {"max_sku": 9999, "min_pcs": 20}]}` | global |
| `cw_core_hero_min_per_sku` | `{"min_pcs": 15}` | global |
| `v2_priority_order` | `["customer_orders", "store_orders", "top_fc"]` | global |
| `v2_min_cover_weeks` | `{"weeks": 1}` | global |
| `logistics_cost_by_region` | `{"same_region": 20000, "diff_region": 45000, "default": 30000}` | by_region |
| `avg_unit_price_default` | `{"amount": 250000}` | global |
| `bst_scope_recent_count` | `{"count": 10}` | global |
| `restock_lookback_days` | `{"days": 14}` | global |

### Buoc 2: Refactor Edge Function — 2 vong SOP

**Contract moi:**
```text
POST /inventory-allocation-engine
Body: {
  "tenant_id": "...",
  "user_id": "...",
  "action": "allocate",     // thay doi: allocate = V1+V2
  "run_type": "V1" | "V2" | "both",  // mac dinh "both"
  "dry_run": false,
  "snapshot_id": "..."       // optional
}
```

**Logic V1 — Phu nen theo BST:**

```text
1. Filter scope:
   - BST moi (is_new_collection = true)
   - 10 BST gan nhat theo air_date
   - Restock trong N ngay (restock_lookback_days)

2. Voi moi FC trong scope:
   a. Check size_integrity → if is_full_size_run = false → SKIP (log reason)
   b. Tinh total_sku tai moi CH
   c. Tra bang v1_min_store_stock_by_total_sku → lay min_qty cho tier/total_sku
   d. current_stock = on_hand + in_transit tai CH
   e. shortage = min_qty - current_stock
   f. Neu shortage > 0 → tao recommendation(stage=V1)

3. Xep uu tien CH: S > A > B > C

4. Greedy allocate tu CNTT:
   a. available = cw_on_hand - cw_reserved
   b. Sau moi lan chia: check cw_reserved_min_by_total_sku
   c. Neu FC la core_hero: check >= cw_core_hero_min_per_sku (15/SKU)
   d. Neu vi pham → STOP, log constraint_checks

5. Output: inv_allocation_recommendations(stage='V1')
   + constraint_checks JSON
   + explain_text: "V1: BST X, CH Y thieu Z units theo min ton tier A"
```

**Logic V2 — Chia chi tiet theo nhu cau CH:**

```text
1. Thu tu uu tien (tu constraint v2_priority_order):
   a. customer_orders_qty > 0 → chia truoc
   b. store_orders_qty > 0 → chia tiep
   c. Top FC theo sales_velocity → chia con lai

2. Cover rule: sau chia, CH phai cover >= v2_min_cover_weeks (1 tuan)

3. Gating rules (chay truoc moi dong):
   a. size_integrity = false → SKIP
   b. CNTT sau chia < cw_reserved_min → STOP
   c. Core/Hero CNTT < 15/SKU → STOP

4. Output: inv_allocation_recommendations(stage='V2')
   + co the xuong level SKU neu customer_orders chi dinh size
```

**Rebalance (giu nguyen Phase hien tai, nhung fix):**
- Lay logistics cost tu `logistics_cost_by_region` thay vi hardcode
- Lay avg_price tu `avg_unit_price_default` thay vi 250k
- Enforce size_integrity check
- Enforce min_cntt theo bang (khong phai so fixed)

### Buoc 3: Update UI — Tab V1/V2 rieng biet

**Thay doi InventoryAllocationPage.tsx:**
- Tab "Tu kho tong" → tach thanh 2 sub-sections: "V1: Phu nen" va "V2: Chia chi tiet"
- Hoac: them 2 tab moi "Phu nen (V1)" va "Chia nhu cau (V2)" thay the tab "Tu kho tong"
- Nut "Chay Quet" → dropdown: "Chay V1", "Chay V2", "Chay V1+V2"

**Thay doi RebalanceBoardTable.tsx:**
- Them cot `stage` (V1/V2) de phan biet
- Them cot `constraint_checks` icon → hover/click hien chi tiet
- Them cot `explain_text` → hien ly do SOP

**Thay doi RebalanceConfigPanel.tsx:**
- Them section "SOP V1: Min ton theo Tier" → render bang v1_min_store_stock_by_total_sku dang editable table
- Them section "CNTT Rules" → cw_reserved_min_by_total_sku + cw_core_hero_min_per_sku
- Chuyen logistics/avg_price thanh editable fields thay vi hardcode

### Buoc 4: Update hooks & export

**Hooks moi/sua:**
- `useRunRebalance.ts` → them `run_type` param
- Them `useCollections.ts` (CRUD inv_collections)
- Them `useSizeIntegrity.ts` (query inv_state_size_integrity)

**Export Excel (inventory-export.ts):**
- Them cot `stage`, `explain_text`, `constraint_checks` summary

---

## File thay doi tong hop

| File | Thay doi |
|------|---------|
| **DB Migration** | Tao inv_collections, inv_state_size_integrity; alter 5 bang them cot; insert 9 constraint keys moi |
| `supabase/functions/inventory-allocation-engine/index.ts` | Refactor toan bo: tach V1/V2 logic, size_integrity check, constraint-driven min_cntt, cost tu registry |
| `src/pages/InventoryAllocationPage.tsx` | Tab V1/V2, run_type selector |
| `src/components/inventory/RebalanceBoardTable.tsx` | Them cot stage, explain, constraint_checks |
| `src/components/inventory/RebalanceConfigPanel.tsx` | Them section SOP V1 min ton, CNTT rules, logistics config |
| `src/hooks/inventory/useRunRebalance.ts` | Them run_type param |
| `src/hooks/inventory/useCollections.ts` | Moi: CRUD inv_collections |
| `src/hooks/inventory/useSizeIntegrity.ts` | Moi: query size integrity |
| `src/lib/inventory-export.ts` | Them cot stage, explain vao Excel |

---

## Thu tu thuc hien

```text
Phase 1: Database (migration)
  → Tao bang, them cot, insert constraints
  
Phase 2: Edge Function
  → Refactor V1 logic
  → Refactor V2 logic  
  → Fix rebalance (cost tu registry, size check)

Phase 3: Hooks + UI
  → Hooks moi (collections, size_integrity)
  → Update run hook (run_type)
  → Update page (tabs V1/V2)
  → Update config panel (SOP rules)
  → Update board table (stage, explain)
  → Update export
```

## Acceptance Criteria

1. V1 ra dung min ton theo tier/total_sku table (khong phai WoC threshold)
2. Chan 100% case le size (size_integrity = false → SKIP + log)
3. V2 uu tien: customer_orders > store_orders > top FC
4. CNTT khong bao gio < cw_reserved_min theo bang total SKU
5. Core/Hero CNTT >= 15/SKU sau moi lan chia
6. Moi de xuat co explain_text + constraint_checks JSON
7. Khong con hardcode cost/price trong engine
8. UI phan biet ro V1 vs V2 recommendations

