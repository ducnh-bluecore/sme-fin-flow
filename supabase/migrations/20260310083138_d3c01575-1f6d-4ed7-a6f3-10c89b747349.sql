
CREATE OR REPLACE FUNCTION public.tenant_lookup_order_ids(
  p_tenant_id uuid,
  p_order_keys text[]
)
RETURNS TABLE(id uuid, order_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
BEGIN
  SELECT CASE 
    WHEN schema_provisioned THEN 'tenant_' || replace(slug, '-', '_')
    ELSE 'public'
  END INTO v_schema
  FROM tenants WHERE id = p_tenant_id;

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT o.id, o.order_key FROM %I.cdp_orders o WHERE o.tenant_id = $1 AND o.order_key = ANY($2)',
    v_schema
  ) USING p_tenant_id, p_order_keys;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_lookup_order_ids(uuid, text[]) TO service_role;
