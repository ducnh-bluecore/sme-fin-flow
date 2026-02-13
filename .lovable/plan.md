
# Tài Liệu Bluecore Command - Retail Inventory Operating Layer

## 1. Tổng Quan

Bluecore Command là module thứ 5 của nền tảng Bluecore, hoạt động như một "Hệ Điều Hành Tồn Kho Bán Lẻ" (Retail Inventory OS). Thay vì báo cáo số liệu, module này tập trung vào **quyết định** -- đảm bảo vốn được phân bổ đúng SKU, đúng cửa hàng, đúng thời điểm.

**Triết lý thiết kế**: Human-in-Control Intelligence -- hệ thống đề xuất "Gói Quyết Định" (Decision Packages), con người duyệt và điều chỉnh. Hệ thống học từ hành vi điều chỉnh (Override Learning).

### Cấu trúc "Decision Stack" (3 tầng não):

```text
+----------------------------------------------------------+
|  TẦNG 3: Growth Simulator (Não Chiến Lược)               |
|  Đối tượng: Ban điều hành                                 |
|  Câu hỏi: "Mở rộng theo hướng nào?"                       |
+----------------------------------------------------------+
|  TẦNG 2: Retail Flight Deck (Não Điều Hành) [tương lai]  |
|  Đối tượng: C-level                                       |
|  Câu hỏi: "Còn bao lâu trước khi thiệt hại tài chính?"   |
+----------------------------------------------------------+
|  TẦNG 1: Size Control Tower (Não Vận Hành)                |
|  Đối tượng: Merchandiser, Operator                        |
|  Câu hỏi: "Sản phẩm nào đang lẻ size, cần xử lý ngay?"   |
+----------------------------------------------------------+
```

---

## 2. CÔNG THỨC TÍNH — SIZE INTELLIGENCE ENGINE (inventory-kpi-engine)

### 2.1 IDI — Inventory Distortion Index (Chỉ số lệch chuẩn tồn kho)

**Mục đích**: Đo mức độ phân bổ tồn kho không đều giữa các cửa hàng cho từng Family Code (FC).

```text
INPUT:
  - positions[]: Tồn kho theo SKU + Store (on_hand)
  - demand[]: Avg daily sales theo Store + FC

TÍNH TOÁN:
  1. DOC_per_store = on_hand / avg_daily_sales   (nếu velocity = 0 → DOC = 999 nếu có hàng, 0 nếu không)
  2. mean_DOC = avg(DOC tất cả stores)
  3. variance = avg((DOC_i - mean_DOC)²)
  4. distortion_score = sqrt(variance)   ← Càng cao = phân bổ càng lệch

  Overstock stores: DOC > mean * 1.5
  Understock stores: DOC < mean * 0.5 VÀ DOC < 14 ngày

  locked_cash_estimate = SUM(on_hand ở overstock stores) × 250,000 VND (fallback price)
```

**Output**: `kpi_inventory_distortion` — distortion_score, overstock_locations[], understock_locations[], locked_cash_estimate

---

### 2.2 SCS — Size Completeness Score (Điểm đầy đủ size)

**Mục đích**: Đo tỷ lệ size có hàng vs size kỳ vọng tại từng cửa hàng.

```text
INPUT:
  - skuMapping[]: FC → SKU → Size
  - positions[]: on_hand > 0 tại retail stores

TÍNH TOÁN:
  SCS = sizes_present / sizes_total   (0.0 → 1.0)

  Status:
    SCS < 0.3  → BROKEN
    SCS < 0.5  → AT_RISK
    SCS >= 0.5 → HEALTHY

  missing_sizes = sizes trong expected nhưng không có trong actual
```

**Output**: `kpi_size_completeness` — style_id, store_id, SCS, missing_sizes[], status

---

### 2.3 CHI — Curve Health Index (Chỉ số sức khỏe đường cong size)

