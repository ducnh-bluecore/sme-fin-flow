# JOB IDEMPOTENCY STANDARD v1.4.2

> **Purpose**: Prevent duplicate alerts, race conditions, and non-idempotent edge function execution.
> 
> **Audience**: Backend Developers, DevOps Engineers
> 
> **Last Updated**: 2026-02-06

---

## 1. EXECUTIVE SUMMARY

Edge functions executing on schedules (5min, hourly, daily) MUST be idempotent. This standard defines:

1. **Lock Key Naming** - Unique identifiers for job instances
2. **Unique Keys for Inserts** - Database-level deduplication
3. **Job Lifecycle Tracking** - `job_runs` table for monitoring
4. **Retry Policy** - Backoff and dead-letter handling

---

## 2. THE PROBLEM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WITHOUT IDEMPOTENCY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   T+0:00    detect-alerts runs ────────────▶ Creates Alert #1               │
│   T+0:30    detect-alerts runs ────────────▶ Creates Alert #2 (DUPLICATE!)  │
│   T+1:00    detect-alerts runs ────────────▶ Creates Alert #3 (DUPLICATE!)  │
│                                                                             │
│   Result: 3 identical alerts for same condition                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         WITH IDEMPOTENCY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   T+0:00    detect-alerts runs ────────────▶ Creates Alert #1               │
│   T+0:30    detect-alerts runs ────────────▶ Skips (lock_key exists)        │
│   T+1:00    detect-alerts runs ────────────▶ Skips (lock_key exists)        │
│                                                                             │
│   Result: 1 alert, correctly deduplicated                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. LOCK KEY NAMING

### 3.1 Format

```
{function_name}:{tenant_id}:{grain_date}:{entity_hash}
```

| Component | Description | Example |
|-----------|-------------|---------|
| `function_name` | Edge function identifier | `detect-alerts` |
| `tenant_id` | Tenant UUID (shortened) | `tenant-abc123` |
| `grain_date` | Date granularity (YYYY-MM-DD) | `2026-02-06` |
| `entity_hash` | SHA256 of entity identifiers | `sha256(rule_id)` |

### 3.2 Examples

```typescript
// Alert detection (daily grain)
const lockKey = `detect-alerts:${tenantId}:${today}`;

// Decision card generation (per alert)
const lockKey = `gen-decision:${tenantId}:${alertId}:${today}`;

// Sync job (hourly grain)
const lockKey = `sync-bigquery:${tenantId}:${todayHour}`;

// CDP build (daily, no entity)
const lockKey = `cdp-build:${tenantId}:${today}`;
```

### 3.3 Hash Computation

When entity identification is complex:

```typescript
import { createHash } from 'crypto';

function computeEntityHash(entities: Record<string, any>): string {
  const canonical = JSON.stringify(
    Object.keys(entities).sort().map(k => [k, entities[k]])
  );
  return createHash('sha256').update(canonical).digest('hex').slice(0, 12);
}

// Usage
const hash = computeEntityHash({ rule_id: 'r123', sku: 'SKU001' });
// Result: "a3f2c9e1b4d7"
```

---

## 4. UNIQUE KEYS FOR INSERTS

### 4.1 Alert Instances

```sql
-- Unique constraint on alert_instances
ALTER TABLE alert_instances
ADD CONSTRAINT unique_alert_instance
UNIQUE NULLS NOT DISTINCT (
  tenant_id,
  alert_config_id,
  COALESCE(external_object_id, ''),
  DATE(created_at)
)
WHERE status IN ('active', 'open', 'triggered');
```

**Upsert pattern:**
```typescript
const { data, error } = await supabase
  .from('alert_instances')
  .upsert({
    tenant_id: tenantId,
    alert_config_id: ruleId,
    external_object_id: objectId,
    title: alertTitle,
    severity: 'warning',
    status: 'active',
    // ... other fields
  }, {
    onConflict: 'tenant_id,alert_config_id,external_object_id,created_at::date',
    ignoreDuplicates: true
  });
```

### 4.2 Decision Cards

```sql
-- Unique constraint on decision_cards
ALTER TABLE decision_cards
ADD CONSTRAINT unique_decision_card
UNIQUE NULLS NOT DISTINCT (
  tenant_id,
  alert_instance_id,
  metric_code,
  period_start
)
WHERE status IN ('OPEN', 'IN_PROGRESS');
```

### 4.3 Job Runs

```sql
-- Lock key is always unique
CREATE UNIQUE INDEX idx_job_runs_lock_key 
ON job_runs(lock_key) 
WHERE status = 'running';
```

---

## 5. JOB LIFECYCLE TABLE

### 5.1 Schema

```sql
CREATE TABLE job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  function_name TEXT NOT NULL,
  lock_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  input_params JSONB,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Computed duration
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
      ELSE NULL
    END
  ) STORED
);

-- Indexes
CREATE INDEX idx_job_runs_tenant_function 
  ON job_runs(tenant_id, function_name, created_at DESC);
CREATE INDEX idx_job_runs_status 
  ON job_runs(status) WHERE status = 'running';
CREATE UNIQUE INDEX idx_job_runs_lock_active 
  ON job_runs(lock_key) WHERE status = 'running';

-- RLS
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY job_runs_tenant_policy ON job_runs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 5.2 State Machine

```
┌─────────────┐
│   (start)   │
└──────┬──────┘
       │ insert
       ▼
