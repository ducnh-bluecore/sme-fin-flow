# Bluecore Command — Technical Source of Truth

**Version**: 2.1  
**Updated**: 2026-02-16  
**Purpose**: Single technical reference for all Bluecore Command module architecture, formulas, contracts, and invariants. This document governs implementation by developers and AI agents.

---

## 1. Decision Stack Philosophy (3 Brains)

Bluecore Command is a **Retail Inventory Operating System** organized into a Decision Stack forming a "Retail Navigation System":

| Brain | Layer | Who | Core Question |
|-------|-------|-----|---------------|
| **Size Control Tower** | Operational | Merchandiser / Operator | "Mã nào đang lẻ size và cần rebalance ngay?" |
| **Retail Flight Deck** | Executive | COO / CFO | "Thời gian đến thiệt hại tài chính là bao lâu?" |
| **Growth Simulator** | Strategic | CEO / Leadership | "Mở thêm ở đâu để đạt target revenue?" |

**Causal Chain**: Operational Signal → Financial Consequence → Strategic Action.

---

## 2. Module Map (9 Routes)

| # | Route | Purpose | Brain |
|---|-------|---------|-------|
| 1 | `/command/overview` | Dashboard KPI cards + Decision Feed | All |
| 2 | `/command/allocation` | Inventory allocation (Push/Lateral) | Operational |
| 3 | `/command/assortment` | Size Control Tower | Operational |
| 4 | `/command/clearance` | Clearance Intelligence | Executive |
| 5 | `/command/network-gap` | Supply Gap Analysis + Growth Simulator | Strategic |
| 6 | `/command/production` | Production Candidate management | Strategic |
| 7 | `/command/decisions` | Decision Package queue | All |
| 8 | `/command/outcomes` | Decision Replay & Accuracy auditing | All |
| 9 | `/command/settings` | Semantic configs (Policies, Curves, Tiers) | All |

---

## 3. Formulas & Logic

### 3.1 Hero Score (0–100)

```
hero_score = revenue_pct_rank(25) + velocity_momentum(25) + margin_health(25) + trend_score(25)
```

- `revenue_pct_rank`: percentile rank of FC revenue within tenant, last 90 days → normalized 0–25
- `velocity_momentum`: avg_daily_sales(7d) / avg_daily_sales(28d) → normalized 0–25
- `margin_health`: contribution_margin_pct percentile → normalized 0–25
- `trend_score`: slope of linear regression on 28-day daily sales → normalized 0–25

### 3.2 Financial Damage Score (0–100)

```
damage_score = cash_lock_severity(30) + margin_erosion(25) + velocity_decay(25) + time_pressure(20)
```

- `cash_lock_severity`: (locked_cash / total_inventory_value) percentile → 0–30
- `margin_erosion`: (original_margin - current_margin) / original_margin → 0–25
- `velocity_decay`: 1 - (velocity_7d / velocity_90d) → 0–25
- `time_pressure`: days_in_stock / expected_selling_season_days → 0–20

### 3.3 Growth Efficiency Score

```
growth_efficiency = incremental_revenue / (capex + 6_month_opex)
```

### 3.4 Days to Clear

```
days_to_clear = current_stock / avg_daily_sales(28d)
```

When `avg_daily_sales = 0`: set `days_to_clear = 9999`, add flag `no_demand = true`.

---

## 4. Database Schema Map

### 4.1 Inventory Tables (`inv_`)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `inv_family_codes` | FC master | `id, tenant_id, fc_code, style, category` |
| `inv_store_positions` | Stock per store | `tenant_id, fc_id, store_id, size, qty_on_hand` |
| `inv_state_demand` | Aggregated demand | `tenant_id, fc_id, store_id, total_sold, avg_daily_sales` |
| `inv_collections` | Collection master | `id, tenant_id, collection_name, season` |
| `inv_collection_fcs` | FC ↔ Collection mapping | `collection_id, fc_id` |

### 4.2 State Tables (`state_`)

