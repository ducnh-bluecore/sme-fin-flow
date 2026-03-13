
-- Add index to speed up the FK fix query
CREATE INDEX IF NOT EXISTS idx_cdp_order_items_order_id_tenant 
ON tenant_icondenim.cdp_order_items (order_id);

-- Recreate function with smaller default and statement timeout override
CREATE OR REPLACE FUNCTION public.fix_order_items_fk_batch(
  p_schema TEXT,
  p_batch_size INT DEFAULT 2000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_updated INT := 0;
  v_remaining INT := 0;
BEGIN
  EXECUTE format('
    WITH to_fix AS (
      SELECT oi.id as item_id, to2.id as new_order_id
      FROM %I.cdp_order_items oi
      JOIN public.cdp_orders po ON po.id = oi.order_id
      JOIN %I.cdp_orders to2 ON to2.order_key = po.order_key AND to2.channel = po.channel
      WHERE NOT EXISTS (SELECT 1 FROM %I.cdp_orders x WHERE x.id = oi.order_id)
      LIMIT %s
    )
    UPDATE %I.cdp_order_items oi
    SET order_id = tf.new_order_id
    FROM to_fix tf
    WHERE oi.id = tf.item_id
  ', p_schema, p_schema, p_schema, p_batch_size, p_schema);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  -- Approximate remaining (cheaper query)
  EXECUTE format('
    SELECT COUNT(*) FROM (
      SELECT 1 FROM %I.cdp_order_items oi
      WHERE NOT EXISTS (SELECT 1 FROM %I.cdp_orders x WHERE x.id = oi.order_id)
        AND EXISTS (SELECT 1 FROM public.cdp_orders po WHERE po.id = oi.order_id)
      LIMIT 100000
    ) sub
  ', p_schema, p_schema) INTO v_remaining;
  
  RETURN jsonb_build_object(
    'updated', v_updated,
    'remaining', v_remaining,
    'done', v_updated = 0
  );
END;
$$;
