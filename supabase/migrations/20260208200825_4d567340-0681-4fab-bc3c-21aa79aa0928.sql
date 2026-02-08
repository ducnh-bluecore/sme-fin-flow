-- Batched version of sync_order_cogs_from_items that processes in chunks
CREATE OR REPLACE FUNCTION sync_order_cogs_batched(
  p_tenant_id UUID,
  p_batch_size INT DEFAULT 2000
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total_updated INT := 0;
  v_batch_updated INT := 0;
BEGIN
  -- Use a loop to process in batches
  LOOP
    WITH agg AS (
      SELECT oi.order_id, SUM(oi.line_cogs) as total_cogs
      FROM cdp_order_items oi
      WHERE oi.tenant_id = p_tenant_id
        AND oi.line_cogs > 0
      GROUP BY oi.order_id
    ),
    to_update AS (
      SELECT o.id, a.total_cogs
      FROM cdp_orders o
      JOIN agg a ON a.order_id = o.id
      WHERE o.tenant_id = p_tenant_id
        AND (o.cogs IS NULL OR o.cogs = 0)
      LIMIT p_batch_size
    ),
    updated AS (
      UPDATE cdp_orders o
      SET cogs = tu.total_cogs,
          gross_margin = o.net_revenue - tu.total_cogs
      FROM to_update tu
      WHERE o.id = tu.id
      RETURNING o.id
    )
    SELECT COUNT(*) INTO v_batch_updated FROM updated;

    v_total_updated := v_total_updated + v_batch_updated;
    
    EXIT WHEN v_batch_updated = 0;
    
    -- Safety: max 500K rows
    EXIT WHEN v_total_updated >= 500000;
  END LOOP;

  RETURN jsonb_build_object(
    'orders_updated', v_total_updated,
    'tenant_id', p_tenant_id
  );
END;
$$;