

# Bluecore Command — Technical Formula Specification

## Status: ✅ ALL 10 FORMULA BIASES FIXED (v2.0)

---

## 1. Engine Architecture

```
inventory-kpi-engine (Edge Function)
├── Layer 1: KPI Metrics (IDI, SCS, CHI, Network Gap)
├── Layer 2: Size Intelligence Phase 1 (Size Health, Lost Revenue, Markdown Risk)
├── Layer 3: Size Intelligence Phase 2 (Smart Transfer, Per-store Health)
└── Layer 4: Financial Impact (Cash Lock, Margin Leak, Evidence Packs)
```

Decision Unit: **FC (Family Code)** = primary key cho moi `state_*` va `dec_*` table.

---

## 2. Constants & Fallbacks

```
DEFAULT_CORE_SIZES    = Set(["M", "L"])        // fallback khi khong co curve profile
DEFAULT_UNIT_PRICE    = 250,000 VND            // retail price fallback
DEFAULT_UNIT_COGS     = 150,000 VND            // COGS fallback
COGS_RATIO_FALLBACK   = 0.6                    // COGS/retail estimate
DOC_CAP               = 180 days               // tran Days of Cover
EPS                   = 0.01                    // velocity epsilon
VELOCITY_FLOOR        = 0.1                     // san velocity cho ETA
TRANSFER_COST_SAME    = 15,000 VND/unit        // noi vung
TRANSFER_COST_CROSS   = 35,000 VND/unit        // lien vung
TRANSFER_SOURCE_MIN_DOC = 30 days              // DOC toi thieu source sau transfer
MARGIN_RATE           = 0.4                     // ty le margin cho size_break leak
MARKDOWN_DISCOUNT     = 0.35                    // discount trung binh khi markdown
```

---

## 3. Layer 1: KPI Metrics

### 3.1 IDI — Inventory Distortion Index

**Muc dich**: Do muc do "lech" phan bo ton kho giua cac store cho 1 FC.

```
Input:  positions (on_hand per store-FC), demand (avg_daily_sales per store-FC)
Filter: chi retail stores (khong tinh central_warehouse)

Per store-FC:
  velocity = demandMap[store:fc] || 0
  DOC = velocity > 0.01 ? min(180, on_hand / velocity) : (on_hand > 0 ? 180 : 0)

Per FC (across stores):
  docs[] = array cua DOC per store
  mean = avg(docs)
  variance = avg((doc_i - mean)^2)
  distortion_score = sqrt(variance)           // stddev of DOC

  overstock_locations = stores co DOC > mean * 1.5
  understock_locations = stores co DOC < mean * 0.5 AND DOC < 14

  locked_cash_estimate = sum(overstock_stores.on_hand) * 150,000  // COGS-based
```

**Output table**: `kpi_inventory_distortion`

### 3.2 SCS — Size Completeness Score

**Muc dich**: Do ty le size co hang tai 1 store cho 1 FC.

```
Input: positions (on_hand > 0), inv_sku_fc_mapping (fc_id, sku, size)

Per store-FC:
  expected_sizes = tat ca sizes trong mapping cho FC
  present_sizes = sizes co on_hand > 0 tai store
  SCS = present_sizes.count / expected_sizes.count

  Status:
    SCS < 0.3 → BROKEN
    SCS < 0.5 → AT_RISK
    else      → HEALTHY
```

**Output table**: `kpi_size_completeness`

### 3.3 CHI — Curve Health Index (Weighted)

**Muc dich**: Suc khoe curve tong hop cho 1 FC tren toan mang.

```
Input: SCS results + demand data (avg_daily_sales per store-FC)

Per FC:
  velocity_i = demand cua store i cho FC nay
  totalWeight = sum(velocity_i)

  CHI = totalWeight > 0
    ? sum(SCS_i * velocity_i) / totalWeight        // weighted avg
    : sum(SCS_i) / count                            // simple avg fallback

  Risk band:
    CHI < 0.3 → CRITICAL
    CHI < 0.5 → HIGH
    CHI < 0.7 → MEDIUM
    else      → LOW
```

**Output table**: `kpi_curve_health`

### 3.4 Network Gap

**Muc dich**: Xac dinh thieu hang thuc su (true shortage) va kha nang tai phan bo.

