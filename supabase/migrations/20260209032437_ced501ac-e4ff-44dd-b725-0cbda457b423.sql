
-- Index cho buyer_id matching
CREATE INDEX IF NOT EXISTS idx_cdp_orders_buyer_id 
  ON cdp_orders(tenant_id, buyer_id) 
  WHERE buyer_id IS NOT NULL AND customer_id IS NULL;

-- Index cho phone matching  
CREATE INDEX IF NOT EXISTS idx_cdp_orders_phone_unlinked
  ON cdp_orders(tenant_id, customer_phone)
  WHERE customer_id IS NULL AND customer_phone IS NOT NULL;

-- GIN index cho external_ids JSONB search
CREATE INDEX IF NOT EXISTS idx_cdp_customers_ext_ids
  ON cdp_customers USING gin(external_ids);

-- Rewrite link_orders_batch with 3-pass strategy
CREATE OR REPLACE FUNCTION link_orders_batch(
  p_tenant_id uuid, 
  p_batch_size integer DEFAULT 5000
) RETURNS integer AS $$
DECLARE
  v_linked integer := 0;
  v_pass integer := 0;
BEGIN
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
      AND o.buyer_id IS NOT NULL 
      AND o.buyer_id != ''
      AND o.channel = 'kiotviet'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  -- Pass 2: Match by phone
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

  -- Pass 3: Name match (fallback)
  WITH unique_names AS (
    SELECT name, (array_agg(id ORDER BY created_at))[1] as customer_id
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND name IS NOT NULL AND trim(name) != '' AND name !~ '\*'
    GROUP BY name HAVING COUNT(*) = 1
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
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  RETURN v_linked;
END;
$$ LANGUAGE plpgsql;
