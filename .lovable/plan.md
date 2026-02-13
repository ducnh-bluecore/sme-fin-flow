
# Tài Liệu Bluecore Command - Retail Inventory Operating Layer

## 1. Tổng Quan

Bluecore Command la module thu 5 cua nen tang Bluecore, hoat dong nhu mot "He Dieu Hanh Ton Kho Ban Le" (Retail Inventory OS). Thay vi bao cao so lieu, module nay tap trung vao **quyet dinh** -- dam bao von duoc phan bo dung SKU, dung cua hang, dung thoi diem.

**Triet ly thiet ke**: Human-in-Control Intelligence -- he thong de xuat "Goi Quyet Dinh" (Decision Packages), con nguoi duyet va dieu chinh. He thong hoc tu hanh vi dieu chinh (Override Learning).

### Cau truc "Decision Stack" (3 tang nao):

```text
+----------------------------------------------------------+
|  TANG 3: Growth Simulator (Nao Chien Luoc)               |
|  Doi tuong: Ban dieu hanh                                 |
|  Cau hoi: "Mo rong theo huong nao?"                       |
+----------------------------------------------------------+
|  TANG 2: Retail Flight Deck (Nao Dieu Hanh) [tuong lai]  |
|  Doi tuong: C-level                                       |
|  Cau hoi: "Con bao lau truoc khi thiet hai tai chinh?"    |
+----------------------------------------------------------+
|  TANG 1: Size Control Tower (Nao Van Hanh)                |
|  Doi tuong: Merchandiser, Operator                        |
|  Cau hoi: "San pham nao dang le size, can xu ly ngay?"    |
+----------------------------------------------------------+
```

---

## 2. Cac Trang (Pages) & Chuc Nang

### 2.1 Tong Quan (/command/overview)

**Muc dich**: Dashboard tong hop, diem vao nhanh cho operator.

**4 KPI chinh**:
- Ton Kho Mang Luoi: Tong so don vi trong he thong (tu RPC `fn_inv_overview_stats`)
- Von Bi Khoa: Tien bi khoa trong ton kho lech chuan
- Chi So Lech Chuan: Diem trung binh tu bang `kpi_inventory_distortion`
- Cho Quyet Dinh: So goi quyet dinh trang thai PROPOSED

**Thanh phan UI**: 4 KPI cards + Danh sach goi quyet dinh cho duyet (top 5)

---

### 2.2 Phan Bo (/command/allocation)

**Muc dich**: Giao dien phan bo ton kho (lazy load tu `InventoryAllocationPage`).

**Chuc nang**: Push allocation, lateral transfer, phan bo theo tier cua hang.

---

### 2.3 Co Cau Size - SIZE CONTROL TOWER (/command/assortment)

**Muc dich**: Bao ve doanh thu bang cach phat hien va xu ly "le size" (broken size runs).

**Day la trang phuc tap nhat**, gom 3 phan chinh:

#### Phan 1: Global Health Strip
Hien thi trang thai tong cua he thong, bao gom:
- **Suc Khoe Size** (0-100): Diem trung binh tu bang `kpi_size_health`
- **Trang thai**: GOOD / WARNING / CRITICAL
- **Le Size**: So mau bi le (broken)
- **DT Mat** (Lost Revenue): Uoc tinh doanh thu mat do thieu size
- **Von Khoa** (Cash Locked): Tien bi khoa trong ton kho lech
- **Ro Bien** (Margin Leak): Bien loi nhuan bi ro do markdown/stockout
- **Neu Hanh Dong**: Du bao suc khoe sau khi thuc hien dieu chuyen

#### Phan 2: Decision Feed (Tin Hieu Quan Trong)
Top 5 san pham nguy hiem nhat, moi san pham hien thi:
- Ban Do Size: ✓ Du hang | ⚠ Le (thieu o mot so store) | ✗ Het toan bo
- Chi tieu tai chinh: DT Mat, Von Khoa, Ro Bien
- AI Narrative: Giai thich tai sao san pham nay nguy hiem
- MD ETA: Du kien bao nhieu ngay nua phai markdown
- Store breakdown: Cua hang nao dang thieu size gi

