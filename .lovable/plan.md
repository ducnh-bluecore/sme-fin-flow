

# Build UX Phase 2: Hero Header, FC Decision Cards, Detail Sheet, Simulation, Audit Log

## Tong quan

Nang cap trang Inventory Allocation Engine tu dang "bang data co ban" len "Decision-first UX" theo dung manifesto Bluecore. 5 phan chinh can build.

---

## 1. Hero Header (Urgency Banner)

Tao component `InventoryHeroHeader.tsx`:

- Gradient banner (giong Decision Center hien tai)
- Dynamic urgency message dua tren du lieu:
  - Co shortage: "37 stores dang thieu hang, uoc tinh mat 420M neu khong xu ly trong 48h" (text do, pulse dot)
  - OK: "Tat ca stores deu du hang. Khong can hanh dong." (text xanh)
- Icon lon + tieu de "Inventory Allocation Engine"
- Tinh urgency tu `suggestions` data: dem P1, tinh tong revenue at risk

---

## 2. Decision Cards per Family Code

Thay the hoac bo sung ben canh Board Table bang danh sach **Decision Cards theo tung FC**:

Tao component `InventoryFCDecisionCards.tsx`:

- Moi card dai dien 1 FC can action (group suggestions theo `fc_id`)
- Card co:
  - Border-left mau theo priority cao nhat (do P1, vang P2, xanh P3)
  - Gradient background nhe
  - Inline key facts: sales velocity, weeks of cover, stockout count, qty de xuat
  - Recommendation badge: STOP (do) / INVESTIGATE (vang) / OPTIMIZE (xanh)
  - Cost of delay estimate
  - Nut "Chi tiet" -> mo Detail Sheet
- Sort theo priority roi net_benefit

---

## 3. Detail Sheet (Slide-out tu phai)

Tao component `RebalanceDetailSheet.tsx` su dung Sheet component san co:

**Panel tren: Allocation Detail**
- Bang chi tiet: Store nao nhan, bao nhieu units, ly do (reason text)
- Impact metrics: from_weeks_cover -> balanced_weeks_cover

**Panel giua: Evidence / Snapshot**
- Demand data: sales velocity, forecast
- Inventory state: on_hand, reserved, available
- Constraint version dang dung

**Panel duoi: Actions**
- 3 nut lon:
  - "Duyet & Thuc thi" -> confirm dialog -> approve
  - "Chinh sua qty" -> cho phep sua qty truoc khi approve (future phase)
  - "Tu choi" -> ghi ly do -> reject
- Su dung hook `useApproveRebalance` hien co

---

## 4. Simulation / What-If Tab

Tao component `RebalanceSimulationTab.tsx`:

- User chon 1 FC tu dropdown
- Hien thi 2 cot so sanh: "Giu nguyen" vs "Chuyen X units"
- Metrics: Revenue du kien, Stockout risk, Overstock risk, Weeks of cover
- Highlight xanh/do cho tung metric thay doi
- Logic tinh toan chay local (client-side) dua tren data hien co tu `inv_state_positions` va `inv_state_demand`
- Can them hook `useInventoryPositions` va `useInventoryDemand` de fetch data cho simulation

---

## 5. Audit Log Tab

Tao component `RebalanceAuditLog.tsx`:

- Fetch tu bang `inv_allocation_audit_log` (da co trong DB)
- Hien thi timeline doc:
  - Ai approve, luc nao
  - Action type (approved/rejected/executed)
  - FC + qty + from/to
  - Snapshot reference
- Can them hook `useAllocationAuditLog`

---

## 6. Cap nhat Page Layout

Refactor `InventoryAllocationPage.tsx`:

- Them Hero Header phia tren cung
- Chuyen Summary Cards xuong duoi Hero
- Them Decision Cards view (co toggle giua Card view va Table view)
- Them 2 tab moi: "Mo phong" (Simulation) va "Lich su" (Audit Log)

Tab structure moi:

```text
[Tat ca] [Tu kho tong] [Giua cac kho] [Mo phong] [Lich su] [Cau hinh]
```

---

## Thu tu build

1. `InventoryHeroHeader.tsx` - Hero banner voi urgency logic
2. `InventoryFCDecisionCards.tsx` - Cards per FC voi priority styling
3. `RebalanceDetailSheet.tsx` - Slide-out detail panel
4. `useInventoryPositions.ts` + `useInventoryDemand.ts` - Hooks cho simulation data
5. `RebalanceSimulationTab.tsx` - What-if comparison
6. `useAllocationAuditLog.ts` - Hook fetch audit data
7. `RebalanceAuditLog.tsx` - Timeline component
8. Refactor `InventoryAllocationPage.tsx` - Tich hop tat ca components moi

---

## Ky thuat

- Tat ca components moi su dung design patterns hien co (Card, Sheet, Badge, Tooltip)
- Tham khao `DecisionCardExpanded` va `DecisionWorkflowCard` cho styling consistency
- Khong can them bang DB moi -- su dung 12 bang da co
- Khong can update edge function -- data da du
- 2 hooks moi (`useInventoryPositions`, `useInventoryDemand`) dung `useTenantQueryBuilder` pattern hien co

