

# Nang cap What-If: Linh hoat Time Horizon + Cai thien UI/UX

## Muc tieu

Cho phep nguoi dung chon khung thoi gian phan tich What-If (1 thang, 3 thang, 6 thang, 12 thang, 24 thang) thay vi chi co 12 thang co dinh. Dong thoi cai thien UI/UX de trai nghiem muot hon.

## Thay doi chinh

### 1. Them Time Horizon Selector

Them mot thanh chon thoi gian ngay phia tren khu vuc slider tham so, dang button group (tuong tu tabs):

| Gia tri | Nhan hien thi | Mo ta |
|---------|--------------|-------|
| 1 | 1 thang | Du bao thang tiep theo |
| 3 | 3 thang | Du bao quy tiep theo |
| 6 | 6 thang | Du bao nua nam |
| 12 | 1 nam | Mac dinh, nhu hien tai |
| 24 | 2 nam | Ke hoach dai han |

### 2. Cap nhat tinh toan dua tren Time Horizon

**WhatIfSimulationPanel.tsx:**
- Them state `timeHorizon` (mac dinh = 12)
- KPI cards: hien thi gia tri theo khung thoi gian da chon (base revenue * timeHorizon/12)
- Save scenario: luu them `time_horizon` vao params

**MonthlyProfitTrendChart.tsx:**
- Nhan prop `timeHorizon` thay vi hardcode `MONTHS = ['T1'...'T12']`
- timeHorizon = 1: hien thi 4 tuan (Tuan 1, Tuan 2, Tuan 3, Tuan 4)
- timeHorizon = 3: hien thi 3 thang (T1, T2, T3)
- timeHorizon = 6: hien thi 6 thang (T1...T6)
- timeHorizon = 12: hien thi 12 thang (nhu hien tai)
- timeHorizon = 24: hien thi 24 thang (T1...T24)
- Summary cards: "EBITDA Du kien (nam)" -> "EBITDA Du kien (3 thang)" tuong ung

### 3. Cai thien UI/UX

**Layout toi uu:**
- Time Horizon selector: dat ngay duoi header, noi bat voi icon Clock
- KPI cards: them label thoi gian (vd: "Doanh thu (3 thang toi)")
- Compact slider area: gom "Doanh thu & Chi phi" va "Gia & San luong" vao 1 card khi man hinh nho
- Chart: them label ky "Tu [thang/nam] den [thang/nam]" de nguoi dung biet dang xem giai doan nao

**Visual cues:**
- Badge hien thoi gian dang chon ben canh tieu de "Mo phong What-If"
- Khi thay doi time horizon, KPI va chart cap nhat ngay (khong can bam nut)

## Chi tiet ky thuat

### Files thay doi

| File | Thay doi |
|------|---------|
| `src/components/whatif/WhatIfSimulationPanel.tsx` | Them `timeHorizon` state, Time Horizon selector UI, truyen prop xuong chart va KPI, cap nhat projected values theo time horizon |
| `src/components/whatif/MonthlyProfitTrendChart.tsx` | Nhan prop `timeHorizon`, dynamic months/weeks generation, dynamic labels |
| `src/hooks/useWhatIfScenarios.ts` | Them `timeHorizon` vao `WhatIfParams` interface |

### Logic tinh toan theo Time Horizon

```text
Base values hien tai = snapshot cua 30 ngay gan nhat (~ 1 thang)

Voi timeHorizon = N thang:
  baseRevenue_period = baseRevenue_monthly * N
  baseCogs_period = baseCogs_monthly * N
  baseOpex_period = baseOpex_monthly * N
  baseEbitda_period = baseEbitda_monthly * N

Projected values van ap dung % thay doi tuong tu:
  projectedRevenue = baseRevenue_period * revenueMultiplier
  ...
```

### Time Horizon Selector UI

Dung ToggleGroup (da co san tu Radix) de tao thanh chon:

```text
[1T]  [3T]  [6T]  [1N]  [2N]
         ^ dang chon
```

Voi:
- 1T = 1 thang
- 3T = 3 thang (1 quy)
- 6T = 6 thang
- 1N = 1 nam (mac dinh)
- 2N = 2 nam

### Chart Dynamic Labels

| timeHorizon | X-axis labels | Chart title |
|------------|--------------|-------------|
| 1 | Tuan 1, Tuan 2, Tuan 3, Tuan 4 | "Xu huong EBITDA theo tuan" |
| 3 | T1, T2, T3 | "Xu huong EBITDA 3 thang toi" |
| 6 | T1, T2, T3, T4, T5, T6 | "Xu huong EBITDA 6 thang toi" |
| 12 | T1...T12 | "Xu huong EBITDA theo thang" (nhu hien tai) |
| 24 | T1...T24 | "Xu huong EBITDA 2 nam" |

### Khong thay doi Database

Khong can migration. `time_horizon` duoc luu trong JSONB `params` cua `what_if_scenarios`, khong can them column.