**Mục đích**: Trung bình SCS qua tất cả stores cho 1 style → đánh giá sức khỏe mạng lưới.

```text
CHI = avg(SCS của style trên tất cả stores)

Risk Band:
  CHI < 0.3  → CRITICAL
  CHI < 0.5  → HIGH
  CHI < 0.7  → MEDIUM
  CHI >= 0.7 → LOW
```

**Output**: `kpi_curve_health` — style_id, curve_health_index, markdown_risk_band

---

### 2.4 Network Gap (Thiếu hụt mạng lưới)

**Mục đích**: Phát hiện FC nào thiếu hàng so với nhu cầu 28 ngày.

```text
INPUT:
  - total_stock = SUM(on_hand) theo fc_id (tất cả stores)
  - total_demand_28d = SUM(avg_daily_sales × 28) theo fc_id (chỉ retail stores)

TÍNH TOÁN:
  reallocatable = floor(total_stock × 0.70)        ← Chỉ 70% tồn kho có thể điều chuyển
  true_shortage = max(0, ceil(total_demand_28d) - total_stock)
  net_gap = max(0, ceil(total_demand_28d) - reallocatable)
  revenue_at_risk = true_shortage × 250,000 VND

  Chỉ output nếu true_shortage > 0 HOẶC net_gap > 0
```

**Output**: `kpi_network_gap` — style_id, reallocatable_units, true_shortage_units, net_gap_units, revenue_at_risk

---

### 2.5 Size Health Score (Điểm sức khỏe size — 0 đến 100)

**Mục đích**: Đánh giá mức độ cân bằng size curve cho từng FC ở cấp mạng lưới.

**Chỉ áp dụng cho FC có >= 2 sizes.**

```text
CORE_SIZES = {M, L}    ← Size quan trọng nhất

INPUT:
  - on_hand theo fc_id + size (chỉ retail stores, on_hand > 0)

TÍNH TOÁN:

  1. Deviation Penalty (0-40 điểm phạt):
     expected_ratio = 1 / total_expected_sizes
     Cho mỗi size:
       actual_ratio = actual_qty / total_on_hand
       deviation = |expected_ratio - actual_ratio|
       weight = 1.5 nếu CORE_SIZE, 1.0 nếu không
       deviationSum += deviation × weight
     deviationPenalty = min(40, deviationSum × 20)

  2. Core Missing Penalty (0 hoặc 30):
     corePenalty = 30 nếu BẤT KỲ size M hoặc L hết hàng, 0 nếu không

  3. Shallow Depth Penalty (0-N×5):
     shallowCount = số sizes có 0 < qty < 2
     shallowPenalty = shallowCount × 5

  SCORE = max(0, min(100, 100 - deviationPenalty - corePenalty - shallowPenalty))

  Curve State:
    score < 40  → "broken"
    score < 60  → "risk"
    score < 80  → "watch"
    score >= 80 → "healthy"
```

**Output**: `state_size_health_daily` — product_id, size_health_score, curve_state, deviation_score, core_size_missing, shallow_depth_count

---

### 2.6 Lost Revenue (Doanh thu mất — Ước tính)

**Mục đích**: Ước tính doanh thu mất do thiếu size (missing hoặc shallow).

```text
INPUT:
  - fcSizes: size kỳ vọng cho mỗi FC
  - actualStock: on_hand theo fc + size
  - fcVelocity: SUM(avg_daily_sales) theo fc_id
  - fcPrice: avg(avg_unit_price) từ v_inv_avg_unit_price (fallback: 250,000 VND)

TÍNH TOÁN:
  missing_sizes = sizes hết hàng hoàn toàn (on_hand = 0 hoặc không tồn tại)
  shallow_sizes = sizes có 0 < on_hand < 2

  missing_ratio = missing_count / total_expected_sizes
  shallow_ratio = (shallow_count / total_expected_sizes) × 0.30   ← 30% nhu cầu bị mất
  lost_ratio = missing_ratio + shallow_ratio

  lost_units = ceil(velocity × 28 × lost_ratio)
  lost_revenue = lost_units × unit_price

  Driver:
    "core_missing" nếu M hoặc L hết hàng
    "shallow" nếu có size < 2 units
    "imbalance" nếu chỉ thiếu sizes không phải core
```

