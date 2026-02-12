

# Bluecore Command — Inventory Intelligence & Allocation System

## Tong quan

Bluecore Command la module thu 5 cua platform (ngang hang FDP, MDP, CDP, Control Tower). Day la "Retail Inventory Operating Layer" — dam bao capital nam dung SKU, dung store, dung thoi diem.

Module nay KHONG phai feature logistics, ma la **Decision Intelligence Layer** cho inventory, xay tren data da co (BigQuery + inv_* tables hien tai).

## Nhung gi da co san

He thong hien tai da co san mot so thanh phan quan trong:

- **Inventory Allocation Engine** (Edge Function): V1 Baseline + V2 Demand + Rebalance, 1022 dong code
- **15 inv_* tables**: inv_stores, inv_state_positions, inv_state_demand, inv_family_codes, inv_allocation_recommendations, inv_rebalance_suggestions, inv_constraint_registry, inv_collections, inv_sku_fc_mapping, inv_state_size_integrity, inv_allocation_audit_log, inv_allocation_runs, inv_rebalance_runs, inv_tier_history...
- **13 UI components** trong `src/components/inventory/`
- **14 hooks** trong `src/hooks/inventory/`
- **Auto-tier system** (Edge Function) + Store Directory + Simulation + Audit Log

=> Phase 1 cua Master Plan (Allocation + Rebalance + Distortion + Planner Workflow) DA DUOC BUILD PHAN LON.

## Pham vi build moi — PHASE 2 & 3

### A. Cau truc Module (giong Control Tower)

| Thanh phan | Mo ta |
|------------|-------|
| Layout | `BluecoreCommandLayout.tsx` — sidebar rieng, giong `ControlTowerLayout.tsx` |
| Portal Card | Module thu 5 tren `/portal` voi metrics: Distortion Index, Revenue Protected |
| Route prefix | `/command/*` |
| Sidebar nav | 8 trang chinh |

### B. 8 Trang chinh

```text
/command
  ├── /overview          ← Command Center (trang mac dinh)
  ├── /allocation        ← Di chuyen tu /inventory-allocation hien tai
  ├── /assortment        ← Size Curve & Assortment Health (Phase 2)
  ├── /network-gap       ← Network Gap Analysis (Phase 3)
  ├── /production        ← Production Candidates (Phase 3)
  ├── /decisions         ← Decision Queue (Package View)
  ├── /outcomes          ← Decision Replay & Trust Score
  └── /settings          ← Policies, Tiers, Constraints
```

### C. Chi tiet tung trang

#### C1. Command Overview (`/command/overview`)
- **Hero**: Inventory Distortion Index (IDI) toan network
- **4 KPI Cards**: Units in Network, Locked Cash, Revenue at Risk, Avg Days of Cover
- **Decision Feed**: Top 5 packages can duyet (link sang `/command/decisions`)
- **Network Health Map**: Heatmap store theo DOC/stockout risk
- Data: Aggregation tu `inv_state_positions` + `kpi_facts_daily`

#### C2. Allocation (chuyen tu InventoryAllocationPage hien tai)
- Giu nguyen toan bo logic V1/V2/Rebalance da build
- Chi thay doi route tu `/inventory-allocation` → `/command/allocation`
- Giu backward-compat redirect

#### C3. Assortment Intelligence (`/command/assortment`) — MOI
- **Size Completeness Score (SCS)** theo style-store
- **Curve Health Index (CHI)** toan network
- **Broken Size Detection**: Danh sach styles bi le size, nhom theo store
- **Repair Recommendations**: De xuat chuyen size tu store A sang B
- **Markdown Risk Prediction**: SCS thap → canh bao markdown 4-8 tuan
- Data moi can: `kpi_size_completeness`, `kpi_curve_health`
- Logic: query `inv_state_positions` JOIN `inv_sku_fc_mapping` → tinh SCS/CHI

#### C4. Network Gap (`/command/network-gap`) — MOI
- Sau khi chay Allocation + Rebalance, con thieu bao nhieu?
- **True Shortage** = Network demand - Reallocatable units
- **Revenue at Risk** theo style/FC
- **Gap Drilldown**: Theo region, tier, category
- Cau noi sang Production (Phase 3)