┌─────────────┐
│   running   │◀──────────────────┐
└──────┬──────┘                   │
       │                          │ retry (if retry_count < 3)
       ├──── success ────▶ ┌─────────────┐
       │                   │  completed  │
       │                   └─────────────┘
       │
       └──── failure ────▶ ┌─────────────┐
                          │   failed    │
                          └─────────────┘
                                 │
                                 │ manual cancel
                                 ▼
                          ┌─────────────┐
                          │  cancelled  │
                          └─────────────┘
```

---

## 6. RETRY POLICY

### 6.1 Default Policy

| Parameter | Value |
|-----------|-------|
| Max Retries | 3 |
| Initial Delay | 1 second |
| Backoff Multiplier | 5x |
| Max Delay | 30 seconds |

**Backoff sequence:** 1s → 5s → 25s → (fail)

### 6.2 Implementation

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffMultiplier?: number;
    maxDelayMs?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 5,
    maxDelayMs = 30000,
  } = options;

  let lastError: Error;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        await sleep(Math.min(delay, maxDelayMs));
        delay *= backoffMultiplier;
      }
    }
  }

  throw lastError!;
}
```

### 6.3 Dead Letter Handling

When all retries exhausted:

```typescript
// Insert to sync_errors for manual review
await supabase.from('sync_errors').insert({
  tenant_id: tenantId,
  error_type: 'job_failure',
  error_code: 'MAX_RETRIES_EXCEEDED',
  error_message: error.message,
  error_details: {
    function_name: functionName,
    lock_key: lockKey,
    input_params: inputParams,
    retry_count: maxRetries,
    last_attempt_at: new Date().toISOString(),
  },
  source_entity_type: 'job_run',
  source_entity_id: jobId,
  is_resolved: false,
});
```

---

## 7. FUNCTION CATEGORIES

### 7.1 Current Status

| Function | Frequency | Idempotent? | Priority |
|----------|-----------|-------------|----------|
| `detect-alerts` | 5min | ⚠️ NEEDS FIX | HIGH |
| `generate-decision-cards` | 15min | ⚠️ NEEDS FIX | HIGH |
| `auto-measure-outcomes` | daily | ⚠️ NEEDS FIX | MEDIUM |
| `process-alert-notifications` | event | ⚠️ NEEDS FIX | MEDIUM |
| `scheduled-cdp-build` | daily | ✅ OK | - |
| `sync-bigquery` | hourly | ✅ OK | - |
| `sync-ecommerce-data` | hourly | ✅ OK | - |

### 7.2 Implementation Checklist

- [ ] Add lock_key generation
- [ ] Add job_runs insert at start
- [ ] Add job_runs update on completion
- [ ] Add job_runs update on failure
- [ ] Add retry logic with backoff
- [ ] Add dead-letter to sync_errors
- [ ] Add unique constraints to output tables

---

## 8. EDGE FUNCTION TEMPLATE

### 8.1 Idempotent Function Template

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // 1. Parse request and validate
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      throw new Error('tenant_id required');
    }

    // 2. Generate lock key
    const today = new Date().toISOString().split('T')[0];
    const lockKey = `my-function:${tenant_id}:${today}`;

    // 3. Check for existing running job
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
        existing_job_id: existingJob.id,
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Create job run record
    const { data: jobRun, error: jobError } = await supabase
      .from('job_runs')
      .insert({
        tenant_id,
        function_name: 'my-function',
        lock_key: lockKey,
        status: 'running',
        input_params: { /* ... */ },
      })
      .select('id')
      .single();

    if (jobError) {
      // Race condition - another instance grabbed the lock
      return new Response(JSON.stringify({
        success: false,
        reason: 'Failed to acquire lock',
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jobId = jobRun.id;

    try {
      // 5. Execute main logic
      const result = await executeMainLogic(supabase, tenant_id);

      // 6. Mark job as completed
      await supabase
        .from('job_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result,
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({
        success: true,
        job_id: jobId,
        result,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // 7. Mark job as failed
      await supabase
        .from('job_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq('id', jobId);

      // 8. Dead letter for manual review
      await supabase.from('sync_errors').insert({
        tenant_id,
        error_type: 'job_failure',
        error_code: 'EXECUTION_ERROR',
        error_message: error.message,
        source_entity_type: 'job_run',
        source_entity_id: jobId,
        is_resolved: false,
      });

      throw error;
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeMainLogic(supabase: any, tenantId: string) {
  // Your business logic here
  // Use UPSERT with onConflict for idempotent inserts
  return { processed: 0 };
}
```

---

## 9. MONITORING & ALERTING

### 9.1 Key Metrics

| Metric | Query | Alert Threshold |
|--------|-------|-----------------|
| Failed jobs (24h) | `status = 'failed' AND created_at > now() - '24h'` | > 5 |
| Long-running jobs | `status = 'running' AND started_at < now() - '30min'` | Any |
| Retry rate | `retry_count > 0` / total | > 10% |

### 9.2 Dashboard Query

```sql
-- Job health summary
SELECT 
  function_name,
  status,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END) as retried_count
FROM job_runs
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY function_name, status
ORDER BY function_name, status;
```

---

## 10. MIGRATION PATH

### Phase 1: Infrastructure (This Sprint)
1. Create `job_runs` table
2. Update edge functions with lock_key check
3. Add unique constraints to alert/decision tables

### Phase 2: Monitoring (Next Sprint)
1. Create job health dashboard
2. Add alerting for failed jobs
3. Create dead-letter review workflow

### Phase 3: Optimization (Future)
1. Add job scheduling UI
2. Add manual retry capability
3. Add job dependency chains

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-06 | System | Initial standard |
