
CREATE OR REPLACE FUNCTION public.link_orders_to_customers(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '300s'
AS $$
DECLARE
  v_phone_linked integer := 0;
  v_name_linked integer := 0;
  v_ambiguous_names integer := 0;
  v_batch_count integer;
BEGIN
  -- PASS 1: Phone match in batches of 50K
  LOOP
    UPDATE cdp_orders o
    SET customer_id = c.id
    FROM cdp_customers c
    WHERE o.id IN (
      SELECT o2.id FROM cdp_orders o2
      WHERE o2.tenant_id = p_tenant_id
        AND o2.customer_id IS NULL
        AND o2.customer_phone IS NOT NULL
        AND o2.customer_phone != ''
      LIMIT 50000
    )
    AND o.tenant_id = p_tenant_id
    AND c.tenant_id = p_tenant_id
    AND c.phone IS NOT NULL
    AND c.phone != ''
    AND replace(replace(o.customer_phone, ' ', ''), '-', '') = replace(replace(c.phone, ' ', ''), '-', '');

    GET DIAGNOSTICS v_batch_count = ROW_COUNT;
    v_phone_linked := v_phone_linked + v_batch_count;
    EXIT WHEN v_batch_count = 0;
    RAISE NOTICE 'Phone batch: % (total: %)', v_batch_count, v_phone_linked;
  END LOOP;

  RAISE NOTICE 'Phone linked total: %', v_phone_linked;

  -- PASS 2: Exact name match (unique names only), in batches
  -- First materialize unique names into temp table for performance
  CREATE TEMP TABLE _unique_customer_names AS
  SELECT name, (array_agg(id ORDER BY created_at))[1] as customer_id
  FROM cdp_customers
  WHERE tenant_id = p_tenant_id
    AND name IS NOT NULL
    AND trim(name) != ''
  GROUP BY name
  HAVING COUNT(*) = 1;

  CREATE INDEX ON _unique_customer_names (name);

  LOOP
    UPDATE cdp_orders o
    SET customer_id = un.customer_id
    FROM _unique_customer_names un
    WHERE o.id IN (
      SELECT o2.id FROM cdp_orders o2
      WHERE o2.tenant_id = p_tenant_id
        AND o2.customer_id IS NULL
        AND o2.customer_name IS NOT NULL
      LIMIT 50000
    )
    AND o.tenant_id = p_tenant_id
    AND trim(o.customer_name) = un.name;

    GET DIAGNOSTICS v_batch_count = ROW_COUNT;
    v_name_linked := v_name_linked + v_batch_count;
    EXIT WHEN v_batch_count = 0;
    RAISE NOTICE 'Name batch: % (total: %)', v_batch_count, v_name_linked;
  END LOOP;

  DROP TABLE IF EXISTS _unique_customer_names;

  -- Count ambiguous names
  SELECT COUNT(*) INTO v_ambiguous_names
  FROM (
    SELECT name FROM cdp_customers
    WHERE tenant_id = p_tenant_id AND name IS NOT NULL AND trim(name) != ''
    GROUP BY name HAVING COUNT(*) > 1
  ) sub;

  RETURN jsonb_build_object(
    'phone_linked', v_phone_linked,
    'name_linked', v_name_linked,
    'total_linked', v_phone_linked + v_name_linked,
    'ambiguous_names_skipped', COALESCE(v_ambiguous_names, 0)
  );
END;
$$;
