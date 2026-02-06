

# BLUECORE ARCHITECTURE v1.4.2 - COMPLETION PLAN

## REMAINING GAPS TO CLOSE

| Gap | Priority | Effort |
|-----|----------|--------|
| DB Facade Views chưa tạo | HIGH | Medium |
| metric_contracts table thiếu | MEDIUM | Small |
| Query Builder chưa reject tenant_id (SCHEMA mode) | MEDIUM | Small |
| auto-measure-outcomes có SSOT violation | LOW | Small |
| Docs discrepancy | LOW | Trivial |

---

## PHASE 4A: Database Facade Views

Tạo 4 facade views như đã spec trong `SSOT_ENFORCEMENT_SPEC.md`:

### Migration: Create Facade Views

```sql
-- v_fdp_truth_snapshot: FDP Dashboard Single Entry Point
CREATE OR REPLACE VIEW v_fdp_truth_snapshot AS
SELECT 
  tenant_id,
  period_date,
  -- Revenue metrics
  COALESCE(net_revenue, 0) as net_revenue,
  COALESCE(gross_profit, 0) as gross_profit,
  COALESCE(contribution_margin, 0) as contribution_margin,
  -- Margin percentages
  CASE WHEN net_revenue > 0 
    THEN ROUND((gross_profit / net_revenue) * 100, 2) 
    ELSE 0 
  END as gross_margin_pct,
  -- Cash position
  COALESCE(cash_in_bank, 0) as cash_in_bank,
  COALESCE(accounts_receivable, 0) as accounts_receivable,
  COALESCE(accounts_payable, 0) as accounts_payable,
  -- Working capital
  COALESCE(dso, 0) as dso,
  COALESCE(dpo, 0) as dpo,
  COALESCE(dio, 0) as dio,
  -- Metadata
  updated_at as snapshot_at
FROM fdp_daily_summary;

-- v_mdp_truth_snapshot: MDP Dashboard Single Entry Point
CREATE OR REPLACE VIEW v_mdp_truth_snapshot AS
SELECT
  tenant_id,
  period_date,
  -- Spend metrics
  COALESCE(total_ad_spend, 0) as total_ad_spend,
  COALESCE(total_revenue_attributed, 0) as revenue_attributed,
  -- Performance
  CASE WHEN total_ad_spend > 0 
    THEN ROUND(total_revenue_attributed / total_ad_spend, 2)
    ELSE 0 
  END as blended_roas,
  COALESCE(total_orders, 0) as total_orders,
  CASE WHEN total_orders > 0 
    THEN ROUND(total_ad_spend / total_orders, 0)
    ELSE 0 
  END as cpa,
  -- Channel breakdown (JSONB)
  channel_breakdown,
  updated_at as snapshot_at
FROM mdp_daily_summary;

-- v_cdp_truth_snapshot: CDP Dashboard Single Entry Point
CREATE OR REPLACE VIEW v_cdp_truth_snapshot AS
SELECT
  tenant_id,
  -- Customer counts
  COALESCE(total_customers, 0) as total_customers,
  COALESCE(active_customers, 0) as active_customers,
  COALESCE(at_risk_customers, 0) as at_risk_customers,
  -- Equity
  COALESCE(total_equity_12m, 0) as total_equity_12m,
  COALESCE(total_equity_24m, 0) as total_equity_24m,
  COALESCE(at_risk_value, 0) as at_risk_value,
  -- Ratios
  CASE WHEN total_customers > 0 
    THEN ROUND((at_risk_customers::numeric / total_customers) * 100, 2)
    ELSE 0 
  END as at_risk_pct,
  -- LTV
  COALESCE(avg_ltv, 0) as avg_ltv,
  COALESCE(ltv_cac_ratio, 0) as ltv_cac_ratio,
  updated_at as snapshot_at
FROM cdp_summary;

-- v_ct_truth_snapshot: Control Tower Dashboard Single Entry Point
CREATE OR REPLACE VIEW v_ct_truth_snapshot AS
SELECT
  tenant_id,
  -- Alert counts by severity
  COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status = 'OPEN') as critical_open,
  COUNT(*) FILTER (WHERE severity = 'HIGH' AND status = 'OPEN') as high_open,
  COUNT(*) FILTER (WHERE severity = 'MEDIUM' AND status = 'OPEN') as medium_open,
  COUNT(*) FILTER (WHERE status = 'OPEN') as total_open,
  -- Decision cards
  COUNT(*) FILTER (WHERE status = 'PENDING') as decisions_pending,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as decisions_in_progress,
  -- Overdue
  COUNT(*) FILTER (WHERE status = 'OPEN' AND due_at < now()) as overdue_count,
  -- Total impact
  COALESCE(SUM(impact_value) FILTER (WHERE status = 'OPEN'), 0) as total_impact_value,
  now() as snapshot_at
FROM alert_instances
GROUP BY tenant_id;
```

