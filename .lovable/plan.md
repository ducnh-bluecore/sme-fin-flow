# Kế hoạch Migration: Schema-per-Tenant Architecture

## Tổng quan

Migrate từ kiến trúc **Shared DB + RLS** (hiện tại) sang **Schema-per-Tenant** để đạt:
- Physical data isolation hoàn toàn giữa các tenant
- Loại bỏ RLS overhead cho query performance
- Dễ dàng backup/restore từng tenant độc lập
- Hỗ trợ 20-30 triệu rows/tenant với query tối ưu

---

## ✅ Phase 1: Chuẩn bị Infrastructure (COMPLETED)

### 1.1 Database Functions ✅

Đã tạo các RPC functions:
- `set_tenant_schema(uuid)` - Set search_path cho tenant
- `get_tenant_schema()` - Lấy current schema
- `is_tenant_schema_provisioned(uuid)` - Kiểm tra schema đã tạo chưa
- `provision_tenant_schema(uuid, text)` - Tạo schema mới với all tables
- `migrate_tenant_data(uuid, text)` - Migrate data từ public sang tenant schema
- `get_tenant_schema_stats(uuid)` - Thống kê schema
- `get_tenant_table_list()` - List tables cần copy
- `get_tenant_view_list()` - List views cần copy

### 1.2 Frontend Wrapper ✅

- `src/integrations/supabase/tenantClient.ts` - Tenant-aware Supabase client
  - `useTenantSupabase()` - Hook auto-set schema
  - `useTenantSupabaseCompat()` - Backward compatible hook
  - `setTenantSchema()` - Direct schema switching
  - `getTenantSupabase()` - Async function for non-React
- `src/hooks/useTenantSupabase.ts` - Hook exports

### 1.3 Edge Functions ✅

- `provision-tenant-schema` - API để provision schema mới
- `migrate-tenant-data` - API để migrate data từng table

---

## ✅ Phase 2: Middleware Layer - Edge Functions (COMPLETED)

### 2.1 Cập nhật Auth Module ✅

File: `supabase/functions/_shared/auth.ts`

Đã thêm logic auto-set schema:
- Check `is_tenant_schema_provisioned()` khi authenticate
- Nếu provisioned: call `set_tenant_schema()` để switch search_path
- Return `isSchemaMode: boolean` trong `SecureContext`
- Backward compatible: nếu schema chưa provisioned, tiếp tục dùng shared DB mode

```typescript
export interface SecureContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  tenantSlug: string | null;
  email: string | null;
  role: string | null;
  isSchemaMode: boolean; // true = schema-per-tenant, false = shared DB
}
```

### 2.2 Create Tenant Schema API ✅ (DONE)

File: `supabase/functions/provision-tenant-schema/index.ts`

---

## 🔄 Phase 3: Frontend Refactoring (IN PROGRESS)

### 3.1 Supabase Client Wrapper ✅ (DONE)

- `src/integrations/supabase/tenantClient.ts`
- `src/hooks/useTenantSupabase.ts`
- `src/hooks/useTenantQueryBuilder.ts` - Helper for query building

### 3.2 FDP Hooks Refactored ✅ (DONE - 15 files)

| File | Status |
|------|--------|
| `useFinanceTruthSnapshot.ts` | ✅ Done |
| `usePLData.ts` | ✅ Done |
| `useExpenseBaselines.ts` | ✅ Done |
| `useCashFlowDirect.ts` | ✅ Done |
| `useExpensesDaily.ts` | ✅ Done |
| `usePLCache.ts` | ✅ Done |
| `useWorkingCapitalDaily.ts` | ✅ Done |
| `useWorkingCapital.ts` | ✅ Done |
| `useFDPFinanceSSOT.ts` | ✅ Done |
| `useExpenseEstimates.ts` | ✅ Done |
| `useExpensePlanSummary.ts` | ✅ Done |
| `useFinanceMonthlySummary.ts` | ✅ Done |
| `useCashForecastSSOT.ts` | ✅ Done |
| `useRetailConcentrationRisk.ts` | ✅ Done |
| `useExecutiveHealthScores.ts` | ✅ Done |