```
Input: positions, demand, skuMapping, priceMap

Per FC:
  totalStock = sum(on_hand) across ALL locations (bao gom warehouse)
  totalDemand28d = sum(avg_daily_sales * 28) across retail stores

  reallocatable = floor(totalStock * 0.70)         // 70% co the di chuyen
  trueShortage = max(0, ceil(totalDemand28d) - totalStock)
  netGap = max(0, ceil(totalDemand28d) - reallocatable)

  // FC price lookup (khong hardcode 250k)
  fcPrices = skuMapping.filter(fc).map(sku => priceMap[sku])
  fcPriceLookup = avg(fcPrices) || 250,000
  revenueAtRisk = trueShortage * fcPriceLookup
```

**Output table**: `kpi_network_gap`

---

## 4. Layer 2: Size Intelligence Phase 1

### 4.1 Size Health Score (0-100)

**Muc dich**: Danh gia suc khoe curve cua 1 FC tren toan mang.

```
Input: positions, skuMapping, curveProfiles (sem_size_curve_profiles)
Filter: chi multi-size FCs (>= 2 sizes), chi retail stores

// Resolve expected ratios tu curve profile
IF curveProfiles.length > 0:
  profileRatios = profile.size_ratios   // e.g. {S: 0.15, M: 0.30, L: 0.30, XL: 0.25}
  coreSizes = sizes co ratio >= 0.2     // e.g. {M, L, XL}
ELSE:
  profileRatios = null
  coreSizes = DEFAULT_CORE_SIZES = {M, L}

Per FC (network-wide):
  totalOnHand = sum(on_hand) across sizes
  actualRatio[size] = on_hand[size] / totalOnHand

  // Penalty 1: Deviation (0-40 points)
  FOR each expected_size:
    expectedRatio = profileRatios[size] || (1 / total_expected_sizes)
    deviation = |expectedRatio - actualRatio|
    weight = coreSizes.has(size) ? 1.5 : 1.0
    deviationSum += deviation * weight
  deviationPenalty = min(40, deviationSum * 20)

  // Penalty 2: Core size missing (0 or 30 points)
  corePenalty = (any core size has 0 stock) ? 30 : 0

  // Penalty 3: Shallow depth (5 points per size with 0 < qty < 2)
  shallowPenalty = shallowCount * 5

  // Final score
  score = max(0, min(100, 100 - deviationPenalty - corePenalty - shallowPenalty))

  Curve state:
    score >= 80 → healthy
    score >= 60 → watch
    score >= 40 → risk
    score < 40  → broken
```

**Output table**: `state_size_health_daily`

### 4.2 Lost Revenue Estimation

**Muc dich**: Uoc tinh doanh thu mat do thieu size.

```
Input: positions, demand, skuMapping, priceMap
Filter: chi multi-size FCs co velocity > 0

Per FC:
  missingSizes = sizes co on_hand = 0
  shallowSizes = sizes co 0 < on_hand < 2

  missingRatio = missingSizes.count / expectedSizes.count
  shallowRatio = shallowSizes.count / expectedSizes.count * 0.30  // 30% demand "lost"
  lostRatio = min(0.80, missingRatio + shallowRatio)               // CLAMP 80%

  lostUnits = ceil(fc_velocity * 28 * lostRatio)
  unitPrice = fcPrice[fc] || 250,000
  lostRevenue = lostUnits * unitPrice

  Driver:
    core size missing → "core_missing"
    shallow sizes     → "shallow"
    else              → "imbalance"
```

**Output table**: `state_lost_revenue_daily`

### 4.3 Markdown Risk (0-100)

**Muc dich**: Du bao rui ro phai markdown (giam gia) cho 1 FC.

