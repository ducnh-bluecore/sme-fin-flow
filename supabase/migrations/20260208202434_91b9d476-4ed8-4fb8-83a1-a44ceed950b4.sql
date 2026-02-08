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
  -- Start from order_items side (indexed, only 89K qualifying orders)
  -- NOT from orders side (1.14M rows, most without items)
  WITH agg AS (
    SELECT oi.order_id, SUM(oi.line_cogs) as total_cogs
    FROM cdp_order_items oi
    WHERE oi.tenant_id = p_tenant_id
      AND oi.line_cogs > 0
    GROUP BY oi.order_id
    LIMIT p_batch_size
  ),
  to_update AS (
    SELECT a.order_id, a.total_cogs
    FROM agg a
    JOIN cdp_orders o ON o.id = a.order_id AND o.tenant_id = p_tenant_id
    WHERE o.cogs = 0 OR o.cogs IS NULL
  ),
  updated AS (
    UPDATE cdp_orders o
    SET cogs = tu.total_cogs,
        gross_margin = o.net_revenue - tu.total_cogs
    FROM to_update tu
    WHERE o.id = tu.order_id
      AND o.tenant_id = p_tenant_id
    RETURNING o.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated;

  RETURN v_updated;
END;
$$;