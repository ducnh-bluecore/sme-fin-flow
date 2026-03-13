
-- Faster approach: use a temp table of distinct phones from unlinked orders
-- Step 1: Create a materialized phone list first
CREATE OR REPLACE FUNCTION public.batch_create_customers_v2(p_batch_size int DEFAULT 500, p_offset int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
  v_created int := 0;
BEGIN
  -- Use the index on customer_phone where customer_id IS NULL
  -- Instead of GROUP BY on millions of rows, just pick phones from the index
  WITH candidate_phones AS (
    SELECT customer_phone, customer_name
    FROM tenant_icondenim.cdp_orders
    WHERE customer_id IS NULL 
      AND customer_phone ~ '^0[0-9]{9,10}$'
    ORDER BY customer_phone
    LIMIT p_batch_size OFFSET p_offset
  ),
  distinct_phones AS (
    SELECT DISTINCT ON (customer_phone) customer_phone, customer_name
    FROM candidate_phones
  ),
  new_phones AS (
    SELECT dp.customer_phone, dp.customer_name
    FROM distinct_phones dp
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_icondenim.cdp_customers c WHERE c.phone = dp.customer_phone
    )
  ),
  inserted AS (
    INSERT INTO tenant_icondenim.cdp_customers (tenant_id, name, phone, phone_extracted, canonical_key, acquisition_source, created_at)
    SELECT '364a23ad-66f5-44d6-8da9-74c7ff333dcc', np.customer_name, np.customer_phone, np.customer_phone,
      'phone:' || np.customer_phone, 'haravan', now()
    FROM new_phones np
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_created FROM inserted;

  RETURN jsonb_build_object('created', v_created, 'offset', p_offset);
END;
$$;
