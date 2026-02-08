
-- Chunked version: link a batch of orders and return how many were linked
-- Caller loops until returns 0
CREATE OR REPLACE FUNCTION public.link_orders_batch(p_tenant_id uuid, p_batch_size integer DEFAULT 10000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked integer := 0;
BEGIN
  -- Match by exact unmasked name where customer name is unique
  WITH unique_names AS (
    SELECT name, (array_agg(id ORDER BY created_at))[1] as customer_id
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND name IS NOT NULL AND trim(name) != '' AND name !~ '\*'
    GROUP BY name
    HAVING COUNT(*) = 1
  ),
  batch AS (
    SELECT o.id as order_id, un.customer_id
    FROM cdp_orders o
    JOIN unique_names un ON trim(o.customer_name) = un.name
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_name IS NOT NULL
      AND o.customer_name !~ '\*'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b
  WHERE o.id = b.order_id;

  GET DIAGNOSTICS v_linked = ROW_COUNT;
  RETURN v_linked;
END;
$$;
