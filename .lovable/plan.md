

# Nang cap Mo phong What-If: Validation thong minh + De xuat hanh dong

## Van de hien tai (nhu screenshot)

1. **Kho nguon chi co 96 units nhung user nhap 200** -- he thong van cho phep va bao "+70M revenue" -- **SAI va nguy hiem**
2. **Kho dich se co 29 tuan cover** -- overstock nghiem trong nhung khong co canh bao
3. **Thieu yeu to mua** -- seasonal_safety_factor da co trong DB nhung chua duoc ap dung vao simulation
4. **Thieu de xuat NEN/KHONG NEN** -- CEO phai tu suy luan thay vi he thong noi thang

---

## Giai phap

### 1. Validation "kho nguon khong du hang"

- Neu `transferQty > fromPosition.on_hand`: hien canh bao do **"Khong kha thi: Kho nguon chi co X units"**
- Tu dong cap `transferQty` toi da = `on_hand - safety_stock` (de goi y so hop ly)
- Hien thi **qty kha dung** (available = on_hand - reserved - safety_stock) ben canh dropdown kho nguon

### 2. Canh bao overstock kho dich

- Neu `toCoverAfter > max_cover_weeks` (tu constraint registry, mac dinh 6 tuan): hien badge vang **"Overstock risk: X tuan cover > nguong Y tuan"**
- Tinh **overstock cost** = (toCoverAfter - max_cover_weeks) * toVelocity * 7 * avg_unit_cost -- tien bi khoa trong ton kho thua

### 3. Ap dung seasonal_safety_factor

- Fetch `seasonal_safety_factor` tu `useConstraintRegistry`
- Nhan safety_stock va nguong cover voi factor nay
- Hien thi dong: "He so mua: 1.5x (cao diem)" hoac "He so mua: 1.0x (binh thuong)"

### 4. De xuat NEN / KHONG NEN / CAN NHAC

Logic phan loai:

```text
KHONG NEN (do):
  - transferQty > fromOnHand (khong du hang)
  - fromCoverAfter < min_cover_weeks (kho nguon xuong duoi nguong)
  - toCoverAfter > max_cover_weeks * 1.5 (overstock qua muc)

CAN NHAC (vang):
  - fromCoverAfter < min_cover_weeks * seasonal_factor
  - toCoverAfter > max_cover_weeks (overstock nhe)
  - revenue gain < min_lateral_net_benefit

NEN CHUYEN (xanh):
  - Tat ca dieu kien an toan
  - Revenue gain > 0
  - Kho dich thuc su thieu hang (toCoverBefore < min_cover_weeks)
```

Hien thi thanh **Verdict Card** lon o cuoi:
- Mau do/vang/xanh
- Dong chu chinh: "KHONG NEN chuyen 200 units"
- Ly do cu the: "Kho OLV chi co 96 units, se ve am (-104). Kho dich se thua 29 tuan hang."
- De xuat thay the: "Nen chuyen toi da 50 units de giu kho nguon >= 2 tuan cover"

### 5. Suggested optimal qty

- Tu dong tinh `optimalQty` sao cho:
  - fromCoverAfter >= min_cover_weeks * seasonal_factor
  - toCoverAfter <= max_cover_weeks
- Hien thi nut "Ap dung de xuat: X units" de user 1-click thay doi

---

## File can thay doi

| File | Thay doi |
|------|---------|
| `RebalanceSimulationTab.tsx` | Toan bo logic moi: validation, overstock warning, seasonal factor, verdict card, optimal qty |

Khong can them file moi, khong can migration -- chi refactor component hien tai va su dung constraint data da co.

---

## Chi tiet ky thuat

- Fetch constraints tu `useConstraintRegistry()` de lay: `min_cover_weeks`, `max_cover_weeks`, `seasonal_safety_factor`, `min_lateral_net_benefit`
- Tinh `availableToTransfer = on_hand - reserved - (safety_stock * seasonal_factor)`
- Revenue calculation can fix: hien tai dang dung `potential_revenue_gain` tu suggestion -- nen tinh = `min(transferQty, shortage_at_dest) * avg_revenue_per_unit`
- Verdict logic chay sau khi tinh simulation, output enum: 'recommended' | 'caution' | 'not_recommended'