#### Phan 3: He Thong 3 Tab

**Tab 1 - Phan Tich SKU (Prioritized Breakdown)**:
- Phan loai theo 3 tier: Khan cap | Can xu ly | Theo doi
- Sap xep theo Financial Damage Score = Lost Revenue + Cash Locked + Margin Leak
- Cot: Mau SP, Size Map, Suc Khoe, DT Mat, Von Khoa, Ro Bien, Kha Nang Fix, MD ETA
- Phan trang 20 items/trang, tim kiem, sap xep

**Tab 2 - De Xuat Dieu Chuyen (Smart Transfers)**:
- Gom nhom theo 4 muc dich: Le size (🟣) | Het hang (🔴) | Ban nhanh (🟠) | Can bang kho (🔵)
- Hien thi: Diem den, so mau, so don vi, Net Benefit
- Mo rong: Chi tiet tung dong dieu chuyen voi ton kho size tai kho dich

**Tab 3 - Heatmap & Impact**:
- Store Heatmap: Xep hang theo khu vuc hoac cua hang, hien thi so broken/risk/watch/healthy
- Action Impact Panel: Gia tri cuu duoc, so don vi chuyen, so mau fix, effort level

#### Cach Tinh (Formulas):

**Size Health Score** (0-100):
```text
CHI = Curve Health Index (do tu curve thuc te vs curve ly tuong)
Deviation = Muc do lech khoi curve chuan
Health = f(CHI, Deviation, Missing Core Sizes)
```

**Lost Revenue**: Uoc tinh doanh thu mat = (units thieu size core) x (avg_unit_price) x (sell-through rate)

**Cash Locked**: Gia tri ton kho bi khoa = on_hand x unit_cogs (cho cac size du thua khong ban duoc)

**Margin Leak**: Bien loi nhuan ro ri = markdown discount x ton kho can markdown + stockout impact

**Fixability**:
- Se giam gia (stars=1): markdown_risk >= 80
- De (stars=4): lost_revenue > 0 VA cash_locked < 30% lost_revenue
- Trung binh (stars=3): markdown_risk 40-80
- Kho (stars=2): cash_locked > 0

**Smart Transfer Score** (chi phi): 15,000 VND cung khu vuc | 35,000 VND khac khu vuc

---

### 2.4 Nguon Cung - Network Gap (/command/network-gap)

**Muc dich**: Phat hien rui ro thieu hang truoc khi mat doanh thu.

**Thanh phan**:
1. **Decision Banner**: Muc do khan cap (SAFE / MONITOR / ACTION)
   - Safe: Shortage = 0
   - Monitor: Shortage < 50
   - Action: Shortage >= 50

2. **4 KPI**:
   - Can San Xuat Them (net_gap_units)
   - Doanh Thu Rui Ro (revenue_at_risk)
   - Dieu Chuyen Duoc (reallocatable_units)
   - Mau Bi Anh Huong

3. **Thanh Kha Nang Dieu Chuyen**: % thieu hut co the xu ly khong can san xuat
   ```text
   transferCoverage = min(100, (reallocatable / (shortage + reallocatable)) * 100)
   ```

4. **Radar San Xuat**: Mau can SX, so luong, doanh thu bi de doa

5. **Mo Phong Tang Truong** (Growth Simulator - xem muc 2.7)

6. **Bang Chi Tiet**: Mau SP | Thieu Hut | DT Rui Ro | Dieu Chuyen Duoc | Can SX | Hanh Dong
   - Mo rong: Ly Do Quyet Dinh + Phan Ra Thieu Hut (waterfall)

---

### 2.5 San Xuat (/command/production)

**Muc dich**: Quan ly de xuat san xuat tu phan tich thieu hut mang luoi.

**4 KPI**: Tong SL Can | Von Can | Bien LN Du Kien | Hoan Von TB (ngay)