```
Input: sizeHealthResults, demand, positions

Per FC (chi xu ly neu co size health data):
  riskScore = 0

  // Factor 1: Size health (0-40 points)
  healthScore < 40 → +40 (size_break)
  healthScore < 60 → +20 (size_stress)

  // Factor 2: Inventory age — weeks_of_cover (0-30 points)
  avgWOC > 12 → +30 (high_age)
  avgWOC > 8  → +15 (moderate_age)

  // Factor 3: Velocity vs stock (0-30 points)
  daysOfSupply = stock / velocity
  daysOfSupply > 90 → +30 (slow_velocity)
  daysOfSupply > 60 → +15 (declining_velocity)
  stock > 0, velocity = 0 → +30 (zero_velocity)

  riskScore = min(100, sum of factors)

  // ETA estimation (chi khi riskScore >= 40)
  IF riskScore >= 60:
    vFloor = max(velocity, 0.1)                     // VELOCITY FLOOR
    etaDays = min(90, max(7, round(stock / vFloor / 2)))
  ELIF riskScore >= 40:
    etaDays = velocity > 0 ? min(120, round(stock / velocity)) : 60

  Filter: chi luu neu riskScore >= 20
```

**Output table**: `state_markdown_risk_daily`

---

## 5. Layer 3: Size Intelligence Phase 2

### 5.1 Smart Transfer

**Muc dich**: Tim co hoi dieu chuyen hang giua stores de khac phuc le size.

```
Input: positions, demand, skuMapping, retailStores, priceMap

Per FC + Size:
  Per store:
    velocity_per_size ≈ store_fc_velocity / total_sizes
    DOC = velocity > 0 ? min(180, on_hand / velocity) : (on_hand > 0 ? 180 : 0)

  Sources: stores co DOC > 60 AND on_hand > 3
  Destinations: stores co on_hand <= 1 AND velocity > 0

  // Sort destinations by velocity desc (highest demand first)
  // Sort sources: same region first, then by DOC desc

  transferQty = min(
    max(1, ceil(dest_velocity * 14)),       // 14 ngay demand
    floor(source_on_hand * 0.50)            // max 50% source stock
  )

  // GUARDRAIL: After-transfer source DOC check
  sourceDocAfter = (source.on_hand - transferQty) / max(source.velocity, 0.01)
  IF sourceDocAfter < 30 → SKIP (khong de source bi thieu hang)

  // Economics
  transferCost = qty * (same_region ? 15,000 : 35,000)
  revenueGain = qty * unitPrice
  netBenefit = revenueGain - transferCost
  IF netBenefit <= 0 → SKIP

  // Priority scoring
  stockoutUrgency = (dest.on_hand == 0) ? 2 : 1
  coreSizeBonus = coreSizes.has(size) ? 1.5 : 1.0
  transferScore = round((stockoutUrgency * coreSizeBonus * revenueGain - transferCost) / 1000)

Output: top 200 sorted by transfer_score desc
```

**Output table**: `state_size_transfer_daily`

### 5.2 Per-store Size Health

**Muc dich**: Size Health Score tinh rieng cho tung store (cung cong thuc voi network-wide).

```
Same formula as 4.1 but computed per store-FC pair.
Dung DEFAULT_CORE_SIZES (chua wire curve profile cho per-store).
```

**Output table**: `state_size_health_daily` (voi store_id NOT NULL)

---

## 6. Layer 4: Financial Impact

### 6.1 Cash Lock

**Muc dich**: Tinh von bi khoa trong ton kho do le size.

```
Input: positions, demand, skuMapping, priceMap, sizeHealthResults

Per FC (chi network-wide health):
  unitCogs = (unitPrice * 0.6) || 150,000        // COGS-BASED valuation
  inventoryValue = stock * unitCogs

  // Lock % theo curve state
  broken → lockedPct = 0.70, driver = "broken_size"
  risk   → lockedPct = 0.40, driver = "broken_size"
  watch  → lockedPct = 0.15, driver = "slow_moving"
  healthy → SKIP

  cashLocked = round(inventoryValue * lockedPct)
  releaseDays = velocity > 0 ? min(180, round(stock / velocity)) : 180
```

**Output table**: `state_cash_lock_daily`

### 6.2 Margin Leak

**Muc dich**: Do muc do xoi mon loi nhuan tu nhieu nguyen nhan.

```
// Driver 1: Size break leak
FOR each FC in lostRevenueResults:
  marginLeak = round(lostRevenue * 0.40)           // 40% margin rate
  leak_driver = "size_break"

// Driver 2: Markdown risk leak (chi khi risk >= 60)
FOR each FC in markdownRiskResults WHERE risk >= 60:
  projectedLoss = round(stock * unitPrice * 0.35 * (riskScore / 100))
  leak_driver = "markdown_risk"
```

