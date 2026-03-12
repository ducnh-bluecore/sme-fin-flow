
-- Single-pass linking functions for performance
CREATE OR REPLACE FUNCTION public.link_orders_pass_phone(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '55s'
AS $$
DECLARE
  v_linked integer := 0;
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);
  
  WITH batch AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.phone = regexp_replace(o.customer_phone, '[^0-9]', '', 'g')
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
  GET DIAGNOSTICS v_linked = ROW_COUNT;
  
  RETURN v_linked;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_orders_pass_canonical(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '55s'
AS $$
DECLARE
  v_linked integer := 0;
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);
  
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
  GET DIAGNOSTICS v_linked = ROW_COUNT;
  
  RETURN v_linked;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_orders_pass_haravan_phone(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '55s'
AS $$
DECLARE
  v_linked integer := 0;
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);
  
  WITH haravan_phones AS (
    SELECT id as customer_id,
      regexp_replace(substring(canonical_key from 'guest\+(.+)@haravan\.com'), '[^0-9]', '', 'g') AS phone_extracted
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND canonical_key LIKE 'guest+%@haravan.com'
      AND length(regexp_replace(substring(canonical_key from 'guest\+(.+)@haravan\.com'), '[^0-9]', '', 'g')) >= 9
  ),
  batch AS (
    SELECT DISTINCT ON (o.id) o.id as order_id, hp.customer_id
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
  GET DIAGNOSTICS v_linked = ROW_COUNT;
  
  RETURN v_linked;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_orders_pass_name(p_tenant_id uuid, p_batch_size integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '55s'
AS $$
DECLARE
  v_linked integer := 0;
BEGIN
  PERFORM public.set_tenant_search_path(p_tenant_id);
  
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
  GET DIAGNOSTICS v_linked = ROW_COUNT;
  
  RETURN v_linked;
END;
$$;
