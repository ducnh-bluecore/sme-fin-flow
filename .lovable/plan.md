

# Nang cap 3 phan: Mo phong, Board Table (chinh de xuat), Cau hinh nang cao

## Van de hien tai

### 1. Mo phong (Simulation Tab)
- Chi co "Chon Family Code" + "So units chuyen" -- **thieu kho nguon va kho dich**
- Khong co kich ban cu the: chuyen tu dau, den dau
- Ket qua mo phong kg co y nghia vi thieu context dia diem

### 2. Board Table (Push / Lateral tabs)
- Khi duyet de xuat, user chi co nut Approve/Reject -- **khong chinh duoc qty truoc khi duyet**
- CEO/CFO can co kha nang dieu chinh so luong de xuat truoc khi bam "Duyet"

### 3. Cau hinh (Config Panel)
- Chi co 5 nguong so va 3 toggle co ban
- **Thieu cac cau hinh nang cao** nhu:
  - Co tinh theo toc do ban cua kho dich khong?
  - Co tinh ty trong doanh thu cua catalog/dong SP?
  - Trong so uu tien: customer orders vs sales velocity vs store tier
  - He so an toan theo mua (seasonal safety factor)

---

## Giai phap

### Phan 1: Mo phong -- Them kho nguon + kho dich

Cap nhat `RebalanceSimulationTab.tsx`:

- Them 2 dropdown moi:
  - **Kho nguon** (From): Dropdown cac store/warehouse tu `inv_stores`
  - **Kho dich** (To): Dropdown cac store tu `inv_stores`
- Khi chon kho nguon + kho dich + FC + qty:
  - Hien thi ton kho hien tai cua ca 2 diem (on_hand, weeks_cover)
  - Tinh toan mo phong: kho nguon giam qty, kho dich tang qty
  - So sanh truoc/sau cho ca 2 dia diem
- Chuyen bang so sanh tu 2 cot thanh chi tiet hon:
  - Kho nguon: cover truoc -> cover sau
  - Kho dich: cover truoc -> cover sau
  - Revenue impact, stockout risk thay doi
- Su dung hook `useInventoryStores` de lay danh sach kho
- Su dung `useInventoryPositions` va `useInventoryDemand` de lay data theo store_id + fc_id

### Phan 2: Board Table -- Cho phep chinh qty truoc khi duyet

Cap nhat `RebalanceBoardTable.tsx`:

- Cot "SL" (qty) chuyen tu text thanh **Input editable** khi status = 'pending'
- Luu gia tri chinh sua vao local state
- Khi bam Approve, gui qty da chinh (khong phai qty goc)
- Hien thi qty goc ben canh de so sanh (e.g. "200 -> 150")
- Truyen qty da chinh qua callback `onApprove(ids, editedQty)`

Cap nhat `useApproveRebalance` hook:
- Nhan them `edited_qty` param
- Update `qty` trong bang `inv_rebalance_suggestions` khi approve

### Phan 3: Cau hinh nang cao

Them cac constraint moi vao DB (`inv_constraint_registry`):

| constraint_key | Loai | Mo ta |
|---|---|---|
| `use_destination_velocity` | boolean | Tinh phan bo dua tren toc do ban cua kho dich |
| `use_catalog_revenue_weight` | boolean | Tinh ty trong doanh thu catalog cua dong SP khi xep hang uu tien |
| `velocity_lookback_days` | number | So ngay nhin lai de tinh toc do ban (7/14/30) |
| `seasonal_safety_factor` | number | He so an toan theo mua (nhan voi safety stock, e.g. 1.5x) |
| `priority_weight_customer_orders` | number | Trong so uu tien: don hang khach dat (0-100) |
| `priority_weight_sales_velocity` | number | Trong so uu tien: toc do ban (0-100) |
| `priority_weight_store_tier` | number | Trong so uu tien: hang store (0-100) |
| `max_transfer_pct` | number | % ton kho toi da duoc chuyen di tu 1 store (e.g. 50%) |

Cap nhat `RebalanceConfigPanel.tsx`:
- Them section "Logic phan bo nang cao" voi cac constraint moi
- Nhom thanh 3 card:
  1. **Nguong & Tham so** (giu nguyen 5 cai cu)
  2. **Logic phan bo nang cao** (velocity, catalog weight, seasonal, priority weights)
  3. **Bat/Tat tinh nang** (giu nguyen 3 cai cu)
- Moi constraint co tooltip giai thich y nghia kinh doanh

Cap nhat `CONSTRAINT_META` trong `RebalanceConfigPanel.tsx` de map 8 constraint moi.

---

## Database migration

Them 8 dong moi vao `inv_constraint_registry` voi gia tri mac dinh hop ly:

```text
use_destination_velocity: { enabled: true }
use_catalog_revenue_weight: { enabled: false }
velocity_lookback_days: { days: 14 }
seasonal_safety_factor: { factor: 1.0 }
priority_weight_customer_orders: { weight: 50 }
priority_weight_sales_velocity: { weight: 30 }
priority_weight_store_tier: { weight: 20 }
max_transfer_pct: { pct: 60 }
```

---

## File can thay doi

| File | Thay doi |
|------|---------|
| `src/components/inventory/RebalanceSimulationTab.tsx` | Them dropdown kho nguon/dich, tinh toan 2 chieu |
| `src/components/inventory/RebalanceBoardTable.tsx` | Editable qty input, truyen qty da chinh khi approve |
| `src/components/inventory/RebalanceConfigPanel.tsx` | Them 8 constraint nang cao, nhom thanh 3 card |
| `src/hooks/inventory/useApproveRebalance.ts` | Nhan them edited_qty param |
| `src/pages/InventoryAllocationPage.tsx` | Cap nhat handleApprove signature |
| DB migration | Insert 8 constraint moi |

---

## Thu tu build

1. DB migration -- insert 8 constraint moi
2. `RebalanceSimulationTab.tsx` -- them kho nguon/dich + tinh toan 2 chieu
3. `RebalanceBoardTable.tsx` -- editable qty
4. `useApproveRebalance.ts` -- ho tro edited_qty
5. `InventoryAllocationPage.tsx` -- cap nhat prop types
6. `RebalanceConfigPanel.tsx` -- them 8 constraint nang cao