**Bang**: Style | SL | Von Can | Bien LN | Hoan Von | Uu Tien | Trang Thai | Thao Tac
- Urgency Score (0-100): Tinh theo cong thuc:
  ```text
  urgency = (isHero ? 30 : 0) + (segment === 'fast' ? 20 : normal ? 10 : 0) + min(50, velocity * 10)
  ```
- Trang thai: PROPOSED → APPROVED / REJECTED
- Mo rong: Phan Bo Theo Size (size_breakdown)

---

### 2.6 Quyet Dinh (/command/decisions)

**Muc dich**: Hang doi duyet goi quyet dinh (Decision Packages).

**Cau truc Progressive Decision Disclosure**:
```text
Level 1: Package View (tong quan 5 giay)
Level 2: Cluster View (nhom logic: Fast Movers, Broken Sizes...)
Level 3: SKU View (chi tiet co the chinh so luong)
Level 4: Movement Object (day sang WMS/ERP)
```

**UI**: Card list, moi goi hien thi:
- Loai (package_type) + Muc do rui ro
- Mo ta + so SKU + so don vi
- Doanh thu bao ve
- Nut Duyet / Tu Choi

**Mo rong**: Bang chi tiet tung dong (SKU, tu, den, de xuat, da duyet, ly do)

---

### 2.7 Ket Qua (/command/outcomes)

**Muc dich**: Decision Replay -- so sanh du doan vs thuc te sau 14/30/60 ngay.

**4 KPI**: Do Tin Cay (%) | Da Danh Gia | Chinh Xac Cao (>=85%) | DT Thuc Dat

**2 Tab**:

**Tab 1 - Phat Lai Quyet Dinh**: Bang so sanh predicted vs actual revenue
- Verdict: Xuat sac (>=90%) | Tot (>=75%) | Trung binh (>=50%) | Kem (<50%)

**Tab 2 - Hoc Tu Dieu Chinh (Override Learning)**:
- Mau dieu chinh: Planner thuong tang/giam SL bao nhieu
- Lich su: Goi | Quyet Dinh | Dieu Chinh | Ngay | Ghi Chu
- He thong hoc tu hanh vi override de cai thien de xuat

---

### 2.8 Cai Dat (/command/settings)

**Muc dich**: Cau hinh tham so van hanh.

**3 Tab cai dat**:
- **Chinh Sach Phan Bo** (sem_allocation_policies): Push/Pull rules
- **Phan Loai SKU** (sem_sku_criticality): Hero / Core / Tail
- **Size Curve Profiles** (sem_size_curve_profiles): Curve chuan theo category

---

## 3. Growth Simulator v2 (Mo Phong Tang Truong)

### 3.1 Kien Truc

**Server-side**: Toan bo logic chay tren Edge Function `growth-simulator`, xu ly song song 7 nguon du lieu, tinh toan tren 13,000+ SKU.

### 3.2 Tham So Dau Vao

| Tham So | Mac Dinh | Mo Ta |
|---------|----------|-------|
| growthPct | 30 | % tang truong muc tieu |
| horizonMonths | 6 | Khung thoi gian (thang) |
| docHero | 60 | Days of Cover cho Hero |
| docNonHero | 30 | Days of Cover cho Non-Hero |
| safetyStockPct | 15% | % ton kho an toan |
| cashCap | 0 (khong gioi han) | Tran tien mat |
| capacityCap | 0 (khong gioi han) | Tran cong suat SX/thang |
| overstockThreshold | 1.5 | Nguong overstock (x nhu cau) |

### 3.3 Cach Tinh Chi Tiet

**Buoc 1: Baseline Revenue**
```text
avgDailyRevenue = sum(kpi_facts_daily.metric_value) / daysCount
monthlyRevenue = avgDailyRevenue * 30
currentRevenue = monthlyRevenue * horizonMonths
targetRevenue = currentRevenue * (1 + growthPct/100)
gapRevenue = targetRevenue - currentRevenue
```

**Buoc 2: Phan Loai Toc Do Ban (Segment)**
```text
velocity < 0.5 SP/ngay → 'slow'
velocity >= 3 VA percentile >= 70 → 'fast'
velocity >= 1 VA percentile >= 70 → 'fast'
percentile <= 30 HOAC velocity < 1 → 'slow'
Con lai → 'normal'
```

