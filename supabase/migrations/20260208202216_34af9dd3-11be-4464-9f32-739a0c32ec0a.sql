-- Simpler batch function using temp table approach
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
  -- Create temp table with pre-aggregated COGS
  CREATE TEMP TABLE IF NOT EXISTS _cogs_batch (
    order_id UUID PRIMARY KEY,
    total_cogs NUMERIC
  ) ON COMMIT DROP;
  
  TRUNCATE _cogs_batch;
  
  -- Fill with batch of orders that need COGS
  INSERT INTO _cogs_batch (order_id, total_cogs)
  SELECT oi.order_id, SUM(oi.line_cogs)
  FROM cdp_order_items oi
  WHERE oi.tenant_id = p_tenant_id
    AND oi.line_cogs > 0
    AND oi.order_id IN (
      SELECT id FROM cdp_orders 
      WHERE tenant_id = p_tenant_id AND cogs = 0
      LIMIT p_batch_size
    )
  GROUP BY oi.order_id;

  -- Update orders from temp table
  UPDATE cdp_orders o
  SET cogs = cb.total_cogs,
      gross_margin = o.net_revenue - cb.total_cogs
  FROM _cogs_batch cb
  WHERE o.id = cb.order_id
    AND o.tenant_id = p_tenant_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  DROP TABLE IF EXISTS _cogs_batch;
  
  RETURN v_updated;
END;
$$;