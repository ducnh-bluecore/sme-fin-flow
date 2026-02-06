

# BLUECORE ARCHITECTURE RISK MITIGATION PLAN v1.4.2

## EXECUTIVE SUMMARY

Bản đánh giá của bạn chính xác. Tài liệu có "spine" tốt nhưng thiếu **cơ chế cưỡng bức** để đảm bảo SSOT không bị rạn. Plan này tập trung vào 4 deliverables chính:

1. **SSOT Enforcement Spec** - Từ khẩu hiệu → cơ chế thực thi
2. **Job Idempotency Standard** - Chống duplicate/race condition
3. **DB vs Edge Boundary Spec** - Ranh giới rõ ràng
4. **Tenancy Invariant Guardrails** - Chống lẫn mô hình

---

## CONFIRMED RISKS (Sau audit codebase)

| Risk | Xác nhận | Mức độ |
|------|----------|--------|
| **R1: Hook Sprawl** | ✅ 183 hooks, ~26 CDP hooks phân tán (không phải 2 như docs ghi) | HIGH |
| **R2: Non-idempotent Edge Functions** | ✅ `detect-alerts` không có lock_key, thiếu job_runs table | HIGH |
| **R3: Mixed Tenancy Mode** | ✅ `useTenantQueryBuilder` không reject filter tenant_id khi SCHEMA mode | MEDIUM |
| **R4: Evidence chỉ là contract, chưa có thực thi** | ✅ Không có `evidence_packs` table, evidence fields hardcoded | HIGH |
| **R5: Identity Resolution thiếu spec** | ✅ Không có `entity_links`, `customer_merge_events` trong codebase | MEDIUM |
| **R6: 2-3 SSOT cho KPI** | ✅ `kpi_facts_daily`, `central_metrics_snapshots`, `dashboard_kpi_cache` chưa phân vai | MEDIUM |
| **R7: BigQuery split-brain** | ⚠️ Có watermark sync nhưng chưa rõ ai là SSOT | LOW |

**Bonus - Docs discrepancy**: `src/hooks/cdp` ghi "(2 files)" nhưng thực tế CDP hooks nằm rải rác ở root với prefix `useCDP*` (26+ files)

---

## PLAN STRUCTURE

### PHASE 1: Documentation Fixes (Immediate - 2 files)

**File 1: `docs/SSOT_ENFORCEMENT_SPEC.md`**

Nội dung:
```text
1. CANONICAL SOURCES BY DOMAIN
   ┌──────────┬────────────────────────────────┬─────────────────┐
   │ Domain   │ Canonical Views (SSOT)         │ Facade View     │
   ├──────────┼────────────────────────────────┼─────────────────┤
   │ FDP      │ v_fdp_finance_summary          │ v_fdp_truth     │
   │          │ v_fdp_daily_metrics            │                 │
   │          │ v_fdp_sku_summary              │                 │
   ├──────────┼────────────────────────────────┼─────────────────┤
   │ MDP      │ v_mdp_channel_performance      │ v_mdp_truth     │
   │          │ v_mdp_campaign_summary         │                 │
   ├──────────┼────────────────────────────────┼─────────────────┤
   │ CDP      │ v_cdp_customer_research        │ v_cdp_truth     │
   │          │ v_cdp_ltv_rules                │                 │
   │          │ v_cdp_equity                   │                 │
   ├──────────┼────────────────────────────────┼─────────────────┤
   │ CT       │ v_control_tower_summary        │ v_ct_truth      │
   │          │ v_decision_pending_followup    │                 │
   └──────────┴────────────────────────────────┴─────────────────┘

2. HOOK CALLING RULES
   - Hooks MUST call facade views (v_*_truth) for dashboard metrics
   - Hooks MAY call specific views for detail pages
   - Hooks MUST NOT join multiple views client-side
   - Hooks MUST NOT compute aggregations (.reduce, .filter.reduce)

3. EVIDENCE REQUIREMENTS
   - Every alert/decision MUST have evidence_pack_id
   - Evidence pack includes: as_of, watermark, row_counts, null_rates
   - Evidence pack TTL: 30 days

4. METRIC VERSIONING
   - metric_version integer (auto-increment)
   - Breaking changes increment version
   - Backfill policy: T-30 days
   - Deprecation: 90 days notice
```