#### C5. Production Candidates (`/command/production`) — MOI (Phase 3)
- Danh sach styles can san xuat them
- Size breakdown tu demand curve
- Cash required, Margin projection, Payback days
- Urgency score
- Status workflow: PROPOSED → APPROVED → REJECTED

#### C6. Decision Queue (`/command/decisions`) — MOI
- **Progressive Disclosure**: Package → Cluster → SKU → Movement
- **Level 1 Package View**: "REBALANCE SOUTH REGION: 12,480 units, 842 SKUs, Revenue protected: 2.1B"
- **Level 2 Cluster View**: Nhom theo Fast movers / Broken size / Dead stock
- **Level 3 SKU View**: Bang chi tiet SKU-From-To-Qty (editable)
- **Batch approve/reject** voi ownership tracking
- Data: `dec_decision_packages` + `dec_decision_package_lines`

#### C7. Decision Outcomes (`/command/outcomes`) — MOI
- **Decision Replay**: Predicted vs Actual sau 14/30/60 ngay
- **Trust Score**: Accuracy trend theo thoi gian
- **Override Learning**: Pattern nao planner thuong sua?
- Data: `dec_decision_outcomes`

#### C8. Settings (`/command/settings`)
- Chuyen tu RebalanceConfigPanel hien tai
- Them: Allocation Policies (sem_allocation_policies)
- Them: SKU Criticality config
- Them: Size Curve Profiles

### D. Database Changes (migration)

#### D1. KPI Tables moi (L3 layer)

```sql
-- Size completeness score
CREATE TABLE kpi_size_completeness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  as_of_date DATE NOT NULL,
  store_id UUID NOT NULL,
  style_id TEXT NOT NULL,
  sizes_present INT,
  sizes_total INT,
  size_completeness_score NUMERIC(5,4),
  missing_sizes JSONB,
  status TEXT DEFAULT 'HEALTHY',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Curve health index
CREATE TABLE kpi_curve_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  as_of_date DATE NOT NULL,
  style_id TEXT NOT NULL,
  curve_health_index NUMERIC(5,4),
  markdown_risk_band TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory distortion
CREATE TABLE kpi_inventory_distortion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  as_of_date DATE NOT NULL,
  fc_id TEXT NOT NULL,
  distortion_score NUMERIC(8,4),
  overstock_locations JSONB,
  understock_locations JSONB,
  locked_cash_estimate NUMERIC(18,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Network gap
CREATE TABLE kpi_network_gap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  as_of_date DATE NOT NULL,
  style_id TEXT NOT NULL,
  reallocatable_units INT,
  true_shortage_units INT,
  net_gap_units INT,
  revenue_at_risk NUMERIC(18,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### D2. Decision Layer tables (L4)

```sql
-- Decision packages (batch object)
CREATE TABLE dec_decision_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  as_of_date DATE,
  package_type TEXT NOT NULL,
  scope_summary JSONB,
  impact_summary JSONB,
  risk_level TEXT DEFAULT 'LOW',
  confidence NUMERIC(5,4),
  status TEXT DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Package lines (SKU detail)
CREATE TABLE dec_decision_package_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  package_id UUID REFERENCES dec_decision_packages(id),
  sku_id TEXT,
  fc_id TEXT,
  from_location_id UUID,
  to_location_id UUID,
  qty_suggested INT,
  qty_approved INT,
  reason_code TEXT,
  line_impact JSONB,
  exceptions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Decision approvals
CREATE TABLE dec_decision_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  package_id UUID REFERENCES dec_decision_packages(id),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  decision TEXT,
  override_summary JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Decision outcomes (30-day replay)
