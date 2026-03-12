
CREATE OR REPLACE FUNCTION public.link_orders_pass_haravan_phone(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '55s'
AS $$
DECLARE
  v_linked integer := 0;
  v_schema text;
BEGIN
  -- Get schema name
  SELECT CASE WHEN schema_provisioned THEN 'tenant_' || slug ELSE 'public' END
  INTO v_schema
  FROM public.tenants WHERE id = p_tenant_id;
  
  v_schema := COALESCE(v_schema, 'public');
  
  EXECUTE format('SET LOCAL search_path TO %I, public', v_schema);
  
  -- Use phone_extracted column (pre-computed) for fast matching
  WITH batch AS (
    SELECT DISTINCT ON (o.id) o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.phone_extracted = regexp_replace(o.customer_phone, '[^0-9]', '', 'g')
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_phone IS NOT NULL
      AND length(regexp_replace(o.customer_phone, '[^0-9]', '', 'g')) >= 9
      AND c.phone_extracted IS NOT NULL
      AND length(c.phone_extracted) >= 9
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_linked = ROW_COUNT;
  
  RETURN v_linked;
END;
$$;