**Output**: `state_lost_revenue_daily` — product_id, lost_units_est, lost_revenue_est, driver

---

### 2.7 Markdown Risk (Rủi ro giảm giá — 0 đến 100)

**Mục đích**: Dự đoán xác suất phải markdown trong 30-90 ngày tới.

```text
INPUT:
  - size_health_score (từ 2.5)
  - avg_weeks_of_cover
  - velocity, stock

TÍNH TOÁN (3 yếu tố cộng dồn):

  Factor 1 — Size Break:
    health < 40 → +40 điểm (reason: "size_break")
    health < 60 → +20 điểm (reason: "size_stress")

  Factor 2 — Inventory Age:
    avg_WOC > 12 tuần → +30 điểm (reason: "high_age")
    avg_WOC > 8 tuần  → +15 điểm (reason: "moderate_age")

  Factor 3 — Velocity vs Stock:
    days_of_supply = stock / velocity
    DOS > 90  → +30 điểm (reason: "slow_velocity")
    DOS > 60  → +15 điểm (reason: "declining_velocity")
    velocity = 0 VÀ stock > 0 → +30 điểm (reason: "zero_velocity")

  markdown_risk_score = min(100, Factor1 + Factor2 + Factor3)

  Markdown ETA:
    risk >= 60 → eta = min(90, max(7, round(stock / velocity / 2)))
    risk >= 40 → eta = min(120, round(stock / velocity))

  Chỉ lưu nếu risk_score >= 20
```

**Output**: `state_markdown_risk_daily` — product_id, markdown_risk_score, markdown_eta_days, reason

---

### 2.8 Smart Transfer (Đề xuất điều chuyển size thông minh)

**Mục đích**: Tìm cơ hội chuyển hàng từ store dư sang store thiếu cùng size.

```text
CONSTANTS:
  TRANSFER_COST_SAME_REGION  = 15,000 VND/unit
  TRANSFER_COST_CROSS_REGION = 35,000 VND/unit

INPUT:
  - on_hand theo store + fc + size
  - velocity theo store + fc (chia đều cho mỗi size)

LOGIC:
  Sources: stores có DOC > 60 ngày VÀ on_hand > 3
  Destinations: stores có on_hand <= 1 VÀ velocity > 0

  Ưu tiên destination có velocity cao nhất
  Ưu tiên source cùng region, sau đó DOC cao nhất

  transfer_qty = min(
    max(1, ceil(dest_velocity × 14)),     ← Đủ cho 14 ngày nhu cầu
    floor(source_on_hand × 0.50)          ← Tối đa 50% stock nguồn
  )

  transfer_cost = qty × (same_region ? 15,000 : 35,000)
  revenue_gain = qty × unit_price
  net_benefit = revenue_gain - transfer_cost   ← Phải > 0

  transfer_score = round(
    (stockout_urgency × core_size_bonus × revenue_gain - transfer_cost) / 1000
  )
    stockout_urgency = 2 nếu dest_on_hand = 0, 1 nếu không
    core_size_bonus = 1.5 nếu M/L, 1.0 nếu không

  Kết quả sort theo transfer_score DESC, giới hạn TOP 200
```

**Output**: `state_size_transfer_daily` — product_id, size_code, source_store_id, dest_store_id, transfer_qty, transfer_score, net_benefit, reason

---

### 2.9 Cash Lock (Vốn bị khóa)

**Mục đích**: Tính giá trị tiền bị khóa trong tồn kho do curve bị hỏng.

