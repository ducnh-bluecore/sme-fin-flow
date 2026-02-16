
# BLUECORE COMMAND - Technical Source of Truth
# Version: 2.0 | Updated: 2026-02-16

---

## 1. TRIET LY: DECISION STACK PHILOSOPHY

Bluecore Command la he thong "Retail Navigation System" voi 3 tang nao:

### 1.1 Size Control Tower (Operational Brain)
- **Doi tuong**: Operators, Merchandisers
- **Cau hoi**: "SKU nao dang le size? Chuyen hang di dau?"
- **Metric chinh**: Size Health Score, Lost Revenue, Cash Lock
- **Hanh dong**: Smart Transfer, Rebalance, Push Allocation

### 1.2 Retail Flight Deck (Executive Brain)
- **Doi tuong**: C-level, Category Managers
- **Cau hoi**: "Con bao lau truoc khi thiet hai tai chinh?"
- **Metric chinh**: Financial Damage Score, Markdown Risk, Days to Clear
- **Hanh dong**: Clearance Decision, Markdown Strategy, Channel Routing
- **Logic**: Operational Signal -> Financial Consequence (causal chain)

### 1.3 Growth Simulator (Strategic Brain)
- **Doi tuong**: Leadership, Planning Team
- **Cau hoi**: "Can san xuat gi de dat muc tieu tang truong?"
- **Metric chinh**: Hero Score, Growth Efficiency, Production Gap
- **Hanh dong**: Production Candidates, Expansion Map, Risk Register

---

## 2. MODULE MAP - 9 TRANG CHINH

```text
Route                      | Ten                  | Lazy Load Component
---------------------------|----------------------|---------------------
/command/overview           | Tong Quan            | CommandOverviewPage
/command/allocation         | Phan Bo Ton Kho      | InventoryAllocationPage (lazy)
/command/assortment         | Size Control Tower   | AssortmentPage
/command/clearance          | Clearance Intel      | ClearancePage
/command/network-gap        | Growth Simulator     | NetworkGapPage
/command/production         | San Xuat             | ProductionCandidatesPage
/command/decisions          | Hang Doi Quyet Dinh  | DecisionQueuePage
/command/outcomes           | Ket Qua              | DecisionOutcomesPage
/command/settings           | Cai Dat              | CommandSettingsPage
```

### 2.1 Overview (/command/overview)
- 4 KPI Cards: Ton Kho Mang Luoi, Von Bi Khoa, Chi So Lech Chuan, Cho Quyet Dinh
- Decision Feed: pending packages tu `dec_decision_packages` (status=PROPOSED)
- Data: `fn_inv_overview_stats` RPC + `kpi_inventory_distortion`

### 2.2 Allocation (/command/allocation)
- Lazy-loaded InventoryAllocationPage
- Store tier priority, demand-based allocation
- Push vs Lateral transfer logic

### 2.3 Assortment - Size Control Tower (/command/assortment)
- HealthStrip: global size health score aggregate
- DecisionFeed: broken styles sorted by priority (impact * urgency)
- PrioritizedBreakdown: SKU-level analysis with evidence packs
- TransferSuggestionsCard: rebalance suggestions with approval flow
- StoreHeatmap: geographic/store-level size health visualization
- ActionImpactPanel: simulated impact of proposed transfers

### 2.4 Clearance Intelligence (/command/clearance)
- CandidatesTab: collection-grouped accordion, velocity indicators
- WhyClearCard: risk breakdown (markdown_risk, health_score, demand_stability)
- ProductDetailPanel: sales history, stock trajectory
- ChannelAnalysisTab: channel-specific performance
- Data: `fn_clearance_stock_by_fc`, `fn_clearance_demand_by_fc`

### 2.5 Network Gap & Growth Simulator (/command/network-gap)
- GrowthInputPanel: simulation parameters entry
- GrowthHeroStrip: top Hero products by Growth Efficiency
- GrowthBeforeAfter: current vs projected comparison
- GrowthProductionTable: production candidates with quantities
- GrowthExpansionMap: category/store expansion vectors
- GrowthRiskRegister: cash cap, DOC, concentration risks

### 2.6 Production (/command/production)
- Production Candidates list from `dec_production_candidates`
- Approve/Reject flow with quantity adjustment
- Links to Growth Simulator evidence

### 2.7 Decisions (/command/decisions)
- Decision Packages queue from `dec_decision_packages`
- Package lines detail from `dec_decision_package_lines`
- Approval workflow with impact summary

