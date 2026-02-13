

# Bluecore Command — Formula Spec & Changelog

## Status: ✅ ALL 10 FIXES IMPLEMENTED

Tat ca 10 formula biases da duoc fix trong `inventory-kpi-engine/index.ts`.

---

## A. Cong Thuc Da Fix (Implemented)

### A1. IDI — Inventory Distortion Index

**Truoc**: DOC = 999 khi velocity = 0; locked_cash = onHand × 250,000 (retail price)

**Sau (implemented)**:
```
DOC_CAP = 180
EPS = 0.01
DOC = velocity > EPS ? min(DOC_CAP, onHand / velocity) : (onHand > 0 ? DOC_CAP : 0)
value_at_risk = onHand × 150,000  // COGS fallback, khong phai retail price
```

**Ly do**: DOC=999 lam variance bung no, bien IDI thanh velocity detector. Cap 180 giu variance trong tam kiem soat.

### A2. CHI — Curve Health Index (Weighted)

**Truoc**: Simple avg across stores (cao bang)

**Sau (implemented)**:
```
// Weighted avg theo store velocity (demand)
totalWeight = sum(velocity_i)
CHI = totalWeight > 0
  ? sum(SCS_i × velocity_i) / totalWeight
  : sum(SCS_i) / count  // fallback simple avg
```

**Ly do**: Store ban 50 units/ngay thieu size nghiem trong hon store ban 1 unit/ngay.

### A3. Size Health Score — Curve Profile

**Truoc**: expectedRatio = 1/N (uniform); CORE_SIZES = hardcode {M, L}

**Sau (implemented)**:
```
// Doc tu sem_size_curve_profiles (category_id, size_ratios, is_current)
// Neu co profile: expectedRatio = profile.size_ratios[size]
// Core sizes = sizes voi ratio >= 0.2 trong profile
// Fallback: uniform 1/N, core = {M, L}
```

**Ly do**: Size curve khong deu — M/L thuong chiem 25-30% moi size. Curve phang gay false positive.

### A4. Lost Revenue — Clamp 0.8

**Truoc**: lostRatio = missingRatio + shallowRatio (co the > 1.0)

**Sau (implemented)**:
```
lostRatio = Math.min(0.8, missingRatio + shallowRatio)
```

**Ly do**: Retail hiem khi mat 100% demand. Clamp 80% la bao thu hop ly.

### A5. Markdown Risk — Velocity Floor

**Truoc**: etaDays dung velocity truc tiep, no khi velocity ~ 0

**Sau (implemented)**:
```
vFloor = Math.max(velocity, 0.1)
etaDays = Math.min(90, Math.max(7, Math.round(stock / vFloor / 2)))
```

**Ly do**: Velocity = 0.001 → ETA = 500,000 ngay. Floor 0.1 gioi han ETA max ~ 90 ngay.

### A6. Smart Transfer — DOC Cap + After-Transfer Check

**Truoc**: DOC = 999 khi velocity = 0; khong check source sau transfer

**Sau (implemented)**:
```
DOC_CAP = 180
doc = velocity > 0 ? Math.min(DOC_CAP, onHand/velocity) : (onHand > 0 ? DOC_CAP : 0)

// After-transfer guardrail:
sourceDocAfter = (source.onHand - transferQty) / Math.max(source.velocity, 0.01)
if (sourceDocAfter < 30) skip  // Khong de source bi thieu hang
```

**Ly do**: Transfer khong nen tao van de moi cho source store.

### A7. Cash Lock — COGS-based Valuation

**Truoc**: inventoryValue = stock × unitPrice (retail price 250k)

**Sau (implemented)**:
```
COGS_RATIO_FALLBACK = 0.6
DEFAULT_UNIT_COGS = 150,000
unitCogs = unitPrice × COGS_RATIO_FALLBACK  // hoac DEFAULT_UNIT_COGS
inventoryValue = stock × unitCogs
```

**Ly do**: Cash lock la von bi khoa, phai do bang COGS (gia von), khong phai retail price.

### A8. Network Gap — FC Price Lookup

**Truoc**: revenueAtRisk = trueShortage × 250,000 (hardcode)

**Sau (implemented)**:
```
// Lookup gia thuc te tu v_inv_avg_unit_price theo SKU → FC
fcPrices = skuMapping.filter(fc).map(sku => priceMap.get(sku))
fcPriceLookup = avg(fcPrices) || DEFAULT_UNIT_PRICE (250k)
revenueAtRisk = trueShortage × fcPriceLookup
```