```text
INPUT:
  - size_health results (curve_state)
  - total on_hand theo fc
  - unit_price theo fc

TÍNH TOÁN:
  inventory_value = stock × unit_price

  locked_pct theo curve_state:
    "broken" → 70%
    "risk"   → 40%
    "watch"  → 15%
    "healthy" → 0% (bỏ qua)

  cash_locked = round(inventory_value × locked_pct)
  expected_release_days = min(180, round(stock / velocity))   ← velocity = 0 → 180 ngày
```

**Output**: `state_cash_lock_daily` — product_id, inventory_value, cash_locked_value, locked_pct, expected_release_days, lock_driver

---

### 2.10 Margin Leak (Rò rỉ biên lợi nhuận)

**Mục đích**: Ước tính biên lợi nhuận bị mất từ 2 nguồn.

```text
CONSTANTS:
  MARGIN_RATE = 0.40 (40% biên)
  MARKDOWN_DISCOUNT = 0.35 (35% giảm giá trung bình)

Driver 1 — Size Break:
  margin_leak = round(lost_revenue_est × MARGIN_RATE)
  leak_driver = "size_break"

Driver 2 — Markdown Risk (chỉ khi risk_score >= 60):
  projected_loss = round(stock × unit_price × MARKDOWN_DISCOUNT × (risk_score / 100))
  leak_driver = "markdown_risk"
```

**Output**: `state_margin_leak_daily` — product_id, margin_leak_value, leak_driver, leak_detail (JSON)

---

### 2.11 Financial Damage Score (Điểm thiệt hại tài chính tổng hợp)

**Mục đích**: Sắp xếp ưu tiên sản phẩm cần xử lý.

```text
Financial_Damage_Score = Lost_Revenue + Cash_Locked + Margin_Leak

Dùng để sắp xếp bảng "Prioritized Breakdown" trong Size Control Tower.
Sản phẩm có FDS cao nhất → xử lý trước.
```

---

### 2.12 Fixability Score (Khả năng sửa chữa)

```text
NẾU markdown_risk >= 80          → "Sẽ giảm giá" (1 sao)
NẾU lost_revenue > 0 VÀ cash_locked < 30% × lost_revenue → "Dễ" (4 sao)
NẾU markdown_risk 40-80          → "Trung bình" (3 sao)
NẾU cash_locked > 0              → "Khó" (2 sao)
MẶC ĐỊNH                         → "Trung bình" (3 sao)
```

---

### 2.13 Evidence Pack (Gói bằng chứng)

**Mục đích**: Tổng hợp toàn bộ metrics cho sản phẩm broken/risk → audit trail.

```text
Chỉ tạo cho FC có curve_state = "broken" HOẶC "risk"

severity:
  curve_state = "broken" VÀ markdown_risk >= 60 → "critical"
  curve_state = "broken" HOẶC markdown_risk >= 40 → "high"
  Còn lại → "medium"

Nội dung: size_health, lost_revenue, markdown_risk, cash_lock, total_margin_leak, summary text
```

**Output**: `evidence_packs` — product_id, severity, evidence (JSONB), summary

---

## 3. CÔNG THỨC TÍNH — GROWTH SIMULATOR v2 (growth-simulator)

### 3.1 Kiến Trúc

**Server-side**: Toàn bộ logic chạy trên Edge Function `growth-simulator`, xử lý song song 7 nguồn dữ liệu:
1. Revenue (kpi_facts_daily — 90 ngày gần nhất)
2. SKU Summary (fdp_sku_summary)
3. Family Codes (inv_family_codes)
4. SKU-FC Mapping (inv_sku_fc_mapping)
5. Inventory (inv_state_positions)
6. Demand (inv_state_demand)
7. Momentum (cdp_orders + cdp_order_items — 30 ngày)

### 3.2 Tham Số Đầu Vào

