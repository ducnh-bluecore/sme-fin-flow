# SSOT ENFORCEMENT SPECIFICATION v1.4.2

> **Purpose**: Transform SSOT from a principle into an enforceable mechanism.
> 
> **Audience**: Developers, Architects, QA Engineers
> 
> **Last Updated**: 2026-02-06

---

## 1. EXECUTIVE SUMMARY

This specification defines:
1. **Canonical Sources** - The single source of truth for each domain
2. **Hook Calling Rules** - What hooks can and cannot do
3. **Evidence Requirements** - Mandatory auditability for decisions
4. **Metric Versioning** - Change management for metrics

---

## 2. CANONICAL SOURCES BY DOMAIN

Each domain has ONE facade view (entry point) and multiple canonical views (detail sources).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CANONICAL HIERARCHY                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│   │ FDP Domain  │     │ MDP Domain  │     │ CDP Domain  │     │ CT Domain │ │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └─────┬─────┘ │
│          │                   │                   │                   │       │
│          ▼                   ▼                   ▼                   ▼       │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│   │v_fdp_truth  │     │v_mdp_truth  │     │v_cdp_truth  │     │v_ct_truth │ │
│   │  _snapshot  │     │  _snapshot  │     │  _snapshot  │     │ _snapshot │ │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └─────┬─────┘ │
│          │                   │                   │                   │       │
│   ┌──────┴──────┐     ┌──────┴──────┐     ┌──────┴──────┐     ┌─────┴─────┐ │
│   │Canonical    │     │Canonical    │     │Canonical    │     │Canonical  │ │
│   │Views        │     │Views        │     │Views        │     │Views      │ │
│   │- v_fdp_fin..│     │- v_mdp_ch..│     │- v_cdp_cust│     │- v_ct_sum.│ │
│   │- v_fdp_daily│     │- v_mdp_camp│     │- v_cdp_ltv..│     │- v_dec_pen│ │
│   │- v_fdp_sku..│     │- v_mdp_attr│     │- v_cdp_equity│    │- v_dec_eff│ │
│   └─────────────┘     └─────────────┘     └─────────────┘     └───────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 FDP (Financial Data Platform)

| Type | View Name | Purpose |
|------|-----------|---------|
| **Facade** | `v_fdp_truth_snapshot` | Dashboard entry point |
| Canonical | `v_fdp_finance_summary` | P&L summary metrics |
| Canonical | `v_fdp_daily_metrics` | Daily financial facts |
| Canonical | `v_fdp_sku_summary` | SKU-level unit economics |
| Canonical | `v_fdp_cash_position` | Real-time cash view |
| Canonical | `v_fdp_working_capital` | Working capital metrics |
| Canonical | `v_fdp_ar_aging` | Accounts receivable aging |
| Canonical | `v_fdp_ap_aging` | Accounts payable aging |

### 2.2 MDP (Marketing Data Platform)

| Type | View Name | Purpose |
|------|-----------|---------|
| **Facade** | `v_mdp_truth_snapshot` | Dashboard entry point |
| Canonical | `v_mdp_channel_performance` | Channel-level metrics |
| Canonical | `v_mdp_campaign_summary` | Campaign aggregations |
| Canonical | `v_mdp_attribution` | Revenue attribution |
| Canonical | `v_mdp_budget_utilization` | Budget tracking |

### 2.3 CDP (Customer Data Platform)

| Type | View Name | Purpose |
|------|-----------|---------|
| **Facade** | `v_cdp_truth_snapshot` | Dashboard entry point |
| Canonical | `v_cdp_customer_research` | Customer metrics |
| Canonical | `v_cdp_ltv_rules` | LTV calculation rules |
| Canonical | `v_cdp_equity` | Customer equity view |
| Canonical | `v_cdp_data_quality` | Data quality metrics |
| Canonical | `v_cdp_population_summary` | Population segments |

### 2.4 Control Tower

| Type | View Name | Purpose |
|------|-----------|---------|
| **Facade** | `v_ct_truth_snapshot` | Dashboard entry point |
| Canonical | `v_control_tower_summary` | Active alerts summary |
| Canonical | `v_decision_pending_followup` | Pending decisions |
| Canonical | `v_decision_effectiveness` | Decision outcomes |
| Canonical | `v_active_alerts_hierarchy` | Alert hierarchy |

---

