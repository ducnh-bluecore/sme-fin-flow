

## Network Gap V2 — Revenue Coverage Engine

Redesign toan bo trang `/command/network-gap` thanh Decision Engine: COO mo len 5 giay hieu ngay "co can san xuat khong?"

### Data thuc te hien tai
- 9 styles trong `kpi_network_gap`
- Chi **2 styles** thuc su thieu hang (4 units, ₫1M revenue at risk)
- **7 styles** la bug data (net_gap > 0 nhung shortage = 0) — can filter bo
- 393 units co the dieu chuyen
- Table **khong co** cot `days_to_stockout` — se tinh toan tu data hien co

---

### Thay doi cu the

#### 1. Decision Banner (BLOCK MOI — tren cung)

Them banner lon nhat trang, tu dong tinh toan va hien ket luan:

- Neu `totalShortage` = 0 hoac transfer cover >= 95%:
  **"Production NOT required — Transfer can cover all gaps"** (banner xanh)

- Neu co shortage nhung it (< 50 units):
  **"Minor shortage: X units / ₫Y revenue — monitor only"** (banner vang)

- Neu shortage lon (>= 50 units):
  **"Production REQUIRED — X styles, Y units, ₫Z at risk"** (banner do)

Hien thi ro: so style can san xuat, so unit, revenue exposure.

#### 2. KPI Bar — doi thu tu uu tien

Thu tu moi (theo mental model COO):

| Vi tri | KPI | Y nghia |
|--------|-----|---------|
| 1 | **Net Production Required** | So unit PHAI san xuat (loc bo bug rows) |
| 2 | **Revenue at Risk** | Tien se mat neu khong hanh dong |
| 3 | **Transfer Solvable** | So unit co the giai quyet bang dieu chuyen |
| 4 | **Styles Affected** | So style dang co gap |

#### 3. Transfer Solvability Bar (thay Coverage)

- Rename "Coverage Analysis" thanh **"Transfer Solvability"**
- Label: "Shortage solvable without production" thay vi "Network demand coverage"
- Chi hien khi co shortage thuc su (shortage > 0)

#### 4. Production Radar (BLOCK MOI)

Card moi giua KPI va table:

```
Production Radar
-----------------
Styles need production: 2
Units required: 4
Revenue exposure: ₫1M
```

Kem nut "Review Production Candidates" navigate sang `/command/production`.

#### 5. Table — loc data va chinh column

- **Filter bo bug rows**: chi hien rows co `true_shortage_units > 0` HOAC `revenue_at_risk > 0`
- **Doi thu tu cot**: Style | Net Gap | Revenue at Risk | Transferable | Shortage | Action
- **Cot Action**: Badge "Needs Production" (do) hoac "Transfer Only" (xanh)
- **Bo cot Severity** cu — thay bang Action badge co y nghia hon

#### 6. Rename page

- Title: **"Revenue Coverage Engine"**
- Subtitle: "Identify supply risks before they become lost sales"

---

### Files thay doi

| File | Thay doi |
|------|---------|
| `src/pages/command/NetworkGapPage.tsx` | Rewrite layout: Decision Banner, reorder KPIs, Production Radar, table filter/columns, rename |

### Khong thay doi
- Khong them cot `days_to_stockout` vao database (chua co data nguon de tinh)
- Khong sua backend engine (bug net_gap se xu ly rieng)
- Chi filter bug rows o frontend

