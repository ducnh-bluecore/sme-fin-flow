-- Service-level version of init_tenant_session for Edge Functions using service_role
-- Skips auth.uid() check since service_role is trusted
CREATE OR REPLACE FUNCTION public.init_tenant_session_service(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_tier public.tenant_tier;
  v_is_provisioned boolean;
BEGIN
  -- Get tenant info (no user check - service role is trusted)
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
  
  -- Set session variables
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.tenant_schema', v_schema_name, false);
  PERFORM set_config('app.tenant_tier', v_tier::text, false);
  PERFORM set_config('app.user_role', 'service', false);
  
  -- Set search_path based on tier
  IF v_tier = 'smb' THEN
    EXECUTE 'SET search_path TO public';
  ELSIF v_is_provisioned AND EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema_name
  ) THEN
    EXECUTE format('SET search_path TO %I, platform, public', v_schema_name);
  ELSE
    EXECUTE 'SET search_path TO public, platform';
  END IF;
  
  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'schema', v_schema_name,
    'tier', v_tier,
    'is_provisioned', v_is_provisioned,
    'user_role', 'service'
  );
END;
$$;

-- Only allow service_role to call this
REVOKE ALL ON FUNCTION public.init_tenant_session_service(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.init_tenant_session_service(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.init_tenant_session_service(uuid) FROM authenticated