| Tham Số | Mặc Định | Mô Tả |
|---------|----------|-------|
| growthPct | 30 | % tăng trưởng mục tiêu |
| horizonMonths | 6 | Khung thời gian (tháng) |
| docHero | 60 | Days of Cover cho Hero |
| docNonHero | 30 | Days of Cover cho Non-Hero |
| safetyStockPct | 15% | % tồn kho an toàn |
| cashCap | 0 (không giới hạn) | Trần tiền mặt |
| capacityCap | 0 (không giới hạn) | Trần công suất SX/tháng |
| overstockThreshold | 1.5 | Ngưỡng overstock (× nhu cầu) |

### 3.3 Bước 1: Baseline Revenue

```text
totalDailyRevenue = SUM(kpi_facts_daily.metric_value) cho metric_code = 'NET_REVENUE'
daysCount = số rows trả về (tối đa 90)
avgDailyRevenue = totalDailyRevenue / daysCount
monthlyRevenue = avgDailyRevenue × 30
currentRevenue = monthlyRevenue × horizonMonths
targetRevenue = currentRevenue × (1 + growthPct / 100)
gapRevenue = targetRevenue - currentRevenue
horizonDays = horizonMonths × 30
```

### 3.4 Bước 2: Aggregate SKU → FC

```text
Cho mỗi SKU trong fdp_sku_summary:
  1. Map SKU → FC qua inv_sku_fc_mapping
  2. Cộng dồn: revenue, qty, cogs, profit, avgPrice, avgCogs
  3. Lấy velocity từ inv_state_demand (avg_daily_sales)
  4. Chỉ giữ FC có is_fashion = true (có mapping trong hệ thống)

unitPrice = avgPrice / count   (fallback: 250,000 VND)
unitCogs = avgCogs / count     (fallback: 150,000 VND)
marginPct = (unitPrice - unitCogs) / unitPrice × 100
```

### 3.5 Bước 3: Velocity Forecast & Segment

```text
vBase = avg_daily_sales (từ inv_state_demand)
trendRatio = velocity7d / velocity   (clamp 0.7 → 1.3)
vForecast = vBase × clamp(trendRatio, 0.7, 1.3)
forecastDemand = vForecast × horizonDays

Phân loại segment:
  velocity < 0.5             → 'slow'
  velocity >= 3 VÀ percentile >= 70  → 'fast'
  velocity >= 1 VÀ percentile >= 70  → 'fast'
  percentile <= 30 HOẶC velocity < 1 → 'slow'
  Còn lại                    → 'normal'

percentileRank(v, sortedValues) = (count of values < v) / total × 100
```

### 3.6 Bước 4: Hero Score (0-100)

```text
Hàm scale025(value, min, max) = clamp((value - min) / (max - min) × 25, 0, 25)

velocityScore = scale025(velocity, min_velocity, max_velocity)          ← 0-25 điểm
marginScore = scale025(marginPct, min_margin, max_margin)              ← 0-25 điểm
stability = velocity > 0 ? 1 - |velocity7d - velocity| / velocity : 0
stabilityScore = scale025(clamp(stability, 0, 1), 0, 1)               ← 0-25 điểm

docCurrent = onHandQty / vForecast
docHealthy = docCurrent >= 30 VÀ docCurrent <= 90
inventoryHealthScore = docHealthy ? 25 : scale025(clamp(docCurrent, 0, 120), 0, 120)  ← 0-25

heroScore = round(velocityScore + marginScore + stabilityScore + inventoryHealthScore)

isHeroCalculated = heroScore >= 80 VÀ marginPct >= 40%
isHero = isHeroManual (is_core_hero = true) HOẶC isHeroCalculated
```

### 3.7 Bước 5: Production Quantity (4 Tầng Lọc Rủi Ro)