**File 2: `docs/JOB_IDEMPOTENCY_STANDARD.md`**

Nội dung:
```text
1. LOCK KEY NAMING
   Format: {function_name}:{tenant_id}:{grain_date}:{entity_id_hash}
   Example: detect-alerts:tenant-123:2026-02-06:sha256(rule_id)

2. UNIQUE KEYS FOR INSERTS
   alert_instances: UNIQUE(tenant_id, rule_id, grain_date, object_id)
   decision_cards: UNIQUE(tenant_id, alert_instance_id, metric_code, period)

3. JOB LIFECYCLE TABLE
   CREATE TABLE job_runs (
     id UUID PRIMARY KEY,
     function_name TEXT NOT NULL,
     tenant_id UUID NOT NULL,
     lock_key TEXT UNIQUE, -- Advisory lock
     status TEXT DEFAULT 'running', -- running/completed/failed
     started_at TIMESTAMPTZ DEFAULT now(),
     completed_at TIMESTAMPTZ,
     result JSONB,
     error_message TEXT
   );

4. RETRY POLICY
   - Max retries: 3
   - Backoff: exponential (1s, 5s, 30s)
   - Dead-letter: insert to sync_errors with payload

5. FUNCTION CATEGORIES
   ┌─────────────────────────────┬────────────────┬─────────────┐
   │ Function                    │ Frequency      │ Idempotent  │
   ├─────────────────────────────┼────────────────┼─────────────┤
   │ detect-alerts               │ 5min           │ ⚠️ NEEDS FIX│
   │ generate-decision-cards     │ 15min          │ ⚠️ NEEDS FIX│
   │ scheduled-cdp-build         │ daily          │ ✅ OK       │
   │ sync-bigquery               │ hourly         │ ✅ OK       │
   │ auto-measure-outcomes       │ daily          │ ⚠️ NEEDS FIX│
   └─────────────────────────────┴────────────────┴─────────────┘
```

---

### PHASE 2: Code Guardrails (High Priority - 3 files)

**File 1: Update `src/hooks/useTenantQueryBuilder.ts`**

Add mode enforcement:

```typescript
// NEW: Query context for debugging
interface QueryContext {
  mode: 'SCHEMA' | 'RLS';
  schema_name: string;
  tenant_id: string;
  org_id: string | null;
}

// ENHANCED: Reject tenant_id filter in SCHEMA mode
const buildSelectQuery = useCallback(
  <T extends TableName>(tableName: T, columns: string) => {
    const actualTable = getTableName(tableName, isSchemaProvisioned ?? false);
    const query = client.from(actualTable as any).select(columns);
    
    if (isPlatformTable(tableName) || isPublicOnlyTable(tableName)) {
      return query;
    }
    
    // SCHEMA mode: isolation via search_path, no tenant_id needed
    if (isSchemaProvisioned) {
      // DEV MODE: Warn if caller tries to filter by tenant_id later
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[SCHEMA MODE] Table ${tableName}: tenant_id filter not needed`);
      }
      return query;
    }
    
    // RLS mode: ENFORCE tenant_id filter
    if (tenantId) {
      return query.eq('tenant_id', tenantId);
    }
    
    throw new Error(`[RLS MODE] tenant_id required for table ${tableName}`);
  },
  [client, tenantId, isSchemaProvisioned]
);

// NEW: Get current query context
const getQueryContext = useCallback((): QueryContext => ({
  mode: isSchemaProvisioned ? 'SCHEMA' : 'RLS',
  schema_name: isSchemaProvisioned ? `tenant_${tenantId}` : 'public',
  tenant_id: tenantId || '',
  org_id: null, // TODO: Add org context
}), [isSchemaProvisioned, tenantId]);

