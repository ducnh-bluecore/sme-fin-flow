
# Kế hoạch Migration: Schema-per-Tenant Architecture

## Tổng quan

Migrate từ kiến trúc **Shared DB + RLS** (hiện tại) sang **Schema-per-Tenant** để đạt:
- Physical data isolation hoàn toàn giữa các tenant
- Loại bỏ RLS overhead cho query performance
- Dễ dàng backup/restore từng tenant độc lập
- Hỗ trợ 20-30 triệu rows/tenant với query tối ưu

---

## Phase 1: Chuẩn bị Infrastructure (Tuần 1-2)

### 1.1 Tạo Schema Template

Tạo template schema chứa tất cả 277 tables, 159 views, indexes:

```text
┌────────────────────────────────────────────────────────────┐
│                     DATABASE STRUCTURE                      │
├────────────────────────────────────────────────────────────┤
│  public (shared)                                           │
│  ├── tenants                 (tenant registry)             │
│  ├── tenant_users            (user-tenant mapping)         │
│  ├── profiles                (user profiles)               │
│  ├── user_roles              (super admin roles)           │
│  └── _template_tables/       (migration templates)         │
├────────────────────────────────────────────────────────────┤
│  tenant_abc123 (per-tenant schema)                         │
│  ├── products, customers, invoices...                      │
│  ├── cdp_orders, cdp_customers...                          │
│  ├── v_channel_performance, v_cdp_overview...              │
│  └── (277 tables + 159 views per tenant)                   │
├────────────────────────────────────────────────────────────┤
│  tenant_xyz789 (another tenant)                            │
│  └── (same structure as above)                             │
└────────────────────────────────────────────────────────────┘
```

### 1.2 RPC Functions cho Schema Switching

Tạo các functions để dynamic schema routing:

```sql
-- Function: Set search_path based on active tenant
CREATE OR REPLACE FUNCTION set_tenant_schema(p_tenant_id uuid)
RETURNS void AS $$
DECLARE
  v_schema_name text;
BEGIN
  SELECT 'tenant_' || slug INTO v_schema_name
  FROM public.tenants WHERE id = p_tenant_id;
  
  EXECUTE format('SET search_path TO %I, public', v_schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get current tenant schema
CREATE OR REPLACE FUNCTION get_tenant_schema()
RETURNS text AS $$
BEGIN
  RETURN current_setting('search_path');
END;
$$ LANGUAGE sql;
```

### 1.3 Tenant Provisioning Function

```sql
-- Function: Create new tenant schema with all tables
CREATE OR REPLACE FUNCTION provision_tenant_schema(
  p_tenant_id uuid,
  p_slug text
) RETURNS void AS $$
DECLARE
  v_schema_name text := 'tenant_' || p_slug;
BEGIN
  -- Create schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema_name);
  
  -- Copy all tables from template
  FOR rec IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
             AND tablename NOT IN ('tenants', 'tenant_users', 'profiles', 'user_roles')
  LOOP
    EXECUTE format(
      'CREATE TABLE %I.%I (LIKE public.%I INCLUDING ALL)',
      v_schema_name, rec.tablename, rec.tablename
    );
  END LOOP;
  
  -- Copy all views
  -- (similar logic for views)
  
  -- Grant permissions
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', v_schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', v_schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 2: Middleware Layer - Edge Functions (Tuần 3-4)

### 2.1 Cập nhật Auth Module

File: `supabase/functions/_shared/auth.ts`

Thêm logic set schema trước mỗi query:

```typescript
// Hiện tại
export async function requireAuth(req: Request): Promise<SecureContext | Response> {
  // ... validate JWT
  // ... get tenantId from tenant_users
  return { supabase, userId, tenantId, email, role };
}

