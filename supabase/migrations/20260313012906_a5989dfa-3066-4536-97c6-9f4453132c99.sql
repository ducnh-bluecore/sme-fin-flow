
-- Create public wrapper that calls the tenant function
CREATE OR REPLACE FUNCTION public.batch_create_and_link_customers(
  p_batch_size int DEFAULT 2000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tenant_icondenim, public
AS $$
DECLARE
  v_created int := 0;
  v_linked int := 0;
BEGIN
  WITH new_phones AS (
    SELECT DISTINCT ON (customer_phone) 
      customer_phone, customer_name
    FROM tenant_icondenim.cdp_orders
    WHERE customer_id IS NULL AND channel = 'haravan'
      AND customer_phone ~ '^0[0-9]{9,10}$'
      AND NOT EXISTS (
        SELECT 1 FROM tenant_icondenim.cdp_customers c WHERE c.phone = cdp_orders.customer_phone
      )
    LIMIT p_batch_size
  ),
  inserted AS (
    INSERT INTO tenant_icondenim.cdp_customers (tenant_id, name, phone, phone_extracted, acquisition_source, created_at)
    SELECT '364a23ad-66f5-44d6-8da9-74c7ff333dcc', np.customer_name, np.customer_phone, np.customer_phone, 'haravan', now()
    FROM new_phones np ON CONFLICT DO NOTHING RETURNING id
  )
  SELECT count(*) INTO v_created FROM inserted;

  WITH to_link AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM tenant_icondenim.cdp_orders o
    JOIN tenant_icondenim.cdp_customers c ON c.phone = o.customer_phone
    WHERE o.customer_id IS NULL AND o.customer_phone ~ '^0[0-9]{9,10}$'
    LIMIT p_batch_size * 5
  ),
  updated AS (
    UPDATE tenant_icondenim.cdp_orders o SET customer_id = tl.customer_id
    FROM to_link tl WHERE o.id = tl.order_id RETURNING o.id
  )
  SELECT count(*) INTO v_linked FROM updated;

  RETURN jsonb_build_object('created', v_created, 'linked', v_linked);
END;
$$;
