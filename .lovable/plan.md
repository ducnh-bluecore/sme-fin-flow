

# Plan: Khac phuc 5 van de trong he thong dieu chuyen hang

## Tom tat van de

Tu feedback cua user, co 5 van de chinh can xu ly:

1. **Ton kho CNTT khong khop Kiot** - Mot so FC hien thi sai ton kho (VD: Abelie Set 3 hien 147 thay vi 46 tren Kiot). Nguyen nhan: `inv_state_positions` co nhieu snapshot_date khac nhau va engine cong don tat ca thay vi lay snapshot moi nhat.

2. **Nhieu dong trung lap cho cung 1 FC** - Cung 1 ma hang tu CNTT qua 1 CH co 3-5 dong rieng biet (push) thay vi gom thanh 1 dong duy nhat. Nguyen nhan: `fn_rebalance_engine` sinh ra nhieu row do khong GROUP BY (fc_id, to_location) khi insert.

3. **Thieu ma OLV (fc_code)** - UI chi hien fc_name ma khong hien fc_code (VD: "Calloway Fleur Top" thay vi "222011502FS - Calloway Fleur Top"). Nguyen nhan: `inv_rebalance_suggestions` va `inv_allocation_recommendations` khong luu fc_code, va UI khong tra cuu fc_code tu fcNameMap.

4. **Thieu thuoc tinh BST (Collection)** - Nguoi dung can biet san pham thuoc BST nao de kiem tra 5 BST gan nhat. Hien tai khong hien collection_name trong UI dieu chuyen.

5. **San pham phi thoi trang van bi chia** - Cac san pham nhu "So Hi 2026", "Bao Li Xi" (fc_code bat dau SP02..., khong phai 2220...) van duoc engine xu ly va tao suggestion. Nguyen nhan: Engine khong loc bo non-fashion items.

---

## Giai phap ky thuat

### Task 1: Fix ton kho CNTT - Lay snapshot moi nhat per store

**File:** Database function `fn_rebalance_engine` va `fn_allocation_engine`

Thay doi: Khi build `_pos` / `tmp_pos`, chi lay rows co `snapshot_date = MAX(snapshot_date)` per store thay vi cong don tat ca snapshot.

```sql
-- Trong fn_rebalance_engine, thay doi _pos:
CREATE TEMP TABLE _latest_snap ON COMMIT DROP AS
SELECT store_id, MAX(snapshot_date) AS max_date
FROM inv_state_positions WHERE tenant_id = p_tenant_id
GROUP BY store_id;

CREATE TEMP TABLE _pos ON COMMIT DROP AS
SELECT p.store_id, p.fc_id, SUM(COALESCE(p.on_hand,0)) AS on_hand, ...
FROM inv_state_positions p
JOIN _latest_snap ls ON ls.store_id = p.store_id AND p.snapshot_date = ls.max_date
JOIN inv_stores s ON s.id = p.store_id AND s.is_active
WHERE p.tenant_id = p_tenant_id
GROUP BY ...;
```

Tuong tu cho `fn_allocation_engine` (tmp_cw, tmp_pos, tmp_soh).

### Task 2: Gom cac dong trung lap thanh 1 lenh dieu chuyen

**File:** Database function `fn_rebalance_engine`

Thay doi: Sau Phase 1 (Push), gom cac dong cung (fc_id, from_location, to_location) thanh 1 dong duy nhat bang cach:

```sql
-- Sau khi INSERT push xong, merge duplicates:
WITH dupes AS (
  SELECT fc_id, from_location, to_location, 
    MIN(id) AS keep_id,
    SUM(qty) AS total_qty,
    SUM(potential_revenue_gain) AS total_rev,
    SUM(logistics_cost_estimate) AS total_cost,
    SUM(net_benefit) AS total_net
  FROM inv_rebalance_suggestions 
  WHERE run_id = p_run_id AND transfer_type = 'push'
  GROUP BY fc_id, from_location, to_location
  HAVING COUNT(*) > 1
)
-- Update the kept row with summed values
UPDATE inv_rebalance_suggestions r SET 
  qty = d.total_qty, 
  potential_revenue_gain = d.total_rev,
  logistics_cost_estimate = d.total_cost,
  net_benefit = d.total_net
FROM dupes d WHERE r.id = d.keep_id;

-- Delete the duplicate rows
DELETE FROM inv_rebalance_suggestions 
WHERE run_id = p_run_id AND transfer_type = 'push'
AND id NOT IN (SELECT MIN(id) FROM inv_rebalance_suggestions WHERE run_id = p_run_id AND transfer_type = 'push' GROUP BY fc_id, from_location, to_location);
```