### 2.8 Outcomes (/command/outcomes)
- Decision Outcomes from `dec_decision_outcomes`
- Override Learning: compare AI recommendation vs human override
- 30-day performance audit

### 2.9 Settings (/command/settings)
- Allocation Policies (`sem_allocation_policies`)
- SKU Criticality rules (`sem_sku_criticality`)
- Size Curve Profiles (`sem_size_curve_profiles`)
- Store Tiers configuration

---

## 3. CONG THUC & LOGIC

### 3.1 Hero Score (0-100)
```text
hero_score = revenue_pct + margin_pct + velocity_momentum + trend_score
```
- `revenue_pct` (0-25): percentile rank of FC revenue contribution
- `margin_pct` (0-25): normalized margin vs category average
- `velocity_momentum` (0-25): recent velocity / historical velocity
- `trend_score` (0-25): trend direction * stability coefficient

### 3.2 Financial Damage Score
```text
damage_score = markdown_risk_score * 0.4 + cash_lock_score * 0.35 + margin_leak_score * 0.25
```
- `markdown_risk_score`: probability of needing markdown (0-100)
- `cash_lock_score`: inventory value * days_on_hand / benchmark_DOC
- `margin_leak_score`: (expected_margin - achievable_margin) / expected_margin

### 3.3 Growth Efficiency
```text
growth_efficiency = (velocity * margin) / DOC
```
- Higher = san pham ban nhanh, loi nhuan cao, khong khoa von lau
- Used to rank categories for expansion priority

### 3.4 Days to Clear
```text
days_to_clear = current_stock / avg_daily_sales
```
- avg_daily_sales from `fn_clearance_demand_by_fc`
- Infinity khi avg_daily_sales = 0 → immediate clearance candidate

### 3.5 Clearance Logic
```text
IF markdown_risk_score >= 50 THEN clearance_candidate = true
RANK BY: markdown_risk_score DESC, health_score ASC, days_to_clear DESC
CONTEXT: curve_state (broken/healthy), trend (declining/stable/growing)
```

### 3.6 Growth Efficiency Score (Expansion)
5 thanh phan trong so:
```text
40% - Revenue Probability (velocity momentum)
25% - Margin Safety (margin vs benchmark)
20% - Inventory Risk (DOC penalty)
15% - Demand Stability (coefficient of variation)
+10  - Bonus: revenue contribution percentile
```

### 3.7 Size Health Score
```text
size_health = completeness_ratio * coverage_weight + balance_ratio * balance_weight
```
- completeness_ratio: sizes_in_stock / sizes_in_curve
- balance_ratio: 1 - coefficient_of_variation(size_quantities)
- "Broken" khi size_health < 0.5

---

## 4. DATABASE SCHEMA MAP

### 4.1 Inventory Core (inv_*)
```text
inv_stores              - Store master (id, name, tier, region, capacity)
inv_family_codes        - FC master (fc_code, category, subcategory, brand, season)
inv_sku_fc_mapping      - SKU -> FC mapping (sku, fc_id, size, color, is_allocatable)
inv_inventory_positions - Stock positions (store_id, fc_id, sku, qty, cost, retail_price)
inv_demand              - Sales/demand data (store_id, fc_id, date, qty_sold, revenue)
inv_collections         - Collection grouping (name, season, start_date, end_date)
inv_collection_fcs      - FC -> Collection mapping
inv_store_tiers         - Store tier definitions (tier, priority, min_depth)
inv_size_curves         - Standard size distribution curves
inv_allocation_rules    - Allocation business rules
inv_transfer_history    - Executed transfer log
inv_reorder_points      - Reorder thresholds per FC/store
inv_seasonal_profiles   - Seasonal demand patterns
```

### 4.2 Daily Computed States (state_*)
```text
state_size_health       - Daily size health scores per FC/store
state_cash_lock         - Cash locked in slow/dead inventory
state_margin_leak       - Margin erosion tracking
state_markdown_risk     - Markdown probability scores
state_lost_revenue      - Estimated lost sales from broken sizes
state_transfers         - Pending/suggested transfer records
```

