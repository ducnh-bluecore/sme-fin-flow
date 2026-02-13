

# Plan: Fix Formula Biases & Update Documentation

## Tong Quan

Ap dung 9 diem review tu A (cong thuc) + B (van hanh) + C (nang cap) vao ca code (inventory-kpi-engine) va tai lieu (plan.md).

---

## Phan 1: Sua Code — inventory-kpi-engine/index.ts

### 1.1 IDI — Cap DOC + Doi locked_cash sang COGS fallback

**Hien tai (line 298):**
```
DOC = velocity > 0 ? onHand/velocity : (onHand > 0 ? 999 : 0)
lockedCash = onHand * 250000
```

**Sua thanh:**
```
DOC_CAP = 180
EPS = 0.01
DOC = velocity > EPS ? min(DOC_CAP, onHand/velocity) : (onHand > 0 ? DOC_CAP : 0)
lockedCash = onHand * 150000  // COGS fallback, doi ten thanh value_at_risk
```

### 1.2 CHI — Weighted avg theo demand

**Hien tai (line 402):**
```
avg = scores.reduce(sum) / scores.length  // Cao bang
```

**Sua thanh:**
```
// Weight theo store velocity (demand)
CHI = sum(SCS_i * velocity_i) / sum(velocity_i)
// Fallback: neu khong co demand data, dung simple avg
```

Thay doi: ham `computeCHI` can nhan them tham so `demand[]` de lay velocity per store-fc.

### 1.3 Size Health Score — Dung curve profile thay vi uniform

**Hien tai (line 541, 472):**
```
expectedRatio = 1 / expectedSizes.size   // Curve phang
CORE_SIZES = hardcode {M, L}
```

**Sua thanh:**
```
// Uu tien doc tu sem_size_curve_profiles (da fetch o line 40)
// Neu co profile cho category nay -> dung size_ratios lam expected_ratio
// Neu khong -> fallback uniform 1/N
// CORE_SIZES doc tu profile hoac default {M, L} theo category
```

Ham `computeSizeHealth` da nhan `_curveProfiles` nhung chua dung. Se wire vao.

### 1.4 Lost Revenue — Clamp lost_ratio max 0.8

**Hien tai (line 695):**
```
lostRatio = missingRatio + shallowRatio  // Co the > 1.0
```

**Sua thanh:**
```
lostRatio = Math.min(0.8, missingRatio + shallowRatio)
```

### 1.5 Markdown Risk — Velocity floor cho ETA

**Hien tai (line 806):**
```
etaDays = velocity > 0 ? ... : 30
```

**Sua thanh:**
```
vFloor = Math.max(velocity, 0.1)
etaDays = Math.min(90, Math.max(7, Math.round(stock / vFloor / 2)))
```

### 1.6 Smart Transfer — DOC cap + After-transfer check

**Hien tai (line 925):**
```
doc = velocity > 0 ? onHand/velocity : (onHand > 0 ? 999 : 0)
// Khong check source DOC sau khi chuyen
```

**Sua thanh:**
```
DOC_CAP = 180
doc = velocity > 0 ? Math.min(DOC_CAP, onHand/velocity) : (onHand > 0 ? DOC_CAP : 0)

// Sau khi tinh transferQty, check:
sourceDocAfter = (source.onHand - transferQty) / Math.max(source.velocity, 0.01)
if (sourceDocAfter < 30) skip  // Source se bi thieu hang
```

### 1.7 Cash Lock — Dung COGS fallback thay vi retail price

**Hien tai (line 1177-1178):**
```
unitPrice = fcPrice.get(fcId) || DEFAULT_UNIT_PRICE  // 250k retail
inventoryValue = stock * unitPrice
```

**Sua thanh:**
```
// Tao COGS map song song voi price map
// Neu co COGS -> dung COGS
// Neu khong -> dung price * 0.6 (estimated COGS ratio)
DEFAULT_UNIT_COGS = 150000
unitCogs = fcCogs.get(fcId) || (unitPrice * 0.6) || DEFAULT_UNIT_COGS
inventoryValue = stock * unitCogs  // COGS-based, khong phai retail
```

### 1.8 Network Gap — revenue_at_risk dung FC price

**Hien tai (line 450):**
```
revenueAtRisk = trueShortage * 250000  // hardcode
```

**Sua thanh:**
```
revenueAtRisk = trueShortage * (fcPrice.get(styleId) || DEFAULT_UNIT_PRICE)
```

Ham `computeNetworkGap` can them tham so `priceMap` va `skuMapping` de build fcPrice.

---

## Phan 2: Update Documentation — .lovable/plan.md

Cap nhat tat ca cong thuc tuong ung voi code moi, bao gom:

1. **IDI**: DOC cap 180, eps, COGS fallback 150k, doi ten locked_cash → value_at_risk
2. **CHI**: Weighted avg formula, giai thich weight = store velocity
3. **SCS**: Ghi chu expected_sizes doc tu sem_size_curve_profiles
4. **Size Health Score**: expected_ratio tu curve profile, CORE_SIZES tu profile
5. **Lost Revenue**: Clamp 0.8
6. **Markdown Risk**: Velocity floor 0.1
7. **Smart Transfer**: DOC cap 180, after-transfer DOC check >= 30
8. **Cash Lock**: COGS-based, khong phai retail price
9. **Network Gap**: FC price thay vi 250k hardcode

Them muc moi:

10. **Muc B: Approval Gate & Safety Layers** — 3 tang an toan (SAFE/ELEVATED/HIGH)
11. **Muc C: Fallback Settings** — Ghi nhan can tenant-level config cho fallback_unit_price, fallback_unit_cogs, default_margin_rate
12. **Muc C: Decision Unit Normalization** — FC la primary key, style la group view, SKU la line item

---

## Phan 3: Tom Tat Thay Doi

| # | Van De | Fix | File |
|---|--------|-----|------|
| 1 | DOC=999 lam bung variance | Cap 180, eps floor | index.ts + plan.md |
| 2 | locked_cash dung retail 250k | Doi sang COGS 150k | index.ts + plan.md |
| 3 | CHI cao bang stores | Weighted avg theo velocity | index.ts + plan.md |
| 4 | expected_ratio phang | Doc tu sem_size_curve_profiles | index.ts + plan.md |
| 5 | CORE_SIZES hardcode M/L | Doc tu profile theo category | index.ts + plan.md |
| 6 | lost_ratio co the > 1 | Clamp max 0.8 | index.ts + plan.md |
| 7 | ETA no khi velocity ~0 | Velocity floor 0.1 | index.ts + plan.md |
| 8 | Transfer khong check source | After-transfer DOC >= 30 | index.ts + plan.md |
| 9 | Cash Lock dung retail price | COGS-based valuation | index.ts + plan.md |
| 10 | Network Gap 250k hardcode | FC price lookup | index.ts + plan.md |

**Khong thay doi**: Financial Damage Score, Fixability Score, Evidence Pack, Growth Simulator — cac cong thuc nay da dung.

