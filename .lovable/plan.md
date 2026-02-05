
# Kế hoạch Migration Hoàn Thiện - Tất Cả Layers

## Tổng quan Tiến độ Hiện tại

| Layer | Tên | Status | % Hoàn thành |
|-------|-----|--------|--------------|
| 1 | Foundation | Partial | 40% |
| 1.5 | Ingestion | Missing | 0% |
| 2 | Master Model | Complete | 95% |
| 2.5 | Events/Marketing | Partial | 60% |
| 3 | KPI | Minimal | 20% |
| 4 | Alert/Decision | Complete | 90% |
| 5 | AI Query | Partial | 30% |
| 6 | Audit | Partial | 50% |
| 10 | BigQuery | Partial | 40% |

---

## Lý Do Các Layer Còn Thiếu

### Layer 1.5 (Ingestion) - 0%
- **Lý do**: Chưa được implement vì focus trước đó là Layer 2 (Data) và Layer 4 (Decisions)
- **Thiếu**: Hooks cho `ingestion_batches`, `data_watermarks`
- **Thiếu table mapping**: `ingestion_batches`, `data_watermarks`

### Layer 3 (KPI) - 20%
- **Lý do**: KPI logic đã được delegate sang precompute views (`kpi_facts_daily`)
- `useKPIData.ts` đã deprecated, sử dụng `useFinanceTruthSnapshot` thay thế
- **Thiếu**: `kpi_targets` table và hook tương ứng

### Layer 5 (AI Query) - 30%
- **Lý do**: AI hooks không nằm trong scope Phase 4-6 (Control Tower focus)
- Hooks như `useAIInsights`, `useHypothesisQuery`, `useProductForecast` vẫn dùng pattern cũ

### Layer 6 (Audit) - 50%
- **Lý do**: Non-critical business flow, được ưu tiên sau Core flows
- `useAuditLogs` đã có nhưng chưa migrate sang `useTenantQueryBuilder`

### Layer 10 (BigQuery) - 40%
- **Lý do**: Advanced feature cho Enterprise tier
- `useBigQueryRealtime` dùng Edge Functions, nhưng internal queries chưa migrate

---

## Phase 7: Migration Tuần Tự Hoàn Thiện

### Step 7.1: Layer 1 - Foundation Completion

**Files cần migrate:**

| File | Current State | Action |
|------|---------------|--------|
| `src/hooks/useOrganization.ts` | Uses raw supabase | Migrate to `useTenantQueryBuilder` |
| `src/hooks/useTeamMembers.ts` | Check pattern | Migrate if needed |

**Table Mapping thêm:**

```text
org_roles → user_roles
organization_members → organization_members
```

**Pattern cần apply:**

```text
// Before
const { data } = await supabase.from('organizations' as any).select('*')

// After  
const query = buildSelectQuery('organizations', '*')
```

---

### Step 7.2: Layer 1.5 - Ingestion (Mới)

**Files cần tạo mới:**

| File | Purpose |
|------|---------|
| `src/hooks/ingestion/useIngestionBatches.ts` | Track data import batches |
| `src/hooks/ingestion/useDataWatermarks.ts` | Track sync checkpoints |

**Table Mapping thêm:**

```text
ingestion_batches → ingestion_batches
data_watermarks → data_watermarks
sync_checkpoints → sync_checkpoints
```

**Edge Functions liên quan:**

- `sync-connector/index.ts` - Cần update để write vào ingestion_batches
- `scheduled-sync/index.ts` - Cần update watermark tracking

---

### Step 7.3: Layer 2.5 - Marketing Events Completion

**Files cần migrate:**

| File | Current State | Action |
|------|---------------|--------|
| `src/hooks/useChannelAnalytics.ts` | Check | Migrate |
| `src/hooks/usePlatformAdsData.ts` | Check | Migrate |
| `src/hooks/useMarketingProfitability.ts` | Check | Migrate |

**Table Mapping thêm:**

```text
marketing_events → commerce_events
ad_performance → master_ad_spend_daily
```

---

### Step 7.4: Layer 3 - KPI Completion

**Files cần migrate:**

| File | Current State | Action |
|------|---------------|--------|
| `src/hooks/useFinanceTruthSnapshot.ts` | Core SSOT | Verify useTenantQueryBuilder |
| `src/hooks/useFinanceTruthFacts.ts` | Uses kpi_facts | Migrate |

**Files cần tạo mới:**

| File | Purpose |
|------|---------|
| `src/hooks/kpi/useKPITargets.ts` | Track target vs actual |
| `src/hooks/kpi/useKPIDefinitions.ts` | Manage KPI metadata |

**Table Mapping thêm:**