## 3. HOOK CALLING RULES

### 3.1 MUST Rules (Violations = Build Failure)

```typescript
// ❌ FORBIDDEN: Client-side aggregation
const total = data.reduce((acc, item) => acc + item.amount, 0);

// ❌ FORBIDDEN: Filter-then-aggregate
const filtered = data.filter(x => x.status === 'active').reduce(...);

// ❌ FORBIDDEN: Multi-view client joins
const combined = [...ordersData, ...paymentsData].map(x => ...);

// ❌ FORBIDDEN: Hardcoded calculation constants
const cogs = revenue * 0.55; // Silent 55% COGS assumption
```

### 3.2 SHOULD Rules (Best Practices)

```typescript
// ✅ PREFERRED: Use facade view for dashboards
const { data } = useQuery({
  queryKey: ['fdp-truth', tenantId],
  queryFn: () => buildSelectQuery('v_fdp_truth_snapshot', '*')
});

// ✅ ALLOWED: Use canonical view for detail pages
const { data } = useQuery({
  queryKey: ['fdp-sku-details', tenantId, skuId],
  queryFn: () => buildSelectQuery('v_fdp_sku_summary', '*').eq('sku', skuId)
});

// ✅ REQUIRED: Mark estimated values explicitly
const grossProfit = createEstimatedMetric(revenue - estimatedCogs, {
  confidence: 0.7,
  source: 'category_average'
});
```

### 3.3 Hook Pattern Classification

| Pattern | Allowed | Example |
|---------|---------|---------|
| Fetch facade view | ✅ YES | `useFDPFinanceSSOT` |
| Fetch canonical view | ✅ YES | `usePLData` |
| Apply WHERE filters | ✅ YES | `.eq('channel', 'shopee')` |
| Apply ORDER BY | ✅ YES | `.order('date', { ascending: false })` |
| Apply LIMIT | ✅ YES | `.limit(100)` |
| Client-side .reduce() | ❌ NO | `data.reduce(...)` |
| Client-side .filter().reduce() | ❌ NO | `data.filter().reduce()` |
| Hardcoded multipliers | ❌ NO | `* 0.55`, `* 0.12` |
| Multi-source joins | ❌ NO | `[...a, ...b].map()` |

---

## 4. EVIDENCE REQUIREMENTS

Every alert and decision MUST be linked to an evidence pack.

### 4.1 Evidence Pack Structure

```typescript
interface EvidencePack {
  id: string;
  tenant_id: string;
  as_of: string;           // Snapshot timestamp
  watermark: {
    orders_latest: string;
    payments_latest: string;
    ad_spend_latest: string;
  };
  row_counts: {
    orders: number;
    customers: number;
    payments: number;
  };
  quality_scores: {
    completeness: number;      // 0-100%
    freshness_hours: number;   // Hours since last sync
    null_rate_percent: number; // % of null values
    duplicate_rate_percent: number;
  };
  reconciliation_diffs?: {
    source: string;
    expected: number;
    actual: number;
    diff_percent: number;
  }[];
  created_at: string;
  expires_at: string;        // TTL: 30 days
}
```

### 4.2 Evidence Linking Rules

| Entity Type | Required? | Field |
|-------------|-----------|-------|
| `alert_instances` | ✅ REQUIRED | `evidence_pack_id` |
| `decision_cards` | ✅ REQUIRED | `evidence_pack_id` |
| `kpi_facts_daily` | ⚪ OPTIONAL | `evidence_pack_id` |
| `central_metrics_snapshots` | ⚪ OPTIONAL | `evidence_pack_id` |

### 4.3 Evidence Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Created   │────▶│   Active    │────▶│   Expired   │────▶│   Deleted   │
│  (T+0)      │     │  (T+0~30d)  │     │  (T+30d+)   │     │  (Cleanup)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           │ linked by
                           ▼
                    ┌─────────────┐
                    │   Alerts/   │
                    │  Decisions  │
                    └─────────────┘