**Output table**: `state_margin_leak_daily`

### 6.3 Evidence Packs

**Muc dich**: Gom tat ca evidence cho FC co van de (broken/risk) de phuc vu approval.

```
Filter: chi FC co curve_state = "broken" hoac "risk"

Pack bao gom:
  - Size Health: score, state, core_missing, deviation
  - Lost Revenue: units, revenue, driver
  - Markdown Risk: score, eta_days, reason
  - Cash Lock: value, pct, release_days
  - Margin Leak: total, drivers[]

Severity:
  broken + markdown_risk >= 60 → "critical"
  broken                       → "high"
  risk                         → "medium"

Source tables: state_size_health_daily, state_lost_revenue_daily,
              state_markdown_risk_daily, state_cash_lock_daily,
              state_margin_leak_daily
```

**Output table**: `evidence_packs`

---

## 7. Approval Gate & Safety Layers

### 3 Tang An Toan (Human-in-Control)

| Tang | Dieu Kien | Nguoi Duyet |
|------|-----------|-------------|
| SAFE | cash_locked < 50M VND VA markdown_risk < 40 VA stores_impacted < 5 | Planner |
| ELEVATED | cash_locked 50-200M HOAC markdown_risk 40-70 HOAC stores 5-15 | Head of Ops |
| HIGH | cash_locked > 200M HOAC markdown_risk > 70 HOAC stores > 15 | CFO/COO |

### Evidence Pack Rules
- Khong co evidence → khong co nut Approve
- Evidence phai show "before/after" du kien (sau transfer / sau production)

### Override Learning Bounds
- Chi hoc khi decision outcome >= 75% accuracy (sau 30 ngay)
- Hoac khi planner co role "trusted_planner"
- Khong hoc tu moi override de tranh bias

---

## 8. Decision Unit Normalization

| Don Vi | Vai Tro | Vi Du |
|--------|---------|-------|
| **FC (Family Code)** | Primary decision unit | AO-POLO-001 |
| **Style** | Group view / aggregation | = FC alias |
| **SKU** | Line item / evidence | AO-POLO-001-M, AO-POLO-001-L |

- Moi `state_*` va `dec_*` table dung `product_id` = FC
- `inv_sku_fc_mapping` lam bridge SKU → FC + Size
- UI hien thi FC level, drill-down xuong SKU/Size

---

## 9. Changelog — 10 Formula Bias Fixes

| # | Van De | Fix | Status |
|---|--------|-----|--------|
| 1 | DOC=999 lam bung variance | Cap 180, eps 0.01 | ✅ |
| 2 | locked_cash dung retail 250k | COGS 150k | ✅ |
| 3 | CHI cao bang stores | Weighted avg theo velocity | ✅ |
| 4 | expected_ratio phang 1/N | Doc tu sem_size_curve_profiles | ✅ |
| 5 | CORE_SIZES hardcode M/L | Dynamic tu profile (ratio >= 0.2) | ✅ |
| 6 | lost_ratio co the > 1 | Clamp max 0.8 | ✅ |
| 7 | ETA no khi velocity ~0 | Velocity floor 0.1 | ✅ |
| 8 | Transfer khong check source | After-transfer DOC >= 30 | ✅ |
| 9 | Cash Lock dung retail price | COGS-based valuation | ✅ |
| 10 | Network Gap 250k hardcode | FC price lookup tu priceMap | ✅ |

**Khong thay doi**: Financial Damage Score, Fixability Score, Evidence Pack builder, Growth Simulator.

---

## 10. Tenant Fallback Config (Planned)

| Setting | Default | Muc Dich |
|---------|---------|----------|
| fallback_unit_price | 250,000 | Gia ban fallback |
| fallback_unit_cogs | 150,000 | Gia von fallback |
| default_margin_rate | 0.4 | Ty le margin cho Margin Leak |
| cogs_ratio_fallback | 0.6 | COGS/retail ratio |
| doc_cap | 180 | Tran Days of Cover |
| velocity_floor | 0.1 | San velocity cho ETA |
| transfer_source_min_doc | 30 | DOC toi thieu source sau transfer |
