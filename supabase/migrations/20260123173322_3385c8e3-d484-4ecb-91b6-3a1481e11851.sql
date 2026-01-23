-- Drop and recreate cdp_build_customer_metrics_daily to fix return type
DROP FUNCTION IF EXISTS cdp_build_customer_metrics_daily(uuid, date);

CREATE OR REPLACE FUNCTION cdp_build_customer_metrics_daily(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  WITH orders_day AS (
    SELECT
      o.tenant_id,
      o.order_at::date AS as_of_date,
      o.customer_id,
      COUNT(*)::int AS orders_count,
      SUM(o.gross_revenue)::numeric AS gross_revenue,
      SUM(o.net_revenue)::numeric AS net_revenue,
      SUM(o.discount_amount)::numeric AS discount_amount,
      SUM(o.cogs)::numeric AS cogs,
      SUM(o.gross_margin)::numeric AS gross_margin,
      SUM(CASE WHEN o.is_discounted THEN 1 ELSE 0 END)::int AS is_discounted_orders_count,
      SUM(CASE WHEN o.is_bundle THEN 1 ELSE 0 END)::int AS bundle_orders_count,
      SUM(CASE WHEN o.payment_method = 'COD' THEN 1 ELSE 0 END)::int AS cod_orders_count,
      0::int AS orders_total_qty
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NOT NULL
      AND o.order_at::date = p_as_of_date
    GROUP BY 1,2,3
  ),
  refunds_day AS (
    SELECT
      r.tenant_id,
      r.refund_at::date AS as_of_date,
      r.customer_id,
      SUM(r.refund_amount)::numeric AS refund_amount
    FROM cdp_refunds r
    WHERE r.tenant_id = p_tenant_id
      AND r.customer_id IS NOT NULL
      AND r.refund_at::date = p_as_of_date
    GROUP BY 1,2,3
  ),
  merged AS (
    SELECT
      o.tenant_id, o.as_of_date, o.customer_id,
      o.orders_count, o.gross_revenue, o.net_revenue, o.discount_amount,
      COALESCE(r.refund_amount, 0)::numeric AS refund_amount,
      o.cogs, o.gross_margin,
      o.is_discounted_orders_count, o.bundle_orders_count, o.cod_orders_count,
      o.orders_total_qty
    FROM orders_day o
    LEFT JOIN refunds_day r ON r.tenant_id = o.tenant_id
      AND r.as_of_date = o.as_of_date AND r.customer_id = o.customer_id
  ),
  inserted AS (
    INSERT INTO cdp_customer_metrics_daily (
      tenant_id, as_of_date, customer_id,
      orders_count, gross_revenue, net_revenue, discount_amount, refund_amount,
      cogs, gross_margin, is_discounted_orders_count, bundle_orders_count, 
      cod_orders_count, orders_total_qty
    )
    SELECT * FROM merged
    ON CONFLICT (tenant_id, as_of_date, customer_id) DO UPDATE SET
      orders_count = EXCLUDED.orders_count, gross_revenue = EXCLUDED.gross_revenue,
      net_revenue = EXCLUDED.net_revenue, discount_amount = EXCLUDED.discount_amount,
      refund_amount = EXCLUDED.refund_amount, cogs = EXCLUDED.cogs,
      gross_margin = EXCLUDED.gross_margin,
      is_discounted_orders_count = EXCLUDED.is_discounted_orders_count,
      bundle_orders_count = EXCLUDED.bundle_orders_count,
      cod_orders_count = EXCLUDED.cod_orders_count,
      orders_total_qty = EXCLUDED.orders_total_qty
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;