
-- Drop old function
DROP FUNCTION IF EXISTS public.batch_create_and_link_customers(int);

-- Step 1: Create customers only (fast, uses offset cursor)
CREATE OR REPLACE FUNCTION public.batch_create_customers_v2(p_batch_size int DEFAULT 500, p_offset int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
  v_created int := 0;
BEGIN
  WITH candidate_phones AS (
    SELECT DISTINCT customer_phone, min(customer_name) as customer_name
    FROM tenant_icondenim.cdp_orders
    WHERE customer_id IS NULL 
      AND customer_phone ~ '^0[0-9]{9,10}$'
    GROUP BY customer_phone
    ORDER BY customer_phone
    LIMIT p_batch_size OFFSET p_offset
  ),
  new_phones AS (
    SELECT cp.customer_phone, cp.customer_name
    FROM candidate_phones cp
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_icondenim.cdp_customers c WHERE c.phone = cp.customer_phone
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

  RETURN jsonb_build_object('created', v_created, 'offset', p_offset, 'batch_size', p_batch_size);
END;
$$;

-- Step 2: Link orders only (uses index on phone)
CREATE OR REPLACE FUNCTION public.batch_link_orders_v2(p_batch_size int DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
  v_linked int := 0;
BEGIN
  WITH to_link AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM tenant_icondenim.cdp_orders o
    JOIN tenant_icondenim.cdp_customers c ON c.phone = o.customer_phone
    WHERE o.customer_id IS NULL 
      AND o.customer_phone ~ '^0[0-9]{9,10}$'
    LIMIT p_batch_size
  ),
  updated AS (
    UPDATE tenant_icondenim.cdp_orders o 
    SET customer_id = tl.customer_id
    FROM to_link tl 
    WHERE o.id = tl.order_id 
    RETURNING o.id
  )
  SELECT count(*) INTO v_linked FROM updated;

  RETURN jsonb_build_object('linked', v_linked);
END;
$$;
