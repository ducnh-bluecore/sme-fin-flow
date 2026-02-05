
# Kế hoạch: Data Flow Migration - từ Public Schema sang Schema-per-Tenant

## Executive Summary

Migration các luồng data hiện tại từ **public schema (RLS-based)** sang **tenant schema (Schema-per-Tenant)** theo Architecture v1.4.1.

| Scope | Current | Target |
|-------|---------|--------|
| **Data Tables** | `cdp_orders`, `cdp_customers` (public) | `master_orders`, `master_customers` (tenant_xxx) |
| **Context** | `useTenantSupabaseCompat` + shouldAddTenantFilter | `useTenantSession` + init_tenant_session() |
| **Hooks Impact** | 163+ hooks | Migration theo priority |
| **Platform Data** | Mixed trong public | Separate `platform` schema |

---

## Phase 1: Update TenantContext Integration (Week 1)

### 1.1 Integrate `useTenantSession` vào TenantContext

**Files to modify:**
- `src/contexts/TenantContext.tsx`

**Changes:**
```typescript
// Add session initialization when tenant switches
import { useTenantSession } from '@/hooks/useTenantSession';

// Inside TenantProvider:
const { isSessionReady, sessionInfo, initSession } = useTenantSession();

// Add to context value:
const value = {
  ...existingValue,
  isSessionReady,
  sessionInfo,
  tenantTier: sessionInfo?.tier ?? 'midmarket',
};
```

### 1.2 Update `useTenantSupabaseCompat` to use Session

**Files to modify:**
- `src/integrations/supabase/tenantClient.ts`

**Changes:**
- Check if session is initialized via `init_tenant_session()`
- Use `current_tenant_id()` helper from DB
- Maintain backward compat for non-provisioned tenants

---

## Phase 2: Table Name Migration (Week 2)

### 2.1 Create Table Name Mapping

**Mapping từ cdp_* → master_***

| Current (public) | Target (tenant schema) | Hooks Using |
|------------------|------------------------|-------------|
| `cdp_orders` | `master_orders` | 21 files |
| `cdp_customers` | `master_customers` | 15+ files |
| `cdp_order_items` | `master_order_items` | 8+ files |
| `cdp_refunds` | `master_refunds` | 5+ files |
| `products` | `master_products` | 10+ files |
| `invoices` | `master_payments` | 7+ files |

### 2.2 Create Compatibility Layer

**New file:** `src/lib/tableMapping.ts`

```typescript
export const TABLE_MAP = {
  // Old name → New name (schema-provisioned mode)
  cdp_orders: 'master_orders',
  cdp_customers: 'master_customers',
  cdp_order_items: 'master_order_items',
  cdp_refunds: 'master_refunds',
  products: 'master_products',
  // ... more mappings
} as const;

export function getTableName(
  legacyName: keyof typeof TABLE_MAP, 
  isProvisioned: boolean
): string {
  return isProvisioned ? TABLE_MAP[legacyName] : legacyName;
}
```

### 2.3 Update `useTenantQueryBuilder`

**Files to modify:**
- `src/hooks/useTenantQueryBuilder.ts`

**Changes:**
- Add table name translation
- Auto-detect provisioned vs shared mode
- Route queries to correct table

```typescript
const buildQuery = useCallback(
  <T extends TableName>(tableName: T) => {
    const actualTable = isSchemaProvisioned 
      ? TABLE_MAP[tableName] ?? tableName 
      : tableName;
    
    const query = client.from(actualTable as any).select();
    
    if (!isSchemaProvisioned && tenantId) {
      return query.eq('tenant_id', tenantId);
    }
    
    return query;
  },
  [client, isSchemaProvisioned, tenantId]
);
```

---

## Phase 3: Priority Hook Migration (Week 3-4)

### 3.1 Tier 1: Core FDP Hooks (Critical Path)

