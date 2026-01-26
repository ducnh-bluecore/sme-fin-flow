-- ============================================================================
-- FIX: compute_central_metrics_snapshot to match existing table schema
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_central_metrics_snapshot(
  p_tenant_id uuid,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id uuid;
  v_start_date date;
  v_end_date date;
  v_metrics record;
BEGIN
  v_end_date := COALESCE(p_period_end, CURRENT_DATE);
  v_start_date := COALESCE(p_period_start, DATE_TRUNC('month', v_end_date)::date);

  -- Compute metrics from cdp_orders (SSOT Layer 2)
  SELECT 
    COALESCE(SUM(co.net_revenue), 0) as total_revenue,
    COALESCE(SUM(co.gross_margin), 0) as gross_profit,
    CASE WHEN SUM(co.net_revenue) > 0 
      THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
      ELSE 0 
    END as gross_margin_percent,
    COALESCE(COUNT(DISTINCT co.id), 0)::integer as order_count,
    COALESCE(COUNT(DISTINCT co.customer_id), 0)::integer as customer_count,
    CASE WHEN COUNT(DISTINCT co.id) > 0 
      THEN ROUND((SUM(co.net_revenue) / COUNT(DISTINCT co.id))::numeric, 0)
      ELSE 0 
    END as avg_order_value
  INTO v_metrics
  FROM cdp_orders co
  WHERE co.tenant_id = p_tenant_id
    AND DATE(co.order_at) >= v_start_date
    AND DATE(co.order_at) <= v_end_date;

  -- Insert snapshot using existing columns in central_metrics_snapshots
  INSERT INTO central_metrics_snapshots (
    tenant_id,
    period_start,
    period_end,
    net_revenue,
    gross_profit,
    gross_margin_percent,
    total_orders,
    total_customers,
    avg_order_value,
    snapshot_at,
    computed_by,
    compute_function
  ) VALUES (
    p_tenant_id,
    v_start_date,
    v_end_date,
    v_metrics.total_revenue,
    v_metrics.gross_profit,
    v_metrics.gross_margin_percent,
    v_metrics.order_count,
    v_metrics.customer_count,
    v_metrics.avg_order_value,
    NOW(),
    'system',
    'compute_central_metrics_snapshot_v2'
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION compute_central_metrics_snapshot IS 
'Compute Central Metrics Snapshot - SSOT Compliant. Reads from cdp_orders (Layer 2). Fixed to match table schema.';