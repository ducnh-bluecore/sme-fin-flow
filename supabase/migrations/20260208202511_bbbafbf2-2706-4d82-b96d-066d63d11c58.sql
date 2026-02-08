CREATE OR REPLACE FUNCTION aggregate_order_cogs_batch(
  p_tenant_id UUID,
  p_batch_size INT DEFAULT 3000
)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '55s'
AS $$
DECLARE
  v_updated INT := 0;
BEGIN
  -- Get distinct order_ids from items that still need COGS on the order
  WITH target_orders AS (
    SELECT DISTINCT oi.order_id
    FROM cdp_order_items oi
    JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = p_tenant_id
    WHERE oi.tenant_id = p_tenant_id
      AND oi.line_cogs > 0
      AND (o.cogs = 0 OR o.cogs IS NULL)
    LIMIT p_batch_size
  ),
  agg AS (
    SELECT oi.order_id, SUM(oi.line_cogs) as total_cogs
    FROM cdp_order_items oi
    JOIN target_orders t ON t.order_id = oi.order_id
    WHERE oi.tenant_id = p_tenant_id
      AND oi.line_cogs > 0
    GROUP BY oi.order_id
  ),
  updated AS (
    UPDATE cdp_orders o
    SET cogs = a.total_cogs,
        gross_margin = o.net_revenue - a.total_cogs
    FROM agg a
    WHERE o.id = a.order_id
      AND o.tenant_id = p_tenant_id
    RETURNING o.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated;

  RETURN v_updated;
END;
$$;