### 4.3 KPI Metrics (kpi_*)
```text
kpi_size_completeness   - Size run completeness ratios
kpi_network_gap         - Supply gap analysis (demand vs stock)
kpi_inventory_distortion - Stock misallocation scores + locked_cash_estimate
kpi_curve_health        - Size curve conformity metrics
kpi_velocity_bands      - Velocity segmentation (fast/medium/slow/dead)
kpi_store_performance   - Store-level performance composites
kpi_category_trends     - Category trend indicators
```

### 4.4 Decision Engine (dec_*)
```text
dec_decision_packages      - Batched decision proposals (status: PROPOSED/APPROVED/REJECTED)
  columns: id, tenant_id, package_type, status, risk_level, scope_summary(JSON), impact_summary(JSON)
dec_decision_package_lines - Individual items within packages
  columns: id, package_id, sku, fc_id, from_store, to_store, qty, action_type
dec_approvals              - Approval records with user + timestamp
dec_decision_outcomes      - 30-day post-decision performance
dec_production_candidates  - Growth Simulator output → production recommendations
```

### 4.5 Semantic Config (sem_*)
```text
sem_allocation_policies  - Allocation rules (push priority, min_depth, tier_weights)
sem_size_curve_profiles  - Standard size curves per category
sem_sku_criticality      - SKU importance classification (hero/core/tail/exit)
```

---

## 5. DATA FLOW & RPC FUNCTIONS

### 5.1 RPC Functions (PostgreSQL)
```text
fn_inv_overview_stats(p_tenant_id)
  → { total_units, locked_cash }
  Aggregates across inv_inventory_positions, no row limit

fn_clearance_stock_by_fc(p_tenant_id)
  → rows: { fc_id, fc_code, total_stock, total_value, store_count }
  Aggregates stock grouped by FC

fn_clearance_demand_by_fc(p_tenant_id)
  → rows: { fc_id, avg_daily_sales, velocity, trend }
  Aggregates demand (sales velocity + trend) server-side
```

### 5.2 Edge Functions
```text
inventory-kpi-engine
  Input: tenant_id, date_range
  Output: Computes and writes to state_* tables
  Metrics: size_health, cash_lock, margin_leak, markdown_risk, lost_revenue

inventory-decision-packager
  Input: tenant_id, package_type
  Output: Creates dec_decision_packages + dec_decision_package_lines
  Logic: Batch related decisions into reviewable packages

inventory-outcome-evaluator
  Input: tenant_id, package_id
  Output: Writes dec_decision_outcomes
  Logic: 30-day post-decision audit comparing expected vs actual

growth-simulator
  Input: SimulationParams (growthPct, horizonMonths, DOC, safetyStock, cashCap)
  Output: SimSummary (production units, cash required, hero gap, risks)
  Logic: Projects demand → identifies production candidates
```

---

## 6. COMPONENT ARCHITECTURE

```text
BluecoreCommandLayout (sidebar + header + mobile nav)
  |
  |-- CommandOverviewPage
  |     |-- KPI Cards (4x: units, locked cash, distortion, pending)
  |     |-- Decision Feed (pending packages list)
  |
  |-- AssortmentPage (Size Control Tower)
  |     |-- HealthStrip (global health score bar)
  |     |-- DecisionFeed (broken styles by priority)
  |     |-- PrioritizedBreakdown (SKU drill-down)
  |     |-- TransferSuggestionsCard (rebalance proposals)
  |     |-- StoreHeatmap (geographic health view)
  |     |-- ActionImpactPanel (transfer simulation)
  |
  |-- ClearancePage (Clearance Intelligence)
  |     |-- CandidatesTab (collection accordion + velocity)
  |     |-- WhyClearCard (risk factor breakdown)
  |     |-- ProductDetailPanel (history + trajectory)
  |     |-- ChannelAnalysisTab (per-channel metrics)
  |
  |-- NetworkGapPage (Growth Simulator)
  |     |-- GrowthInputPanel (params form)
  |     |-- GrowthHeroStrip (top hero products)
  |     |-- GrowthBeforeAfter (current vs projected)
  |     |-- GrowthProductionTable (production plan)
  |     |-- GrowthExpansionMap (category vectors)
  |     |-- GrowthRiskRegister (risk matrix)
  |
  |-- ProductionCandidatesPage
  |-- DecisionQueuePage
  |-- DecisionOutcomesPage
  |-- CommandSettingsPage
```

---

## 7. HOOK ARCHITECTURE