### 3.3 MDP Hooks ✅ (DONE - 12 files)

| File | Status |
|------|--------|
| `useMDPSSOT.ts` | ✅ Done |
| `useMDPData.ts` | ⏸️ Deprecated (thin wrapper for SSOT) |
| `useMDPDataSSOT.ts` | ⏸️ Wrapper uses useMDPSSOT |
| `useMDPDecisionSignals.ts` | ✅ Done |
| `useChannelPL.ts` | ✅ Done |
| `useChannelPLSSOT.ts` | ✅ Done |
| `useChannelAnalyticsCache.ts` | ✅ Done |
| `useChannelBudgets.ts` | ✅ Done |
| `usePlatformAdsData.ts` | ✅ Done |
| `useTopCustomersAR.ts` | ✅ Done |
| `useUpcomingPaymentAlerts.ts` | ✅ Done |

### 3.4 CDP Hooks ⏳ PENDING

| File | Status |
|------|--------|
| `useCDPOverview.ts` | ⏳ Pending |
| `useCDPSSOT.ts` | ⏳ Pending |
| `useCDPEquity.ts` | ⏳ Pending |
| + remaining CDP hooks (25 files) | ⏳ Pending |

### 3.5 Control Tower Hooks ⏳ PENDING

| File | Status |
|------|--------|
| `useControlTowerSSOT.ts` | ⏳ Pending |
| `useAlertInstances.ts` | ⏳ Pending |
| `useDecisionCards.ts` | ⏳ Pending |
| + remaining CT hooks (15 files) | ⏳ Pending |

---

## Phase 4: Data Migration (Tuần 9-12)

### 4.1 Migration Steps

1. Call `provision-tenant-schema` edge function để tạo schema
2. Call `migrate-tenant-data` cho từng table theo order

### 4.2 Migration Order (Data Dependencies)

```text
┌──────────────────────────────────────────────────────────────┐
│                    MIGRATION ORDER                           │
├──────────────────────────────────────────────────────────────┤
│ Layer 0: Master Data                                         │
│ └── products, customers, vendors, gl_accounts, etc.          │
│                         ↓                                    │
│ Layer 1: Transactional Data                                  │
│ └── invoices, bills, orders, payments, etc.                  │
│                         ↓                                    │
│ Layer 2: CDP Source Data                                     │
│ └── cdp_orders, cdp_customers, external_orders               │
│                         ↓                                    │
│ Layer 3: Computed Data (Materialized Views)                  │
│ └── cdp_customer_equity_computed, central_metrics_snapshots  │
│                         ↓                                    │
│ Layer 4: Alert/Control Tower Data                            │
│ └── early_warning_alerts, alert_instances, decision_logs     │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Rollback Strategy

```sql
-- Backup before migration
CREATE SCHEMA backup_pre_migration;
-- Copy critical tables to backup schema