```text
targetDOC = isHero ? params.docHero : params.docNonHero

TẦNG 1 — Chặn slow mover không phải Hero:
  NẾU segment = 'slow' VÀ !isHero → productionQty = 0

TẦNG 2 — Giới hạn DOC cho Hero bán chậm:
  NẾU segment = 'slow' VÀ isHero → targetDOC = min(targetDOC, 30)

Tính production:
  safetyQty = (safetyStockPct / 100) × forecastDemand
  requiredSupply = forecastDemand + safetyQty + (targetDOC × vForecast)
  productionQty = max(0, round(requiredSupply - onHandQty))

TẦNG 3 — Cash Recovery Filter:
  docAfterProduction = (onHandQty + productionQty) / vForecast
  NẾU docAfterProduction > 120 VÀ productionQty > 0:
    productionQty = max(0, round(90 × vForecast - onHandQty))
    ← Cắt về mức 90 ngày tồn kho

TẦNG 4 — Gắn nhãn lý do:
  "⛔ Không SX - bán chậm, rủi ro khóa cash" (slow + !hero)
  "⚠ SX giới hạn - Hero nhưng velocity thấp" (slow + hero)
```

### 3.8 Bước 6: Constraints (Ràng buộc)

```text
Sắp xếp: Hero trước, heroScore giảm dần

Cash Cap (nếu > 0):
  Duyệt tuần tự, cộng dồn cashRequired
  Khi totalCash > cashCap → productionQty = 0 cho FC đó trở đi

Capacity Cap (nếu > 0):
  capPerHorizon = capacityCap × horizonMonths
  Duyệt tuần tự, cộng dồn productionQty
  Khi totalQty > capPerHorizon → productionQty = 0 cho FC đó trở đi
```

### 3.9 Bước 7: Risk Flags

```text
Stockout:
  onHand / vForecast < 14 ngày → severity = (onHand = 0 ? 'critical' : 'high')

Overstock:
  onHand > forecastDemand × overstockThreshold → severity = (> 2× ? 'high' : 'medium')

Slow Mover High Stock:
  segment = 'slow' VÀ onHand > 0 → severity = (velocity < 0.2 ? 'high' : 'medium')

Concentration (toàn bộ kế hoạch):
  top3_share = SUM(top 3 FC productionQty) / total_productionQty
  top3_share > 0.50 → severity = (> 0.70 ? 'critical' : 'high')

Risk Score tổng hợp:
  riskScore = round(stockoutRatio × 40 + overstockRatio × 30 + concentrationScore × 30)
```

### 3.10 Bước 8: Hero Gap Analysis

```text
heroNeed = gapRevenue × 0.60 (HERO_REVENUE_TARGET_SHARE = 60%)

heroCapacity = SUM cho mỗi Hero FC:
  unitPrice_fc = currentRevenue / currentQty
  min(onHandQty + productionQty, forecastDemand) × unitPrice_fc

gap = max(0, heroNeed - heroCapacity)
recoverabilityPct = clamp(heroCapacity / heroNeed × 100, 0, 100)

heroCandidates = FCs không phải manual hero, heroScore >= 50, top 10
avgCandidateCapacity = avg(projectedRevenue) của candidates
heroCountGap = ceil(gap / avgCandidateCapacity)

Message:
  recoverabilityPct >= 80 → "Có thể đạt X% target bằng tăng depth hero hiện có"
  Còn lại → "Cần thêm ~N hero mới để đạt target"
```

### 3.11 Bước 9: Before / After Metrics

```text
revenueProjected = [currentRevenue, currentRevenue + SUM(projectedRevenue)]
marginPct = [avgMarginPct, avgMarginPct]
heroRevenueShare = [heroRevenue/fashionTotal × 100, (heroRevenue + heroProjected) / (total + projected) × 100]
stockoutRiskCount = [count(stockout risk FCs), count(FCs with docAfterProduction < 14)]
avgDOC = [avg(docCurrent), avg(docAfterProduction)]
```

### 3.12 Urgency Score (Điểm ưu tiên sản xuất)

```text
urgency = (isHero ? 30 : 0)
        + (segment === 'fast' ? 20 : segment === 'normal' ? 10 : 0)
        + min(50, round(velocity × 10))

Range: 0-100
Dùng khi đẩy vào dec_production_candidates
```