| Hook | Current Table | Action |
|------|---------------|--------|
| `useFDPFinanceSSOT` | `central_metrics_snapshots` | Update to use session + platform schema for KPIs |
| `useFinanceTruthSnapshot` | `central_metrics_snapshots` | Update to use session |
| `usePLData` | `cdp_orders` | Migrate to `master_orders` via buildQuery |
| `useCashForecastSSOT` | Multiple | Update table references |

**Migration Pattern:**
```typescript
// Before
import { useTenantSupabaseCompat } from './useTenantSupabase';
const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

let query = client.from('cdp_orders').select('*');
if (shouldAddTenantFilter) {
  query = query.eq('tenant_id', tenantId);
}

// After
import { useTenantSession } from './useTenantSession';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

const { isSessionReady, sessionInfo } = useTenantSession();
const { buildQuery } = useTenantQueryBuilder();

// Table name auto-translated, tenant filter auto-applied
let query = buildQuery('cdp_orders'); // → master_orders if provisioned
```

### 3.2 Tier 2: MDP Hooks

| Hook | Action |
|------|--------|
| `useMDPSSOT` | Migrate cdp_orders → master_orders |
| `useMDPDataSSOT` | Update imports, use session |
| `useChannelPL` | Migrate to buildQuery |
| `useChannelPLSSOT` | Update table references |

### 3.3 Tier 3: CDP Hooks

| Hook | Action |
|------|--------|
| `useCDPEquity` | Migrate to master_customers |
| `useCDPOverview` | Update table references |
| `useCDPPopulations` | Migrate to session-based |
| `useCDPLTVEngine` | Migrate cdp_orders → master_orders |

### 3.4 Tier 4: Control Tower Hooks

| Hook | Action |
|------|--------|
| `useControlTowerSSOT` | Update to use session |
| `useDecisionCards` | Migrate to tenant schema |
| `useAlertInstances` | Migrate to tenant schema |

---

## Phase 4: Platform Data Access (Week 4)

### 4.1 Update Platform Data Hooks

**Files to update:**
- `src/hooks/usePlatformData.ts` (already created)

**Ensure queries use platform schema:**
```typescript
// Platform tables are in platform schema, accessed via search_path
// After init_tenant_session(), search_path = 'tenant_xxx, platform, public'

const { data } = await supabase
  .from('ai_metric_definitions') // → platform.ai_metric_definitions
  .select('*');
```

### 4.2 Migrate Alert/KPI Templates

| Current Location | Target | Notes |
|-----------------|--------|-------|
| `intelligent_alert_rules` (public) | `platform.alert_rule_templates` | Global templates |
| `kpi_definitions` (public) | `platform.kpi_definition_templates` | Global templates |
| `alert_instances` (public) | `{tenant}.alert_instances` | Tenant-specific |
| `decision_cards` (public) | `{tenant}.decision_cards` | Tenant-specific |

---

## Phase 5: Edge Function Updates (Week 5)

### 5.1 Functions Requiring Migration

| Function | Current | Changes Needed |
|----------|---------|----------------|
| `decision-snapshots` | Uses cdp_orders | Switch to tenant schema RPC |
| `analyze-contextual` | Uses cdp_orders | Switch to tenant schema RPC |
| `detect-cross-domain-alerts` | Uses cdp_orders | Switch to master_orders |
| `create-tenant-self` | Creates tenant | Add schema provisioning |

### 5.2 Add Schema Provisioning to Tenant Creation

**File:** `supabase/functions/create-tenant-self/index.ts`

```typescript
// After creating tenant record, provision schema
const { data: provisionResult } = await supabase.rpc('provision_tenant_by_tier', {
  p_tenant_id: tenant.id,
  p_slug: tenant.slug,
  p_tier: tier || 'midmarket'
});
```

---

## Phase 6: Cross-Module Hooks (Week 5-6)

### 6.1 Files in `src/hooks/cross-module/`

14 files cần update để sử dụng session context và table mapping:

| File | Tables Used | Action |
|------|-------------|--------|
| `useCDPRevenueAllocation.ts` | cdp_orders | Migrate |
| `useFDPLockedCosts.ts` | fdp_locked_costs | Keep (FDP specific) |
| `useCDPSegmentLTV.ts` | cdp_customers | Migrate to master_customers |
| `useMDPChannelROI.ts` | cdp_orders | Migrate to master_orders |
| ... | | |

---

## Phase 7: Testing & Validation (Week 6)

### 7.1 Create E2E Test Suite

**Test Scenarios:**

1. **SMB Tier (shared schema)**
   - Verify RLS still works
   - Confirm tenant_id filters applied

2. **Midmarket Tier (dedicated schema)**
   - Verify session initialization
   - Confirm search_path set correctly
   - Test table queries without tenant_id filter

3. **Data Isolation**
   - Cross-tenant query should fail
   - Same data accessible via session

### 7.2 Backward Compatibility Validation

```typescript
// Test: Hooks work in both modes
describe('useFDPFinanceSSOT', () => {
  it('works with shared schema (SMB)', async () => {
    // Mock isSchemaProvisioned = false
    // Verify tenant_id filter applied
  });
  
  it('works with tenant schema (Midmarket)', async () => {
    // Mock isSchemaProvisioned = true
    // Verify queries use master_orders without filter
  });
});
```

---

## Files to Create/Modify Summary

### New Files
| File | Purpose |
|------|---------|
| `src/lib/tableMapping.ts` | Table name translation cdp_* → master_* |
| `src/contexts/OrganizationContext.tsx` | Organization layer (already created) |
| `src/hooks/useTenantSession.ts` | Session management (already created) |
| `src/hooks/usePlatformData.ts` | Platform schema access (already created) |
| `src/hooks/useOrganization.ts` | Organization hooks (already created) |

### Modified Files (Priority Order)

| Priority | File | Changes |
|----------|------|---------|
| P0 | `TenantContext.tsx` | Integrate session init |
| P0 | `tenantClient.ts` | Update isReady logic |
| P0 | `useTenantQueryBuilder.ts` | Add table mapping |
| P1 | `useFDPFinanceSSOT.ts` | Use session + buildQuery |
| P1 | `useFinanceTruthSnapshot.ts` | Use session |
| P1 | `useMDPSSOT.ts` | Migrate to master_orders |
| P1 | `usePLData.ts` | Migrate to master_orders |
| P2 | 20+ hooks using cdp_orders | Migrate incrementally |
| P2 | Edge functions (4) | Update table references |
| P3 | Cross-module hooks (14) | Migrate to session |

---

## Migration Strategy: Feature Flag

```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_TENANT_SCHEMA: process.env.VITE_USE_TENANT_SCHEMA === 'true',
};

// In hooks:
if (FEATURE_FLAGS.USE_TENANT_SCHEMA && isSchemaProvisioned) {
  // Use new master_* tables
} else {
  // Use legacy cdp_* tables
}
```

---

## Rollback Plan

```text
IF migration fails:
├── Feature flag = false → All hooks use legacy tables
├── TenantContext → Keep existing useSwitchTenant logic
├── Database → cdp_* tables still exist, RLS still works
└── Edge functions → Revert to cdp_orders queries
```

---

## Success Metrics

1. **Query Performance**: < 50ms for typical queries (down from ~100ms with RLS overhead)
2. **Zero Data Leakage**: Cross-tenant queries blocked at schema level
3. **Backward Compat**: 100% existing features work during migration
4. **Provisioning Speed**: < 2 seconds for new tenant schema creation

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Context Integration | TenantContext + session init |
| 2 | Table Mapping | tableMapping.ts, useTenantQueryBuilder update |
| 3 | FDP/MDP Migration | Core finance hooks migrated |
| 4 | CDP/Platform | CDP hooks + platform data access |
| 5 | Edge Functions + Cross-module | 4 functions + 14 hooks |
| 6 | Testing + Rollout | E2E tests, feature flag rollout |