| Table | Grain | Refresh |
|-------|-------|---------|
| `state_size_health_daily` | `(as_of_date, store_id, product_id)` | Daily by inventory-kpi-engine |
| `state_markdown_risk_daily` | `(as_of_date, product_id)` | Daily by inventory-kpi-engine |
| `state_cash_lock_daily` | `(as_of_date, product_id)` | Daily by inventory-kpi-engine |
| `state_margin_leak_daily` | `(as_of_date, store_id, product_id)` | Daily by inventory-kpi-engine |
| `state_lost_revenue_daily` | `(as_of_date, store_id, product_id)` | Daily by inventory-kpi-engine |

### 4.3 KPI Tables (`kpi_`)

| Table | Purpose |
|-------|---------|
| `kpi_inventory_daily` | Daily aggregated KPIs per tenant |
| `kpi_store_daily` | Daily KPIs per store |

### 4.4 Decision Tables (`dec_`)

| Table | Purpose |
|-------|---------|
| `dec_decision_packages` | Decision package header |
| `dec_decision_package_lines` | Line items per package (fc_id NOT NULL) |
| `dec_decision_outcomes` | Outcome tracking post-decision |

### 4.5 Semantic Tables (`sem_`)

| Table | Purpose |
|-------|---------|
| `sem_size_curves` | Size distribution curves by category |
| `sem_store_tiers` | Store tier classification |
| `sem_allocation_policies` | Allocation rules and policies |
| `sem_category_configs` | Category-level configurations |

### 4.6 Markdown & Clearance History (Planned)

> **Status**: Schema designed, NOT yet implemented. No migration created.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `inv_markdown_events` | Historical markdown events | `tenant_id, fc_id, channel, store_id(nullable), event_date, markdown_pct, price_before, price_after, units_sold_7d, revenue_7d, margin_7d` |
| `sem_markdown_ladders` | Markdown step rules by category/collection | `tenant_id, category(nullable), collection_id(nullable), ladder_steps: jsonb, min_days_per_step: int, max_markdown_pct: int` |
| `sem_markdown_caps` | Premium/signature markdown caps | `tenant_id, tag_pattern: text, max_discount_pct: int, override_requires: text` |

---

## 5. Data Flow & RPC Functions

### 5.1 Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `inventory-kpi-engine` | Recompute all state_* tables | Daily cron / manual |
| `growth-simulator` | Run growth simulation | On-demand |

### 5.2 RPC Functions

| Function | Params | Returns |
|----------|--------|---------|
| `fn_clearance_stock_by_fc` | `p_tenant_id, p_fc_ids` | Stock positions grouped by FC |
| `fn_clearance_demand_by_fc` | `p_tenant_id, p_fc_ids` | Demand aggregation by FC across stores |
| `fn_allocation_candidates` | `p_tenant_id, p_store_id` | FCs eligible for allocation |
| `fn_size_health_summary` | `p_tenant_id` | Size health aggregation |

---

## 6. Component Architecture

```
CommandLayout
├── CommandOverviewPage
│   ├── KPICardGrid
│   ├── DecisionFeedWidget
│   └── AlertSummaryWidget
├── AllocationPage
│   ├── AllocationFilters
│   ├── PushAllocationTab
│   └── LateralTransferTab
├── AssortmentPage (Size Control Tower)
│   ├── SizeHealthMatrix
│   ├── StoreComparisonPanel
│   └── RebalanceActionPanel
├── ClearancePage
│   ├── CandidatesTab
│   │   └── Badge: "Best channel @30%/@50%" (planned)
│   ├── ProductDetailPanel
│   │   └── Markdown Ladder History timeline (planned)
│   ├── WhyClearCard
│   │   └── Next Step Recommendation with premium cap check (planned)
│   └── ChannelAnalysisTab
├── NetworkGapPage
│   ├── GapAnalysisTab
│   └── GrowthSimulatorTab
├── ProductionPage
│   └── ProductionCandidateList
├── DecisionsPage
│   └── DecisionPackageQueue
├── OutcomesPage
│   └── DecisionReplayTable
└── SettingsPage
    ├── SizeCurveEditor
    ├── StoreTierEditor
    └── PolicyEditor
```

