

# Bluecore Command Doc v2.1 - 5 Gap Fixes

## Tong quan thay doi

Nang cap `.lovable/plan.md` tu v2.0 len v2.1 va cap nhat code contracts de khac phuc 5 diem "ho" ma ban da chi ra.

---

## 1. Route Contracts (Section 11 moi trong plan.md)

Them section "ROUTE CONTRACTS" voi block chuan cho moi route. Vi du cho `/command/clearance`:

```text
ROUTE: /command/clearance
  Input Filters: date_range, store_scope, category, collection, season, excludeFCs
  RPC/Queries:
    - fn_clearance_stock_by_fc(p_tenant_id, p_fc_ids)
    - fn_clearance_demand_by_fc(p_tenant_id, p_fc_ids)
  Tables Read:
    - state_markdown_risk_daily (latest by product_id)
    - state_size_health_daily (latest, store_id IS NULL)
    - state_cash_lock_daily (latest by product_id)
    - inv_family_codes, inv_collections, inv_collection_fcs
    - v_clearance_history_by_fc
  Tables Write: none (read-only analysis)
  Refresh: daily (state_* recomputed by inventory-kpi-engine)
  Row Constraints: tenant_id (mandatory), org_id (optional)
  Fallback:
    - Missing demand: avg_daily_sales=0 → days_to_clear=null, flag no_demand
    - Missing health: health_score=null → show "Chua du du lieu"
```

Tuong tu cho tat ca 9 routes (overview, allocation, assortment, clearance, network-gap, production, decisions, outcomes, settings).

---

## 2. Grain Invariants (Section 12 moi trong plan.md)

Them 3 invariants bat buoc:

```text
INVARIANT A - Decision Grain:
  dec_decision_package_lines.fc_id = NOT NULL (bat buoc)
  dec_decision_package_lines.sku = nullable (chi la detail)
  Moi decision line PHAI map ve FC level

INVARIANT B - State Grain:
  state_size_health_daily:    grain = (as_of_date, store_id, product_id)
  state_markdown_risk_daily:  grain = (as_of_date, product_id) — khong co store
  state_cash_lock_daily:      grain = (as_of_date, product_id) — khong co store
  state_margin_leak_daily:    grain = (as_of_date, store_id, product_id)
  state_lost_revenue_daily:   grain = (as_of_date, store_id, product_id)

INVARIANT C - Demand Grain:
  inv_state_demand: grain = (fc_id, store_id) — khong co channel
  Channel dimension chi xuat hien trong cdp_order_items, KHONG trong demand table
```

Day la tai lieu, khong phai schema migration. Nhung ghi ro de dev biet "khong duoc pha".

---

## 3. Markdown Ladder Schema + Clearance Upgrade (Section 4.6 + 2.4 update)

### 3A. Schema moi (tai lieu, chua tao table):

```text
4.6 Markdown & Clearance History (Planned)

  inv_markdown_events
    tenant_id, fc_id, channel, store_id(nullable), event_date,
    markdown_pct, price_before, price_after,
    units_sold_7d, revenue_7d, margin_7d

  sem_markdown_ladders
    tenant_id, category(nullable), collection_id(nullable),
    ladder_steps: jsonb   -- e.g. [10, 20, 30, 40, 50]
    min_days_per_step: int
    max_markdown_pct: int

  sem_markdown_caps
    tenant_id, tag_pattern: text,  -- 'premium|signature|theu|embroidery'
    max_discount_pct: int          -- default 50
    override_requires: text        -- 'CEO' | 'CFO'
```

### 3B. Clearance page upgrade (tai lieu):

```text
ClearancePage upgrades:
  CandidatesTab: them badge "Best channel @30%/@50%"
  ProductDetailPanel: them "Markdown Ladder History" timeline
  WhyClearCard: them "Next Step Recommendation" voi premium cap check
```

---

## 4. Scoring Spec (Section 13 moi trong plan.md)

```text
SCORING SPECIFICATION

4.1 Scope & Windows
  - Hero Score: scope = tenant-wide, last 90 days
  - velocity_momentum = avg_daily_sales(last 7d) / avg_daily_sales(last 28d)
  - trend_score: slope of linear regression on 28-day daily sales, normalized 0-25
  - revenue_pct: percentile rank within tenant, same season/category

4.2 Bounds & Clamping
  - All scores: clamp to [0, 100]
  - Sub-components: clamp to [0, 25] before sum
  - Financial Damage Score: clamp to [0, 100]

4.3 Null & Missing Data Rules
  - avg_daily_sales = 0: set days_to_clear = 9999, add flag no_demand = true
  - Missing health score: exclude from ranking, show "Incomplete"
  - Missing margin data: use category average, set data_quality = 'estimated'
  - Less than 7 days of sales data: set confidence = 'low', data_quality = 'partial'

4.4 Outlier Handling
  - Trim top/bottom 1% of velocity values before percentile ranking
  - Single-day spikes (>5x avg): flag as anomaly, exclude from trend calc
```

---

## 5. COMMAND domain trong DecisionContract

### 5A. Update `contracts.ts`:

```typescript
// Truoc:
export type CommandCenterDomain = 'FDP' | 'MDP' | 'CDP' | 'CONTROL_TOWER';
export type DecisionOwnerRole = 'CEO' | 'CFO' | 'CMO' | 'COO' | 'OPS';

// Sau:
export type CommandCenterDomain = 'FDP' | 'MDP' | 'CDP' | 'COMMAND' | 'CONTROL_TOWER';
export type DecisionOwnerRole = 'CEO' | 'CFO' | 'CMO' | 'COO' | 'OPS' | 'MERCHANDISER';
```

### 5B. Update `plan.md` section 9.3:

```text
domain: 'COMMAND' | 'FDP' | 'MDP' | 'CDP' | 'CONTROL_TOWER'

Owner Role Map:
  COMMAND decisions:
    MERCHANDISER - Size rebalance, allocation
    OPS          - Transfer execution
    COO          - Clearance approval
    CFO          - Premium override, large markdown

dedupeKey: {tenant_id}:{package_type}:{fc_id}:{date_bucket}
```

### 5C. Update `metric-registry.ts` neu can them COMMAND metrics.

---

## Files thay doi

| File | Thay doi |
|------|---------|
| `.lovable/plan.md` | Them sections 11 (Route Contracts), 12 (Grain Invariants), 13 (Scoring Spec). Update section 4.6, 2.4, 9.3. Version 2.0 → 2.1 |
| `src/lib/command-center/contracts.ts` | Them 'COMMAND' vao CommandCenterDomain, 'MERCHANDISER' vao DecisionOwnerRole |
| `src/lib/command-center/metric-registry.ts` | Them COMMAND domain metrics (neu co) |

---

## Khong thay doi

- Khong tao database migration (markdown tables la "Planned", chua implement)
- Khong thay doi UI components
- Khong thay doi hooks logic

