
CREATE OR REPLACE FUNCTION public.tenant_min_order_key(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_result text;
BEGIN
  SELECT CASE 
    WHEN schema_provisioned THEN 'tenant_' || replace(slug, '-', '_')
    ELSE 'public'
  END INTO v_schema
  FROM tenants WHERE id = p_tenant_id;

  IF v_schema IS NULL THEN
    RETURN NULL;
  END IF;

  EXECUTE format(
    'SELECT MIN(order_key) FROM %I.cdp_orders WHERE tenant_id = $1',
    v_schema
  ) INTO v_result USING p_tenant_id;

  RETURN v_result;
END;
$$;

-- Reset the order_items job for Icon Denim
UPDATE bigquery_backfill_jobs 
SET status = 'pending', processed_records = 0, 
    metadata = '{}'::jsonb
WHERE id = '521ea5c7-948d-4043-bfef-e8a4086f78b4';
