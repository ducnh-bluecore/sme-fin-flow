
CREATE OR REPLACE FUNCTION public.fix_order_items_fk_batch(
  p_schema TEXT,
  p_batch_size INT DEFAULT 10000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $fn$
DECLARE
  v_updated INT := 0;
  v_remaining INT := 0;
BEGIN
  EXECUTE format($q$
    UPDATE %I.cdp_order_items oi
    SET order_id = r.new_id
    FROM %I.order_id_remap r
    WHERE oi.order_id = r.old_id
      AND oi.order_id != r.new_id
      AND oi.id IN (
        SELECT oi2.id FROM %I.cdp_order_items oi2
        JOIN %I.order_id_remap r2 ON oi2.order_id = r2.old_id AND oi2.order_id != r2.new_id
        LIMIT %s
      )
  $q$, p_schema, p_schema, p_schema, p_schema, p_batch_size);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  EXECUTE format($q$
    SELECT COUNT(*) FROM %I.cdp_order_items oi
    JOIN %I.order_id_remap r ON oi.order_id = r.old_id AND oi.order_id != r.new_id
  $q$, p_schema, p_schema) INTO v_remaining;
  
  RETURN jsonb_build_object(
    'updated', v_updated,
    'remaining', v_remaining,
    'done', v_updated = 0
  );
END;
$fn$;