-- Rollback procedure
CREATE OR REPLACE FUNCTION rollback_tenant_migration(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  -- Restore from backup
  -- Re-enable RLS on shared tables
  -- Update frontend to use shared DB mode
END;
$$;
```

---

## Phase 5: RLS Cleanup & Table Partitioning (Tuần 13-14)

### 5.1 Remove RLS Policies

Sau khi migrate xong, loại bỏ RLS trên shared tables:

```sql
-- Remove RLS policies (keep tables in public for backward compat)
ALTER TABLE public.cdp_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
-- ... for all 277 tables

-- Drop old policies
DROP POLICY IF EXISTS "tenant_isolation" ON public.cdp_orders;
-- ... for all policies
```

### 5.2 Table Partitioning trong Tenant Schema

Cho các bảng lớn (>10M rows), thêm partitioning:

```sql
-- Trong mỗi tenant schema
CREATE TABLE tenant_abc123.cdp_orders (
  id uuid,
  order_date date,
  -- ... columns WITHOUT tenant_id
) PARTITION BY RANGE (order_date);

-- Partitions by quarter
CREATE TABLE tenant_abc123.cdp_orders_2025_q1 
  PARTITION OF tenant_abc123.cdp_orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
```

---

## Phase 6: Testing & Validation (Tuần 15-16)

### 6.1 Test Cases

| Test | Description | Expected |
|------|-------------|----------|
| Tenant Isolation | Query from Tenant A cannot see Tenant B data | Pass |
| Schema Switching | User switching tenant sees correct data | Pass |
| Performance | 30M rows query < 2s | Pass |
| Edge Functions | All 43 functions work with new schema | Pass |
| Rollback | Can rollback to shared DB if needed | Pass |

### 6.2 Performance Benchmarks

```text
┌─────────────────────────────────────────────────────────────┐
│              EXPECTED PERFORMANCE COMPARISON                 │
├─────────────────────────────────────────────────────────────┤
│ Query Type          │ Shared+RLS  │ Schema-per-Tenant       │
├─────────────────────┼─────────────┼─────────────────────────┤
│ Simple SELECT       │ 50ms        │ 15ms (-70%)             │
│ Aggregation         │ 500ms       │ 150ms (-70%)            │
│ Join 3 tables       │ 800ms       │ 250ms (-69%)            │
│ 30M rows scan       │ 15s         │ 4s (-73%)               │
│ Dashboard load      │ 3s          │ 0.8s (-73%)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Timeline Tổng Quan

```text
Week 1-2:   Phase 1 - Infrastructure Setup ✅ COMPLETED
Week 3-4:   Phase 2 - Edge Functions Middleware ✅ COMPLETED
Week 5-8:   Phase 3 - Frontend Refactoring (185 files)
Week 9-12:  Phase 4 - Data Migration
Week 13-14: Phase 5 - RLS Cleanup + Partitioning
Week 15-16: Phase 6 - Testing & Go-Live

Total: ~4 months for full migration
```

---

## Rủi ro & Mitigation

| Rủi ro | Mức độ | Mitigation |
|--------|--------|------------|
| PostgREST không hỗ trợ dynamic schema | Cao | Sử dụng RPC wrapper thay vì direct table access |
| Migration downtime | Trung bình | Blue-green deployment với read replica |
| Cross-tenant reporting khó | Trung bình | Tạo aggregation schema riêng cho admin reports |
| 43 Edge Functions cần update | Trung bình | Refactor `_shared/auth.ts` để tự động set schema |
| Frontend 185 files cần update | Thấp | Có thể refactor dần dần, backward compatible |

---

## Chi tiết Kỹ thuật

### Database Changes Required ✅

1. **New Schemas**: 1 schema per tenant (dynamic creation)
2. **New Functions**: ✅
   - `set_tenant_schema(uuid)` 
   - `provision_tenant_schema(uuid, text)`
   - `get_tenant_schema()`
   - `is_tenant_schema_provisioned(uuid)`
   - `migrate_tenant_data(uuid, text)`
   - `get_tenant_schema_stats(uuid)`
   - `get_tenant_table_list()`
   - `get_tenant_view_list()`
3. **Modified Tables**: Remove `tenant_id` column from tenant-specific tables
4. **Removed RLS**: All 600+ policies on shared tables

### Frontend Changes Required ✅

1. **New Files**: ✅
   - `src/integrations/supabase/tenantClient.ts`
   - `src/hooks/useTenantSupabase.ts`

2. **Modified Files**:
   - 185 hook files to use new wrapper
   - `TenantContext.tsx` to trigger schema switch on tenant change

3. **Edge Functions**: ✅
   - `provision-tenant-schema` - Provision new tenant schema
   - `migrate-tenant-data` - Migrate data per table
   - `_shared/auth.ts` - Auto schema switching ✅

---

## Next Steps

1. **Phase 3**: Begin refactoring hooks module by module (CDP → FDP → Control Tower)
2. **Test**: Provision a test tenant schema and verify queries work correctly
3. **Optional**: Start data migration for one test tenant
