-- Batched aggregate COGS from order_items to orders
-- Returns number of orders updated in this batch
CREATE OR REPLACE FUNCTION aggregate_order_cogs_batch(
  p_tenant_id UUID,
  p_batch_size INT DEFAULT 2000
)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  WITH order_ids AS (
    SELECT id
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND (cogs IS NULL OR cogs = 0)
      AND net_revenue > 0
    LIMIT p_batch_size
  ),
  agg AS (
    SELECT oi.order_id, SUM(oi.line_cogs) as total_cogs
    FROM cdp_order_items oi
    JOIN order_ids oids ON oids.id = oi.order_id
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

  -- Also mark orders with no matching items (so they don't loop forever)
  -- Set cogs = 0 for orders that have no items with cogs
  IF v_updated = 0 THEN
    WITH no_cogs_orders AS (
      SELECT o.id
      FROM cdp_orders o
      WHERE o.tenant_id = p_tenant_id
        AND (o.cogs IS NULL OR o.cogs = 0)
        AND o.net_revenue > 0
      LIMIT p_batch_size
    ),
    has_items AS (
      SELECT DISTINCT oi.order_id
      FROM cdp_order_items oi
      JOIN no_cogs_orders nco ON nco.id = oi.order_id
      WHERE oi.line_cogs > 0
    ),
    orphans AS (
      SELECT nco.id
      FROM no_cogs_orders nco
      LEFT JOIN has_items hi ON hi.order_id = nco.id
      WHERE hi.order_id IS NULL
    )
    UPDATE cdp_orders o
    SET cogs = 0,
        gross_margin = o.net_revenue
    FROM orphans orph
    WHERE o.id = orph.id;
    
    -- Return 0 to signal completion
    v_updated := 0;
  END IF;

  RETURN v_updated;
END;
$$;