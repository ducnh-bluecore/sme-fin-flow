
# Kế hoạch: Data Flow Migration - Phase 4-6

## Tổng quan Phase 4-6

| Phase | Scope | Files |
|-------|-------|-------|
| **Phase 4** | Control Tower + CDP Hooks | 11 files |
| **Phase 5** | Cross-Module Hooks (còn lại) | 8 files |
| **Phase 6** | Edge Functions | 4 priority functions |

---

## Phase 4: Control Tower + CDP Hooks

### 4.1 Control Tower Hooks (5 files)

| File | Current Import | Changes |
|------|----------------|---------|
| `control-tower/usePendingFollowups.ts` | `useTenantSupabaseCompat` | Use `useTenantQueryBuilder` for view queries |
| `control-tower/useEstimatedActualImpact.ts` | `useTenantSupabaseCompat` | Use `callRpc` from query builder |
| `control-tower/useDecisionEffectiveness.ts` | `useTenantSupabaseCompat` | Use `buildSelectQuery` for view |
| `control-tower/useOutcomeRecording.ts` | `useTenantSupabaseCompat` | Use `buildInsertQuery`, `buildUpdateQuery` |
| `control-tower/useLearningInsights.ts` | `useTenantSupabaseCompat` | Update to session-based |

**Pattern:**
```typescript
// Before
let query = client.from('v_decision_pending_followup').select('*');
if (shouldAddTenantFilter) query = query.eq('tenant_id', tenantId);

// After
const query = buildSelectQuery('v_decision_pending_followup', '*');
```

### 4.2 CDP Hooks (6 files)

| File | Current Table | Target Table | Action |
|------|---------------|--------------|--------|
| `useCDPDecisionCards.ts` | `cdp_decision_cards` | `decision_cards` | Use buildQuery with table mapping |
| `cdp/useHypothesisQuery.ts` | TBD | TBD | Update to session-based |
| `cdp/useProductForecast.ts` | TBD | TBD | Update to session-based |

**Table Mapping cần thêm:**
```typescript
// Thêm vào src/lib/tableMapping.ts
cdp_decision_cards: 'decision_cards',
v_cdp_decision_cards_detail: 'v_decision_cards_detail',
v_decision_pending_followup: 'v_decision_pending_followup',
v_decision_effectiveness: 'v_decision_effectiveness',
decision_outcome_records: 'decision_outcomes',
alert_instances: 'alert_instances',
```

---

## Phase 5: Cross-Module Hooks (8 files còn lại)

### 5.1 Files cần migrate

| File | Current State | Changes Required |
|------|---------------|------------------|
| `useCDPChurnSignals.ts` | Uses `useTenantSupabaseCompat` | Use `callRpc`, `buildSelectQuery` |
| `useCDPCohortCAC.ts` | Uses `useTenantSupabaseCompat` | Use `callRpc`, `buildSelectQuery` |
| `useCDPCreditRisk.ts` | Uses `useTenantSupabaseCompat` | Use `buildSelectQuery` |
| `useControlTowerPriorityQueue.ts` | Uses `useTenantSupabaseCompat` | Use `buildQuery`, `buildUpdateQuery` |
| `useCrossModuleVarianceAlerts.ts` | Uses `useTenantSupabaseCompat` | Use `buildQuery`, `buildUpdateQuery` |
| `useMDPSeasonalPatterns.ts` | Uses `useTenantSupabaseCompat` | Use `callRpc`, `buildSelectQuery` |
| `useMDPAcquisitionSource.ts` | Uses `useTenantSupabaseCompat` | Use `callRpc` |
| `useMDPAttributionPush.ts` | Already migrated | Verify working |

### 5.2 Table Mapping bổ sung

```typescript
// Thêm vào TABLE_MAP
cdp_churn_signals: 'churn_signals',
cdp_customer_cohort_cac: 'customer_cohort_cac',
cdp_customer_credit_risk: 'customer_credit_risk',
control_tower_priority_queue: 'priority_queue',
cross_domain_variance_alerts: 'variance_alerts',
mdp_seasonal_patterns: 'seasonal_patterns',
```

---

## Phase 6: Edge Functions (4 priority)

### 6.1 Functions cần update

