
CREATE OR REPLACE FUNCTION public.link_orders_to_customers(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_linked integer := 0;
  v_name_linked integer := 0;
  v_ambiguous_names integer := 0;
BEGIN
  -- PASS 1: Phone match (highest confidence)
  UPDATE cdp_orders o
  SET customer_id = c.id
  FROM cdp_customers c
  WHERE o.tenant_id = p_tenant_id
    AND c.tenant_id = p_tenant_id
    AND o.customer_id IS NULL
    AND o.customer_phone IS NOT NULL
    AND o.customer_phone != ''
    AND c.phone IS NOT NULL
    AND c.phone != ''
    AND replace(replace(o.customer_phone, ' ', ''), '-', '') = replace(replace(c.phone, ' ', ''), '-', '');

  GET DIAGNOSTICS v_phone_linked = ROW_COUNT;
  RAISE NOTICE 'Phone linked: %', v_phone_linked;

  -- PASS 2: Exact name match (only unique names)
  WITH unique_names AS (
    SELECT name, (array_agg(id ORDER BY created_at))[1] as customer_id
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND name IS NOT NULL
      AND trim(name) != ''
    GROUP BY name
    HAVING COUNT(*) = 1
  )
  UPDATE cdp_orders o
  SET customer_id = un.customer_id
  FROM unique_names un
  WHERE o.tenant_id = p_tenant_id
    AND o.customer_id IS NULL
    AND o.customer_name IS NOT NULL
    AND trim(o.customer_name) = un.name;

  GET DIAGNOSTICS v_name_linked = ROW_COUNT;
  RAISE NOTICE 'Name linked: %', v_name_linked;

  -- Count ambiguous names skipped
  SELECT COUNT(*) INTO v_ambiguous_names
  FROM (
    SELECT name
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND name IS NOT NULL AND trim(name) != ''
    GROUP BY name
    HAVING COUNT(*) > 1
  ) sub;

  RETURN jsonb_build_object(
    'phone_linked', v_phone_linked,
    'name_linked', v_name_linked,
    'total_linked', v_phone_linked + v_name_linked,
    'ambiguous_names_skipped', COALESCE(v_ambiguous_names, 0)
  );
END;
$$;