// Sau migration
export async function requireAuth(req: Request): Promise<SecureContext | Response> {
  // ... validate JWT
  // ... get tenant slug from public.tenants
  
  // Set schema cho tenant
  await supabase.rpc('set_tenant_schema', { p_tenant_id: tenantId });
  
  return { supabase, userId, tenantId, tenantSlug, email, role };
}
```

### 2.2 Create Tenant Schema API

File: `supabase/functions/provision-tenant-schema/index.ts`

```typescript
// Khi tạo tenant mới, tự động provision schema
Deno.serve(async (req) => {
  const { tenantId, slug } = await req.json();
  
  // Validate admin permission
  // Call provision_tenant_schema RPC
  // Migrate initial data if needed
  
  return new Response(JSON.stringify({ success: true }));
});
```

---

## Phase 3: Frontend Refactoring (Tuần 5-8)

### 3.1 Supabase Client Wrapper

Tạo wrapper để auto-set schema:

File: `src/integrations/supabase/tenantClient.ts`

```typescript
import { supabase } from './client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export async function getTenantSupabase() {
  const tenantId = await getCurrentTenantId();
  
  // Call RPC to set search_path
  await supabase.rpc('set_tenant_schema', { p_tenant_id: tenantId });
  
  return supabase;
}

// Hook version for React components
export function useTenantSupabase() {
  const { data: tenantId } = useActiveTenantId();
  
  useEffect(() => {
    if (tenantId) {
      supabase.rpc('set_tenant_schema', { p_tenant_id: tenantId });
    }
  }, [tenantId]);
  
  return supabase;
}
```

### 3.2 Refactor All Hooks (185 files)

Loại bỏ `.eq('tenant_id', tenantId)` vì schema đã isolate:

```typescript
// TRƯỚC (Shared DB + RLS)
export function useCDPOrders() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryFn: async () => {
      const { data } = await supabase
        .from('cdp_orders')
        .select('*')
        .eq('tenant_id', tenantId)  // <-- RLS filter
        .range(0, 999);
      return data;
    },
    enabled: !!tenantId,
  });
}

// SAU (Schema-per-Tenant)
export function useCDPOrders() {
  const tenantSupabase = useTenantSupabase();
  
  return useQuery({
    queryFn: async () => {
      // Schema already set by wrapper
      const { data } = await tenantSupabase
        .from('cdp_orders')  // Queries tenant_xxx.cdp_orders
        .select('*')
        .range(0, 999);
      return data;
    },
  });
}
```

### 3.3 Files cần refactor

| Module | Files | Priority |
|--------|-------|----------|
| CDP Hooks | 25 files | High |
| FDP Hooks | 30 files | High |
| Control Tower | 15 files | High |
| MDP Hooks | 12 files | Medium |
| Settings/Admin | 20 files | Medium |
| Other | 83 files | Low |

---

## Phase 4: Data Migration (Tuần 9-12)

### 4.1 Migration Script Template

```sql
-- Migration cho từng tenant
DO $$
DECLARE
  v_tenant RECORD;
  v_schema_name text;
BEGIN
  FOR v_tenant IN SELECT id, slug FROM public.tenants WHERE is_active = true
  LOOP
    v_schema_name := 'tenant_' || v_tenant.slug;
    
    -- Provision schema nếu chưa có
    PERFORM provision_tenant_schema(v_tenant.id, v_tenant.slug);
    
    -- Migrate data từ shared tables
    EXECUTE format('
      INSERT INTO %I.products 
      SELECT * FROM public.products WHERE tenant_id = %L
    ', v_schema_name, v_tenant.id);
    
    -- Repeat for all 277 tables...
    
    RAISE NOTICE 'Migrated tenant: %', v_tenant.slug;
  END LOOP;
END $$;
```

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

CREATE TABLE tenant_abc123.cdp_orders_2025_q2 
  PARTITION OF tenant_abc123.cdp_orders
  FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
-- etc.
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
Week 1-2:   Phase 1 - Infrastructure Setup
Week 3-4:   Phase 2 - Edge Functions Middleware
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

### Database Changes Required

1. **New Schemas**: 1 schema per tenant (dynamic creation)
2. **New Functions**: 
   - `set_tenant_schema(uuid)` 
   - `provision_tenant_schema(uuid, text)`
   - `get_tenant_schema()`
3. **Modified Tables**: Remove `tenant_id` column from tenant-specific tables
4. **Removed RLS**: All 600+ policies on shared tables

### Frontend Changes Required

1. **New Files**:
   - `src/integrations/supabase/tenantClient.ts`
   - `src/hooks/useTenantSupabase.ts`

2. **Modified Files**:
   - 185 hook files to use new wrapper
   - `TenantContext.tsx` to trigger schema switch on tenant change

3. **Edge Functions**:
   - `_shared/auth.ts` - Add schema switching logic
   - All 43 functions to use updated auth module