**Buoc 3: Hero Score (0-100)**
```text
heroScore = velocityScore(0-25) + marginScore(0-25) + stabilityScore(0-25) + inventoryHealthScore(0-25)

velocityScore = scale025(velocity, min, max)
marginScore = scale025(marginPct, min, max)
stabilityScore = scale025(1 - |velocity7d - velocity| / velocity, 0, 1)
inventoryHealthScore = DOC 30-90 → 25 diem, ngoai khoang → scale025

Hero neu: heroScore >= 80 VA marginPct >= 40% HOAC is_core_hero = true
```

**Buoc 4: San Luong San Xuat (4 Tang Loc)**
```text
Tang 1 - Chan slow mover: segment='slow' VA !isHero → productionQty = 0
Tang 2 - Gioi han DOC: segment='slow' VA isHero → targetDOC = min(targetDOC, 30)
Tang 3 - Cash Recovery: docAfterProduction > 120 → productionQty = max(0, 90*vForecast - onHand)
Tang 4 - Ly do: Gan nhan "Khong SX - ban cham, rui ro khoa cash" hoac "SX gioi han"

requiredSupply = forecastDemand + safetyQty + (targetDOC * vForecast)
productionQty = max(0, round(requiredSupply - onHandQty))
```

**Buoc 5: Constraints**
```text
Sap xep: Hero truoc, heroScore giam dan
cashCap > 0: Cat SX khi tong cash vuot tran
capacityCap > 0: Cat SX khi tong qty vuot tran/horizon
```

**Buoc 6: Risk Flags**
```text
Stockout: onHand/vForecast < 14 ngay → severity critical (=0) hoac high
Overstock: onHand > forecastDemand * 1.5 → medium/high
Slow Mover High Stock: segment='slow' VA onHand > 0
Concentration: Top 3 FC chiem > 50% tong SX → high/critical
```

**Buoc 7: Hero Gap Analysis**
```text
heroNeed = gapRevenue * 60% (HERO_REVENUE_TARGET_SHARE)
heroCapacity = sum(hero FCs: min(onHand + production, demand) * unitPrice)
gap = max(0, heroNeed - heroCapacity)
recoverabilityPct = clamp(heroCapacity/heroNeed * 100, 0, 100)
heroCountGap = ceil(gap / avgCandidateCapacity)
```

### 3.4 Growth Expansion Map (Directional Intelligence)

Phan tich vector mo rong toi uu:

**Category Shape**: Nhom theo danh muc (Ao, Dam, Quan, Vay, Set, Ao Khoac, Khac)
```text
efficiencyScore = (momentumPct >= 10 ? 30 : momentum*3)
                + (avgMarginPct >= 50 ? 30 : margin/50*30)
                + (avgVelocity >= 2 ? 20 : velocity/2*20)
                + (overstockRatio < 0.2 ? 20 : (1-overstockRatio)*20)

CAO: efficiency >= 60
TRUNG BINH: 35-60
THAP: < 35

expand: efficiency >= 50
hold: 35-50
avoid: < 35
```

**Size Shifts**: Phan tich xu huong size (XS → XL), delta so voi ky truoc

**Price Bands**: Phan tich theo khung gia

### 3.5 Thanh Hanh Dong (Growth Action Bar)

3 hanh dong:
1. **Tao De Xuat San Xuat**: Day FC co productionQty > 0 vao bang `dec_production_candidates`
2. **Luu Kich Ban**: Luu params + ket qua vao bang `growth_scenarios` (JSONB)
3. **Xuat Bao Cao**: File Excel (.xlsx) gom 3 sheet: Tong Quan, Chi Tiet SKU, Ban Do Chien Luoc

---

## 4. Edge Functions (Backend)

