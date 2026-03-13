
CREATE OR REPLACE FUNCTION public.batch_create_customers_v2(p_batch_size int DEFAULT 500, p_offset int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
  v_created int := 0;
  v_marked int := 0;
BEGIN
  -- Step 1: Create customers from pending phones
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
  )
  SELECT count(*) INTO v_created FROM inserted;

  -- Step 2: Mark batch as processed (separate statement)
  UPDATE tenant_icondenim.pending_customer_phones
  SET processed = true
  WHERE phone IN (
    SELECT phone FROM tenant_icondenim.pending_customer_phones WHERE processed = false LIMIT p_batch_size
  );
  GET DIAGNOSTICS v_marked = ROW_COUNT;

  RETURN jsonb_build_object('created', v_created, 'marked', v_marked);
END;
$$;
