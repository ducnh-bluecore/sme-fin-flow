
-- Create a staging table of unlinked phones for fast processing
CREATE TABLE IF NOT EXISTS tenant_icondenim.pending_customer_phones (
  phone text PRIMARY KEY,
  name text,
  processed boolean DEFAULT false
);

-- Populate it with distinct phones from unlinked orders (one-time)
INSERT INTO tenant_icondenim.pending_customer_phones (phone, name)
SELECT DISTINCT ON (customer_phone) customer_phone, customer_name
FROM tenant_icondenim.cdp_orders
WHERE customer_id IS NULL 
  AND customer_phone ~ '^0[0-9]{9,10}$'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_icondenim.cdp_customers c WHERE c.phone = cdp_orders.customer_phone
  )
ON CONFLICT DO NOTHING;

-- Fast create function: reads from small staging table
CREATE OR REPLACE FUNCTION public.batch_create_customers_v2(p_batch_size int DEFAULT 500, p_offset int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
  v_created int := 0;
BEGIN
  WITH batch AS (
    SELECT phone, name
    FROM tenant_icondenim.pending_customer_phones
    WHERE processed = false
    LIMIT p_batch_size
  ),
  inserted AS (
    INSERT INTO tenant_icondenim.cdp_customers (tenant_id, name, phone, phone_extracted, canonical_key, acquisition_source, created_at)
    SELECT '364a23ad-66f5-44d6-8da9-74c7ff333dcc', b.name, b.phone, b.phone,
      'phone:' || b.phone, 'haravan', now()
    FROM batch b
    ON CONFLICT DO NOTHING
    RETURNING phone
  ),
  mark_done AS (
    UPDATE tenant_icondenim.pending_customer_phones p
    SET processed = true
    FROM batch b WHERE p.phone = b.phone
    RETURNING p.phone
  )
  SELECT count(*) INTO v_created FROM inserted;

  RETURN jsonb_build_object('created', v_created);
END;
$$;