| Function | Chuc Nang |
|----------|-----------|
| `growth-simulator` | Mo phong tang truong server-side, xu ly 7 nguon du lieu song song |
| `inventory-kpi-engine` | Tinh Size Health Score, Cash Lock, Margin Leak cho toan bo FC |
| `inventory-decision-packager` | Gom cac de xuat thanh Decision Packages |
| `inventory-outcome-evaluator` | Danh gia ket qua sau 14/30/60 ngay, tinh accuracy_score |

---

## 5. Database Tables (L4 - Decision Layer)

| Table | Chuc Nang |
|-------|-----------|
| `kpi_size_health` | Diem suc khoe size theo FC |
| `kpi_size_completeness` | Missing sizes theo store + style |
| `kpi_network_gap` | Phan tich thieu hut theo style |
| `kpi_inventory_distortion` | Diem lech chuan + locked cash |
| `dec_decision_packages` | Goi quyet dinh (PROPOSED/APPROVED/REJECTED) |
| `dec_decision_package_lines` | Chi tiet tung dong trong goi |
| `dec_production_candidates` | De xuat san xuat tu Growth Simulator |
| `dec_decision_outcomes` | Ket qua du doan vs thuc te |
| `dec_decision_approvals` | Lich su duyet + override |
| `growth_scenarios` | Kich ban mo phong da luu |
| `sem_allocation_policies` | Chinh sach phan bo |
| `sem_sku_criticality` | Phan loai Hero/Core/Tail |
| `sem_size_curve_profiles` | Curve chuan theo category |
| `inv_family_codes` | Family Code master (nhom SKU → FC) |
| `inv_stores` | Master cua hang |
| `inv_state_positions` | Ton kho theo SKU + Store |
| `inv_sku_fc_mapping` | Mapping SKU → FC + Size |

---

## 6. Giao Dien (UI Architecture)

### Sidebar Navigation (8 muc)
```text
Tong Quan     → /command/overview
Phan Bo       → /command/allocation
Co Cau Size   → /command/assortment
Nguon Cung    → /command/network-gap
San Xuat      → /command/production
Quyet Dinh    → /command/decisions
Ket Qua       → /command/outcomes
Cai Dat       → /command/settings
```

### UX Pattern: Progressive Decision Disclosure
- Level 1: Tong quan 5 giay (KPI strips, badges)
- Level 2: Nhom logic (tabs, tier categories)
- Level 3: Chi tiet SKU (bang phan trang, search, sort)
- Level 4: Evidence Pack (drawer voi ban do size, nguon hang, store breakdown)

### Responsive
- Desktop: Sidebar collapsible (260px → 72px)
- Mobile: Bottom nav + Drawer

---

## 7. Luong Du Lieu (Data Flow)

```text
inv_state_positions (ton kho)
inv_sku_fc_mapping (SKU→FC)        ──┐
inv_family_codes (FC master)          │
                                      ▼
                        [inventory-kpi-engine]
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
            kpi_size_health    kpi_network_gap    kpi_inventory_distortion
                    │                 │
                    ▼                 ▼
        Size Control Tower    [growth-simulator]
        (Assortment Page)            │
                                     ▼
                        dec_production_candidates
                                     │
                    ┌────────────────┤
                    ▼                ▼
        dec_decision_packages    Production Page
                    │
                    ▼
        [inventory-outcome-evaluator]
                    │
                    ▼
        dec_decision_outcomes (Decision Replay)
```

---

## 8. Nguyen Tac Thiet Ke

1. **Truth > Flexibility**: Khong cho tu dinh nghia metric, khong chinh cong thuc
2. **Financial Damage Score**: Uu tien san pham gay thiet hai tai chinh lon nhat
3. **Cash Recovery Filter**: Khong khoa von qua 3 thang cho bat ky FC nao
4. **Evidence-Based Decisions**: Moi de xuat di kem bang chung (Evidence Pack)
5. **Decision Replay**: So sanh du doan vs thuc te sau 30 ngay de xay dung niem tin
6. **Override Learning**: He thong hoc tu hanh vi dieu chinh cua planner
7. **DB-First**: Du lieu tinh toan (L3+) thong qua database functions, khong tinh tren client