**Ly do**: FC co ASP 1.2M se bi underestimate neu dung 250k.

### A9. CORE_SIZES — Dynamic tu Profile

**Truoc**: `const CORE_SIZES = new Set(["M", "L"])` hardcode

**Sau (implemented)**:
```
DEFAULT_CORE_SIZES = {M, L}  // fallback
// Khi co curve profile: core = sizes voi ratio >= 0.2
// Ap dung cho: Size Health, Lost Revenue, Smart Transfer, Per-store Health
```

### A10. Constants Refactored

```
DEFAULT_CORE_SIZES = new Set(["M", "L"])
DEFAULT_UNIT_PRICE = 250,000
DEFAULT_UNIT_COGS_GLOBAL = 150,000
COGS_RATIO_FALLBACK = 0.6
TRANSFER_COST_SAME_REGION = 15,000 VND
TRANSFER_COST_CROSS_REGION = 35,000 VND
```

---

## B. Approval Gate & Safety Layers

### 3 Tang An Toan (Human-in-Control)

| Tang | Dieu Kien | Nguoi Duyet |
|------|-----------|-------------|
| SAFE | cash_locked < 50M VND VA markdown_risk < 40 VA stores_impacted < 5 | Planner |
| ELEVATED | cash_locked 50-200M HOAC markdown_risk 40-70 HOAC stores 5-15 | Head of Ops |
| HIGH | cash_locked > 200M HOAC markdown_risk > 70 HOAC stores > 15 | CFO/COO |

### Evidence Pack Rules
- Khong co evidence → khong co nut Approve
- Evidence phai show "before/after" du kien (sau transfer / sau production)
- Evidence tu: state_size_health_daily, state_lost_revenue_daily, state_markdown_risk_daily, state_cash_lock_daily

### Override Learning Bounds
- Chi hoc khi decision outcome >= 75% accuracy (sau 30 ngay)
- Hoac khi planner co role "trusted_planner"
- Khong hoc tu moi override de tranh bias

---

## C. Fallback Settings & Decision Unit

### C1. Tenant-level Fallback Config (Can Implement)

Cac gia tri fallback hien tai hardcode trong engine. Can chuyen sang `command_settings` theo tenant:

| Setting | Default | Muc Dich |
|---------|---------|----------|
| fallback_unit_price | 250,000 | Gia ban fallback khi khong co data |
| fallback_unit_cogs | 150,000 | Gia von fallback |
| default_margin_rate | 0.4 | Ty le margin cho Margin Leak |
| cogs_ratio_fallback | 0.6 | COGS/retail ratio estimate |
| doc_cap | 180 | Tran Days of Cover |
| velocity_floor | 0.1 | San velocity cho ETA |
| transfer_source_min_doc | 30 | DOC toi thieu sau transfer |

### C2. Decision Unit Normalization

| Don Vi | Vai Tro | Vi Du |
|--------|---------|-------|
| **FC (Family Code)** | Primary decision unit | AO-POLO-001 |
| **Style** | Group view / aggregation | = FC alias |
| **SKU** | Line item / evidence | AO-POLO-001-M, AO-POLO-001-L |

- Moi `state_*` va `dec_*` table dung `product_id` = FC
- `inv_sku_fc_mapping` lam bridge SKU → FC + Size
- UI hien thi FC level, drill-down xuong SKU/Size

---

## D. Tom Tat Thay Doi (Completed)

| # | Van De | Fix | Status |
|---|--------|-----|--------|
| 1 | DOC=999 lam bung variance | Cap 180, eps floor | ✅ |
| 2 | locked_cash dung retail 250k | COGS 150k | ✅ |
| 3 | CHI cao bang stores | Weighted avg theo velocity | ✅ |
| 4 | expected_ratio phang | Doc tu sem_size_curve_profiles | ✅ |
| 5 | CORE_SIZES hardcode M/L | Dynamic tu profile (ratio >= 0.2) | ✅ |
| 6 | lost_ratio co the > 1 | Clamp max 0.8 | ✅ |
| 7 | ETA no khi velocity ~0 | Velocity floor 0.1 | ✅ |
| 8 | Transfer khong check source | After-transfer DOC >= 30 | ✅ |
| 9 | Cash Lock dung retail price | COGS-based valuation | ✅ |
| 10 | Network Gap 250k hardcode | FC price lookup tu priceMap | ✅ |

**Khong thay doi**: Financial Damage Score, Fixability Score, Evidence Pack builder, Growth Simulator — cac cong thuc nay da dung.
