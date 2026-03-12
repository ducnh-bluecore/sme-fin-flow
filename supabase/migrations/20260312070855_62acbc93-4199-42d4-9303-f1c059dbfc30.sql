
-- Update link_orders_batch to handle Haravan channel (email-based canonical_key)
CREATE OR REPLACE FUNCTION public.link_orders_batch(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_linked integer := 0;
  v_pass integer := 0;
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);

  -- Pass 1: Match by buyer_id (KiotViet CusId)
  WITH batch AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.external_ids @> jsonb_build_array(
        jsonb_build_object('id', o.buyer_id::bigint, 'source', 'kiotviet')
      )
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.buyer_id IS NOT NULL AND o.buyer_id != ''
      AND o.channel = 'kiotviet'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  -- Pass 2: Match by phone (canonical_key is phone-based)
  WITH batch AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.canonical_key = regexp_replace(o.customer_phone, '[^0-9]', '', 'g')
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_phone IS NOT NULL
      AND o.customer_phone !~ '\*'
      AND length(regexp_replace(o.customer_phone, '[^0-9]', '', 'g')) >= 9
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  -- Pass 3: Haravan - match phone from canonical_key "guest+PHONE@haravan.com"
  WITH haravan_phones AS (
    SELECT id as customer_id,
      regexp_replace(substring(canonical_key from 'guest\+(.+)@haravan\.com'), '[^0-9]', '', 'g') AS phone_extracted
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND canonical_key LIKE 'guest+%@haravan.com'
  ),
  batch AS (
    SELECT o.id as order_id, hp.customer_id
    FROM cdp_orders o
    JOIN haravan_phones hp 
      ON regexp_replace(o.customer_phone, '[^0-9]', '', 'g') = hp.phone_extracted
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_phone IS NOT NULL
      AND length(regexp_replace(o.customer_phone, '[^0-9]', '', 'g')) >= 9
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  -- Pass 4: Haravan - match by external_ids haravan customer id
  WITH batch AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.external_ids @> jsonb_build_array(
        jsonb_build_object('id', o.buyer_id, 'source', 'haravan')
      )
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.buyer_id IS NOT NULL AND o.buyer_id != ''
      AND o.channel = 'haravan'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  -- Pass 5: Name match (unique names only, fallback)
  WITH unique_names AS (
    SELECT LOWER(TRIM(name)) as norm_name, (array_agg(id ORDER BY created_at))[1] as customer_id
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND name IS NOT NULL AND trim(name) != '' AND name !~ '\*'
    GROUP BY LOWER(TRIM(name)) HAVING COUNT(*) = 1
  ),
  batch AS (
    SELECT o.id as order_id, un.customer_id
    FROM cdp_orders o
    JOIN unique_names un ON LOWER(TRIM(o.customer_name)) = un.norm_name
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_name IS NOT NULL
      AND TRIM(o.customer_name) != ''
      AND o.customer_name !~ '\*'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  RETURN v_linked;
END;
$function$;
