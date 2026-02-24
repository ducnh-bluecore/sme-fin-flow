

# DAILY WAR ROOM + WIN SCOREBOARD
## Them man hinh moi, giu nguyen tat ca man hinh cu

---

## Nguyen tac

Giu nguyen 100% cac route va man hinh hien tai. Them **3 man hinh/section moi** va **2 menu moi** vao sidebar. Route `/command` van redirect ve `/command/overview` nhu cu.

---

## Thay doi cu the

### 1. MAN HINH WAR ROOM (`/command/war-room`)

Trang "Daily War Room" -- man hinh dau tien retailer mo khi can biet "hom nay lam gi".

**3 section chinh:**

**A. WIN SCOREBOARD (top)**
- Card nho gon hien thi thanh tich gan day
- Data: Query `decision_outcomes` (actual_impact_amount) 7 ngay + compare `state_size_health_daily` today vs 7d ago
- Hien tai `decision_outcomes` chua co data (0 rows) --> hien empty state "Chua co quyet dinh nao duoc do luong"
- Khi co data: "Da cuu Xtr / Tranh markdown Xtr / Health +X"

**B. TODAY'S PRIORITIES (main)**
- Top 5-7 issues nguy hiem nhat, aggregate tu:
  - `state_size_health_daily` (curve_state = 'broken'/'risk') -- 10,571 rows co san
  - `state_markdown_risk_daily` (score >= 70) -- 44 rows co san
  - `state_cash_lock_daily` -- 307 rows co san
  - `state_margin_leak_daily` -- 563 rows co san
  - `state_lost_revenue_daily` -- 23 rows co san

- Moi item bat buoc 3 cau:
  1. Mat bao nhieu tien? (tu lost_revenue / cash_locked / margin_leak)
  2. Con bao lau? (tu markdown_eta_days)
  3. Hanh dong gi? (link den man hinh tuong ung: assortment/clearance/allocation)

- Sap xep theo: `financial_damage DESC` (lost_revenue + cash_locked + margin_leak)
- Gioi han 7 items (theo Control Tower Manifesto)

**C. QUICK ACTION QUEUE (bottom)**
- Danh sach 3-5 hanh dong co the approve ngay
- Link den cac man hinh execute tuong ung

**Format moi priority card:**

```text
+-----------------------------------------------------------+
| #1  SIZE BREAK -- [FC Name]                 [URGENT tag]  |
|     Mat [X]tr trong [Y] ngay neu khong xu ly              |
|     WHY NOW: [markdown_eta_days] ngay truoc markdown risk  |
|     [Xem Chi Tiet ->]                                     |
+-----------------------------------------------------------+
```

### 2. MAN HINH CAPITAL MAP (`/command/capital-map`)

Day la phien ban nang cao cua Overview hien tai, tap trung vao cau hoi:
"Tien dang nam sai o dau?"

- Reuse data tu `CommandOverviewPage` (KPI cards + misallocation)
- Them: breakdown theo category/season/demand_space
- Them: treemap hoac bar chart hien thi phan bo von theo FC group
- Data source: `state_cash_lock_daily` + `inv_family_codes` (category, season, demand_space)

### 3. THEM MENU VAO SIDEBAR

Giu nguyen 9 menu cu, them 2 menu moi o **dau danh sach** (truoc "Tong Quan"):

| # | Menu moi | Icon | Route |
|---|----------|------|-------|
| 1 | **War Room** | Siren | `/command/war-room` |
| 2 | **Capital Map** | Map | `/command/capital-map` |

Danh sach sidebar se la:
1. War Room (moi)
2. Capital Map (moi)
3. Tong Quan (cu)
4. Phan Bo (cu)
5. Co Cau Size (cu)
6. Thanh Ly (cu)
7. Nguon Cung (cu)
8. San Xuat (cu)
9. Quyet Dinh (cu)
10. Ket Qua (cu)
11. Cai Dat (cu)

---

## Chi tiet ky thuat

### Files moi:

1. **`src/pages/command/WarRoomPage.tsx`**
   - Component chinh cua War Room
   - Render WinScoreboard + PriorityList + QuickActions

2. **`src/hooks/command/useWarRoomPriorities.ts`**
   - Aggregate tu 5 state tables
   - Join voi `inv_family_codes` de lay ten san pham, category
   - Tinh `financial_damage` = lost_revenue + cash_locked + margin_leak per product
   - Sort DESC, limit 7
   - Them `time_pressure` tu markdown_eta_days
   - Return: `{ priorities, isLoading }`

3. **`src/hooks/command/useWinScoreboard.ts`**
   - Query `decision_outcomes` (sum actual_impact_amount, 7d)
   - Query `state_size_health_daily` (avg health today vs 7d ago)
   - Return: `{ rescuedRevenue, avoidedMarkdown, healthDelta, haData }`

4. **`src/components/command/WarRoom/PriorityCard.tsx`**
   - Card component cho 1 priority item
   - Hien thi: rank, type icon, ten FC, financial damage, time pressure (WHY NOW), action button

5. **`src/components/command/WarRoom/WinScoreboard.tsx`**
   - Card component hien thi thanh tich 7 ngay
   - Empty state khi chua co data

6. **`src/pages/command/CapitalMapPage.tsx`**
   - Hien thi phan bo von theo category/season
   - Dung Recharts bar chart cho breakdown
   - Query `state_cash_lock_daily` JOIN `inv_family_codes`

### Files sua:

1. **`src/components/layout/BluecoreCommandLayout.tsx`**
   - Them 2 nav items moi o dau mang `navItems` (War Room + Capital Map)
   - Khong xoa bat ky item nao

2. **`src/App.tsx`**
   - Import 2 page moi (WarRoomPage, CapitalMapPage)
   - Them 2 route moi trong block `/command`
   - Giu nguyen route `/command` redirect ve `/command/overview`

3. **`src/pages/command/index.ts`**
   - Export 2 page moi

### Khong thay doi database:
- Tat ca data can thiet da co trong cac state tables hien tai
- Khong can migration moi

