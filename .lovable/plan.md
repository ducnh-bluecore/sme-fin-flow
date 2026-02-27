
# Plan: Nang cap Rule Dieu Phoi Hang Hoa - Version 2

## Tong quan

Implement day du bo quy tac dieu phoi hang hoa cua doanh nghiep vao 3 engine chinh: **Allocation Engine**, **Recall Engine**, va **Clearance Engine**. Hien tai cac engine da co logic co ban, nhung chua ap dung dung cac rule nghiep vu chi tiet nhu: FC-based tier filtering, BST moi uu tien, 2-week observation period, restock exclusion, hay clearance exclusion rules.

---

## Phan 1: Database - Bo sung columns va constraints

### 1.1 Them columns con thieu

- `inv_stores`: them `display_capacity` (INT) - so luong trung bay toi da tai CH
- `inv_stores`: them `store_type` (TEXT) - phan biet kho CNTT / CH
- `inv_family_codes`: them `is_restock` (BOOLEAN DEFAULT false) - co phieu dat nhap
- `inv_family_codes`: them `restock_confirmed_at` (TIMESTAMPTZ) - ngay xac nhan restock
- `inv_family_codes`: them `ecom_port` (TEXT[]) - port CORE/HERO tren TikTok/Shopee (cho exclusion thanh ly)

### 1.2 Them constraint keys moi vao `inv_constraint_registry`

Insert 8 constraint keys moi:

| constraint_key | constraint_value | Mo ta |
|---|---|---|
| `fc_allocation_tier_rules` | `{ "ranges": [{"max_fc": 40, "tiers": []}, {"max_fc": 60, "tiers": ["S","A"]}, {"max_fc": 80, "tiers": ["S","A","B"]}, {"max_fc": 99999, "tiers": ["S","A","B","C"]}] }` | Rule A1: FC toan he thong -> tier nao duoc chia |
| `fc_recall_tier_rules` | `{ "ranges": [{"max_fc": 40, "tiers": ["S","A","B","C"]}, {"max_fc": 60, "tiers": ["B","C"]}, {"max_fc": 80, "tiers": ["C"]}, {"max_fc": 99999, "tiers": []}] }` | Rule thu hoi: FC -> tier nao bi thu hoi |
| `bst_new_age_days` | `{ "days": 60 }` | BST moi = age < 60 ngay |
| `bst_new_allocation_override` | `{ "enabled": true, "description": "BST moi FC<60 van chia all CH, khong chung ton min CNTT" }` | Note A1 |
| `lateral_min_age_days` | `{ "days": 60 }` | Han che dieu CH->CH voi BST < 60d |
| `slow_sell_observation_weeks` | `{ "weeks": 2 }` | Hang ban cham: theo doi 2 tuan truoc khi action |
| `store_max_stock_vs_display` | `{ "multiplier": 2.5 }` | Total ton CH khong qua x2.5 display capacity |
| `clearance_restock_lookback_days` | `{ "days": 90 }` | Tru restock trong 90d |

---

## Phan 2: Nang cap Allocation Engine (inventory-allocation-engine)

### 2.1 Rule A1: FC-based tier filtering

**Hien tai:** V1 chia theo `v1_min_store_stock_by_total_sku` - so luong min theo tong SKU tai CH, khong phan biet FC level.

**Thay doi:** Truoc khi chia cho 1 store, tinh `system_fc_total` (tong on_hand toan he thong cua FC do), rui tra bang `fc_allocation_tier_rules` de xac dinh store tier nao du dieu kien nhan hang.

```text
Logic moi trong runV1() va runV2():
1. Tinh systemFcStock = SUM(on_hand) toan he thong cho moi FC
2. Tra bang fc_allocation_tier_rules -> eligible tiers
3. Neu store.tier KHONG nam trong eligible tiers -> skip
4. Ngoai le: BST moi (age < 60d) && FC < 60 -> van chia all tiers (override)
```

### 2.2 Rule A2: Thu tu luu chuyen

**Hien tai:** Da co logic CW -> CH (push) va CH -> CH (lateral). Nhung chua co: chia theo thu tu S -> A -> B -> C khi CW thap.

**Thay doi:** Giu nguyen thu tu sort S -> A -> B -> C (da co `tierOrder`). Bo sung: khi CW stock thap (< effectiveCwReserve * 2), chi chia S va A, dung lai.

### 2.3 Rule A3: Bo sung metrics vao constraint_checks

Them cac truong sau vao `constraint_checks` jsonb cua moi recommendation:

- `source_remaining_by_size`: ton con lai o kho nguon theo size sau chia
- `dest_remaining_by_size`: ton kho dich theo size sau chia
- `avg_sold_14d`: so luong ban TB 2 tuan gan nhat tai CH (tu `inv_state_demand.total_sold`)
- `in_transit_qty`: hang dang chuyen den CH (tu `inv_state_positions.in_transit`)
- `customer_orders_pending`: phieu dat hang khach trang thai tam (tu `inv_state_demand.customer_orders_qty`)
- `system_fc_total`: tong FC toan he thong
- `eligible_tiers`: danh sach tier du dieu kien

