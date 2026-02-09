

# Them Region & Tier vao Cards + Table + Filter

## Hien trang

- `inv_stores` co: `region`, `tier`, `address` -- du data
- `inv_rebalance_suggestions` chi luu `to_location` (UUID) va `to_location_name` -- **khong co** region/tier
- Card view nhom theo FC, khong hien region
- Table view nhom theo `from_location_name`, khong co cot region/tier
- Khong co filter theo region

## Giai phap

### 1. Enrich suggestions voi store metadata (client-side join)

Dung hook `useInventoryStores` (da co) de lay danh sach stores voi region/tier/address. Tao utility map `storeId -> {region, tier, address}` va enrich suggestions truoc khi render.

Khong can thay doi database -- chi join o frontend.

### 2. Card View — Them region/tier badges + nhom theo Region

**InventoryFCDecisionCards.tsx:**
- Them filter dropdown "Khu vuc" (region) o tren danh sach cards
- Trong moi card, hien cac stores dich kem region tag va tier badge
- Them dong: "HCM (3 CH) • Mien Trung (2 CH)" ngay duoi dong "X units • Y transfers"

### 3. Table View — Them cot Region/Tier + filter

**RebalanceBoardTable.tsx:**
- Them filter dropdown "Khu vuc" trong toolbar (ben canh Priority va Status)
- Them 2 cot moi trong table: **Region** va **Tier** (sau cot "Den")
- Hien tier dang badge mau (S=tim, A=xanh, B=vang, C=xam)
- Region hien text nho

### 4. Detail Sheet — Hien region/tier

**RebalanceDetailSheet.tsx:**
- Them cot Region va Tier trong bang chi tiet phan bo

## Files thay doi

| File | Thay doi |
|------|---------|
| `src/components/inventory/InventoryFCDecisionCards.tsx` | Them region filter, hien region/tier trong card, nhom store theo region |
| `src/components/inventory/RebalanceBoardTable.tsx` | Them region filter dropdown, them 2 cot Region + Tier |
| `src/components/inventory/RebalanceDetailSheet.tsx` | Them cot Region/Tier trong bang chi tiet |
| `src/pages/InventoryAllocationPage.tsx` | Truyen stores data xuong cac component |

## Chi tiet ky thuat

- Import `useInventoryStores` o page level, tao `storeMap: Record<string, {region, tier, address}>`
- Truyen `storeMap` xuong Cards, Table, DetailSheet qua props
- Filter region: lay unique regions tu storeMap, render `<Select>` voi cac option
- Tier badges: S = purple, A = blue, B = amber, C = gray

