-- More efficient: first mark orders WITHOUT items, then batch the rest
CREATE OR REPLACE FUNCTION aggregate_order_cogs_batch(
  p_tenant_id UUID,
  p_batch_size INT DEFAULT 2000
)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '30s'
AS $$
DECLARE
  v_updated INT := 0;
BEGIN
  -- Only update orders that actually have order_items with line_cogs
  WITH candidates AS (
    SELECT DISTINCT oi.order_id, SUM(oi.line_cogs) as total_cogs
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

-- Separate function to mark orphan orders (no items or no COGS items)
CREATE OR REPLACE FUNCTION mark_orphan_orders_cogs(
  p_tenant_id UUID,
  p_batch_size INT DEFAULT 50000
)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  v_marked INT;
BEGIN
  WITH orphans AS (
    SELECT o.id
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND (o.cogs IS NULL OR o.cogs = 0)
      AND NOT EXISTS (
        SELECT 1 FROM cdp_order_items oi 
        WHERE oi.order_id = o.id 
          AND oi.tenant_id = p_tenant_id
          AND oi.line_cogs > 0
      )
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET cogs = 0,
      gross_margin = net_revenue
  FROM orphans orph
  WHERE o.id = orph.id;

  GET DIAGNOSTICS v_marked = ROW_COUNT;
  RETURN v_marked;
END;
$$;