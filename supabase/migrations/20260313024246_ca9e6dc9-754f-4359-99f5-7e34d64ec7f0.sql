
CREATE OR REPLACE FUNCTION tenant_icondenim.batch_update_cogs_estimate(
  p_batch_size int DEFAULT 50000
)
RETURNS TABLE(items_updated bigint, orders_updated bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tenant_icondenim, public
AS $$
DECLARE
  v_items_updated bigint := 0;
  v_orders_updated bigint := 0;
BEGIN
  WITH to_update AS (
    SELECT id 
    FROM tenant_icondenim.cdp_order_items 
    WHERE (line_cogs IS NULL OR line_cogs = 0) 
      AND unit_price > 0
    LIMIT p_batch_size
  )
  UPDATE tenant_icondenim.cdp_order_items oi
  SET line_cogs = ROUND(oi.unit_price * oi.qty * 0.20, 0),
      unit_cogs = ROUND(oi.unit_price * 0.20, 0)
  FROM to_update tu
  WHERE oi.id = tu.id;
  
  GET DIAGNOSTICS v_items_updated = ROW_COUNT;

  WITH order_cogs AS (
    SELECT order_id, SUM(line_cogs) as total_cogs
    FROM tenant_icondenim.cdp_order_items
    WHERE line_cogs > 0
    GROUP BY order_id
  )
  UPDATE tenant_icondenim.cdp_orders o
  SET cogs = oc.total_cogs
  FROM order_cogs oc
  WHERE o.id = oc.order_id
    AND (o.cogs IS NULL OR o.cogs = 0 OR o.cogs != oc.total_cogs);
  
  GET DIAGNOSTICS v_orders_updated = ROW_COUNT;

  RETURN QUERY SELECT v_items_updated, v_orders_updated;
END;
$$;