---

## 4. CÔNG THỨC TÍNH — GROWTH EXPANSION MAP (Bản đồ mở rộng)

### 4.1 Category Efficiency Score (Điểm hiệu quả danh mục)

```text
Phân loại danh mục từ fc_name bằng regex:
  /top|shirt|blouse|ao|áo/ (không khoác) → "Áo/Tops"
  /dress|dam|đầm/ → "Đầm/Dresses"
  /skirt|vay|váy|chân váy/ → "Váy/Skirts"
  /pant|jean|quan|quần/ → "Quần/Bottoms"
  /set/ → "Set"
  /jacket|coat|blazer|khoác/ → "Áo khoác"
  Còn lại → "Khác"

Cho mỗi category:
  avgVelocity = totalVelocity / fcCount
  avgMargin = sumMargin / fcCount
  avgDOC = sumDOC / fcCount
  overstockRatio = overstockCount / fcCount
  revenueShare = (categoryRevenue / totalRevenue) × 100
  momentumPct = priorQty > 0 ? ((recentQty - priorQty) / priorQty) × 100 : (recent > 0 ? 100 : 0)

  stabilityRatio = priorQty > 0 ? 1 - |recentQty - priorQty| / max(recentQty, priorQty) : 0.5

  efficiencyScore = min(100, round(
      clamp(avgVelocity / maxCatVelocity, 0, 1) × 40          ← Velocity (40%)
    + clamp(avgMargin / 100, 0, 1) × 25                       ← Margin (25%)
    + (1 - clamp(overstockRatio, 0, 1)) × 20                  ← Inventory Health (20%)
    + clamp(stabilityRatio, 0, 1) × 15                         ← Stability (15%)
    + clamp(revenueShare / 30, 0, 1) × 10                     ← Revenue Bonus (10%)  ← Tổng có thể > 100, capped bởi min
  ))

  efficiencyLabel:
    >= 65 → "CAO"
    >= 40 → "TRUNG BÌNH"
    < 40  → "THẤP"

  direction:
    "CAO" VÀ momentum >= -10 → "expand"
    efficiency >= 55 VÀ momentum >= 0 VÀ revenueShare >= 10 → "expand"
    "THẤP" HOẶC momentum < -30 → "avoid"
    Còn lại → "hold"
```

### 4.2 Size Shifts (Xu hướng dịch chuyển size)

```text
Trích size từ SKU bằng hậu tố: XL, XS, L, M, S
Tính velocity share cho mỗi size
equalShare = 100 / số sizes

deltaPct = velocityShare - equalShare
direction:
  delta > 5  → "tăng"
  delta < -5 → "giảm"
  Còn lại    → "ổn định"
```

### 4.3 Price Bands (Phân khúc giá)

```text
Bands: < 300K | 300-500K | 500K-1M | > 1M

Cho mỗi band:
  Lọc FCs theo unitPrice (currentRevenue / currentQty)
  avgVelocity, avgMarginPct
  momentum = ((upTrend_count - downTrend_count) / total) × 100
  efficiency = round(
      clamp(avgV / 5, 0, 1) × 40
    + clamp(avgM / 100, 0, 1) × 25
    + 20                             ← Base score
    + 15 × (upOrStable_count / total)  ← Stability
  )
  Label: >= 65 → "CAO", >= 40 → "TRUNG BÌNH", < 40 → "THẤP"
```

### 4.4 Gravity Summary

```text
gravitySummary = "Phát hiện trọng lực tại: {top_category} | Size {top_size} | {top_price_band}"
  top_category = expand category có efficiency cao nhất
  top_size = size có velocityShare cao nhất
  top_price_band = band có avgVelocity cao nhất
```

---

## 5. Các Trang (Pages) & Chức Năng

### 5.1 Tổng Quan (/command/overview)
4 KPI cards + Danh sách gói quyết định chờ duyệt (top 5)