// Return enhanced context
return {
  // ... existing
  getQueryContext, // NEW
};
```

**File 2: Create `src/lib/ssot/facadeViews.ts`**

```typescript
/**
 * SSOT Facade Views - Single entry point per domain
 * 
 * Hooks SHOULD use these facade views for dashboard metrics.
 * Hooks MAY use specific views for detail pages.
 */

export const FACADE_VIEWS = {
  FDP: 'v_fdp_truth_snapshot',
  MDP: 'v_mdp_truth_snapshot', 
  CDP: 'v_cdp_truth_snapshot',
  CONTROL_TOWER: 'v_ct_truth_snapshot',
} as const;

export const CANONICAL_VIEWS = {
  FDP: [
    'v_fdp_finance_summary',
    'v_fdp_daily_metrics',
    'v_fdp_sku_summary',
    'v_fdp_cash_position',
    'v_fdp_working_capital',
  ],
  MDP: [
    'v_mdp_channel_performance',
    'v_mdp_campaign_summary',
    'v_mdp_attribution',
  ],
  CDP: [
    'v_cdp_customer_research',
    'v_cdp_ltv_rules',
    'v_cdp_equity',
    'v_cdp_data_quality',
  ],
  CONTROL_TOWER: [
    'v_control_tower_summary',
    'v_decision_pending_followup',
    'v_decision_effectiveness',
  ],
} as const;

/**
 * Validate if a view is SSOT-compliant
 */
export function isCanonicalView(viewName: string): boolean {
  const allViews = Object.values(CANONICAL_VIEWS).flat();
  return allViews.includes(viewName as any);
}

/**
 * Get domain for a view
 */
export function getViewDomain(viewName: string): keyof typeof CANONICAL_VIEWS | null {
  for (const [domain, views] of Object.entries(CANONICAL_VIEWS)) {
    if (views.includes(viewName as any)) {
      return domain as keyof typeof CANONICAL_VIEWS;
    }
  }
  return null;
}
```

**File 3: Create `src/lib/ssot/evidenceContract.ts`**

```typescript
/**
 * Evidence Contract - Auditability implementation
 */

export interface EvidencePack {
  id: string;
  tenant_id: string;
  as_of: string;
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
    completeness: number; // 0-100
    freshness_hours: number;
    null_rate_percent: number;
    duplicate_rate_percent: number;
  };
  reconciliation_diffs?: {
    source: string;
    expected: number;
    actual: number;
    diff_percent: number;
  }[];
  created_at: string;
  expires_at: string; // TTL 30 days
}

/**
 * Create evidence pack for a metric calculation
 */
