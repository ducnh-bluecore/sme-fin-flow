
-- Add index for faster name matching
CREATE INDEX IF NOT EXISTS idx_cdp_customers_tenant_name 
ON cdp_customers (tenant_id, name) 
WHERE name IS NOT NULL AND trim(name) != '';

CREATE INDEX IF NOT EXISTS idx_cdp_orders_tenant_null_customer 
ON cdp_orders (tenant_id, customer_name) 
WHERE customer_id IS NULL AND customer_name IS NOT NULL;

-- Rewrite with batching and masked name exclusion
CREATE OR REPLACE FUNCTION public.link_orders_to_customers(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '300s'
AS $$
DECLARE
  v_name_linked integer := 0;
  v_ambiguous_names integer := 0;
  v_batch_count integer;
BEGIN
  -- Build temp table of unique customer names for efficient lookup
  CREATE TEMP TABLE _unique_customer_names AS
  SELECT name, (array_agg(id ORDER BY created_at))[1] as customer_id
  FROM cdp_customers
  WHERE tenant_id = p_tenant_id
    AND name IS NOT NULL
    AND trim(name) != ''
    AND name !~ '\*'  -- Exclude masked names
  GROUP BY name
  HAVING COUNT(*) = 1;

  CREATE INDEX ON _unique_customer_names (name);

  RAISE NOTICE 'Unique customer names: %', (SELECT COUNT(*) FROM _unique_customer_names);

  -- Batch name match: 100K at a time
  LOOP
    WITH batch AS (
      SELECT o.id as order_id, un.customer_id
      FROM cdp_orders o
      JOIN _unique_customer_names un ON trim(o.customer_name) = un.name
      WHERE o.tenant_id = p_tenant_id
        AND o.customer_id IS NULL
        AND o.customer_name IS NOT NULL
        AND o.customer_name !~ '\*'  -- Skip masked names
      LIMIT 100000
    )
    UPDATE cdp_orders o
    SET customer_id = b.customer_id
    FROM batch b
    WHERE o.id = b.order_id;

    GET DIAGNOSTICS v_batch_count = ROW_COUNT;
    v_name_linked := v_name_linked + v_batch_count;
    RAISE NOTICE 'Name batch: % (total: %)', v_batch_count, v_name_linked;
    EXIT WHEN v_batch_count = 0;
  END LOOP;

  DROP TABLE IF EXISTS _unique_customer_names;

  -- Count ambiguous
  SELECT COUNT(*) INTO v_ambiguous_names
  FROM (
    SELECT name FROM cdp_customers
    WHERE tenant_id = p_tenant_id AND name IS NOT NULL AND trim(name) != '' AND name !~ '\*'
    GROUP BY name HAVING COUNT(*) > 1
  ) sub;

  RETURN jsonb_build_object(
    'name_linked', v_name_linked,
    'total_linked', v_name_linked,
    'ambiguous_names_skipped', COALESCE(v_ambiguous_names, 0)
  );
END;
$$;