---

## 7. Hook Architecture

| Hook | Domain | Purpose |
|------|--------|---------|
| `useInventoryKPIs` | COMMAND | Fetch daily KPIs |
| `useSizeHealth` | COMMAND | Size health state |
| `useMarkdownRisk` | COMMAND | Markdown risk state |
| `useClearanceCandidates` | COMMAND | Clearance candidate list |
| `useAllocationEngine` | COMMAND | Allocation logic |
| `useGrowthSimulator` | COMMAND | Growth simulation |
| `useDecisionPackages` | COMMAND | Decision package CRUD |
| `useFDPCommandCenter` | FDP | FDP decisions |
| `useMDPCommandCenter` | MDP | MDP decisions |
| `useCDPCommandCenter` | CDP | CDP decisions |
| `useControlTowerCommandCenter` | CONTROL_TOWER | Federated feed |
| `useFederatedDecisions` | ALL | Cross-domain decision aggregation |

---

## 8. Simulation Engine (Growth Simulator v2)

### Input Parameters
- `target_monthly_revenue`: Target revenue to achieve
- `store_scope`: Which stores to include
- `category_scope`: Which categories to simulate
- `growth_horizon_months`: Planning horizon (3/6/12)

### Output
- `required_skus`: Number of new SKUs needed
- `required_inventory_value`: Capital investment needed
- `growth_efficiency_score`: Revenue per unit of investment
- `recommended_stores`: Store expansion priority list
- `production_candidates`: FCs to produce more of

### Logic
1. Calculate current revenue run-rate per store per category
2. Identify top-performing FCs (Hero Score > 70)
3. Model incremental revenue from expanding hero FCs to gap stores
4. Calculate required production volume
5. Score efficiency: `incremental_revenue / total_investment`

---

## 9. Decision Contract Spec

### 9.1 Three Contracts

Every Command Center decision MUST include:

1. **Metric Contract**: Source of Truth reference (metric_code, source_view, grain, version)
2. **Evidence Contract**: Auditability (as_of_timestamp, source_tables, data_quality_flags, confidence_score)
3. **Decision Contract**: Structure (id, domain, severity, status, facts, actions, evidence)

### 9.2 Deduplication

```
dedupeKey = {tenant_id}:{metric_code}:{grain}:{period}:{entity_id}
```

Keep most recent by `updated_at`.

### 9.3 Domains & Ownership

```typescript
type CommandCenterDomain = 'FDP' | 'MDP' | 'CDP' | 'COMMAND' | 'CONTROL_TOWER';
type DecisionOwnerRole = 'CEO' | 'CFO' | 'CMO' | 'COO' | 'OPS' | 'MERCHANDISER';
```

**Owner Role Map for COMMAND domain:**

| Role | Responsibility |
|------|---------------|
| `MERCHANDISER` | Size rebalance, allocation decisions |
| `OPS` | Transfer execution, store operations |
| `COO` | Clearance approval, network decisions |
| `CFO` | Premium override, large markdown approval |

**COMMAND dedupeKey rule:**
```
{tenant_id}:{package_type}:{fc_id}:{date_bucket}
```

Where `date_bucket` = `YYYY-WW` (ISO week) for operational decisions, `YYYY-MM` for strategic decisions.

### 9.4 Escalation

Auto-escalate to Control Tower when:
- Severity = `critical` AND status = `OPEN` for > 4 hours
- Impact amount > 100M VND
- Overdue > `overdue_hours_for_escalation` config

---

## 10. Alert & Control Tower Integration

### Alert Flow
1. `inventory-kpi-engine` computes daily state
2. State changes trigger alert evaluation
3. Alerts matching rules → `alert_instances`
4. Critical alerts → Control Tower feed
5. Control Tower can escalate to decision packages

### Control Tower Principles
- Max 5–7 active alerts at any time
- Every alert MUST have: owner, impact amount, deadline
- Alert without owner = invalid
- Resolved alerts tracked with outcome

