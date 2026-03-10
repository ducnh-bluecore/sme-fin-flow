
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
      COALESCE(SUM(oi.discount_amount), 0) AS discount_amount
    FROM cdp_order_items oi
    INNER JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id
      AND oi.sku LIKE (p_fc_code || '%')
      AND o.status NOT IN ('cancelled', 'returned')
    GROUP BY o.channel
  ),
  profit_agg AS (
    SELECT
      sc.channel,
      COALESCE(SUM(sc.revenue), 0) AS prof_revenue,
      COALESCE(SUM(sc.cogs), 0) AS total_cogs,
      COALESCE(SUM(sc.fees), 0) AS total_fees,
      COALESCE(SUM(sc.profit), 0) AS total_profit,
      COALESCE(SUM(sc.quantity), 0) AS prof_qty
    FROM sku_profitability_cache sc
    WHERE sc.tenant_id = p_tenant_id
      AND sc.sku LIKE (p_fc_code || '%')
    GROUP BY sc.channel
  ),
  totals AS (
    SELECT
      COALESCE(SUM(revenue), 0) AS total_revenue,
      COALESCE(SUM(discount_amount), 0) AS total_discount,
      COALESCE(SUM(qty_sold), 0) AS total_qty,
      COALESCE(SUM(order_count), 0) AS total_orders
    FROM channel_agg
  ),
  profit_totals AS (
    SELECT
      COALESCE(SUM(total_cogs), 0) AS grand_cogs,
      COALESCE(SUM(total_fees), 0) AS grand_fees,
      COALESCE(SUM(total_profit), 0) AS grand_profit
    FROM profit_agg
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
          'cogs', COALESCE(pa.total_cogs, 0),
          'fees', COALESCE(pa.total_fees, 0),
          'profit', COALESCE(pa.total_profit, 0),
          'margin_pct', CASE WHEN COALESCE(pa.prof_revenue, 0) > 0 THEN ROUND((pa.total_profit / pa.prof_revenue) * 100, 1) ELSE 0 END
        ) ORDER BY ca.revenue DESC
      )
      FROM channel_agg ca
      LEFT JOIN profit_agg pa ON pa.channel = ca.channel
    ), '[]'::jsonb),
    'total_revenue', t.total_revenue,
    'total_discount', t.total_discount,
    'total_qty', t.total_qty,
    'total_orders', t.total_orders,
    'avg_discount_pct', CASE WHEN t.total_revenue > 0 THEN ROUND((t.total_discount::numeric / (t.total_revenue + t.total_discount)) * 100, 1) ELSE 0 END,
    'total_cogs', pt.grand_cogs,
    'total_fees', pt.grand_fees,
    'total_profit', pt.grand_profit,
    'avg_margin_pct', CASE WHEN t.total_revenue > 0 THEN ROUND((pt.grand_profit / t.total_revenue) * 100, 1) ELSE 0 END
  ) INTO result
  FROM totals t, profit_totals pt;

  RETURN result;
END;
$$;