```text
kpi_targets → kpi_targets
kpi_snapshots → kpi_facts_daily
```

**Database cần bổ sung:**

```sql
-- Thêm table kpi_targets nếu chưa có
CREATE TABLE IF NOT EXISTS kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  kpi_code TEXT NOT NULL,
  period_type TEXT DEFAULT 'monthly',
  period_value TEXT,
  target_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Step 7.5: Layer 5 - AI Query Completion

**Files cần migrate:**

| File | Current Issue | Action |
|------|---------------|--------|
| `src/hooks/useAIInsights.ts` | Uses `useTenantSupabaseCompat` | Migrate to `useTenantQueryBuilder` |
| `src/hooks/cdp/useHypothesisQuery.ts` | Uses raw `supabase` + `useTenantContext` | Full migration |
| `src/hooks/cdp/useProductForecast.ts` | Uses raw `supabase` + `useTenantContext` | Full migration |

**Table Mapping thêm:**

```text
v_cdp_customer_research → v_customer_research
v_cdp_product_benchmark → v_product_benchmark
v_cdp_category_conversion_stats → v_category_conversion_stats
v_cdp_customer_category_affinity → v_customer_category_affinity
cdp_product_forecasts → product_forecasts
cdp_segments → customer_segments
```

**Pattern cho useHypothesisQuery:**

```text
// Before
const { data } = await supabase
  .from('v_cdp_customer_research' as any)
  .select('*')
  .eq('tenant_id', tenantId);

// After
const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();
const query = buildSelectQuery('v_cdp_customer_research', '*');
```

---

### Step 7.6: Layer 6 - Audit Completion

**Files cần migrate:**

| File | Current State | Action |
|------|---------------|--------|
| `src/hooks/useAuditLogs.ts` | Uses `useTenantSupabaseCompat` | Migrate to `useTenantQueryBuilder` |
| `src/hooks/useCDPAudit.ts` | Uses `useTenantSupabaseCompat` | Migrate to `useTenantQueryBuilder` |
| `src/hooks/useAudit.ts` | Check | Migrate if needed |

**Table Mapping thêm:**

```text
v_cdp_customer_audit → v_customer_audit
event_logs → event_logs
```

---

### Step 7.7: Layer 10 - BigQuery Completion

**Files cần migrate:**

| File | Current State | Action |
|------|---------------|--------|
| `src/hooks/useBigQueryRealtime.ts` | Uses `useTenantSupabaseCompat` | Migrate to `useTenantQueryBuilder` |

**Table Mapping thêm:**

```text
bigquery_query_cache → query_cache
bigquery_sync_watermarks → sync_watermarks
bigquery_data_models → data_models
```

---

### Step 7.8: Edge Function Final Update - create-tenant-self

**File:** `supabase/functions/create-tenant-self/index.ts`

**Current State:** Gọi `provision_tenant_schema()` nhưng không theo tier

**Changes:**

```text
// Add tier-based provisioning
const { data: provisionResult, error: provisionError } = await serviceClient.rpc(
  'provision_tenant_by_tier',
  {
    p_tenant_id: tenant.id,
    p_slug: slug,
    p_tier: body.tier || 'midmarket'  // SMB không provision, Midmarket+ provision
  }
);
```

---

### Step 7.9: Remaining Hooks Migration (Batch)

**150+ hooks còn lại dùng `useTenantSupabaseCompat`:**

Priority order:

| Priority | Category | Estimated Files |
|----------|----------|-----------------|
| P1 | FDP hooks (Finance) | ~25 files |
| P2 | MDP hooks (Marketing) | ~15 files |
| P3 | CDP hooks (Customer) | ~30 files |
| P4 | Utility hooks | ~80 files |

**Pattern chung:**

```text
// Step 1: Thay import
- import { useTenantSupabaseCompat } from './useTenantSupabase';
+ import { useTenantQueryBuilder } from './useTenantQueryBuilder';

// Step 2: Thay hook call
- const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
+ const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

