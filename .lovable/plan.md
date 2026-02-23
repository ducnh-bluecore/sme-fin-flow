
# Them Size Breakdown cho Allocation Recommendations

## Van de
Allocation Engine hien tai de xuat dieu chuyen o cap FC (Family Code) -- vi du "Clotilda Top -> OLV VAN HANH MALL, qty: 2" -- nhung KHONG chi ro chia theo size nao (S/M/L). Kho nhan se khong biet lay size gi de gui.

Du lieu size TON TAI trong `inv_state_positions` (vd: `222011391S`, `222011391M`, `222011391L` voi on_hand cu the), nhung engine khong su dung thong tin nay de phan bo.

## Giai phap: Size Split Logic

### Buoc 1: Tao DB function `fn_allocate_size_split`

Tao mot RPC function nhan vao `fc_id`, `source_store_id` (hoac NULL = kho tong), `dest_store_id`, `total_qty` va tra ve mang size breakdown:

```text
Input:  fc_id = 'Clotilda Top', dest_store = 'OLV VAN HANH', qty = 2
Output: [{ sku: '222011391M', size: 'M', qty: 1 }, { sku: '222011391S', size: 'S', qty: 1 }]
```

Logic uu tien:
1. Lay tat ca SKU (sizes) thuoc fc_id tai nguon (kho tong)
2. Lay velocity ban hang tung size tai store dich tu du lieu don hang
3. Phan bo qty theo ty le velocity (size ban chay duoc nhieu hon)
4. Kiem tra ton kho nguon du cho tung size
5. Fallback: neu khong co velocity, chia deu

### Buoc 2: Them cot `size_breakdown` JSONB vao `inv_allocation_recommendations`

```text
ALTER TABLE inv_allocation_recommendations 
ADD COLUMN size_breakdown jsonb DEFAULT NULL;
```

Format:
```text
[
  {"sku": "222011391S", "size": "S", "qty": 1},
  {"sku": "222011391M", "size": "M", "qty": 1}
]
```

### Buoc 3: Cap nhat Allocation Engine edge function

Sau khi tinh recommended_qty cho moi FC+Store, goi `fn_allocate_size_split` de tinh size breakdown va luu vao cot moi.

### Buoc 4: Hien thi Size Breakdown trong UI

#### 4a. Table View (`RebalanceBoardTable.tsx`)
- Them expandable row: click vao dong se hien bang con hien thi size breakdown
- Hien thi: Size | SKU | SL de xuat | Ton kho nguon | Ton kho dich
- Cho phep chinh so luong tung size (thay vi chi chinh tong)

#### 4b. Card View (`InventoryFCDecisionCards.tsx`)
- Trong detail panel, them section "Chia theo size" hien thi badges: `S:1 M:1 L:0`
- Color-coded: xanh = co ton, do = het tai nguon

#### 4c. Excel Export (`inventory-export.ts`)
- Xuat moi dong la 1 size (thay vi 1 dong = 1 FC)
- Format: STT | Ten SP | Size | SKU | SL | Kho nguon | Kho dich
- Day la format kho thuc te can de nhap WMS

## Chi tiet ky thuat

### DB Function logic (PostgreSQL)
```text
CREATE FUNCTION fn_allocate_size_split(
  p_tenant_id UUID,
  p_fc_id UUID,
  p_source_store_id UUID,  -- NULL = central warehouse  
  p_dest_store_id UUID,
  p_total_qty INT
) RETURNS JSONB AS $$
  -- 1. Get available sizes at source
  -- 2. Get sales velocity per size at destination (from order data)
  -- 3. Proportional allocation based on velocity
  -- 4. Constrain by source availability
  -- 5. Return array of {sku, size, qty}
$$
```

### UI Expandable Row Pattern
```text
[v] P1 | Push | Clotilda Top | OLV VAN HANH | HCM | S | 2 | ...
    |-- Size S | 222011391S | 1 | Ton nguon: 48 | Ton dich: 0
    |-- Size M | 222011391M | 1 | Ton nguon: 37 | Ton dich: 2
```

### Files can sua/tao
1. Migration SQL: them cot `size_breakdown` + tao function `fn_allocate_size_split`
2. `supabase/functions/inventory-allocation-engine/` - goi size split sau khi tinh qty
3. `src/components/inventory/RebalanceBoardTable.tsx` - them expandable size rows
4. `src/components/inventory/InventoryFCDecisionCards.tsx` - them size badges trong detail
5. `src/lib/inventory-export.ts` - xuat Excel theo tung size
6. `src/hooks/inventory/useAllocationRecommendations.ts` - fetch them cot size_breakdown

### Xu ly edge case
- FC chi co 1 size (vd: Free Size) -> khong can split, hien thi "FS: 2"
- Ton kho nguon khong du cho size nao do -> giam qty size do, canh bao trong UI
- Khong co du lieu velocity -> chia deu cac size co ton
- User chinh qty tung size -> tong phai bang recommended_qty (validate)

## Thu tu thuc hien
1. Migration: them cot + tao DB function
2. Cap nhat engine edge function de populate size_breakdown
3. Cap nhat UI table voi expandable rows
4. Cap nhat Excel export
5. Test end-to-end voi du lieu that
