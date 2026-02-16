
# Tai lieu Bluecore Command - Viet lai toan bo

## Muc tieu
Viet lai file `.lovable/plan.md` thanh tai lieu toan dien ve Bluecore Command, bao gom kien truc, modules, cong thuc, luong du lieu va database schema. Day la Source of Truth duy nhat cho toan bo he thong.

## Cau truc tai lieu

### 1. Tong quan & Triet ly (Decision Stack Philosophy)

Mo ta 3 tang nao cua Bluecore Command:
- **Size Control Tower** (Operational Brain) - Bao ve doanh thu, phat hien "le size", dieu chuyen ton kho
- **Retail Flight Deck** (Executive Brain) - Clearance Intelligence, markdown risk, thoi gian toi thiet hai tai chinh
- **Growth Simulator** (Strategic Brain) - Mo phong tang truong, xac dinh Hero products, ke hoach san xuat

### 2. Module Map - 9 Trang chinh

```text
/command/overview         -> Trang Tong Quan (KPI cards, decision feed)
/command/allocation       -> Phan Bo Ton Kho (lazy load InventoryAllocationPage)
/command/assortment       -> Size Control Tower (HealthStrip, Heatmap, Transfers)
/command/clearance        -> Clearance Intelligence (MD risk, Why Clear, Collection groups)
/command/network-gap      -> Nguon Cung & Growth Simulator
/command/production       -> San Xuat (Production Candidates, approve/reject)
/command/decisions        -> Hang Doi Quyet Dinh (Decision Packages)
/command/outcomes         -> Ket Qua (Decision Outcomes, Override Learning)
/command/settings         -> Cai Dat (Policies, Criticality, Size Curves, Store Tiers)
```

### 3. Cong thuc & Logic quan trong

- **Hero Score**: 4 thanh phan (Revenue percentile, Margin, Velocity momentum, Trend) - moi thanh phan 0-25, tong 0-100
- **Financial Damage Score**: Markdown risk + Cash lock + Margin leak
- **Growth Efficiency**: Velocity * Margin / DOC
- **Days to Clear**: current_stock / avg_daily_sales
- **Clearance logic**: markdown_risk_score >= 50 → candidate, ket hop health_score, curve_state, trend

### 4. Database Schema Map

Liet ke cac nhom bang:
- `inv_*` (13 bang) - Inventory core: stores, family_codes, sku_fc_mapping, positions, demand, collections...
- `state_*` (6 bang) - Daily computed states: size_health, cash_lock, margin_leak, markdown_risk, lost_revenue, transfers
- `kpi_*` (7 bang) - KPI metrics: size_completeness, network_gap, inventory_distortion, curve_health...
- `dec_*` (5 bang) - Decision engine: packages, package_lines, approvals, outcomes, production_candidates
- `sem_*` (3 bang) - Semantic config: allocation_policies, size_curve_profiles, sku_criticality

### 5. Data Flow & RPC Functions

- `fn_inv_overview_stats` - Aggregate inventory stats (no row limit)
- `fn_clearance_stock_by_fc` - Aggregate stock by FC
- `fn_clearance_demand_by_fc` - Aggregate demand (avg_daily_sales, velocity, trend) by FC
- `inventory-kpi-engine` (Edge Function) - Compute health, cash lock, margin leak
- `growth-simulator` (Edge Function) - Run growth simulation

### 6. Component Architecture

```text
BluecoreCommandLayout (sidebar + header)
  |-- CommandOverviewPage (KPI cards + Decision Feed)
  |-- AssortmentPage (Size Control Tower)
  |     |-- HealthStrip (global health score)
  |     |-- DecisionFeed (broken styles priority)
  |     |-- PrioritizedBreakdown (SKU analysis)
  |     |-- TransferSuggestionsCard (rebalance)
  |     |-- StoreHeatmap + ActionImpactPanel
  |-- ClearancePage
  |     |-- CandidatesTab (collection groups, velocity)
  |     |-- WhyClearCard (risk breakdown)
  |     |-- ProductDetailPanel (history, channels)
  |     |-- ChannelAnalysisTab
  |-- NetworkGapPage + GrowthSimulator
  |     |-- GrowthInputPanel -> GrowthHeroStrip
  |     |-- GrowthBeforeAfter, GrowthProductionTable
  |     |-- GrowthExpansionMap, GrowthRiskRegister
  |-- ProductionCandidatesPage
  |-- DecisionQueuePage
  |-- DecisionOutcomesPage
  |-- CommandSettingsPage
```

### 7. Hook Architecture

Liet ke cac custom hooks va chuc nang:
- `useSizeControlTower` - Aggregate hook (summary + heatmap + health groups)
- `useSizeIntelligence` - Evidence packs + transfers
- `useClearanceIntelligence` - Clearance candidates + history + channel analysis
- `useAllocationRecommendations`, `useRunRebalance`, `useApproveTransfer`...

### 8. Simulation Engine (Growth Simulator v2)

Chi tiet cong thuc:
- Input: `SimulationParams` (growthPct, horizonMonths, DOC, safetyStock, cashCap...)
- Output: `SimSummary` (production units, cash required, hero gap, before/after, risks)
- Growth Shape: `CategoryShape`, `SizeShift`, `PriceBandShape`

## File thay doi

| File | Thay doi |
|------|---------|
| `.lovable/plan.md` | Viet lai toan bo - tu 76 dong thanh ~300+ dong tai lieu toan dien |

## Ghi chu

- Tai lieu viet bang tieng Viet (khong dau) de dam bao tuong thich voi moi editor
- Day la tai lieu noi bo cho dev & AI, khong phai user-facing
- Moi thay doi module trong tuong lai can cap nhat file nay
