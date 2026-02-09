-- RPC to delete KiotViet marketplace orders by order_key batch
CREATE OR REPLACE FUNCTION public.cleanup_kiotviet_marketplace_orders(
  p_tenant_id UUID,
  p_order_keys TEXT[],
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items_deleted BIGINT := 0;
  v_orders_deleted BIGINT := 0;
  v_matched BIGINT := 0;
BEGIN
  -- Count matching orders
  SELECT COUNT(*) INTO v_matched
  FROM cdp_orders 
  WHERE tenant_id = p_tenant_id 
    AND channel = 'kiotviet' 
    AND order_key = ANY(p_order_keys);
  
  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'dry_run', true,
      'matched_orders', v_matched
    );
  END IF;

  -- Delete order items first (FK constraint)
  WITH orders_to_delete AS (
    SELECT id FROM cdp_orders 
    WHERE tenant_id = p_tenant_id 
      AND channel = 'kiotviet' 
      AND order_key = ANY(p_order_keys)
  )
  DELETE FROM cdp_order_items 
  WHERE tenant_id = p_tenant_id 
    AND order_id IN (SELECT id FROM orders_to_delete);
  GET DIAGNOSTICS v_items_deleted = ROW_COUNT;

  -- Delete orders
  DELETE FROM cdp_orders 
  WHERE tenant_id = p_tenant_id 
    AND channel = 'kiotviet' 
    AND order_key = ANY(p_order_keys);
  GET DIAGNOSTICS v_orders_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'dry_run', false,
    'orders_deleted', v_orders_deleted,
    'items_deleted', v_items_deleted
  );
END;
$$;