// Step 3: Thay query pattern
- let query = client.from('table_name').select('*');
- if (shouldAddTenantFilter) query = query.eq('tenant_id', tenantId);
+ const query = buildSelectQuery('table_name', '*');
```

---

## Summary: Files to Create/Modify

### New Files (4):

| File | Layer |
|------|-------|
| `src/hooks/ingestion/useIngestionBatches.ts` | 1.5 |
| `src/hooks/ingestion/useDataWatermarks.ts` | 1.5 |
| `src/hooks/kpi/useKPITargets.ts` | 3 |
| `src/hooks/kpi/useKPIDefinitions.ts` | 3 |

### Files to Migrate (15 priority):

| # | File | Layer |
|---|------|-------|
| 1 | `src/lib/tableMapping.ts` | Core |
| 2 | `src/hooks/useOrganization.ts` | 1 |
| 3 | `src/hooks/useFinanceTruthFacts.ts` | 3 |
| 4 | `src/hooks/useAIInsights.ts` | 5 |
| 5 | `src/hooks/cdp/useHypothesisQuery.ts` | 5 |
| 6 | `src/hooks/cdp/useProductForecast.ts` | 5 |
| 7 | `src/hooks/useAuditLogs.ts` | 6 |
| 8 | `src/hooks/useCDPAudit.ts` | 6 |
| 9 | `src/hooks/useBigQueryRealtime.ts` | 10 |
| 10 | `src/hooks/useChannelAnalytics.ts` | 2.5 |
| 11 | `src/hooks/usePlatformAdsData.ts` | 2.5 |
| 12 | `src/hooks/useMarketingProfitability.ts` | 2.5 |
| 13 | `src/hooks/useCDPScenarios.ts` | 5 |
| 14 | `src/hooks/useConnectorIntegrations.ts` | 1.5 |
| 15 | `supabase/functions/create-tenant-self/index.ts` | Edge |

### Table Mapping Additions (~25 new entries):

```text
// Layer 1 & 1.5
org_roles: 'user_roles',
ingestion_batches: 'ingestion_batches',
data_watermarks: 'data_watermarks',
sync_checkpoints: 'sync_checkpoints',

// Layer 2.5
marketing_events: 'commerce_events',
ad_performance: 'master_ad_spend_daily',

// Layer 3
kpi_targets: 'kpi_targets',
kpi_snapshots: 'kpi_facts_daily',

// Layer 5
v_cdp_customer_research: 'v_customer_research',
v_cdp_product_benchmark: 'v_product_benchmark',
v_cdp_category_conversion_stats: 'v_category_conversion_stats',
v_cdp_customer_category_affinity: 'v_customer_category_affinity',
cdp_product_forecasts: 'product_forecasts',
cdp_segments: 'customer_segments',

// Layer 6
v_cdp_customer_audit: 'v_customer_audit',
event_logs: 'event_logs',

// Layer 10
bigquery_query_cache: 'query_cache',
bigquery_sync_watermarks: 'sync_watermarks',
bigquery_data_models: 'data_models',
```

---

## Implementation Order (Tuần tự)

```text
Step 1: Extend tableMapping.ts với tất cả mappings mới
    ↓
Step 2: Migrate Layer 1 - useOrganization.ts
    ↓
Step 3: Create Layer 1.5 hooks - Ingestion
    ↓
Step 4: Migrate Layer 2.5 - Marketing hooks
    ↓
Step 5: Create Layer 3 hooks - KPI
    ↓
Step 6: Migrate Layer 5 hooks - AI Query (useHypothesisQuery, useProductForecast, useAIInsights)
    ↓
Step 7: Migrate Layer 6 - useAuditLogs, useCDPAudit
    ↓
Step 8: Migrate Layer 10 - useBigQueryRealtime
    ↓
Step 9: Update create-tenant-self với tier-based provisioning
    ↓
Step 10: Batch migrate remaining 150+ hooks
```

---

## Validation Checklist

- [ ] All new table mappings compile without TypeScript errors
- [ ] Layer 1 (Foundation) hooks work with useTenantQueryBuilder
- [ ] Layer 1.5 (Ingestion) hooks created and tested
- [ ] Layer 3 (KPI) hooks created and connected to precompute views
- [ ] Layer 5 (AI) hooks fully migrated
- [ ] Layer 6 (Audit) hooks fully migrated
- [ ] Layer 10 (BigQuery) hooks fully migrated
- [ ] create-tenant-self provisions schema by tier
- [ ] No cross-tenant data leakage in any layer
- [ ] All queries work for both SMB (shared) and Midmarket (dedicated)

---

## Technical Notes

### Backward Compatibility

Tất cả changes maintain backward compat:
- `useTenantQueryBuilder` auto-detects `isSchemaProvisioned`
- Non-provisioned tenants (SMB) continue using public schema + RLS
- Provisioned tenants (Midmarket+) use dedicated schema via search_path

### Không cần Database Migration

Các table mappings chỉ là alias translation:
- Nếu table đã tồn tại trong tenant schema → sử dụng
- Nếu chưa → fallback về public schema với RLS

### Edge Functions Pattern

```text
// All edge functions accessing tenant data MUST:
// 1. Call init_tenant_session first
await supabase.rpc('init_tenant_session', { p_tenant_id: tenantId });

// 2. Use master_* table names
const { data } = await supabase.from('master_orders').select('*');
```