### 5.2 Phân Bổ (/command/allocation)
Push allocation, lateral transfer, phân bổ theo tier cửa hàng.

### 5.3 Cơ Cấu Size — SIZE CONTROL TOWER (/command/assortment)
- Global Health Strip (metrics từ mục 2)
- Decision Feed (top 5 sản phẩm nguy hiểm nhất)
- 3 Tabs: Phân Tích SKU | Đề Xuất Điều Chuyển | Heatmap & Impact

### 5.4 Nguồn Cung — Network Gap (/command/network-gap)
- Decision Banner (SAFE/MONITOR/ACTION)
- Transfer Coverage = min(100, reallocatable / (shortage + reallocatable) × 100)

### 5.5 Sản Xuất (/command/production)
- Quản lý đề xuất sản xuất, Urgency Score

### 5.6 Quyết Định (/command/decisions)
- Progressive Decision Disclosure (4 levels)

### 5.7 Kết Quả (/command/outcomes)
- Decision Replay: predicted vs actual revenue
- Override Learning

### 5.8 Cài Đặt (/command/settings)
- Chính sách phân bổ, Phân loại SKU, Size Curve Profiles

---

## 6. Edge Functions (Backend)

| Function | Chức Năng |
|----------|-----------|
| `growth-simulator` | Mô phỏng tăng trưởng server-side, 7 nguồn dữ liệu song song |
| `inventory-kpi-engine` | 12 engines: IDI, SCS, CHI, Network Gap, Size Health, Lost Revenue, Markdown Risk, Smart Transfer, Per-store Health, Cash Lock, Margin Leak, Evidence Pack |
| `inventory-decision-packager` | Gom các đề xuất thành Decision Packages |
| `inventory-outcome-evaluator` | Đánh giá kết quả sau 14/30/60 ngày |

---

## 7. Database Tables (L4 - Decision Layer)

| Table | Chức Năng |
|-------|-----------|
| `kpi_inventory_distortion` | IDI — distortion_score, locked_cash |
| `kpi_size_completeness` | SCS — size completion per store-style |
| `kpi_curve_health` | CHI — curve health per style |
| `kpi_network_gap` | Network gap: shortage, reallocatable |
| `state_size_health_daily` | Size Health Score per FC (network + per-store) |
| `state_lost_revenue_daily` | Lost revenue estimates per FC |
| `state_markdown_risk_daily` | Markdown risk score per FC |
| `state_size_transfer_daily` | Smart transfer suggestions |
| `state_cash_lock_daily` | Cash locked per FC |
| `state_margin_leak_daily` | Margin leak per FC |
| `evidence_packs` | Audit trail cho broken/risk products |
| `dec_decision_packages` | Gói quyết định (PROPOSED/APPROVED/REJECTED) |
| `dec_decision_package_lines` | Chi tiết từng dòng trong gói |
| `dec_production_candidates` | Đề xuất sản xuất từ Growth Simulator |
| `dec_decision_outcomes` | Kết quả dự đoán vs thực tế |
| `growth_scenarios` | Kịch bản mô phỏng đã lưu |

---

## 8. Nguyên Tắc Thiết Kế

1. **Truth > Flexibility**: Không cho tự định nghĩa metric, không chỉnh công thức
2. **Financial Damage Score**: Ưu tiên sản phẩm gây thiệt hại tài chính lớn nhất
3. **Cash Recovery Filter**: Không khóa vốn quá 3 tháng cho bất kỳ FC nào
4. **Evidence-Based Decisions**: Mọi đề xuất đi kèm bằng chứng (Evidence Pack)
5. **Decision Replay**: So sánh dự đoán vs thực tế sau 30 ngày
6. **Override Learning**: Hệ thống học từ hành vi điều chỉnh của planner
7. **DB-First**: Dữ liệu tính toán (L3+) thông qua database functions, không tính trên client