---

## 11. Route Contracts

### 11.1 `/command/overview`
```
Input Filters: date_range, store_scope
RPC/Queries: none (reads state tables directly)
Tables Read: kpi_inventory_daily, state_size_health_daily, state_markdown_risk_daily, state_cash_lock_daily, dec_decision_packages
Tables Write: none
Refresh: daily (state_* recomputed by inventory-kpi-engine)
Row Constraints: tenant_id (mandatory)
Fallback: Show "Chưa có dữ liệu" when no KPI rows for selected date
```

### 11.2 `/command/allocation`
```
Input Filters: date_range, store_scope, category, fc_search
RPC/Queries: fn_allocation_candidates(p_tenant_id, p_store_id)
Tables Read: inv_store_positions, inv_family_codes, inv_state_demand, state_size_health_daily, sem_allocation_policies
Tables Write: dec_decision_packages, dec_decision_package_lines
Refresh: realtime for position changes, daily for demand
Row Constraints: tenant_id (mandatory)
Fallback: When demand missing for FC, show "Không đủ dữ liệu demand" and exclude from auto-allocation
```

### 11.3 `/command/assortment`
```
Input Filters: date_range, store_scope, category, size_group
RPC/Queries: fn_size_health_summary(p_tenant_id)
Tables Read: state_size_health_daily, inv_store_positions, inv_family_codes, sem_size_curves
Tables Write: dec_decision_packages, dec_decision_package_lines
Refresh: daily
Row Constraints: tenant_id (mandatory)
Fallback: When size curve missing for category, use default curve and flag data_quality='estimated'
```

### 11.4 `/command/clearance`
```
Input Filters: date_range, store_scope, category, collection, season, excludeFCs
RPC/Queries:
  - fn_clearance_stock_by_fc(p_tenant_id, p_fc_ids)
  - fn_clearance_demand_by_fc(p_tenant_id, p_fc_ids)
Tables Read: state_markdown_risk_daily, state_size_health_daily (store_id IS NULL), state_cash_lock_daily, inv_family_codes, inv_collections, inv_collection_fcs
Tables Write: none (read-only analysis)
Refresh: daily (state_* recomputed by inventory-kpi-engine)
Row Constraints: tenant_id (mandatory)
Fallback:
  - Missing demand: avg_daily_sales=0 → days_to_clear=9999, flag no_demand=true
  - Missing health: health_score=null → show "Chưa đủ dữ liệu"
```

### 11.5 `/command/network-gap`
```
Input Filters: target_revenue, store_scope, category_scope, growth_horizon_months
RPC/Queries: growth-simulator edge function
Tables Read: inv_store_positions, inv_state_demand, inv_family_codes, kpi_store_daily, sem_store_tiers
Tables Write: none (simulation only)
Refresh: on-demand (user triggers simulation)
Row Constraints: tenant_id (mandatory)
Fallback: When store has no historical data, exclude from simulation and warn user
```

### 11.6 `/command/production`
```
Input Filters: category, season, min_hero_score
RPC/Queries: none (reads state tables)
Tables Read: state_markdown_risk_daily, inv_family_codes, inv_state_demand, kpi_inventory_daily
Tables Write: dec_decision_packages, dec_decision_package_lines
Refresh: daily
Row Constraints: tenant_id (mandatory)
Fallback: FCs with < 7 days sales data → confidence='low', exclude from auto-recommend
```

### 11.7 `/command/decisions`
```
Input Filters: status, package_type, date_range, assigned_to
RPC/Queries: none
Tables Read: dec_decision_packages, dec_decision_package_lines, inv_family_codes
Tables Write: dec_decision_packages (status updates), dec_decision_package_lines
Refresh: realtime (on status change)
Row Constraints: tenant_id (mandatory)
Fallback: Empty queue → show "Không có quyết định chờ xử lý"
```