---

## PHASE 4B: Metric Contracts Table

Tạo registry cho metric versioning:

```sql
CREATE TABLE IF NOT EXISTS metric_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  
  -- Identity
  metric_code TEXT NOT NULL,
  metric_version INTEGER NOT NULL DEFAULT 1,
  
  -- Definition
  display_name TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL CHECK (domain IN ('FDP', 'MDP', 'CDP', 'CT')),
  
  -- Source
  source_view TEXT NOT NULL,
  grain TEXT NOT NULL CHECK (grain IN ('daily', 'weekly', 'monthly', 'realtime')),
  
  -- Governance
  is_actionable BOOLEAN DEFAULT false,
  deprecation_date DATE,
  breaking_change_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(tenant_id, metric_code, metric_version)
);

-- Insert core metrics
INSERT INTO metric_contracts (tenant_id, metric_code, display_name, domain, source_view, grain, is_actionable) VALUES
  (NULL, 'NET_REVENUE', 'Net Revenue', 'FDP', 'v_fdp_truth_snapshot', 'daily', true),
  (NULL, 'GROSS_PROFIT', 'Gross Profit', 'FDP', 'v_fdp_truth_snapshot', 'daily', true),
  (NULL, 'CONTRIBUTION_MARGIN', 'Contribution Margin', 'FDP', 'v_fdp_truth_snapshot', 'daily', true),
  (NULL, 'BLENDED_ROAS', 'Blended ROAS', 'MDP', 'v_mdp_truth_snapshot', 'daily', true),
  (NULL, 'CPA', 'Cost Per Acquisition', 'MDP', 'v_mdp_truth_snapshot', 'daily', true),
  (NULL, 'TOTAL_EQUITY_12M', 'Customer Equity (12M)', 'CDP', 'v_cdp_truth_snapshot', 'monthly', true),
  (NULL, 'AT_RISK_VALUE', 'At-Risk Customer Value', 'CDP', 'v_cdp_truth_snapshot', 'weekly', true),
  (NULL, 'CRITICAL_ALERTS', 'Critical Alerts Open', 'CT', 'v_ct_truth_snapshot', 'realtime', true);
```

---

## PHASE 4C: Strengthen Query Builder

Update `useTenantQueryBuilder.ts` để reject tenant_id filter khi SCHEMA mode:

```typescript
// Enhanced buildSelectQuery with strict enforcement
const buildSelectQuery = useCallback(
  <T extends TableName>(tableName: T, columns: string) => {
    const actualTable = getTableName(tableName, isSchemaProvisioned ?? false);
    const query = client.from(actualTable as any).select(columns);
    
    if (isPlatformTable(tableName) || isPublicOnlyTable(tableName)) {
      return query;
    }
    
    // SCHEMA mode: tenant isolation via search_path
    if (isSchemaProvisioned) {
      // Return wrapped query that warns/rejects .eq('tenant_id', ...)
      return createSchemaProtectedQuery(query, tableName);
    }
    
    // RLS mode: ENFORCE tenant_id filter
    if (!tenantId) {
      throw new Error(`[RLS MODE] tenant_id required for table ${tableName}`);
    }
    return query.eq('tenant_id', tenantId);
  },
  [client, tenantId, isSchemaProvisioned]
);

// Helper to wrap query and detect tenant_id misuse
function createSchemaProtectedQuery(query: any, tableName: string) {
  const originalEq = query.eq.bind(query);
  query.eq = (column: string, value: any) => {
    if (column === 'tenant_id') {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[SSOT VIOLATION] tenant_id filter on "${tableName}" in SCHEMA mode.`,
          '\n→ Isolation is via search_path, not row filter.',
          '\n→ Remove .eq("tenant_id", ...) from query.'
        );
      }
      // In production, skip the filter silently (isolation already guaranteed)
      return query;
    }
    return originalEq(column, value);
  };
  return query;
}
```

---

## PHASE 4D: Fix auto-measure-outcomes Violations

Hiện tại edge function đang dùng `.reduce()` client-side. Cần chuyển sang SQL:

```sql
-- Create helper view for outcome measurement
CREATE OR REPLACE VIEW v_decision_outcome_stats AS
SELECT
  tenant_id,
  decision_id,
  metric_code,
  -- Pre-computed stats
  COUNT(*) as measurement_count,
  AVG(actual_value) as avg_actual,
  AVG(expected_value) as avg_expected,
  CASE WHEN AVG(expected_value) > 0 
    THEN ROUND(((AVG(actual_value) - AVG(expected_value)) / AVG(expected_value)) * 100, 2)
    ELSE 0 
  END as variance_pct,
  MAX(measured_at) as latest_measurement
FROM decision_outcomes
GROUP BY tenant_id, decision_id, metric_code;
```

Sau đó update edge function để query view thay vì aggregate client-side.

---

## PHASE 4E: Fix Documentation

Update `docs/BLUECORE_SYSTEM_ARCHITECTURE_v1.4.1.md`:

1. Sửa `src/hooks/cdp` từ "(2 files)" → "(26+ hooks with useCDP* prefix distributed in root)"
2. Thêm section "DB vs Edge Boundary"
3. Thêm section "Evidence Lifecycle"
4. Update version → v1.4.2

---

## IMPLEMENTATION ORDER

```text
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Database Migration                                  │
│  ├── Create facade views (4 views)                          │
│  ├── Create metric_contracts table                          │
│  └── Create v_decision_outcome_stats helper view            │
├─────────────────────────────────────────────────────────────┤
│  Step 2: Code Updates                                        │
│  ├── Strengthen useTenantQueryBuilder                       │
│  └── Update auto-measure-outcomes to use SQL view           │
├─────────────────────────────────────────────────────────────┤
│  Step 3: Documentation                                       │
│  └── Update BLUECORE_SYSTEM_ARCHITECTURE → v1.4.2           │
└─────────────────────────────────────────────────────────────┘
```

---

## SUCCESS CRITERIA

| Item | Verification |
|------|--------------|
| Facade Views | `SELECT * FROM v_fdp_truth_snapshot LIMIT 1` works |
| Metric Contracts | 8 core metrics registered |
| Query Builder | Dev console shows error on tenant_id in SCHEMA mode |
| Outcome Stats | auto-measure-outcomes uses SQL view, no .reduce() |
| Docs | Version shows v1.4.2, CDP hooks count fixed |

---

## FILES TO CREATE/MODIFY

### Database Migration (1 migration file)
- Create 4 facade views
- Create metric_contracts table + seed data
- Create v_decision_outcome_stats view

### Code Files (2)
1. `src/hooks/useTenantQueryBuilder.ts` - Add strict enforcement
2. `supabase/functions/auto-measure-outcomes/index.ts` - Use SQL view

### Documentation (1)
1. `docs/BLUECORE_SYSTEM_ARCHITECTURE_v1.4.1.md` → rename to v1.4.2 + fixes