| Function | Current Query | Changes |
|----------|---------------|---------|
| `create-tenant-self` | Creates tenant only | Add `provision_tenant_by_tier()` call |
| `decision-snapshots` | Uses `cdp_orders` | Switch to tenant schema via RPC |
| `detect-cross-domain-alerts` | Uses `cdp_orders` | Use tenant context |
| `analyze-contextual` | Uses `cdp_orders` | Use tenant context |

### 6.2 Create-tenant-self changes

```typescript
// Sau khi tạo tenant record
const { data: provisionResult, error: provisionError } = await supabase.rpc(
  'provision_tenant_by_tier',
  {
    p_tenant_id: tenant.id,
    p_slug: tenant.slug,
    p_tier: tier || 'midmarket'
  }
);
```

### 6.3 Edge Function Pattern

```typescript
// Before - direct table access
const { data } = await supabase
  .from('cdp_orders')
  .select('*')
  .eq('tenant_id', tenantId);

// After - use init_tenant_session + search_path
await supabase.rpc('init_tenant_session', { p_tenant_id: tenantId });
const { data } = await supabase
  .from('master_orders') // Now resolves via search_path
  .select('*');
```

---

## Files to Modify Summary

### Phase 4 (11 files)

| Priority | File | Type |
|----------|------|------|
| P1 | `src/lib/tableMapping.ts` | Add new mappings |
| P1 | `src/hooks/control-tower/usePendingFollowups.ts` | Migrate |
| P1 | `src/hooks/control-tower/useEstimatedActualImpact.ts` | Migrate |
| P1 | `src/hooks/control-tower/useDecisionEffectiveness.ts` | Migrate |
| P1 | `src/hooks/control-tower/useOutcomeRecording.ts` | Migrate |
| P1 | `src/hooks/control-tower/useLearningInsights.ts` | Migrate |
| P2 | `src/hooks/useCDPDecisionCards.ts` | Migrate |
| P2 | `src/hooks/cdp/useHypothesisQuery.ts` | Migrate |
| P2 | `src/hooks/cdp/useProductForecast.ts` | Migrate |

### Phase 5 (8 files)

| Priority | File |
|----------|------|
| P2 | `src/hooks/cross-module/useCDPChurnSignals.ts` |
| P2 | `src/hooks/cross-module/useCDPCohortCAC.ts` |
| P2 | `src/hooks/cross-module/useCDPCreditRisk.ts` |
| P2 | `src/hooks/cross-module/useControlTowerPriorityQueue.ts` |
| P2 | `src/hooks/cross-module/useCrossModuleVarianceAlerts.ts` |
| P2 | `src/hooks/cross-module/useMDPSeasonalPatterns.ts` |
| P2 | `src/hooks/cross-module/useMDPAcquisitionSource.ts` |

### Phase 6 (4 edge functions)

| Priority | Function |
|----------|----------|
| P1 | `supabase/functions/create-tenant-self/index.ts` |
| P2 | `supabase/functions/decision-snapshots/index.ts` |
| P2 | `supabase/functions/detect-cross-domain-alerts/index.ts` |
| P3 | `supabase/functions/analyze-contextual/index.ts` |

---

## Implementation Order

1. **Step 1**: Extend `tableMapping.ts` với tất cả mappings mới
2. **Step 2**: Migrate Control Tower hooks (5 files)
3. **Step 3**: Migrate CDP hooks (3 files)
4. **Step 4**: Migrate remaining cross-module hooks (7 files)
5. **Step 5**: Update edge function `create-tenant-self` với schema provisioning
6. **Step 6**: Update các edge functions còn lại

---

## Backward Compatibility

Tất cả migrations đều maintain backward compat:
- `useTenantQueryBuilder` auto-detects `isSchemaProvisioned`
- Non-provisioned tenants continue using public schema + RLS
- No breaking changes to existing queries

---

## Validation Checklist

- [ ] All hooks compile without TypeScript errors
- [ ] Queries work for non-provisioned tenants (SMB tier)
- [ ] Queries work for provisioned tenants (Midmarket tier)
- [ ] Edge functions successfully provision new tenant schemas
- [ ] No cross-tenant data leakage
