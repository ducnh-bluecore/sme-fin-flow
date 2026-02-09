

# Inventory Allocation Engine -- Cap nhat: De xuat 2 chieu (Kho tong + Kho con)

## Yeu cau bo sung

He thong phai de xuat chuyen hang theo **2 luong**:

1. **Kho tong (CNTT) ra kho con/store** -- Push allocation (phan bo tu nguon chinh)
2. **Giua cac kho con voi nhau** -- Lateral rebalancing (can bang ngang)

---

## Thiet ke Location Model

### Bang `inv_stores` -- bo sung `location_type`

```text
location_type ENUM:
  - 'central_warehouse'  (kho tong / CNTT)
  - 'sub_warehouse'      (kho vung / kho nhanh)
  - 'store'              (cua hang)
```

Moi location co `tier`, `capacity`, `region` -- giup engine biet uu tien va rang buoc khoang cach.

---

## 2 loai de xuat trong bang `inv_rebalance_suggestions`

Them cot `transfer_type`:

```text
transfer_type ENUM:
  - 'push'      -- tu kho tong/sub_warehouse xuong store
  - 'lateral'   -- giua cac store hoac sub_warehouse voi nhau
```

### Schema day du cua `inv_rebalance_suggestions`:

```text
tenant_id, suggestion_id (uuid PK), run_id (FK),
transfer_type ('push' | 'lateral'),
fc_id, fc_name,
from_location, from_location_name, from_location_type,
to_location, to_location_name, to_location_type,
qty,
reason,
from_weeks_cover, to_weeks_cover, balanced_weeks_cover,
priority (P1/P2/P3),
potential_revenue_gain,
logistics_cost_estimate,
net_benefit (= potential_revenue_gain - logistics_cost),
status (pending/approved/rejected/executed),
approved_by, approved_at
```

---

## Logic Engine -- 2 pha

### Pha 1: Push Allocation (Kho tong ra store)

```text
1. Lay ton kho kho tong (location_type = 'central_warehouse')
2. Tinh available_to_push = on_hand - reserved - safety_stock_cntt
3. Voi moi FC co hang trong kho tong:
   a. Tim tat ca store dang thieu (weeks_cover < min_cover_weeks)
   b. Xep hang store theo priority_score
   c. Greedy allocate tu kho tong xuong store
   d. Dung khi available_to_push <= 0 hoac min_cntt constraint
4. Ghi ket qua voi transfer_type = 'push'
```

### Pha 2: Lateral Rebalancing (Giua cac kho con)

```text
1. SAU KHI push xong, con store nao van thieu?
2. Tim store THUA cung FC (weeks_cover > threshold_high, e.g. > 6 tuan)
3. Tim store THIEU cung FC (weeks_cover < threshold_low, e.g. < 1 tuan)
4. Ghep cap store_thua -> store_thieu:
   a. Uu tien cung region (giam chi phi van chuyen)
   b. qty = min(surplus - safety_stock, shortage)
   c. Chi chuyen khi net_benefit > 0 (revenue gain > logistics cost)
5. Ghi ket qua voi transfer_type = 'lateral'
```

Thu tu quan trong: **Push truoc, Lateral sau** -- vi kho tong la nguon chinh, chi can bang ngang khi kho tong khong du.

---

## Frontend -- Daily Rebalance Board

### Layout co 2 tab/section:

```text
+--------------------------------------------------+
| Daily Rebalance Board            [Chay Quet]      |
+--------------------------------------------------+
| [Summary Cards: 4 KPIs]                          |
|  - Push: X units | Lateral: Y units              |
|  - Revenue tiep can: +Z | Stores shortage: N     |
+--------------------------------------------------+
| Tab: [Tu kho tong] | [Giua cac kho]  | [Tat ca]  |
+--------------------------------------------------+

Tab "Tu kho tong" (Push):
| FC | Kho tong | -> Store | SL | Ly do | Cover | Revenue | Action |

Tab "Giua cac kho" (Lateral):
| FC | Store thua | -> Store thieu | SL | Ly do | Cover truoc/sau | Chi phi VC | Net benefit | Action |

Tab "Tat ca":
| Gop ca 2 loai, sort theo priority |
```

### Decision Card (CEO view):

```text
+--------------------------------------------------+
| De xuat chia hang hom nay                         |
|                                                    |
| Push: 420 units tu CNTT -> 12 stores              |
| Lateral: 180 units giua 8 cap store               |
| Projected revenue: +28.5M                         |
| Stockout risk giam: -23%                           |
|                                                    |
| [Duyet tat ca P1]  [Xem chi tiet]  [Tu choi]     |
+--------------------------------------------------+
```

---

## Constraint bo sung cho lateral

Them constraint moi trong `inv_constraint_registry`:

```text
- min_lateral_net_benefit: 500000    (chi chuyen khi loi > 500K)
- max_lateral_distance: 'same_region' (uu tien cung vung)
- lateral_enabled: true               (bat/tat lateral)
- push_priority_over_lateral: true    (push truoc, lateral sau)
```

---

## Thay doi so voi plan truoc

| Hang muc | Truoc | Sau |
|----------|-------|-----|
| `inv_stores` | Khong co `location_type` | Them `location_type` (central/sub/store) |
| `inv_rebalance_suggestions` | Khong phan biet loai | Them `transfer_type` (push/lateral) + `logistics_cost` + `net_benefit` |
| Engine logic | 1 pha (rebalance chung) | 2 pha: Push truoc, Lateral sau |
| Frontend | 1 bang | 3 tab: Push / Lateral / Tat ca |
| Constraints | Khong co lateral rules | Them `min_lateral_net_benefit`, `lateral_enabled` |

---

## Tong hop toan bo bang can tao (13 bang)

1. `inv_stores` (voi location_type)
2. `inv_family_codes`
3. `inv_sku_fc_mapping`
4. `inv_state_positions`
5. `inv_state_demand`
6. `inv_constraint_registry`
7. `inv_allocation_runs`
8. `inv_allocation_recommendations`
9. `inv_allocation_audit_log`
10. `inv_transfer_orders`
11. `inv_rebalance_runs`
12. `inv_rebalance_suggestions` (voi transfer_type, logistics_cost, net_benefit)
13. Edge function: `inventory-allocation-engine` (2 endpoint: /allocate va /rebalance)

---

## Thu tu build

1. Database migration -- 13 bang + RLS + indexes
2. Edge function `inventory-allocation-engine` (Push + Lateral logic)
3. Frontend hooks (9 hooks)
4. Page `/inventory-allocation` voi 2 tab chinh: Allocation + Rebalance Board
5. Route + Sidebar registration

