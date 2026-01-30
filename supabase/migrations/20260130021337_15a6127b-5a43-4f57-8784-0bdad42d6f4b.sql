-- =====================================================
-- PHASE 1: Schema-per-Tenant Infrastructure Functions
-- =====================================================

-- 1.1 Function: Set search_path based on active tenant
-- Used by frontend/edge functions to switch to tenant schema
CREATE OR REPLACE FUNCTION public.set_tenant_schema(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_tenant_exists boolean;
BEGIN
  -- Validate tenant exists
  SELECT EXISTS(SELECT 1 FROM public.tenants WHERE id = p_tenant_id) INTO v_tenant_exists;
  
  IF NOT v_tenant_exists THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;
  
  -- Build schema name from tenant slug
  SELECT 'tenant_' || slug INTO v_schema_name
  FROM public.tenants WHERE id = p_tenant_id;
  
  -- Check if schema exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = v_schema_name
  ) THEN
    RAISE EXCEPTION 'Tenant schema not provisioned: %', v_schema_name;
  END IF;
  
  -- Set search_path to tenant schema first, then public for shared tables
  EXECUTE format('SET search_path TO %I, public', v_schema_name);
END;
$$;

-- 1.2 Function: Get current tenant schema
CREATE OR REPLACE FUNCTION public.get_tenant_schema()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('search_path', true);
$$;

-- 1.3 Function: Check if tenant schema is provisioned
CREATE OR REPLACE FUNCTION public.is_tenant_schema_provisioned(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
BEGIN
  SELECT 'tenant_' || slug INTO v_schema_name
  FROM public.tenants WHERE id = p_tenant_id;
  
  IF v_schema_name IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = v_schema_name
  );
END;
$$;

-- 1.4 Function: List tables that should be copied to tenant schema
-- Excludes shared tables that remain in public schema
CREATE OR REPLACE FUNCTION public.get_tenant_table_list()
RETURNS TABLE(table_name text)
LANGUAGE sql
STABLE
AS $$
  SELECT tablename::text
  FROM pg_tables 
  WHERE schemaname = 'public'
  AND tablename NOT IN (
    -- Shared tables that remain in public
    'tenants',
    'tenant_users', 
    'profiles',
    'user_roles',
    'spatial_ref_sys',  -- PostGIS system table
    'schema_migrations' -- Migration tracking
  )
  ORDER BY tablename;
$$;

-- 1.5 Function: List views that should be copied to tenant schema
CREATE OR REPLACE FUNCTION public.get_tenant_view_list()
RETURNS TABLE(view_name text, view_definition text)
LANGUAGE sql
STABLE
AS $$
  SELECT viewname::text, definition::text
  FROM pg_views 
  WHERE schemaname = 'public'
  AND viewname NOT LIKE 'pg_%'
  AND viewname NOT LIKE 'information_%'
  ORDER BY viewname;
$$;

-- 1.6 Main Provisioning Function: Create tenant schema with all tables
CREATE OR REPLACE FUNCTION public.provision_tenant_schema(
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
  v_view_count int := 0;
  v_rec RECORD;
  v_result jsonb;
BEGIN
  -- Validate tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND slug = p_slug) THEN
    RAISE EXCEPTION 'Tenant not found or slug mismatch: % / %', p_tenant_id, p_slug;
  END IF;
  
  -- Check if schema already exists
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema_name) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Schema already exists',
      'schema_name', v_schema_name
    );
  END IF;
  
  -- Create schema
  EXECUTE format('CREATE SCHEMA %I', v_schema_name);
  
  -- Copy all tenant tables (structure only, no data yet)
  FOR v_rec IN SELECT table_name FROM public.get_tenant_table_list()
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE TABLE %I.%I (LIKE public.%I INCLUDING ALL)',
        v_schema_name, v_rec.table_name, v_rec.table_name
      );
      v_table_count := v_table_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to create table %.%: %', v_schema_name, v_rec.table_name, SQLERRM;
    END;
  END LOOP;
  
  -- Grant permissions to authenticated role
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', v_schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', v_schema_name);
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated', v_schema_name);
  
  -- Grant to anon role for public access if needed
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon', v_schema_name);
  EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO anon', v_schema_name);
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'schema_name', v_schema_name,
    'tables_created', v_table_count,
    'views_created', v_view_count,
    'provisioned_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- 1.7 Function: Migrate data from public to tenant schema
CREATE OR REPLACE FUNCTION public.migrate_tenant_data(
  p_tenant_id uuid,
  p_table_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_row_count int;
  v_has_tenant_id boolean;
BEGIN
  -- Get tenant schema name
  SELECT 'tenant_' || slug INTO v_schema_name
  FROM public.tenants WHERE id = p_tenant_id;
  
  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;
  
  -- Check if table has tenant_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name 
    AND column_name = 'tenant_id'
  ) INTO v_has_tenant_id;
  
  IF v_has_tenant_id THEN
    -- Migrate only this tenant's data
    EXECUTE format(
      'INSERT INTO %I.%I SELECT * FROM public.%I WHERE tenant_id = %L',
      v_schema_name, p_table_name, p_table_name, p_tenant_id
    );
  ELSE
    -- Table doesn't have tenant_id, copy all data (shared reference data)
    EXECUTE format(
      'INSERT INTO %I.%I SELECT * FROM public.%I',
      v_schema_name, p_table_name, p_table_name
    );
  END IF;
  
  -- Get row count
  EXECUTE format('SELECT count(*) FROM %I.%I', v_schema_name, p_table_name) INTO v_row_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'table', p_table_name,
    'rows_migrated', v_row_count,
    'migrated_at', now()
  );
END;
$$;

-- 1.8 Function: Get tenant schema statistics
CREATE OR REPLACE FUNCTION public.get_tenant_schema_stats(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_table_count int;
  v_total_rows bigint := 0;
  v_rec RECORD;
BEGIN
  SELECT 'tenant_' || slug INTO v_schema_name
  FROM public.tenants WHERE id = p_tenant_id;
  
  IF v_schema_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant not found');
  END IF;
  
  -- Count tables
  SELECT count(*) INTO v_table_count
  FROM information_schema.tables 
  WHERE table_schema = v_schema_name;
  
  -- Get approximate row counts for each table
  FOR v_rec IN 
    SELECT relname, reltuples::bigint as row_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = v_schema_name
    AND c.relkind = 'r'
  LOOP
    v_total_rows := v_total_rows + COALESCE(v_rec.row_count, 0);
  END LOOP;
  
  RETURN jsonb_build_object(
    'schema_name', v_schema_name,
    'table_count', v_table_count,
    'approximate_total_rows', v_total_rows,
    'is_provisioned', v_table_count > 0
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_tenant_schema(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_schema_provisioned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_table_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_view_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_schema_stats(uuid) TO authenticated;
-- provision_tenant_schema and migrate_tenant_data should only be called by admins/service role