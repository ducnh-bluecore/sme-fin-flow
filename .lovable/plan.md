

# Growth Simulator v2 -- Retail Production Planning Engine

## Tong quan thay doi

Nang cap tu mo phong don gian (v1: gap revenue -> phan bo tuyen tinh) thanh **Retail Production Planning Engine** voi forecast, DOC, safety stock, hero scoring, va risk register.

---

## A. Thay doi trong Scenario Builder (Input Panel)

Giu nguyen Growth % slider va Horizon select. Them:

1. **Inventory Policy Panel** (collapsible)
   - DOC Hero: slider 45-90 ngay (default 60)
   - DOC Non-Hero: slider 15-60 ngay (default 30)
   - Safety Stock: slider 5-30% (default 15%)

2. **Constraints Panel** (collapsible, optional)
   - Cash Cap: input so tien (VND)
   - Capacity Cap: input SL/thang
   - Max Overstock Threshold: slider 1.0-3.0x (default 1.5x)

---

## B. Thay doi Engine Logic (runSimulation)

### B1. Forecast Demand (thay the tinh tuyen tinh)

```text
v_base = avg_daily_sales (tu inv_state_demand, 30d)
trend_ratio = velocity_7d / velocity_30d  (neu co)
v_forecast = v_base * clamp(trend_ratio, 0.7, 1.3)
demand = v_forecast * horizon_days
```

Thay vi dung revenue gap -> phan bo theo ty trong, chuyen sang **demand-driven per SKU/FC**.

### B2. Production Formula (co DOC + Safety)

```text
OnHand = total_on_hand (tu inv_state_positions, aggregate by fc_id)
TargetDOC = doc_hero hoac doc_nonhero (tuy segment)
Safety = safety_pct * demand

RequiredSupply = demand + Safety + (TargetDOC * v_forecast)
ProductionNeeded = max(0, RequiredSupply - OnHand)
```

### B3. HeroScore (rule-based, 4 yeu to)

```text
HeroScore = 
  VelocityScore (percentile rank trong tat ca FC, 0-25)
  + MarginScore (margin_pct rank, 0-25)  
  + StabilityScore (1 - abs(v7d - v30d)/v30d, scale 0-25, cao = on dinh)
  + InventoryHealthScore (DOC hien tai 30-90d = tot, 0-25)

Hero candidate = top 20% HeroScore VA margin > 40%
```

So sanh voi `is_core_hero` flag hien tai. Hien thi ca hai: "Hero (manual)" va "Hero candidate (calculated)".

### B4. Fast/Slow Mover Classification

```text
Fast mover: velocity percentile > P70
Slow mover: velocity percentile < P30
Filter: slow mover voi velocity < 0.1 unit/day -> khong de xuat SX (chi SX neu la Hero)
```

### B5. Risk Flags per FC

```text
Stockout risk: OnHand / v_forecast < 14 (lead_time + buffer)
Overstock risk: OnHand > demand * overstock_threshold
Mix/Concentration risk: top 3 FC chiem > 50% total production
```

### B6. Hero Gap Calculation

```text
R_inc = baseline_revenue * growth_pct
hero_capacity = SUM(min(available_units, demand) * avg_price) cho hero hien tai
hero_need = R_inc * 0.6 (60% tang truong tu hero)
gap = max(0, hero_need - hero_capacity)
hero_count_gap = ceil(gap / median(top_quartile_hero_capacity))
```

### B7. Constraints Enforcement

```text
Neu cash_cap > 0: cat san xuat tu priority thap -> cao cho den khi total_cash <= cap
Neu capacity_cap > 0: tuong tu
```

---

## C. Thay doi UI Output

### C1. Hero Strip (5 KPI cards, thay the 4 cards hien tai)

| Total Units SX | Cash Required | Hero SKUs / %Rev | Recoverability | Risk Score |
|---|---|---|---|---|

- **Recoverability**: "Co the dat 80% target bang tang depth hero hien tai" vs "Can them 3 hero moi"
- **Risk Score**: composite tu stockout + overstock + mix risks (0-100)

### C2. Panel "Before -> After" (MOI)

Bang 2 cot:

| Metric | Hien Tai | Sau Ke Hoach SX |
|---|---|---|
| Revenue (projected) | X | Y |
| Margin % | X% | Y% |
| Hero Revenue Share | X% | Y% |
| Stockout Risk FCs | N | M |
| DOC trung binh | X ngay | Y ngay |

### C3. Production Plan Table (nang cap)

Them cot va filter:
- Filter tabs: All / Hero / Non-Hero / Fast Mover / Slow Mover
- Them cot: Velocity (SP/ngay), DOC Hien Tai, DOC Sau SX, Segment (Fast/Slow/Normal), HeroScore
- Hien thi tat ca FC co productionQty > 0 (khong gioi han 30)
- Pagination hoac virtual scroll

### C4. Hero Plan (tach rieng section)

- Danh sach hero (manual + calculated candidates)
- Cot: Velocity, Margin, OnHand, DOC hien tai, SX de xuat, % dong gop tang truong, HeroScore
- "Next Hero Candidates" (top 10 non-hero co HeroScore cao nhat)

### C5. "Can Them Bao Nhieu Hero?" (section moi)

- hero_count_gap
- Danh sach "Next Hero Candidates" voi HeroScore va ly do
- Message: "Thieu X hero SKU de dat +Y% trong Z thang"

### C6. Risk Register (thay the Risk Summary don gian)

Bang top 10 risks:
| FC | Risk Type | Muc Do | Chi Tiet | De Xuat |
|---|---|---|---|---|

Risk types: Stockout / Overstock / Concentration / Slow-mover-high-stock
De xuat: Giam SX / Bundle / Markdown / Delay / Tang depth

---

## D. Cac file can thay doi

### File chinh (sua lon):
- `src/components/command/GrowthSimulator.tsx` -- Refactor toan bo: tach thanh sub-components, upgrade engine logic, them UI sections moi

### Tach component con (tao moi):
- `src/components/command/growth/GrowthInputPanel.tsx` -- Scenario builder voi inventory policy + constraints
- `src/components/command/growth/GrowthHeroStrip.tsx` -- 5 KPI cards
- `src/components/command/growth/GrowthBeforeAfter.tsx` -- Panel Before/After
- `src/components/command/growth/GrowthProductionTable.tsx` -- Bang san xuat voi filter/pagination
- `src/components/command/growth/GrowthHeroPlan.tsx` -- Hero analysis + candidates
- `src/components/command/growth/GrowthRiskRegister.tsx` -- Bang risk chi tiet
- `src/components/command/growth/simulationEngine.ts` -- Toan bo logic tinh toan (tach khoi UI)
- `src/components/command/growth/types.ts` -- Interfaces va constants

### File khong thay doi:
- `NetworkGapPage.tsx` -- Chi import GrowthSimulator, khong can sua
- Database -- Khong tao bang moi, chi doc data hien co

---

## E. Default Parameters (Fashion v1)

```text
DOC Hero = 60 ngay
DOC Non-Hero = 30 ngay
Safety Stock = 15%
Lead Time Buffer = 14 ngay
Hero Revenue Target Share = 60%
Overstock Threshold = 1.5x
Slow Mover Threshold = P30 (hoac < 0.1 unit/day)
Fast Mover Threshold = P70
HeroScore Margin Threshold = 40%
```

---

## F. Data Sources (khong thay doi, chi doc)

| Table | Dung de |
|---|---|
| `kpi_facts_daily` (NET_REVENUE) | Baseline revenue |
| `fdp_sku_summary` | Revenue, margin, qty, price per SKU |
| `inv_family_codes` | FC metadata, is_core_hero flag |
| `inv_sku_fc_mapping` | SKU -> FC mapping |
| `inv_state_positions` | On-hand inventory by fc_id |
| `inv_state_demand` | Sales velocity, avg_daily_sales, trend |

---

## G. Thu tu implement

1. Tao `types.ts` va `simulationEngine.ts` (core logic moi)
2. Tao cac sub-components UI
3. Refactor `GrowthSimulator.tsx` thanh orchestrator import sub-components
4. Test end-to-end voi "Chay Mo Phong"