### 11.8 `/command/outcomes`
```
Input Filters: date_range, package_type, outcome_status
RPC/Queries: none
Tables Read: dec_decision_packages, dec_decision_outcomes, dec_decision_package_lines
Tables Write: dec_decision_outcomes (accuracy scoring)
Refresh: daily (outcome measured after execution)
Row Constraints: tenant_id (mandatory)
Fallback: Decisions without outcomes after 14 days → flag "Chưa đo lường kết quả"
```

### 11.9 `/command/settings`
```
Input Filters: none
RPC/Queries: none
Tables Read: sem_size_curves, sem_store_tiers, sem_allocation_policies, sem_category_configs
Tables Write: sem_size_curves, sem_store_tiers, sem_allocation_policies, sem_category_configs
Refresh: on-save (immediate)
Row Constraints: tenant_id (mandatory)
Fallback: Missing configs → use system defaults, show warning badge
```

---

## 12. Grain Invariants

### Invariant A — Decision Grain
```
dec_decision_package_lines.fc_id = NOT NULL (bắt buộc)
dec_decision_package_lines.sku = nullable (chỉ là detail)
```
Every decision line MUST map to FC level. SKU is optional execution detail.

### Invariant B — State Grain
```
state_size_health_daily:    grain = (as_of_date, store_id, product_id)
state_markdown_risk_daily:  grain = (as_of_date, product_id) — KHÔNG có store
state_cash_lock_daily:      grain = (as_of_date, product_id) — KHÔNG có store
state_margin_leak_daily:    grain = (as_of_date, store_id, product_id)
state_lost_revenue_daily:   grain = (as_of_date, store_id, product_id)
```
Each state table has ONE canonical grain. Do not add dimensions not listed above.

### Invariant C — Demand Grain
```
inv_state_demand: grain = (fc_id, store_id) — KHÔNG có channel
```
Channel dimension only appears in `cdp_order_items`, NOT in the demand table. If channel-level demand is needed, derive it from order items at query time.

---

## 13. Scoring Specification

### 13.1 Scope & Windows

| Score | Scope | Window |
|-------|-------|--------|
| Hero Score | Tenant-wide, same season/category | Last 90 days |
| Financial Damage Score | Tenant-wide | Last 90 days |
| Size Health Score | Per store per FC | Last 28 days |
| Markdown Risk Score | Per FC (all stores) | Last 28 days |
| velocity_momentum | Per FC | 7d vs 28d |
| trend_score | Per FC | 28-day daily sales |
| revenue_pct_rank | Per FC within tenant | Last 90 days |

### 13.2 Bounds & Clamping

- All composite scores: **clamp to [0, 100]**
- Sub-components (revenue_pct, velocity, margin, trend): **clamp to [0, 25]** before summing
- Financial Damage Score sub-components: clamp to their respective max weights (30/25/25/20)
- No negative scores allowed

### 13.3 Null & Missing Data Rules

| Condition | Handling |
|-----------|----------|
| `avg_daily_sales = 0` | `days_to_clear = 9999`, flag `no_demand = true` |
| Missing health score | Exclude from ranking, show "Chưa đủ dữ liệu" |
| Missing margin data | Use category average, set `data_quality = 'estimated'` |
| < 7 days of sales data | Set `confidence = 'low'`, `data_quality = 'partial'` |
| No store positions | Exclude FC from allocation, flag `no_inventory = true` |

### 13.4 Outlier Handling

- **Percentile ranking**: Trim top/bottom 1% of velocity values before ranking
- **Single-day spikes**: If daily_sales > 5× avg_28d → flag as `anomaly`, exclude from trend calculation
- **Zero-stock days**: Exclude from velocity calculation (don't count stockout days as zero-sale days)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-15 | Initial Source of Truth with Decision Stack, Schema Map, Contracts |
| 2.1 | 2026-02-16 | Added Route Contracts (§11), Grain Invariants (§12), Scoring Spec (§13). Added COMMAND domain + MERCHANDISER role. Added Markdown Ladder schema (planned, §4.6). Updated dedupeKey rule for COMMAND. |
