

# Size Intelligence Engine - Phase 1 Implementation Plan

## Vision

Nang cap module Assortment hien tai thanh **Size Intelligence Engine** - he thong phat hien ro ri doanh thu tu size curve bi gay truoc khi phai markdown. Day la buoc chuyen tu "inventory report" sang "Revenue Protection System".

## What We Already Have

| Component | Status |
|-----------|--------|
| `kpi_size_completeness` table (SCS) | Done - 22K+ records |
| `kpi_curve_health` table (CHI) | Done - 1.5K+ records |
| `kpi_inventory_distortion` table (IDI) | Done - 1.4K+ records |
| `kpi_network_gap` table | Done |
| `sem_size_curve_profiles` table (initial ratio) | Done |
| `inv_state_size_integrity` table | Done |
| `inventory-kpi-engine` Edge Function | Done - computes SCS, CHI, IDI, Network Gap |
| Assortment Page (basic table) | Done |
| Command Center layout + routing | Done |

## What Needs to Be Built (Phase 1)

### 1. Database: New Tables for Size Intelligence STATE Layer

**`state_size_health_daily`** - Core decision table (the single source for downstream logic)

| Column | Type | Purpose |
|--------|------|---------|
| product_id (fc_id) | text | Family Code |
| store_id | uuid (nullable) | Per-store or network-wide |
| as_of_date | date | Snapshot date |
| size_health_score | numeric | 0-100 composite score |
| curve_state | text | healthy / watch / risk / broken |
| deviation_score | numeric | Weighted deviation from initial curve |
| core_size_missing | boolean | M/L missing flag |
| shallow_depth_count | integer | Number of sizes with depth less than 2 |

**`state_lost_revenue_daily`** - Revenue leak estimation

| Column | Type | Purpose |
|--------|------|---------|
| product_id | text | FC ID |
| as_of_date | date | |
| lost_units_est | integer | Estimated units lost to broken sizes |
| lost_revenue_est | numeric | lost_units * AOV |
| driver | text | core_missing / shallow / imbalance |

**`state_markdown_risk_daily`** - Markdown prediction

| Column | Type | Purpose |
|--------|------|---------|
| product_id | text | FC ID |
| as_of_date | date | |
| markdown_risk_score | numeric | 0-100 |
| markdown_eta_days | integer | Estimated days until markdown needed |
| reason | text | size_break + age + slow_velocity |

### 2. Upgrade `inventory-kpi-engine` Edge Function

Add 3 new computation stages to the existing pipeline:

```text
Existing Pipeline:
  positions + demand + skuMapping
    --> IDI (distortion)
    --> SCS (size completeness per store-style)
    --> CHI (curve health per style)
    --> Network Gap

New Additions:
    --> Size Health Score (composite from SCS + deviation + core check)
    --> Lost Revenue Estimation (from sales mix vs missing sizes)
    --> Markdown Risk Prediction (from health + age + velocity trend)
```

**Size Health Score Logic:**
- Start at 100
- Subtract deviation penalty (weighted by core sizes at 1.5x)
- Subtract core missing penalty (-30 if M or L missing)
- Subtract shallow depth penalty (-5 per size with depth less than 2)
- Map to curve_state: >=80 healthy, >=60 watch, >=40 risk, <40 broken

**Lost Revenue Logic:**
- Use `sem_size_curve_profiles` for expected sales mix ratios
- Compare expected vs actual available sizes
- lost_units = expected_demand_for_missing_sizes (from velocity * 28 days)
- lost_revenue = lost_units * avg_unit_price (from `v_inv_avg_unit_price`)

**Markdown Risk Logic:**
- If size_health < 45 AND sell-through slowing AND inventory age rising --> high risk
- Estimate markdown_eta_days based on velocity trend

### 3. Upgrade Assortment Page UI

Transform from basic table into **Size Intelligence Dashboard**:

**Hero KPIs (top row, 5 cards):**
- Network Size Health (avg score, color-coded)
- Lost Revenue (total estimated, in VND)
- Broken Styles (count)
- Markdown Risk (count of HIGH/CRITICAL)
- Avg Curve Health Index

**New Section: Revenue Risk Feed**
- Decision cards showing top styles with highest lost revenue
- Each card: Style name, lost revenue amount, missing core sizes, recommended action (transfer/reorder)
- Color-coded by severity

**Existing Table: Enhanced**
- Add Lost Revenue column
- Add Markdown ETA column
- Add Size Health Score column (replacing raw SCS)
- Sort by revenue impact by default

### 4. Decision Card Integration

Connect Size Intelligence to existing Decision Feed (`RetailDecisionFeed.tsx`):

- New decision type: "Size curve broken - Revenue at risk"
- Trigger when: size_health < 40 AND lost_revenue > threshold
- Include evidence: health score trend, missing sizes, estimated impact
- Actions: transfer / reorder / bundle promo

---

## Technical Details

### Database Migration

3 new tables with RLS policies matching existing pattern (tenant_id filter). No foreign keys to auth.users.

### Edge Function Changes

Modify `inventory-kpi-engine/index.ts`:
- Add `computeSizeHealth()` function
- Add `computeLostRevenue()` function  
- Add `computeMarkdownRisk()` function
- Fetch `sem_size_curve_profiles` for initial ratio baseline
- Fetch `v_inv_avg_unit_price` for revenue estimation
- Upsert into 3 new tables

### Frontend Changes

- `AssortmentPage.tsx` - Major upgrade with hero KPIs, revenue risk feed, enhanced table
- `RetailDecisionFeed.tsx` - Add size intelligence decision type
- New hook: `useSizeIntelligence.ts` - Query state_size_health_daily, state_lost_revenue_daily, state_markdown_risk_daily

### Sequence

1. ✅ Create 3 database tables (migration) — Phase 1
2. ✅ Update Edge Function with Size Health, Lost Revenue, Markdown Risk — Phase 1
3. ✅ Deploy and run engine to populate data — Phase 1
4. ✅ Build upgraded UI — Phase 1
5. ✅ Create state_size_transfer_daily table — Phase 2
6. ✅ Add Smart Transfer Engine + Per-store Health to edge function — Phase 2
7. ✅ Update hook and UI with Transfer Opportunities — Phase 2
8. ✅ Create evidence_packs, post_impact_metrics, state_cash_lock_daily, state_margin_leak_daily tables — Phase 3
9. ✅ Add Cash Lock + Margin Leak + Evidence Pack computations to edge function — Phase 3
10. ✅ Update UI with Cash Lock, Margin Leak KPIs + Evidence Pack drawer — Phase 3

### Phase 3 Results
- **Cash Lock**: Tracks inventory value trapped by broken size curves (70% locked for broken, 40% for risk, 15% for watch)
- **Margin Leak**: Two drivers tracked — `size_break` (40% margin on lost revenue) and `markdown_risk` (35% discount on high-risk inventory)
- **Evidence Packs**: Audit trail with full data snapshot for every broken/risk product — includes health, lost revenue, cash lock, margin leak, markdown risk
- **Evidence Drawer**: Click any at-risk style to see complete evidence pack with all metrics and source tables

