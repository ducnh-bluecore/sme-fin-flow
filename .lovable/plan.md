

# Bản Đồ Mở Rộng Tăng Trưởng -- Tầng Chiến Lược

## Tổng Quan

Thêm một block chiến lược mới vào kết quả Mô Phỏng Tăng Trưởng. Block này trả lời MỘT câu hỏi: **"Nếu tăng trưởng -- nên mở rộng theo HƯỚNG nào?"**

Không phải table. Không phải list SKU. Là một panel kể chuyện bằng narrative, giúp CEO đọc trong 5 giây và hiểu ngay: "Growth nằm ở đâu."

---

## A. Cấu trúc block "Bản Đồ Mở Rộng" (3 phần)

### Phần 1: Tín Hiệu Mở Rộng
- Tiêu đề lớn: "Để đạt +X% trong Y tháng:"
- "Nên tập trung mở rộng:" -- danh sách category có Growth Efficiency Score CAO (xanh lá)
- "Hạn chế mở rộng:" -- category có score THAP (đỏ/cam)
- Mỗi category hiển thị: tên, momentum %, và 1 dòng lý do

### Phần 2: Dịch Chuyển Cầu Cấu Trúc
- Thanh phân bổ size (S/M/L/XL) theo velocity
- Narrative: "Xu hướng tiêu dùng đang dịch chuyển sang size nhỏ hơn. Size S +X%, Size L giảm Y%."

### Phần 3: Trọng Lực Tăng Trưởng (Growth Gravity)
- Card tóm tắt: "Phát hiện trọng lực tại: [Category] | [Size] | [Phân khúc giá]"
- Câu kết luận: "Cấu trúc này tối đa hóa xác suất doanh thu và bảo vệ biên lợi nhuận."

---

## B. Tính toán Growth Efficiency Score (mỗi category)

```text
Efficiency = trung binh co trong cua:
  Xac suat doanh thu (velocity momentum)     40%
  An toan bien loi nhuan (avg margin)         25%
  Rui ro ton kho (DOC, overstock ratio)       20%
  On dinh cau (trend consistency)             15%

Phan loai: CAO (>= 65) / TRUNG BINH (40-65) / THAP (< 40)
Huong: "Mo rong" (CAO + momentum duong) / "Giu" / "Han che" (THAP hoac momentum am)
```

---

## C. Logic phan loai category tu fc_name

```text
Ao/Tops:     fc_name chua "top" | "shirt" | "blouse" | "ao" | "áo"
Dam/Dresses: fc_name chua "dress" | "dam" | "đầm"
Vay/Skirts:  fc_name chua "skirt" | "vay" | "váy" | "chân váy"
Quan/Bottoms: fc_name chua "pant" | "jean" | "quan" | "quần"
Set:         fc_name chua "set"
Ao khoac:    fc_name chua "jacket" | "coat" | "blazer" | "khoác"
Khac:        con lai
```

Size tu SKU code:
```text
Ket thuc bang "XS" -> XS, "S" (khong phai XS) -> S, "M" -> M, "L" (khong phai XL) -> L, "XL" -> XL
```

---

## D. Cac file can tao/sua

### Tao moi:
- `src/components/command/growth/GrowthExpansionMap.tsx` -- Component hien thi block chien luoc

### Sua:
- `src/components/command/growth/types.ts` -- Them interfaces: CategoryShape, SizeShift, PriceBandShape, GrowthShape
- `src/components/command/growth/simulationEngine.ts` -- Them ham `computeGrowthShape()` xu ly du lieu tu SimResult[]
- `src/components/command/GrowthSimulator.tsx` -- Import va render GrowthExpansionMap sau HeroStrip

---

## E. Types moi (them vao types.ts)

```text
CategoryShape:
  category (string) -- "Ao/Tops", "Dam/Dresses"...
  fcCount, totalVelocity, avgVelocity
  momentumPct -- xu huong tang/giam %
  avgMarginPct, avgDOC, overstockRatio
  revenueShare -- % doanh thu
  efficiencyScore (0-100)
  efficiencyLabel: 'CAO' | 'TRUNG BINH' | 'THAP'
  direction: 'expand' | 'hold' | 'avoid'
  reason (string) -- 1 dong giai thich

SizeShift:
  size, totalVelocity, velocityShare
  deltaPct, direction: 'tang' | 'on dinh' | 'giam'

PriceBandShape:
  band ("< 300K", "300-500K", "500K-1M", "> 1M")
  fcCount, avgVelocity, avgMarginPct
  momentumPct, efficiencyLabel

GrowthShape:
  expandCategories, avoidCategories
  sizeShifts, priceBands
  gravitySummary (string) -- cau tom tat cho CEO
  shapeStatement (string) -- cau ket luan chien luoc
```

---

## F. UI chi tiet (toan bo tieng Viet)

```text
+---------------------------------------------------------------+
|  BAN DO MO RONG TANG TRUONG                                   |
|  De dat +30% trong 6 thang:                                   |
|                                                                |
|  NEN TAP TRUNG MO RONG:             HAN CHE MO RONG:          |
|  +---------------------------+  +---------------------------+  |
|  | Ao/Tops     +42% momentum |  | Quan/Bottoms cau dung     |  |
|  | Hieu suat CAO             |  | Hieu suat THAP            |  |
|  | Toc do ban tot, margin on |  | Luan chuyen cham          |  |
|  +---------------------------+  +---------------------------+  |
|                                                                |
|  DICH CHUYEN CAU CAU TRUC                                     |
|  [===S 38%===] [===M 35%===] [==L 25%==] [XS 2%]             |
|  "Xu huong tieu dung dang dich chuyen sang size nho hon."      |
|  Size S: +12% | Size M: on dinh | Size L: -8%                 |
|                                                                |
|  TRONG LUC TANG TRUONG                                        |
|  Phat hien tai: Ao Casual | Size S-M | Gia 299-499K           |
|  "Cau truc nay toi da hoa xac suat doanh thu va bao ve        |
|   bien loi nhuan."                                             |
+---------------------------------------------------------------+
```

---

## G. Thu tu implement

1. Them types moi vao `types.ts`
2. Them ham `computeGrowthShape()` vao `simulationEngine.ts`
3. Tao component `GrowthExpansionMap.tsx` (narrative + cards, gradient background)
4. Noi vao `GrowthSimulator.tsx` -- render giua HeroStrip va BeforeAfter