### 2.4 Rule A3: Store capacity vs display

Them check: `total_on_hand_at_store + allocQty <= display_capacity * 2.5` (neu co `display_capacity`). Neu vuot -> giam `allocQty` hoac skip.

---

## Phan 3: Nang cap Recall Engine (inventory-recall-engine)

### 3.1 Dieu kien loai tru truoc khi thu hoi

Them 3 exclusion checks:

1. **BST moi (age < 60d):** Skip neu `product_created_date` va (now - product_created_date) < 60 ngay
2. **Hang restock:** Skip neu `is_restock = true` va `restock_confirmed_at` IS NOT NULL
3. **Hang dang chuyen den:** Skip neu `in_transit > 0` cho store-FC do

### 3.2 FC-based recall rules

Ap dung bang `fc_recall_tier_rules`:

```text
FC toan he thong < 40  -> thu hoi ALL tiers (S, A, B, C)
40 < FC < 60           -> thu hoi B, C (tru S, A)
60 < FC < 80           -> thu hoi C (tru S, A, B)
FC > 80                -> KHONG thu hoi
```

Them:
- Thu hoi hang le size o CH do le size he thong va FC < 100
- Thu hoi hang ban cham tai CH sau 2 tuan trung bay ma khong ra ban (can `slow_sell_observation_weeks`)

### 3.3 Phan loai action cho moi ma hang tai CH

Them truong `action_category` vao `inv_rebalance_suggestions`:

| Nhom | Dieu kien | Action |
|---|---|---|
| `hot_selling_broken` | Sell through cao + thieu size | CNTT -> CH hoac CH cham -> CH tot |
| `slow_selling` | Sell through thap + ton >> ban | Nhac CHT trung bay (theo doi 2 tuan) |
| `slow_extended` | Sell through thap + ton > 90d | Dieu sang CH tot hoac thu hoi CNTT (chi khi FC<100) |

---

## Phan 4: Nang cap Clearance/Thanh ly

### 4.1 Exclusion rules cho `fn_clearance_candidates`

Update function de loai tru TRUOC KHI phan loai:

1. **Hang co phieu dat nhap:** `is_restock = true`
2. **Hang restock trong 90d:** `restock_confirmed_at > now() - 90 days`
3. **Hang trong port CORE/HERO:** `ecom_port && ARRAY['core','hero']`

### 4.2 Phan nhom thanh ly

Sau khi loai tru, phan vao 3 nhom:

| Nhom | Dieu kien |
|---|---|
| `aging_old` | product_created_date va age > 300 ngay |
| `slow_extended` | age > 150 va days_to_clear > 200 |
| `broken_system` | age > 90 va le size toan he thong (S&L, M&L) |

Them output column `clearance_group` vao fn_clearance_candidates return table.

### 4.3 Size view: hien thi theo ma hang thay vi CH

Them field `size_matrix_by_fc` (jsonb) vao output: gom ton kho theo size toan he thong cho tung FC.

---

## Phan 5: UI Updates

### 5.1 Hien thi them metrics tren lenh dieu chuyen

Cap nhat `RebalanceDetailSheet.tsx` va cac component lien quan de hien thi:
- Ton con lai kho nguon/dich theo size (tu `constraint_checks.source_remaining_by_size`)
- Sold 14d (tu `constraint_checks.avg_sold_14d`)
- Hang dang chuyen (in_transit)
- Phieu dat khach (customer_orders_pending)
- System FC total + eligible tiers badge

### 5.2 Them action_category badge

Hien thi badge mau cho `hot_selling_broken`, `slow_selling`, `slow_extended` tren moi dong suggestion.

### 5.3 Clearance: Hien thi clearance_group

Them tab/filter trong clearance UI cho 3 nhom: "Hang cu (>300d)", "Ban cham keo dai", "Le size he thong".

---

## Phan 6: Constraint Settings UI

Cap nhat `CommandSettingsPage.tsx` them cac constraint moi vao UI de CEO/Ops co the chinh:
- FC allocation tier rules (editable ranges)
- FC recall tier rules
- BST new age threshold
- Lateral min age days
- Store display capacity multiplier
- Clearance exclusion rules

---

## Trinh tu thuc hien

1. Migration: Them columns + insert constraint keys
2. Update `inventory-allocation-engine`: FC-tier filtering, BST override, enhanced constraint_checks
3. Update `inventory-recall-engine`: Exclusion rules, FC-tier recall, action_category
4. Update `fn_clearance_candidates`: Exclusion rules, clearance_group
5. Update `fn_rebalance_engine` (PL/pgSQL): FC-tier cho push/lateral
6. Add `action_category` column to `inv_rebalance_suggestions`
7. UI: Enhanced detail sheet + clearance grouping + settings
8. Deploy edge functions
