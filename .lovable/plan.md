

# Kế hoạch: Architecture v1.4.1 - Address 3 Critical Risks

## Executive Summary

Expert feedback đã xác nhận architecture schema-per-tenant là đúng hướng (9/10), nhưng cần address **3 CRITICAL RISKS** trước khi scale:

| Risk | Problem | Solution |
|------|---------|----------|
| **#1 Migration Explosion** | Mỗi ALTER TABLE phải chạy 200+ lần khi có 200 tenants | Template Schema Pattern |
| **#2 Connection Pool Hell** | Schema switching per query gây pool fragmentation | Session-based Context |
| **#3 AI Layer Misplacement** | AI metadata bị silo trong tenant → mất ML leverage | Control Plane Split |

**Bonus Strategic Move**: Tenant Tiering (SMB=shared, Mid-market=schema, Enterprise=database)

---

## Current State Analysis

### Public Schema: 285+ tables (quá nhiều)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT PUBLIC SCHEMA STATUS                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  AI-Related Tables (hiện ở public - SHOULD BE GLOBAL):                          │
│  ├── ai_advisor_config, ai_advisor_responses, ai_predictions                   │
│  ├── ai_usage_logs, ml_training_samples                                        │
│  └── bigquery_configs, bigquery_data_models, bigquery_query_cache              │
│                                                                                 │
│  Alert/Decision Tables (hiện ở public - MIX GLOBAL + TENANT):                   │
│  ├── intelligent_alert_rules, predictive_alert_rules (SHOULD BE GLOBAL)        │
│  ├── alert_instances, decision_cards (SHOULD BE PER-TENANT)                    │
│  └── control_tower_priority_queue (SHOULD BE PER-TENANT)                       │
│                                                                                 │
│  Business Tables (hiện ở public - SHOULD BE PER-TENANT):                        │
│  ├── cdp_orders, cdp_customers, cdp_order_items                                │
│  ├── products, invoices, payments                                              │
│  └── ... 270+ more tables                                                      │
│                                                                                 │
│  Tenant Schemas: NONE PROVISIONED                                              │
│  └── provision_tenant_schema() copies ALL tables (risky)                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Solution Architecture: Control Plane + Data Plane Split

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TARGET ARCHITECTURE v1.4.1                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    CONTROL PLANE (platform schema)                      │   │
│  │                    Shared across all tenants                            │   │
│  │                                                                         │   │
│  │   Auth & Tenant Management (existing public):                           │   │
│  │     profiles, tenants, tenant_users, tenant_roles                       │   │
│  │                                                                         │   │
│  │   AI Registry (NEW - cross-tenant learning):                            │   │
│  │     ai_metric_definitions, ai_dimension_catalog, ai_semantic_models,    │   │
│  │     ai_query_templates, ai_model_registry                               │   │
│  │                                                                         │   │
│  │   Rule Registry (NEW - shared business rules):                          │   │
│  │     kpi_definition_templates, alert_rule_templates,                     │   │
│  │     decision_taxonomy, insight_taxonomy                                 │   │
│  │                                                                         │   │
│  │   Platform Config:                                                      │   │
│  │     feature_flags, billing_plans, global_source_platforms               │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    TEMPLATE SCHEMA (tenant_template)                    │   │
│  │                    Source of truth for tenant structure                 │   │
│  │                                                                         │   │
│  │   53 business tables organized by layer                                 │   │
│  │   All migrations apply HERE FIRST, then replicate                       │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    DATA PLANE (tenant_xxx schemas)                      │   │
│  │                    Isolated per tenant                                  │   │
│  │                                                                         │   │
│  │   tenant_vinamilk:                                                      │   │
│  │     organizations, master_orders, master_customers, etc.                │   │
│  │     ai_conversations, ai_query_history (tenant-specific queries)        │   │
│  │     alert_instances, decision_cards (tenant-specific events)            │   │
│  │                                                                         │   │
│  │   tenant_masan:                                                         │   │
│  │     ... (same structure from template)                                  │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Template Schema Pattern (Fixes RISK #1)

### 1.1 Create Template Schema

```sql
-- Create template schema (never used directly, only as source)
CREATE SCHEMA tenant_template;

-- All tenant tables defined here ONCE
CREATE TABLE tenant_template.organizations (...);
CREATE TABLE tenant_template.master_orders (...);
-- ... 53 tables total
```

### 1.2 New Provisioning Function

```sql
CREATE OR REPLACE FUNCTION public.provision_tenant_from_template(
  p_tenant_id uuid,
  p_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_name text := 'tenant_' || p_slug;
  v_table_count int := 0;
  v_rec RECORD;
BEGIN
  -- Create schema from template using pg_dump-like approach
  FOR v_rec IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_template'
  LOOP
    EXECUTE format(
      'CREATE TABLE %I.%I (LIKE tenant_template.%I INCLUDING ALL)',
      v_schema_name, v_rec.tablename, v_rec.tablename
    );
    v_table_count := v_table_count + 1;
  END LOOP;
  
  -- Copy constraints, indexes, triggers from template
  PERFORM copy_template_constraints(v_schema_name);
  
  RETURN jsonb_build_object('tables_created', v_table_count);
END;
$$;
```

### 1.3 Migration Pipeline Function

```sql
-- Apply migration to template, then auto-replicate to all tenants
CREATE OR REPLACE FUNCTION public.apply_tenant_migration(
  p_migration_sql text,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant RECORD;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Step 1: Apply to template first
  EXECUTE replace(p_migration_sql, '{schema}', 'tenant_template');
  
  -- Step 2: Replicate to all tenant schemas
  FOR v_tenant IN 
    SELECT t.id, t.slug, 'tenant_' || t.slug as schema_name
    FROM public.tenants t
    WHERE EXISTS (
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = 'tenant_' || t.slug
    )
  LOOP
    BEGIN
      EXECUTE replace(p_migration_sql, '{schema}', v_tenant.schema_name);
      v_results := v_results || jsonb_build_object(
        'tenant_id', v_tenant.id,
        'status', 'success'
      );
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object(
        'tenant_id', v_tenant.id,
        'status', 'error',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'template_applied', true,
    'tenant_results', v_results
  );
END;
$$;
```

---

## Phase 2: Session-based Context (Fixes RISK #2)

### 2.1 Enhanced Tenant Context

```sql
-- Set tenant context ONCE per session, not per query
CREATE OR REPLACE FUNCTION public.init_tenant_session(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_name text;
BEGIN
  -- Validate access
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id AND user_id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Get schema name
  SELECT 'tenant_' || slug INTO v_schema_name
  FROM public.tenants WHERE id = p_tenant_id;
  
  -- Set session variables (persist for entire session)
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.schema_name', v_schema_name, false);
  
  -- Set search_path for session (NOT per transaction)
  EXECUTE format('SET search_path TO %I, public', v_schema_name);
END;
$$;
```

### 2.2 Frontend Hook Update

```typescript
// src/hooks/useTenantSession.ts
export function useTenantSession() {
  const { tenantId } = useTenantContext();
  const [isSessionInit, setIsSessionInit] = useState(false);
  
  useEffect(() => {
    if (!tenantId) return;
    
    // Initialize session ONCE when tenant changes
    supabase.rpc('init_tenant_session', { p_tenant_id: tenantId })
      .then(() => setIsSessionInit(true));
    
    return () => {
      // Session cleanup on unmount/tenant switch
      setIsSessionInit(false);
    };
  }, [tenantId]);
  
  return { isSessionInit };
}
```

---

## Phase 3: Control Plane Split (Fixes RISK #3)

### 3.1 Create Platform Schema for AI Registry

```sql
CREATE SCHEMA platform;

-- AI metric definitions (cross-tenant learning)
CREATE TABLE platform.ai_metric_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  formula text NOT NULL,
  category text NOT NULL,  -- revenue, cost, margin, cash
  description text,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Semantic models (shared understanding)
CREATE TABLE platform.ai_semantic_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,  -- order, customer, product
  schema_version text NOT NULL,
  columns jsonb NOT NULL,     -- column definitions + meanings
  relationships jsonb,
  created_at timestamptz DEFAULT now()
);

-- Query templates (proven patterns)
CREATE TABLE platform.ai_query_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_pattern text NOT NULL,  -- "top customers by LTV"
  sql_template text NOT NULL,
  parameters jsonb,
  success_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- KPI definition templates
CREATE TABLE platform.kpi_definition_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  formula text NOT NULL,
  thresholds jsonb NOT NULL,
  industry_benchmarks jsonb,
  created_at timestamptz DEFAULT now()
);

-- Alert rule templates
CREATE TABLE platform.alert_rule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  condition_template text NOT NULL,
  severity_default text NOT NULL,
  decision_framing jsonb,
  created_at timestamptz DEFAULT now()
);

-- Decision taxonomy (action categories)
CREATE TABLE platform.decision_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subcategory text,
  action_templates jsonb,
  owner_role_default text,
  created_at timestamptz DEFAULT now()
);
```

### 3.2 Move Global Data from Public to Platform

```sql
-- Migrate existing global data
INSERT INTO platform.alert_rule_templates (code, name, condition_template, severity_default)
SELECT rule_code, name, condition_template, 'high'
FROM public.intelligent_alert_rules
WHERE is_system = true;

INSERT INTO platform.kpi_definition_templates (code, name, formula, thresholds)
SELECT DISTINCT metric_code, metric_name, formula, thresholds
FROM public.intelligent_alert_rules;
```

### 3.3 Tenant Schema References Platform

```sql
-- Tenant-specific table references platform templates
CREATE TABLE {tenant_schema}.kpi_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES platform.kpi_definition_templates(id),
  custom_name text,
  custom_thresholds jsonb,  -- Override platform defaults
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tenant-specific AI conversations (only queries, not metadata)
CREATE TABLE {tenant_schema}.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  query text NOT NULL,
  response text,
  template_id uuid REFERENCES platform.ai_query_templates(id),  -- Link to global
  created_at timestamptz DEFAULT now()
);
```

---

## Phase 4: Tenant Tiering (Strategic)

### 4.1 Add Tier to Tenants Table

```sql
CREATE TYPE public.tenant_tier AS ENUM ('smb', 'midmarket', 'enterprise');

ALTER TABLE public.tenants 
ADD COLUMN tier tenant_tier NOT NULL DEFAULT 'smb';

-- SMB: shared schema (public with RLS)
-- Midmarket: dedicated schema
-- Enterprise: dedicated database (future)
```

### 4.2 Tiered Provisioning Logic

```sql
CREATE OR REPLACE FUNCTION public.provision_tenant_by_tier(
  p_tenant_id uuid,
  p_slug text,
  p_tier tenant_tier
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE p_tier
    WHEN 'smb' THEN
      -- SMB stays in public schema with RLS
      RETURN jsonb_build_object(
        'tier', 'smb',
        'isolation', 'rls',
        'schema', 'public'
      );
    
    WHEN 'midmarket' THEN
      -- Midmarket gets dedicated schema
      RETURN provision_tenant_from_template(p_tenant_id, p_slug);
    
    WHEN 'enterprise' THEN
      -- Enterprise: log request for manual database creation
      INSERT INTO platform.enterprise_provisioning_requests (tenant_id, slug)
      VALUES (p_tenant_id, p_slug);
      
      RETURN jsonb_build_object(
        'tier', 'enterprise',
        'status', 'pending_manual_setup'
      );
  END CASE;
END;
$$;
```

---

## Implementation Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Template Schema | Create tenant_template, migrate 53 table definitions |
| 2 | Template Schema | New provision_tenant_from_template(), apply_tenant_migration() |
| 3 | Session Context | init_tenant_session(), update frontend hooks |
| 4 | Platform Schema | Create platform schema, AI registry tables |
| 5 | Platform Schema | Migrate global data, update references |
| 6 | Tenant Tiering | Add tier column, tiered provisioning logic |
| 7 | Testing | E2E test all 3 isolation levels |
| 8 | Documentation | Architecture docs, runbook |

---

## Files to Create/Modify

### Database Migrations

| Migration | Description |
|-----------|-------------|
| `001_create_platform_schema.sql` | Control plane schema |
| `002_platform_ai_registry.sql` | AI metadata tables |
| `003_platform_rule_templates.sql` | KPI/Alert templates |
| `004_create_tenant_template.sql` | Template schema + 53 tables |
| `005_provision_from_template.sql` | New provisioning function |
| `006_apply_tenant_migration.sql` | Migration pipeline |
| `007_init_tenant_session.sql` | Session-based context |
| `008_tenant_tiering.sql` | Tier column + tiered provisioning |

### Frontend Files

| File | Description |
|------|-------------|
| `src/hooks/useTenantSession.ts` | Session-based tenant init |
| `src/hooks/usePlatformData.ts` | Query platform schema |
| Update `TenantContext.tsx` | Integrate session init |

### Edge Functions

| Function | Description |
|----------|-------------|
| `provision-tenant-v2/index.ts` | Use template-based provisioning |
| `apply-migration/index.ts` | Run migration pipeline |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Template schema drift | Automated validation before each migration |
| Migration failures | Transaction + rollback per tenant |
| Session context not set | Frontend guards + RPC validation |
| Platform data access | Read-only for tenants, write via admin only |

---

## Success Metrics

1. **Migration time**: < 5 seconds for 100 tenants (vs hours with current approach)
2. **Connection efficiency**: 90% reduction in schema switching overhead
3. **AI model accuracy**: Cross-tenant learning enables 20%+ improvement
4. **Provisioning speed**: < 2 seconds for new midmarket tenant

---

## Rollback Strategy

```text
IF architecture change fails:
├── Platform schema: DROP SCHEMA platform CASCADE (no tenant impact)
├── Template schema: DROP SCHEMA tenant_template CASCADE
├── Session context: Revert to per-query switching (backward compatible)
└── Tenant tiering: Treat all as 'midmarket' (current behavior)
```

