-- =====================================================
-- Architecture v1.4.1 - Phase 3: Provisioning + Session + Tiering
-- =====================================================

-- =====================================================
-- 1. Tenant Tiering
-- =====================================================

-- Create tenant tier enum
DO $$ BEGIN
  CREATE TYPE public.tenant_tier AS ENUM ('smb', 'midmarket', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add tier column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS tier public.tenant_tier NOT NULL DEFAULT 'midmarket';

-- Add schema_provisioned flag
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS schema_provisioned boolean DEFAULT false;

-- Add schema_provisioned_at timestamp
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS schema_provisioned_at timestamptz;

-- =====================================================
-- 2. Helper Functions
-- =====================================================

-- Get current tenant ID from session
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- Get current organization ID from session
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.org_id', true), '')::uuid
$$;

-- Get current schema name from session
CREATE OR REPLACE FUNCTION public.current_tenant_schema()
RETURNS text
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.tenant_schema', true), '')
$$;

-- =====================================================
-- 3. Session-based Tenant Context (Fixes RISK #2)
-- =====================================================

-- Initialize tenant session ONCE per connection
CREATE OR REPLACE FUNCTION public.init_tenant_session(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_tier public.tenant_tier;
  v_is_provisioned boolean;
  v_user_role text;
BEGIN
  -- Validate user has access to this tenant
  SELECT tu.role INTO v_user_role
  FROM public.tenant_users tu
  WHERE tu.tenant_id = p_tenant_id 
    AND tu.user_id = auth.uid() 
    AND tu.is_active = true;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied to tenant %', p_tenant_id;
  END IF;
  
  -- Get tenant info
  SELECT 
    'tenant_' || slug,
    tier,
    COALESCE(schema_provisioned, false)
  INTO v_schema_name, v_tier, v_is_provisioned
  FROM public.tenants 
  WHERE id = p_tenant_id AND is_active = true;
  
  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION 'Tenant not found or inactive';
  END IF;
  
  -- Set session variables (persist for entire session with false = session-level)
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.tenant_schema', v_schema_name, false);
  PERFORM set_config('app.tenant_tier', v_tier::text, false);
  PERFORM set_config('app.user_role', v_user_role, false);
  
  -- Set search_path based on tier
  IF v_tier = 'smb' THEN
    -- SMB uses public schema with RLS
    EXECUTE 'SET search_path TO public';
  ELSIF v_is_provisioned AND EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema_name
  ) THEN
    -- Midmarket/Enterprise with provisioned schema
    EXECUTE format('SET search_path TO %I, platform, public', v_schema_name);
  ELSE
    -- Schema not yet provisioned, use public
    EXECUTE 'SET search_path TO public, platform';
  END IF;
  
  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'schema', v_schema_name,
    'tier', v_tier,
    'is_provisioned', v_is_provisioned,
    'user_role', v_user_role
  );
END;
$$;

-- Set organization context within tenant
CREATE OR REPLACE FUNCTION public.set_current_org(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_schema text;
BEGIN
  v_tenant_schema := current_setting('app.tenant_schema', true);
  
  IF v_tenant_schema IS NULL OR v_tenant_schema = '' THEN
    RAISE EXCEPTION 'Tenant session not initialized. Call init_tenant_session first.';
  END IF;
  
  -- Validate user has access to this organization
  -- This check works for both provisioned schemas and public schema
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = v_tenant_schema AND tablename = 'organization_members'
  ) THEN
    -- Schema not provisioned, skip org check (SMB mode)
    NULL;
  ELSE
    EXECUTE format(
      'SELECT 1 FROM %I.organization_members WHERE organization_id = $1 AND user_id = $2 AND is_active = true',
      v_tenant_schema
    ) USING p_org_id, auth.uid();
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Access denied to organization %', p_org_id;
    END IF;
  END IF;
  
  -- Set org context
  PERFORM set_config('app.org_id', p_org_id::text, false);
END;
$$;

-- =====================================================
-- 4. Template-based Provisioning (Fixes RISK #1)
-- =====================================================

-- Copy single table from template to tenant schema
CREATE OR REPLACE FUNCTION public.copy_template_table(
  p_target_schema text,
  p_table_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create table with same structure as template
  EXECUTE format(
    'CREATE TABLE %I.%I (LIKE tenant_template.%I INCLUDING ALL)',
    p_target_schema, p_table_name, p_table_name
  );
  
  -- Grant permissions
  EXECUTE format(
    'GRANT ALL ON TABLE %I.%I TO authenticated',
    p_target_schema, p_table_name
  );
END;
$$;

-- Copy enum type from template to tenant schema
CREATE OR REPLACE FUNCTION public.copy_template_type(
  p_target_schema text,
  p_type_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enum_labels text;
BEGIN
  -- Get enum labels from template
  SELECT string_agg(quote_literal(enumlabel), ', ' ORDER BY enumsortorder)
  INTO v_enum_labels
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE n.nspname = 'tenant_template' AND t.typname = p_type_name;
  
  IF v_enum_labels IS NOT NULL THEN
    EXECUTE format('CREATE TYPE %I.%I AS ENUM (%s)', p_target_schema, p_type_name, v_enum_labels);
  END IF;
END;
$$;

-- Provision tenant schema from template
CREATE OR REPLACE FUNCTION public.provision_tenant_from_template(
  p_tenant_id uuid,
  p_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text := 'tenant_' || p_slug;
  v_table_count int := 0;
  v_type_count int := 0;
  v_rec RECORD;
BEGIN
  -- Validate tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND slug = p_slug) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant not found');
  END IF;
  
  -- Check if schema already exists
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema_name) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Schema already exists');
  END IF;
  
  -- Create schema
  EXECUTE format('CREATE SCHEMA %I', v_schema_name);
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', v_schema_name);
  
  -- Copy enum types first
  FOR v_rec IN 
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'tenant_template' AND t.typtype = 'e'
  LOOP
    PERFORM copy_template_type(v_schema_name, v_rec.typname);
    v_type_count := v_type_count + 1;
  END LOOP;
  
  -- Copy tables in dependency order (organizations first, then tables referencing it)
  -- Layer 1: Foundation
  PERFORM copy_template_table(v_schema_name, 'organizations');
  PERFORM copy_template_table(v_schema_name, 'organization_members');
  PERFORM copy_template_table(v_schema_name, 'user_roles');
  PERFORM copy_template_table(v_schema_name, 'channel_accounts');
  PERFORM copy_template_table(v_schema_name, 'organization_sources');
  PERFORM copy_template_table(v_schema_name, 'source_table_mappings');
  v_table_count := v_table_count + 6;
  
  -- Layer 1.5: Ingestion
  PERFORM copy_template_table(v_schema_name, 'ingestion_batches');
  PERFORM copy_template_table(v_schema_name, 'source_extract_versions');
  PERFORM copy_template_table(v_schema_name, 'watermark_tracking');
  v_table_count := v_table_count + 3;
  
  -- Layer 2: Master Model
  PERFORM copy_template_table(v_schema_name, 'entity_links');
  PERFORM copy_template_table(v_schema_name, 'master_customers');
  PERFORM copy_template_table(v_schema_name, 'master_products');
  PERFORM copy_template_table(v_schema_name, 'master_product_variants');
  PERFORM copy_template_table(v_schema_name, 'master_orders');
  PERFORM copy_template_table(v_schema_name, 'master_order_items');
  PERFORM copy_template_table(v_schema_name, 'master_refunds');
  PERFORM copy_template_table(v_schema_name, 'master_payments');
  PERFORM copy_template_table(v_schema_name, 'master_fulfillments');
  PERFORM copy_template_table(v_schema_name, 'master_inventory');
  PERFORM copy_template_table(v_schema_name, 'master_costs');
  PERFORM copy_template_table(v_schema_name, 'master_suppliers');
  v_table_count := v_table_count + 12;
  
  -- Layer 2.5: Events + Marketing
  PERFORM copy_template_table(v_schema_name, 'commerce_events');
  PERFORM copy_template_table(v_schema_name, 'master_ad_accounts');
  PERFORM copy_template_table(v_schema_name, 'master_campaigns');
  PERFORM copy_template_table(v_schema_name, 'master_ad_spend_daily');
  v_table_count := v_table_count + 4;
  
  -- Layer 3: KPI
  PERFORM copy_template_table(v_schema_name, 'kpi_definitions');
  PERFORM copy_template_table(v_schema_name, 'kpi_thresholds');
  PERFORM copy_template_table(v_schema_name, 'kpi_facts_daily');
  PERFORM copy_template_table(v_schema_name, 'anomaly_scores');
  PERFORM copy_template_table(v_schema_name, 'period_comparisons');
  v_table_count := v_table_count + 5;
  
  -- Layer 4: Alert & Decision
  PERFORM copy_template_table(v_schema_name, 'alert_rules');
  PERFORM copy_template_table(v_schema_name, 'alert_instances');
  PERFORM copy_template_table(v_schema_name, 'evidence_logs');
  PERFORM copy_template_table(v_schema_name, 'decision_cards');
  PERFORM copy_template_table(v_schema_name, 'card_actions');
  PERFORM copy_template_table(v_schema_name, 'decision_outcomes');
  PERFORM copy_template_table(v_schema_name, 'alert_escalations');
  v_table_count := v_table_count + 7;
  
  -- Layer 5: AI Query
  PERFORM copy_template_table(v_schema_name, 'ai_conversations');
  PERFORM copy_template_table(v_schema_name, 'ai_messages');
  PERFORM copy_template_table(v_schema_name, 'ai_query_history');
  PERFORM copy_template_table(v_schema_name, 'ai_favorites');
  PERFORM copy_template_table(v_schema_name, 'ai_scheduled_reports');
  PERFORM copy_template_table(v_schema_name, 'ai_insights');
  PERFORM copy_template_table(v_schema_name, 'ai_feedback');
  v_table_count := v_table_count + 7;
  
  -- Layer 6: Audit
  PERFORM copy_template_table(v_schema_name, 'sync_jobs');
  PERFORM copy_template_table(v_schema_name, 'sync_errors');
  PERFORM copy_template_table(v_schema_name, 'batch_lineage');
  PERFORM copy_template_table(v_schema_name, 'audit_logs');
  v_table_count := v_table_count + 4;
  
  -- Layer 10: BigQuery Sync
  PERFORM copy_template_table(v_schema_name, 'bigquery_connections');
  PERFORM copy_template_table(v_schema_name, 'bigquery_sync_configs');
  PERFORM copy_template_table(v_schema_name, 'bigquery_sync_logs');
  PERFORM copy_template_table(v_schema_name, 'query_cache');
  v_table_count := v_table_count + 4;
  
  -- Grant all privileges on tables
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', v_schema_name);
  EXECUTE format('GRANT USAGE ON ALL SEQUENCES IN SCHEMA %I TO authenticated', v_schema_name);
  
  -- Update tenant record
  UPDATE public.tenants 
  SET schema_provisioned = true, 
      schema_provisioned_at = now()
  WHERE id = p_tenant_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'schema_name', v_schema_name,
    'tables_created', v_table_count,
    'types_created', v_type_count,
    'provisioned_at', now()
  );
END;
$$;

-- =====================================================
-- 5. Migration Pipeline (Fixes RISK #1)
-- =====================================================

-- Track migrations applied to tenant schemas
CREATE TABLE IF NOT EXISTS public.tenant_schema_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name text NOT NULL,
  migration_sql text NOT NULL,
  description text,
  applied_to_template_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(migration_name)
);

-- Track which tenants received each migration
CREATE TABLE IF NOT EXISTS public.tenant_migration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id uuid NOT NULL REFERENCES public.tenant_schema_migrations(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(migration_id, tenant_id)
);

-- Enable RLS on migration tables
ALTER TABLE public.tenant_schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_migration_log ENABLE ROW LEVEL SECURITY;

-- Only system admins can read/write migration tables
CREATE POLICY "system_admins_manage_migrations" ON public.tenant_schema_migrations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "system_admins_manage_migration_log" ON public.tenant_migration_log
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Apply migration to template, then replicate to all tenant schemas
CREATE OR REPLACE FUNCTION public.apply_tenant_migration(
  p_migration_name text,
  p_migration_sql text,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_migration_id uuid;
  v_tenant RECORD;
  v_results jsonb := '[]'::jsonb;
  v_success_count int := 0;
  v_error_count int := 0;
  v_tenant_sql text;
BEGIN
  -- Check if migration already exists
  SELECT id INTO v_migration_id
  FROM public.tenant_schema_migrations
  WHERE migration_name = p_migration_name;
  
  IF v_migration_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Migration already exists');
  END IF;
  
  -- Step 1: Apply to template first
  BEGIN
    v_tenant_sql := replace(p_migration_sql, '{schema}', 'tenant_template');
    EXECUTE v_tenant_sql;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Template migration failed: ' || SQLERRM
    );
  END;
  
  -- Record the migration
  INSERT INTO public.tenant_schema_migrations (migration_name, migration_sql, description, applied_to_template_at)
  VALUES (p_migration_name, p_migration_sql, p_description, now())
  RETURNING id INTO v_migration_id;
  
  -- Step 2: Replicate to all provisioned tenant schemas
  FOR v_tenant IN 
    SELECT t.id, t.slug, 'tenant_' || t.slug as schema_name
    FROM public.tenants t
    WHERE t.schema_provisioned = true
    AND t.is_active = true
    AND EXISTS (
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = 'tenant_' || t.slug
    )
  LOOP
    BEGIN
      v_tenant_sql := replace(p_migration_sql, '{schema}', v_tenant.schema_name);
      EXECUTE v_tenant_sql;
      
      INSERT INTO public.tenant_migration_log (migration_id, tenant_id, status, applied_at)
      VALUES (v_migration_id, v_tenant.id, 'success', now());
      
      v_results := v_results || jsonb_build_object(
        'tenant_id', v_tenant.id,
        'schema', v_tenant.schema_name,
        'status', 'success'
      );
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.tenant_migration_log (migration_id, tenant_id, status, error_message)
      VALUES (v_migration_id, v_tenant.id, 'error', SQLERRM);
      
      v_results := v_results || jsonb_build_object(
        'tenant_id', v_tenant.id,
        'schema', v_tenant.schema_name,
        'status', 'error',
        'error', SQLERRM
      );
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'migration_id', v_migration_id,
    'template_applied', true,
    'tenants_success', v_success_count,
    'tenants_error', v_error_count,
    'details', v_results
  );
END;
$$;

-- =====================================================
-- 6. Tiered Provisioning
-- =====================================================

-- Provision tenant based on tier
CREATE OR REPLACE FUNCTION public.provision_tenant_by_tier(
  p_tenant_id uuid,
  p_slug text,
  p_tier public.tenant_tier DEFAULT 'midmarket'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update tenant tier
  UPDATE public.tenants SET tier = p_tier WHERE id = p_tenant_id;
  
  CASE p_tier
    WHEN 'smb' THEN
      -- SMB stays in public schema with RLS (no dedicated schema)
      RETURN jsonb_build_object(
        'success', true,
        'tier', 'smb',
        'isolation', 'rls',
        'schema', 'public',
        'message', 'SMB tier uses shared public schema with RLS'
      );
    
    WHEN 'midmarket' THEN
      -- Midmarket gets dedicated schema
      RETURN provision_tenant_from_template(p_tenant_id, p_slug);
    
    WHEN 'enterprise' THEN
      -- Enterprise: create schema + log request for additional setup
      DECLARE
        v_result jsonb;
      BEGIN
        -- Create the schema first
        v_result := provision_tenant_from_template(p_tenant_id, p_slug);
        
        -- Log enterprise provisioning request for manual follow-up
        INSERT INTO platform.enterprise_provisioning_requests (tenant_id, slug, status)
        VALUES (p_tenant_id, p_slug, 'pending')
        ON CONFLICT (tenant_id) DO UPDATE SET status = 'pending';
        
        RETURN v_result || jsonb_build_object(
          'tier', 'enterprise',
          'enterprise_request', 'logged_for_review'
        );
      END;
  END CASE;
END;
$$;

-- =====================================================
-- 7. Check Schema Status
-- =====================================================

-- Check if tenant schema is provisioned and accessible
CREATE OR REPLACE FUNCTION public.check_tenant_schema_status(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_schema_exists boolean;
  v_table_count int;
BEGIN
  -- Get tenant info
  SELECT id, slug, tier, schema_provisioned, schema_provisioned_at
  INTO v_tenant
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant not found');
  END IF;
  
  -- Check if schema exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = 'tenant_' || v_tenant.slug
  ) INTO v_schema_exists;
  
  -- Count tables if schema exists
  IF v_schema_exists THEN
    SELECT COUNT(*)
    INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'tenant_' || v_tenant.slug;
  ELSE
    v_table_count := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'tenant_id', v_tenant.id,
    'slug', v_tenant.slug,
    'tier', v_tenant.tier,
    'schema_name', 'tenant_' || v_tenant.slug,
    'is_provisioned', v_tenant.schema_provisioned,
    'provisioned_at', v_tenant.schema_provisioned_at,
    'schema_exists', v_schema_exists,
    'table_count', v_table_count
  );
END;
$$;