export function createEvidencePack(
  tenantId: string,
  watermark: EvidencePack['watermark'],
  rowCounts: EvidencePack['row_counts'],
  qualityScores: EvidencePack['quality_scores']
): Omit<EvidencePack, 'id'> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return {
    tenant_id: tenantId,
    as_of: now.toISOString(),
    watermark,
    row_counts: rowCounts,
    quality_scores: qualityScores,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

/**
 * Validate evidence is still fresh
 */
export function isEvidenceFresh(evidence: EvidencePack, maxHours = 24): boolean {
  return evidence.quality_scores.freshness_hours <= maxHours;
}
```

---

### PHASE 3: Database Schema (Medium Priority)

**Migration 1: Create `job_runs` table**

```sql
-- Job runs table for idempotency tracking
CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  function_name TEXT NOT NULL,
  lock_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  input_params JSONB,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    EXTRACT(MILLISECOND FROM (completed_at - started_at))::INTEGER
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_job_runs_tenant_function ON job_runs(tenant_id, function_name);
CREATE INDEX idx_job_runs_status ON job_runs(status) WHERE status = 'running';
CREATE INDEX idx_job_runs_lock_key ON job_runs(lock_key);

-- Enable RLS
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_runs_tenant_policy ON job_runs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

**Migration 2: Create `evidence_packs` table**

```sql
-- Evidence packs for auditability
CREATE TABLE IF NOT EXISTS evidence_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  watermark JSONB NOT NULL,
  row_counts JSONB NOT NULL,
  quality_scores JSONB NOT NULL,
  reconciliation_diffs JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Indexes
CREATE INDEX idx_evidence_packs_tenant ON evidence_packs(tenant_id);
CREATE INDEX idx_evidence_packs_as_of ON evidence_packs(as_of DESC);
CREATE INDEX idx_evidence_packs_expires ON evidence_packs(expires_at);

-- Auto-cleanup expired evidence
CREATE OR REPLACE FUNCTION cleanup_expired_evidence() RETURNS void AS $$
BEGIN
  DELETE FROM evidence_packs WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE evidence_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY evidence_packs_tenant_policy ON evidence_packs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

**Migration 3: Add `evidence_pack_id` to decision/alert tables**

```sql
-- Add evidence_pack_id to alert_instances
ALTER TABLE alert_instances 
  ADD COLUMN IF NOT EXISTS evidence_pack_id UUID REFERENCES evidence_packs(id);

-- Add evidence_pack_id to decision_cards
ALTER TABLE decision_cards 
  ADD COLUMN IF NOT EXISTS evidence_pack_id UUID REFERENCES evidence_packs(id);

-- Add unique constraint for idempotency
ALTER TABLE alert_instances 
  ADD CONSTRAINT unique_alert_instance 
  UNIQUE (tenant_id, rule_id, grain_date, object_id)
  WHERE status = 'active';

ALTER TABLE decision_cards
  ADD CONSTRAINT unique_decision_card
  UNIQUE (tenant_id, alert_instance_id, metric_code, period)
  WHERE status IN ('OPEN', 'IN_PROGRESS');
```

**Migration 4: Create facade views**

```sql
-- v_fdp_truth_snapshot: Single entry point for FDP dashboard
CREATE OR REPLACE VIEW v_fdp_truth_snapshot AS
SELECT 
  tenant_id,
  MAX(as_of) as as_of,
  -- Core metrics from v_fdp_finance_summary
  SUM(net_revenue) as net_revenue,
  SUM(gross_profit) as gross_profit,
  SUM(contribution_margin) as contribution_margin,
  -- Cash metrics
  SUM(cash_in_bank) as cash_in_bank,
  SUM(accounts_receivable) as accounts_receivable,
  SUM(accounts_payable) as accounts_payable,
  -- Computed
  CASE WHEN SUM(net_revenue) > 0 
    THEN (SUM(gross_profit) / SUM(net_revenue)) * 100 
    ELSE 0 
  END as gross_margin_percent
FROM v_fdp_finance_summary
GROUP BY tenant_id;

-- Similar views for MDP, CDP, CT
-- (detailed SQL for each facade view)
```

---

### PHASE 4: Edge Function Hardening (Medium Priority)

**Update `supabase/functions/detect-alerts/index.ts`**

Add idempotency:

```typescript
// At top of serve function, after tenant validation:

// Check for existing running job
const lockKey = `detect-alerts:${tenantId}:${new Date().toISOString().split('T')[0]}`;

const { data: existingJob } = await supabase
  .from('job_runs')
  .select('id, status')
  .eq('lock_key', lockKey)
  .eq('status', 'running')
  .maybeSingle();

if (existingJob) {
  return new Response(JSON.stringify({ 
    success: false, 
    reason: 'Job already running',
    existing_job_id: existingJob.id 
  }), {
    status: 409,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Create job run record
const { data: jobRun, error: jobError } = await supabase
  .from('job_runs')
  .insert({
    tenant_id: tenantId,
    function_name: 'detect-alerts',
    lock_key: lockKey,
    status: 'running',
    input_params: { use_precalculated },
  })
  .select('id')
  .single();

if (jobError) {
  // Another instance grabbed the lock
  return new Response(JSON.stringify({ 
    success: false, 
    reason: 'Failed to acquire lock' 
  }), {
    status: 409,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const jobId = jobRun.id;

try {
  // ... existing detection logic ...
  
  // Update job as completed
  await supabase
    .from('job_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result,
    })
    .eq('id', jobId);

  return new Response(JSON.stringify({ success: true, result }), ...);
  
} catch (error) {
  // Update job as failed
  await supabase
    .from('job_runs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
    })
    .eq('id', jobId);
    
  throw error;
}
```

---

### PHASE 5: Documentation Updates (Low Priority)

**Update `docs/BLUECORE_SYSTEM_ARCHITECTURE_v1.4.1.md`**

1. Fix statistics discrepancy:
   - `src/hooks/cdp` shows "(2 files)" → Change to "CDP hooks distributed across root (~26 files with useCDP* prefix)"
   
2. Add DB vs Edge boundary section:
```text
## DB vs EDGE FUNCTION BOUNDARY

| Category | Where | Examples |
|----------|-------|----------|
| Aggregation/Computation | SQL Views | SUM, AVG, GROUP BY |
| Alert Detection Logic | SQL Views/Functions | Threshold comparison |
| Decision Card Generation | Edge Function | Orchestration only |
| Notification Dispatch | Edge Function | External I/O |
| AI Explanation | Edge Function | LLM calls |
| Sync/ETL | Edge Function + SQL | Watermark tracking |
| Reconciliation | SQL Functions | Cross-source validation |
```

3. Add Evidence lifecycle section
4. Add Job Idempotency requirements

---

## IMPLEMENTATION PRIORITY

```text
┌─────────────────────────────────────────────────────────────┐
│  WEEK 1: Foundation (Docs + Code Guardrails)                │
│  ├── SSOT_ENFORCEMENT_SPEC.md                               │
│  ├── JOB_IDEMPOTENCY_STANDARD.md                            │
│  ├── Update useTenantQueryBuilder (mode enforcement)        │
│  └── Create facadeViews.ts + evidenceContract.ts            │
├─────────────────────────────────────────────────────────────┤
│  WEEK 2: Database Schema                                     │
│  ├── job_runs table                                          │
│  ├── evidence_packs table                                    │
│  ├── Add evidence_pack_id FK                                 │
│  └── Create facade views                                     │
├─────────────────────────────────────────────────────────────┤
│  WEEK 3: Edge Function Hardening                             │
│  ├── detect-alerts idempotency                               │
│  ├── generate-decision-cards idempotency                     │
│  └── auto-measure-outcomes idempotency                       │
├─────────────────────────────────────────────────────────────┤
│  WEEK 4: Cleanup & Validation                                │
│  ├── Fix docs discrepancies                                  │
│  ├── Add smoke tests for tenant session                      │
│  └── E2E test SCHEMA vs RLS mode                             │
└─────────────────────────────────────────────────────────────┘
```

---

## SUCCESS CRITERIA

| Risk | Mitigation | Verification |
|------|------------|--------------|
| R1 Hook Sprawl | Facade views + hook rules | Hooks only call canonical views |
| R2 Non-idempotent | job_runs + lock_key | No duplicate alerts after 5min re-run |
| R3 Mixed Tenancy | Query context + warnings | Dev console shows mode warnings |
| R4 No Evidence | evidence_packs table | Every alert has evidence_pack_id |
| R6 Multiple SSOT | Canonical designation | docs/SSOT_ENFORCEMENT_SPEC.md |

---

## FILES TO CREATE/MODIFY

### New Files (5)
1. `docs/SSOT_ENFORCEMENT_SPEC.md`
2. `docs/JOB_IDEMPOTENCY_STANDARD.md`
3. `src/lib/ssot/facadeViews.ts`
4. `src/lib/ssot/evidenceContract.ts`
5. `src/lib/ssot/index.ts` (barrel export)

### Modified Files (4)
1. `src/hooks/useTenantQueryBuilder.ts` - Add mode enforcement + getQueryContext
2. `supabase/functions/detect-alerts/index.ts` - Add idempotency
3. `supabase/functions/generate-decision-cards/index.ts` - Add idempotency
4. `docs/BLUECORE_SYSTEM_ARCHITECTURE_v1.4.1.md` - Fix stats + add sections

### Database Migrations (4)
1. Create `job_runs` table
2. Create `evidence_packs` table
3. Add `evidence_pack_id` to alert/decision tables
4. Create facade views (v_*_truth_snapshot)

