

# Store Intelligence - Goc nhin tong hop cua hang

## Muc tieu
Xay dung tab "Store Intelligence" moi trong trang Allocation (`/command/allocation`) de cung cap goc nhin toan dien ve tung cua hang: tier, so luong ban, va phan tich **demand space**, **size distribution** ban nhieu nhat tai cua hang do.

**Luu y**: Cot `color` trong `inv_sku_fc_mapping` hien tai chua co du lieu (0/4,383 rows), nen se hien thi "Chua co du lieu mau" thay vi bo qua -- san sang khi du lieu duoc nhap.

## Thiet ke giao dien

### 1. Tab moi "Store Intel" trong InventoryAllocationPage
- Them tab thu 5 ben canh Lenh Dieu Chuyen / Mo phong / Lich su / Cai dat
- Icon: `Store` + label "Store Intel"

### 2. Trang Store Intel gom 2 phan:

**Phan A - Bang tong quan cua hang** (table view)
- Cot: Ten CH | Tier | Khu vuc | Da ban (units) | Ton kho | Velocity | DT uoc tinh
- Click vao 1 dong -> mo panel chi tiet ben duoi

**Phan B - Panel chi tiet cua hang** (khi chon 1 store)
Hien thi 3 card ngang:

1. **Demand Space Breakdown** - Bieu do thanh ngang (horizontal bar)
   - Gop `inv_state_demand` JOIN `inv_sku_fc_mapping` JOIN `inv_family_codes`
   - Group by `demand_space`, SUM `total_sold`
   - VD: EverydayComfort 45%, Travel 20%, FastTrendFashion 15%...

2. **Size Distribution** - Bieu do thanh ngang
   - Gop `inv_state_demand` JOIN `inv_sku_fc_mapping`
   - Group by `size`, SUM `total_sold`
   - VD: M 35%, S 33%, L 17%, FS 12%...

3. **Color Distribution** - Bieu do thanh ngang (hoac thong bao "Chua co du lieu")
   - Tuong tu, group by `color`
   - Neu tat ca null -> hien thong bao

## Chi tiet ky thuat

### Database View moi
Tao 1 view `v_inv_store_profile` de gom du lieu san, tranh query nang tren client:

```sql
CREATE VIEW v_inv_store_profile AS
SELECT
  d.tenant_id,
  d.store_id,
  m.size,
  m.color,
  f.demand_space,
  SUM(d.total_sold) AS units_sold
FROM inv_state_demand d
JOIN inv_sku_fc_mapping m ON m.sku = d.sku
JOIN inv_family_codes f ON f.id = m.fc_id
GROUP BY d.tenant_id, d.store_id, m.size, m.color, f.demand_space;
```

### Hook moi: `useStoreProfile(storeId)`
- Query `v_inv_store_profile` filtered by `store_id`
- Client-side aggregate thanh 3 breakdowns: by demand_space, by size, by color
- Return: `{ demandSpace: {label, units}[], sizeBreakdown: {label, units}[], colorBreakdown: {label, units}[], isLoading }`

### Component moi: `StoreIntelligenceTab.tsx`
- Su dung `useStoreMetrics()` co san (tu `StoreDirectoryTab`) cho bang tong quan
- State `selectedStoreId` de dieu khien panel chi tiet
- Khi chon store -> fetch `useStoreProfile(storeId)` -> render 3 card breakdown
- Moi card dung horizontal bar chart (Recharts `BarChart` hoac don gian la div bars giong `StoreHeatmap`)

### Files can thay doi

| File | Thay doi |
|------|----------|
| **Migration SQL** | Tao view `v_inv_store_profile` |
| **`src/hooks/inventory/useStoreProfile.ts`** | Hook moi fetch + aggregate profile data |
| **`src/components/inventory/StoreIntelligenceTab.tsx`** | Component moi: table + detail panel |
| **`src/pages/InventoryAllocationPage.tsx`** | Them tab "Store Intel" |

### Filter & Sort
- Ke thua filter Tier / Khu vuc tu `StoreDirectoryTab`
- Sort mac dinh theo Tier (S > A > B > C), sau do theo doanh thu

### UX
- Bang cua hang compact, click row highlight va cuon xuong panel chi tiet
- Bar charts don gian (div-based, khong can Recharts) de nhe va nhanh
- Demand Space dung mau rieng cho moi loai (EverydayComfort = xanh la, LuxuryParty = tim, v.v.)
- Responsive: mobile stack 3 card doc, desktop hien ngang

