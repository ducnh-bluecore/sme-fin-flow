-- Create RPC to get SKU cost breakdown from CDP SSOT
-- This replaces the external_order_items query with CDP-only data

CREATE OR REPLACE FUNCTION public.get_sku_cost_breakdown(
  p_tenant_id uuid,
  p_sku text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  order_id uuid,
  order_key text,
  channel text,
  order_at timestamptz,
  quantity integer,
  unit_price numeric,
  line_revenue numeric,
  line_cogs numeric,
  line_margin numeric,
  order_gross_revenue numeric,
  order_platform_fee numeric,
  order_shipping_fee numeric,
  order_other_fees numeric,
  revenue_share_pct numeric,
  allocated_platform_fee numeric,
  allocated_shipping_fee numeric,
  allocated_other_fees numeric,
  gross_profit numeric,
  net_profit numeric,
  margin_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- Revenue share percentage
    CASE WHEN co.gross_revenue > 0 
      THEN ROUND((coi.line_revenue / co.gross_revenue * 100)::numeric, 2)
      ELSE 0
    END AS revenue_share_pct,
    -- Allocated fees based on revenue share
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
    -- Profit calculations
    COALESCE(coi.line_revenue - coi.line_cogs, 0)::numeric AS gross_profit,
    (COALESCE(coi.line_revenue, 0) 
      - COALESCE(coi.line_cogs, 0)
      - CASE WHEN co.gross_revenue > 0 
          THEN (coi.line_revenue / co.gross_revenue * (COALESCE(co.platform_fee, 0) + COALESCE(co.shipping_fee, 0) + COALESCE(co.other_fees, 0)))
          ELSE 0
        END
    )::numeric AS net_profit,
    -- Margin percent
    CASE WHEN coi.line_revenue > 0 
      THEN ROUND(((coi.line_revenue - coi.line_cogs) / coi.line_revenue * 100)::numeric, 2)
      ELSE 0
    END AS margin_percent
  FROM cdp_order_items coi
  INNER JOIN cdp_orders co ON co.id = coi.order_id AND co.tenant_id = coi.tenant_id
  INNER JOIN products p ON p.tenant_id = coi.tenant_id 
    AND (p.id::text = coi.product_id OR p.sku = coi.product_id)
  WHERE coi.tenant_id = p_tenant_id
    AND p.sku = p_sku
    AND co.order_at::date BETWEEN p_start_date AND p_end_date
  ORDER BY co.order_at DESC
  LIMIT 500;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_sku_cost_breakdown(uuid, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sku_cost_breakdown(uuid, text, date, date) TO anon;