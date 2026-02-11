
CREATE OR REPLACE FUNCTION get_sku_cost_breakdown(
  p_tenant_id UUID,
  p_sku TEXT,
  p_start_date TEXT DEFAULT '2020-01-01',
  p_end_date TEXT DEFAULT '2099-12-31'
)
RETURNS TABLE(
  order_id UUID,
  order_key TEXT,
  channel TEXT,
  order_at TIMESTAMPTZ,
  quantity NUMERIC,
  unit_price NUMERIC,
  line_revenue NUMERIC,
  line_cogs NUMERIC,
  line_margin NUMERIC,
  order_gross_revenue NUMERIC,
  order_platform_fee NUMERIC,
  order_shipping_fee NUMERIC,
  order_other_fees NUMERIC,
  revenue_share_pct NUMERIC,
  allocated_platform_fee NUMERIC,
  allocated_shipping_fee NUMERIC,
  allocated_other_fees NUMERIC,
  gross_profit NUMERIC,
  net_profit NUMERIC,
  margin_percent NUMERIC
)
LANGUAGE plpgsql
STABLE
SET statement_timeout = '60s'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    co.id AS order_id,
    co.order_key,
    co.channel,
    co.order_at,
    coi.qty AS quantity,
    coi.unit_price,
    coi.line_revenue,
    coi.line_cogs,
    coi.line_margin,
    co.gross_revenue AS order_gross_revenue,
    COALESCE(co.platform_fee, 0) AS order_platform_fee,
    COALESCE(co.shipping_fee, 0) AS order_shipping_fee,
    COALESCE(co.other_fees, 0) AS order_other_fees,
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * 100)::numeric, 2)
      ELSE 0
    END AS revenue_share_pct,
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * COALESCE(co.platform_fee, 0))::numeric, 2)
      ELSE 0
    END AS allocated_platform_fee,
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * COALESCE(co.shipping_fee, 0))::numeric, 2)
      ELSE 0
    END AS allocated_shipping_fee,
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * COALESCE(co.other_fees, 0))::numeric, 2)
      ELSE 0
    END AS allocated_other_fees,
    COALESCE(coi.line_revenue - coi.line_cogs, 0)::numeric AS gross_profit,
    (COALESCE(coi.line_revenue, 0) 
      - COALESCE(coi.line_cogs, 0)
      - CASE WHEN co.gross_revenue > 0 
          THEN (coi.line_revenue / co.gross_revenue * (COALESCE(co.platform_fee, 0) + COALESCE(co.shipping_fee, 0) + COALESCE(co.other_fees, 0)))
          ELSE 0
        END
    )::numeric AS net_profit,
    CASE WHEN coi.line_revenue > 0 
      THEN ROUND(((coi.line_revenue - coi.line_cogs) / coi.line_revenue * 100)::numeric, 2)
      ELSE 0
    END AS margin_percent
  FROM cdp_order_items coi
  INNER JOIN cdp_orders co ON co.id = coi.order_id AND co.tenant_id = coi.tenant_id
  WHERE coi.tenant_id = p_tenant_id
    AND coi.sku = p_sku
    AND co.order_at::date BETWEEN p_start_date::date AND p_end_date::date
  ORDER BY co.order_at DESC
  LIMIT 500;
END;
$$;