CREATE TABLE dec_decision_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  package_id UUID REFERENCES dec_decision_packages(id),
  evaluation_date DATE,
  predicted_impact JSONB,
  actual_impact JSONB,
  accuracy_score NUMERIC(5,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Production candidates
CREATE TABLE dec_production_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  as_of_date DATE,
  style_id TEXT NOT NULL,
  recommended_qty INT,
  size_breakdown JSONB,
  cash_required NUMERIC(18,2),
  margin_projection NUMERIC(18,2),
  payback_days INT,
  urgency_score NUMERIC(5,2),
  status TEXT DEFAULT 'PROPOSED',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

RLS policies: tat ca bang moi deu co `tenant_id` filter, giong pattern inv_* hien tai.

### E. Edge Functions moi / cap nhat

| Function | Muc dich |
|----------|----------|
| `inventory-kpi-engine` | Tinh SCS, CHI, IDI, Network Gap — batch job |
| `inventory-decision-packager` | Gom allocation recs thanh decision packages |
| `inventory-outcome-evaluator` | Chay sau 30 ngay, so sanh predicted vs actual |
| Cap nhat `inventory-allocation-engine` | Them output `network_gap` sau khi chay allocate |

### F. Files moi can tao

```text
src/components/layout/BluecoreCommandLayout.tsx   ← Layout rieng (giong ControlTowerLayout)
src/pages/command/
  ├── CommandOverviewPage.tsx
  ├── CommandAllocationPage.tsx    (wrap InventoryAllocationPage)
  ├── AssortmentPage.tsx
  ├── NetworkGapPage.tsx
  ├── ProductionCandidatesPage.tsx
  ├── DecisionQueuePage.tsx
  ├── DecisionOutcomesPage.tsx
  ├── CommandSettingsPage.tsx
  └── index.ts

src/hooks/command/
  ├── useDistortionIndex.ts
  ├── useSizeCompleteness.ts
  ├── useCurveHealth.ts
  ├── useNetworkGap.ts
  ├── useDecisionPackages.ts
  ├── useDecisionOutcomes.ts
  └── useProductionCandidates.ts

src/components/command/
  ├── CommandHeroHeader.tsx
  ├── DistortionHeatmap.tsx
  ├── DecisionPackageCard.tsx
  ├── PackageDetailSheet.tsx
  ├── ClusterView.tsx
  ├── SizeCompletenessTable.tsx
  ├── CurveHealthCard.tsx
  ├── NetworkGapSummary.tsx
  ├── ProductionCandidateCard.tsx
  ├── OutcomeReplayCard.tsx
  └── TrustScoreChart.tsx

supabase/functions/
  ├── inventory-kpi-engine/index.ts
  ├── inventory-decision-packager/index.ts
  └── inventory-outcome-evaluator/index.ts
```

### G. Cap nhat Portal

Them module thu 5 vao `PortalPage.tsx`:

```text
{
  id: 'command',
  code: 'command',
  name: 'Bluecore Command',
  shortName: 'CMD',
  tagline: 'Capital at the Right Place',
  icon: Crosshair,
  path: '/command',
  metrics: [
    { label: 'Distortion', value: IDI score },
    { label: 'Revenue Protected', value: formatVND(...) },
  ]
}
```

### H. Cap nhat Routing (App.tsx)

Them route group `/command/*` su dung `BluecoreCommandLayout` giong pattern `/control-tower/*`.

## Thu tu thuc hien (3 giai doan)

### Giai doan 1: Foundation (lam truoc)
1. Database migrations (tao 9 bang moi)
2. `BluecoreCommandLayout.tsx` + routing
3. Portal card cho Command module
4. Command Overview page (IDI + KPI cards)
5. Chuyen Allocation page vao `/command/allocation`
6. Decision Queue page (Package View) — dung data `dec_decision_packages`
7. Edge function `inventory-decision-packager` (gom recs thanh packages)

### Giai doan 2: Assortment Intelligence (moat)
8. Edge function `inventory-kpi-engine` (SCS, CHI, IDI calculation)
9. Assortment page (Size Completeness + Curve Health)
10. Network Gap page
11. Decision Outcomes page + Trust Score

### Giai doan 3: Production & Advanced
12. Production Candidates page
13. Edge function `inventory-outcome-evaluator`
14. Override Learning analytics
15. Settings page mo rong (policies, criticality, size curves)

## Luu y ky thuat

- Tat ca bang moi co `tenant_id` + RLS, theo dung pattern `useTenantQueryBuilder`
- Khong pha cac layer hien tai (L1-L10), chi ADD-ON tren L3/L4
- `inventory-allocation-engine` giu nguyen, chi mo rong output
- Decision Packages la abstraction layer TREN `inv_allocation_recommendations` va `inv_rebalance_suggestions` — khong thay the chung
- Progressive Disclosure UX: Package (5 giay hieu) → Cluster → SKU → Movement