**Ghi chu:** Root cause thuc su la Push query sinh nhieu row cho cung 1 FC+store do khong co GROUP BY. Fix dung hon la sua truc tiep Push CTE de GROUP BY (fc_id, cw_id, store_id) truoc khi insert.

### Task 3: Hien thi fc_code (ma OLV) trong UI

**Files:**
- `src/pages/InventoryAllocationPage.tsx` - Build them fcCodeMap
- `src/components/inventory/DailyTransferOrder.tsx` - Hien thi fc_code truoc fc_name
- `src/components/inventory/RecallOrderPanel.tsx` - Tuong tu

Thay doi:
1. Trong `InventoryAllocationPage`, tao them `fcCodeMap: Record<string, string>` (fc.id -> fc.fc_code) va truyen xuong component.
2. Trong `DailyTransferOrder`, hien thi: `{fcCodeMap[s.fc_id]} - {fcNameMap[s.fc_id] || s.fc_name}`

### Task 4: Hien thi thuoc tinh BST (Collection) trong UI dieu chuyen

**Files:**
- `src/hooks/inventory/useFamilyCodes.ts` - Them select `collection_id`
- `src/pages/InventoryAllocationPage.tsx` - Build fcCollectionMap
- `src/components/inventory/DailyTransferOrder.tsx` - Hien thi Badge BST

Thay doi:
1. Them `collection_id` vao FamilyCode interface va query
2. Dung `useCollections()` hook da co san de map collection_id -> collection_name
3. Hien thi Badge BST ben canh ten san pham, voi highlight dac biet cho 5 BST gan nhat

### Task 5: Loai bo san pham phi thoi trang khoi Engine

**Files:** Database functions `fn_allocation_engine` va `fn_rebalance_engine`

Thay doi: Them dieu kien loc trong temp table `tmp_fc` / `_fc`:

```sql
-- Trong fn_allocation_engine, them dieu kien vao tmp_fc:
AND f.fc_code NOT LIKE 'SP%'
AND f.fc_code NOT LIKE 'GIFT%'
AND f.fc_code NOT LIKE 'BAG%'
AND f.fc_code NOT LIKE 'BOX%'

-- Tuong tu trong fn_rebalance_engine, _fc table
```

Hoac tot hon, them cot `is_non_fashion` boolean vao `inv_family_codes` va loc theo do. Nhung de don gian, loc theo prefix fc_code la du chinh xac vi da co logic tuong tu trong `backfill-sku-fc-mapping`.

---

## Thu tu thuc hien

1. Migration 1: Fix `fn_allocation_engine` - snapshot moi nhat + loc non-fashion + gom dong
2. Migration 2: Fix `fn_rebalance_engine` - snapshot moi nhat + loc non-fashion + gom dong  
3. Update `useFamilyCodes.ts` - them collection_id
4. Update `InventoryAllocationPage.tsx` - build fcCodeMap + fcCollectionMap
5. Update `DailyTransferOrder.tsx` - hien thi fc_code + BST badge
6. Update `RecallOrderPanel.tsx` - hien thi fc_code + BST badge

## Ve cau hoi "nhan nut nao de cap nhat ton kho va tinh toan lai"

Hien tai quy trinh la:
1. **Sync ton kho**: Goi Edge Function `sync-inventory-positions` (dong bo tu BigQuery/KiotViet)
2. **Chay Engine**: Nhan nut "Chay Engine" tren trang `/command/allocation`

Se them huong dan ro rang trong UI hoac them nut "Dong bo & Chay lai" ket hop ca 2 buoc.