```

---

## 5. METRIC VERSIONING

### 5.1 Version Schema

```sql
CREATE TABLE metric_contracts (
  id UUID PRIMARY KEY,
  metric_code TEXT UNIQUE NOT NULL,
  metric_version INTEGER NOT NULL DEFAULT 1,
  display_name TEXT NOT NULL,
  source_view TEXT NOT NULL,
  calculation_sql TEXT,
  grain TEXT NOT NULL,           -- 'daily', 'monthly', 'sku', etc.
  domain TEXT NOT NULL,          -- 'FDP', 'MDP', 'CDP', 'CT'
  is_actionable BOOLEAN DEFAULT false,
  deprecation_date DATE,
  replacement_metric TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Breaking Change Rules

| Change Type | Version Bump? | Backfill Required? |
|-------------|---------------|-------------------|
| Add new field | ❌ No | ❌ No |
| Rename field | ✅ Yes | ✅ Yes (T-30d) |
| Change calculation | ✅ Yes | ✅ Yes (T-30d) |
| Remove field | ✅ Yes | ❌ No (deprecate first) |
| Change grain | ✅ Yes | ✅ Yes (T-30d) |

### 5.3 Deprecation Policy

```
T+0:    Announce deprecation, set deprecation_date = T+90
T+0~90: Both versions available, warnings in logs
T+90:   Old version returns error, redirect to replacement
T+180:  Remove old metric from system
```

---

## 6. KPI LAYER DISAMBIGUATION

### 6.1 Layer Roles

| Table | Role | Usage |
|-------|------|-------|
| `kpi_facts_daily` | **CANONICAL** | Source of truth for daily facts |
| `kpi_definitions` | **CANONICAL** | Metric definitions registry |
| `central_metrics_snapshots` | **SNAPSHOT** | Point-in-time snapshots with evidence |
| `dashboard_kpi_cache` | **CACHE** | Performance optimization, TTL-based |

### 6.2 Query Priority

```
1. For CURRENT metrics:     → dashboard_kpi_cache (if fresh) 
                            → kpi_facts_daily (if stale)
                            
2. For HISTORICAL metrics:  → kpi_facts_daily (always)

3. For AUDITING:            → central_metrics_snapshots (with evidence)

4. For DEFINITIONS:         → kpi_definitions (always)
```

### 6.3 Cache Invalidation

| Event | Invalidate Cache? |
|-------|-------------------|
| New order synced | ✅ Yes (metrics affected) |
| Manual refresh triggered | ✅ Yes (all) |
| Evidence pack created | ❌ No |
| Alert resolved | ❌ No |

---

## 7. ENFORCEMENT MECHANISMS

### 7.1 Build-Time Checks

```javascript
// scripts/check-ssot.js
const VIOLATION_PATTERNS = {
  REDUCE_ON_DATA: /\.reduce\s*\(\s*\([^)]*\)\s*=>/,
  FILTER_REDUCE: /\.filter\s*\([^)]*\)\s*\.reduce/,
  SILENT_COGS: /\*\s*0\.55/,
  SILENT_FEES: /\*\s*0\.12/,
  ACC_PLUS: /acc\s*\+\s*\(/,
};
```

### 7.2 Runtime Warnings

```typescript
// In useTenantQueryBuilder
if (process.env.NODE_ENV === 'development') {
  if (isSchemaProvisioned && queryHasTenantIdFilter) {
    console.warn('[SSOT] Redundant tenant_id filter in SCHEMA mode');
  }
  if (!isCanonicalView(viewName)) {
    console.warn(`[SSOT] Non-canonical view used: ${viewName}`);
  }
}
```

### 7.3 Audit Logging

All SSOT violations are logged to `audit_logs` with:
- `event_type: 'ssot_violation'`
- `severity: 'warning' | 'error'`
- `metadata: { pattern, file, line, hook_name }`

---

## 8. MIGRATION CHECKLIST

When creating new hooks:

- [ ] Identify the domain (FDP/MDP/CDP/CT)
- [ ] Use facade view for dashboard metrics
- [ ] Use canonical view for detail pages
- [ ] No client-side aggregations
- [ ] No hardcoded calculation constants
- [ ] Mark estimated values explicitly
- [ ] Add to hook audit document

When modifying metrics:

- [ ] Update `metric_contracts` with new version
- [ ] Document breaking changes
- [ ] Plan backfill if needed
- [ ] Notify dependent systems
- [ ] Update facade views if affected

---

## 9. APPENDIX: SSOT VIOLATION DETECTOR

See: `src/lib/ssot-violation-detector.ts`

Usage:
```bash
# Pre-commit hook
npm run check:ssot

# CI pipeline
node scripts/check-ssot.js
```

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-06 | System | Initial specification |
