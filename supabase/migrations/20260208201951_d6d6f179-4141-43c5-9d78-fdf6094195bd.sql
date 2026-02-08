CREATE OR REPLACE FUNCTION aggregate_order_cogs_batch(
  p_tenant_id UUID,
  p_batch_size INT DEFAULT 2000
)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '25s'
AS $$
DECLARE
  v_updated INT := 0;
BEGIN
  WITH candidates AS (
    SELECT oi.order_id, SUM(oi.line_cogs) as total_cogs
    FROM cdp_order_items oi
    JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id
      AND oi.line_cogs > 0
      AND (o.cogs IS NULL OR o.cogs = 0)
    GROUP BY oi.order_id
    LIMIT p_batch_size
  ),
  updated AS (
    UPDATE cdp_orders o
    SET cogs = c.total_cogs,
        gross_margin = o.net_revenue - c.total_cogs
    FROM candidates c
    WHERE o.id = c.order_id
      AND o.tenant_id = p_tenant_id
    RETURNING o.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated;

  RETURN v_updated;
END;
$$;