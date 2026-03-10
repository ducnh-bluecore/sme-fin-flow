
CREATE OR REPLACE FUNCTION public.fn_product_channel_sales(
  p_tenant_id UUID,
  p_fc_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH channel_agg AS (
    SELECT
      o.channel,
      COUNT(DISTINCT oi.order_id) AS order_count,
      COALESCE(SUM(oi.qty), 0) AS qty_sold,
      COALESCE(SUM(oi.line_revenue), 0) AS revenue,
      COALESCE(SUM(oi.discount_amount), 0) AS discount_amount,
      COALESCE(SUM(oi.line_cogs), 0) AS cogs
    FROM cdp_order_items oi
    INNER JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id
      AND oi.sku LIKE (p_fc_code || '%')
      AND o.status NOT IN ('cancelled', 'returned')
    GROUP BY o.channel
  ),
  totals AS (
    SELECT
      COALESCE(SUM(revenue), 0) AS total_revenue,
      COALESCE(SUM(discount_amount), 0) AS total_discount,
      COALESCE(SUM(qty_sold), 0) AS total_qty,
      COALESCE(SUM(order_count), 0) AS total_orders,
      COALESCE(SUM(cogs), 0) AS total_cogs
    FROM channel_agg
  )
  SELECT jsonb_build_object(
    'channels', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'channel', ca.channel,
          'order_count', ca.order_count,
          'qty_sold', ca.qty_sold,
          'revenue', ca.revenue,
          'discount_amount', ca.discount_amount,
          'avg_discount_pct', CASE WHEN ca.revenue > 0 THEN ROUND((ca.discount_amount::numeric / (ca.revenue + ca.discount_amount)) * 100, 1) ELSE 0 END,
          'cogs', ca.cogs,
          'fees', 0,
          'profit', ca.revenue - ca.cogs,
          'margin_pct', CASE WHEN ca.revenue > 0 THEN ROUND(((ca.revenue - ca.cogs)::numeric / ca.revenue) * 100, 1) ELSE 0 END
        ) ORDER BY ca.revenue DESC
      )
      FROM channel_agg ca
    ), '[]'::jsonb),
    'total_revenue', t.total_revenue,
    'total_discount', t.total_discount,
    'total_qty', t.total_qty,
    'total_orders', t.total_orders,
    'avg_discount_pct', CASE WHEN t.total_revenue > 0 THEN ROUND((t.total_discount::numeric / (t.total_revenue + t.total_discount)) * 100, 1) ELSE 0 END,
    'total_cogs', t.total_cogs,
    'total_fees', 0,
    'total_profit', t.total_revenue - t.total_cogs,
    'avg_margin_pct', CASE WHEN t.total_revenue > 0 THEN ROUND(((t.total_revenue - t.total_cogs)::numeric / t.total_revenue) * 100, 1) ELSE 0 END
  ) INTO result
  FROM totals t;

  RETURN result;
END;
$$;