### 7.1 Size Intelligence
```text
useSizeControlTower(tenantId)
  → { summary, heatmapData, healthGroups, isLoading }
  Aggregate hook combining health + heatmap + grouping

useSizeIntelligence(fcId, tenantId)
  → { evidencePack, transfers, recommendations }
  Deep-dive hook for single FC analysis
```

### 7.2 Clearance Intelligence
```text
useClearanceIntelligence(tenantId, filters)
  → { candidates, history, channelAnalysis, isLoading }
  Main hook for clearance module
  Uses fn_clearance_stock_by_fc + fn_clearance_demand_by_fc
```

### 7.3 Allocation & Transfer
```text
useAllocationRecommendations(tenantId)  → allocation suggestions
useRunRebalance(tenantId)               → trigger rebalance engine
useApproveTransfer(transferId)          → approve single transfer
useBulkApproveTransfers(ids)            → batch approve
```

### 7.4 Decision Engine
```text
useDecisionPackages(tenantId, status)   → list packages
useApprovePackage(packageId)            → approve package
useRejectPackage(packageId)             → reject with reason
useDecisionOutcomes(tenantId)           → historical outcomes
```

### 7.5 Growth Simulator
```text
useGrowthSimulation(params)             → SimSummary result
useProductionCandidates(tenantId)       → production list
useApproveProduction(candidateId)       → approve for production
```

---

## 8. SIMULATION ENGINE (Growth Simulator v2)

### 8.1 Input: SimulationParams
```text
{
  growthPct: number          // Target growth % (e.g., 30 = +30%)
  horizonMonths: number      // Planning horizon (3/6/12 months)
  DOC: number                // Target Days of Coverage
  safetyStock: number        // Safety stock multiplier (e.g., 1.2)
  cashCap: number            // Maximum cash available for production
  categoryWeights: {}        // Optional: weight per category
  excludeFCs: string[]       // FCs to exclude from simulation
}
```

### 8.2 Output: SimSummary
```text
{
  totalProductionUnits: number
  totalCashRequired: number
  heroGap: number              // Shortage in hero product supply
  beforeAfter: {
    revenue: { before, after, delta }
    margin: { before, after, delta }
    DOC: { before, after, delta }
  }
  productionCandidates: [{
    fcId, fcCode, category, currentStock, projectedDemand,
    productionQty, cashNeeded, heroScore, growthEfficiency
  }]
  risks: [{
    type: 'CASH_CAP' | 'DOC_EXCEED' | 'CONCENTRATION' | 'TREND_DECLINE',
    severity: 'HIGH' | 'MEDIUM' | 'LOW',
    description: string,
    impactAmount: number
  }]
}
```

### 8.3 Growth Shape Config
```text
CategoryShape    - Growth distribution across categories
SizeShift        - Size mix changes (e.g., trending toward larger sizes)
PriceBandShape   - Price band distribution for new production
```

---

## 9. INTEGRATION VỚI CONTROL TOWER

### 9.1 Federated Command Center
Bluecore Command feed data vao Control Tower thong qua:
- `useFederatedDecisions` - Unified decision feed across all domains
- `useFDPCommandCenter` - Financial decisions (FDP domain)
- `useMDPCommandCenter` - Marketing decisions (MDP domain)
- `useCDPCommandCenter` - Customer decisions (CDP domain)
- `useControlTowerCommandCenter` - Aggregate control tower view

### 9.2 Alert Integration
- Inventory alerts → `alert_instances` table
- Clearance urgency → escalation rules
- Growth risks → decision cards

### 9.3 Decision Contract
Moi decision tu Command phai tuan theo `DecisionContract`:
```text
{
  domain: 'FDP' | 'MDP' | 'CDP'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  facts: DecisionFact[]        // Evidence with metric contracts
  actions: DecisionAction[]    // Proposed actions
  owner: DecisionOwnerRole     // Who must act
  deadline: Date               // Time to act
  dedupeKey: string            // Prevent duplicate decisions
}
```

---

## 10. GHI CHU QUAN TRONG

- Tai lieu viet bang tieng Viet (khong dau) de tuong thich moi editor
- Day la tai lieu noi bo cho dev & AI, khong phai user-facing
- Moi thay doi module phai cap nhat file nay
- Family Code (FC) la don vi quyet dinh chinh, khong phai SKU
- Tat ca RPC functions bypass row limit 1000 cua Supabase
- Edge Functions tu dong deploy qua Lovable Cloud
- State tables (state_*) duoc tinh lai hang ngay boi inventory-kpi-engine
