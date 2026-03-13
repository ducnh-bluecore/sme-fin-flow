
CREATE OR REPLACE FUNCTION tenant_icondenim.aggregate_item_cogs_to_orders(p_batch_size int DEFAULT 50000)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = tenant_icondenim, public AS $$
DECLARE v_updated int;
BEGIN
  WITH item_cogs AS (
    SELECT po.order_key, SUM(oi.line_cogs) as total_cogs
    FROM tenant_icondenim.cdp_order_items oi
    INNER JOIN public.cdp_orders po ON po.id = oi.order_id
    WHERE oi.line_cogs > 0
    GROUP BY po.order_key
  ),
  target_orders AS (
    SELECT t.id, ic.total_cogs
    FROM tenant_icondenim.cdp_orders t
    INNER JOIN item_cogs ic ON ic.order_key = t.order_key
    WHERE (t.cogs IS NULL OR t.cogs = 0)
    LIMIT p_batch_size
  )
  UPDATE tenant_icondenim.cdp_orders o
  SET cogs = tgt.total_cogs
  FROM target_orders tgt
  WHERE o.id = tgt.id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;
