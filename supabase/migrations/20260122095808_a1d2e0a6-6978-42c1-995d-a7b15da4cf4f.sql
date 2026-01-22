-- Fix: Column is external_order_id, not order_id
DROP FUNCTION IF EXISTS get_sku_profitability_by_date_range(uuid, date, date);

CREATE OR REPLACE FUNCTION get_sku_profitability_by_date_range(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  sku text,
  product_name text,
  channel text,
  total_quantity numeric,
  total_revenue numeric,
  total_cogs numeric,
  total_fees numeric,
  gross_profit numeric,
  margin_percent numeric,
  aov numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eoi.sku::text,
    eoi.product_name::text,
    COALESCE(eo.channel, 'Unknown')::text AS channel,
    SUM(COALESCE(eoi.quantity, 0))::numeric AS total_quantity,
    SUM(COALESCE(eoi.total_amount, 0))::numeric AS total_revenue,
    SUM(
      CASE 
        WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 THEN p.cost_price * COALESCE(eoi.quantity, 0)
        WHEN eoi.unit_cogs IS NOT NULL AND eoi.unit_cogs > 0 THEN eoi.unit_cogs * COALESCE(eoi.quantity, 0)
        ELSE COALESCE(eoi.total_cogs, 0)
      END
    )::numeric AS total_cogs,
    SUM(
      COALESCE(eo.platform_fee, 0) + 
      COALESCE(eo.commission_fee, 0) + 
      COALESCE(eo.payment_fee, 0) + 
      COALESCE(eo.shipping_fee, 0)
    )::numeric AS total_fees,
    (SUM(COALESCE(eoi.total_amount, 0)) - 
     SUM(
       CASE 
         WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 THEN p.cost_price * COALESCE(eoi.quantity, 0)
         WHEN eoi.unit_cogs IS NOT NULL AND eoi.unit_cogs > 0 THEN eoi.unit_cogs * COALESCE(eoi.quantity, 0)
         ELSE COALESCE(eoi.total_cogs, 0)
       END
     ) -
     SUM(
       COALESCE(eo.platform_fee, 0) + 
       COALESCE(eo.commission_fee, 0) + 
       COALESCE(eo.payment_fee, 0) + 
       COALESCE(eo.shipping_fee, 0)
     )
    )::numeric AS gross_profit,
    CASE 
      WHEN SUM(COALESCE(eoi.total_amount, 0)) > 0 THEN
        ROUND(
          ((SUM(COALESCE(eoi.total_amount, 0)) - 
            SUM(
              CASE 
                WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 THEN p.cost_price * COALESCE(eoi.quantity, 0)
                WHEN eoi.unit_cogs IS NOT NULL AND eoi.unit_cogs > 0 THEN eoi.unit_cogs * COALESCE(eoi.quantity, 0)
                ELSE COALESCE(eoi.total_cogs, 0)
              END
            ) -
            SUM(
              COALESCE(eo.platform_fee, 0) + 
              COALESCE(eo.commission_fee, 0) + 
              COALESCE(eo.payment_fee, 0) + 
              COALESCE(eo.shipping_fee, 0)
            )
          ) / SUM(COALESCE(eoi.total_amount, 0)) * 100)::numeric, 2
        )
      ELSE 0
    END AS margin_percent,
    CASE 
      WHEN SUM(COALESCE(eoi.quantity, 0)) > 0 THEN
        ROUND((SUM(COALESCE(eoi.total_amount, 0)) / SUM(COALESCE(eoi.quantity, 0)))::numeric, 0)
      ELSE 0
    END AS aov,
    CASE 
      WHEN SUM(COALESCE(eoi.total_amount, 0)) <= 0 THEN 'unknown'
      WHEN ((SUM(COALESCE(eoi.total_amount, 0)) - 
             SUM(
               CASE 
                 WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 THEN p.cost_price * COALESCE(eoi.quantity, 0)
                 WHEN eoi.unit_cogs IS NOT NULL AND eoi.unit_cogs > 0 THEN eoi.unit_cogs * COALESCE(eoi.quantity, 0)
                 ELSE COALESCE(eoi.total_cogs, 0)
               END
             ) -
             SUM(
               COALESCE(eo.platform_fee, 0) + 
               COALESCE(eo.commission_fee, 0) + 
               COALESCE(eo.payment_fee, 0) + 
               COALESCE(eo.shipping_fee, 0)
             )
           ) / SUM(COALESCE(eoi.total_amount, 0)) * 100) >= 10 THEN 'profitable'
      WHEN ((SUM(COALESCE(eoi.total_amount, 0)) - 
             SUM(
               CASE 
                 WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 THEN p.cost_price * COALESCE(eoi.quantity, 0)
                 WHEN eoi.unit_cogs IS NOT NULL AND eoi.unit_cogs > 0 THEN eoi.unit_cogs * COALESCE(eoi.quantity, 0)
                 ELSE COALESCE(eoi.total_cogs, 0)
               END
             ) -
             SUM(
               COALESCE(eo.platform_fee, 0) + 
               COALESCE(eo.commission_fee, 0) + 
               COALESCE(eo.payment_fee, 0) + 
               COALESCE(eo.shipping_fee, 0)
             )
           ) / SUM(COALESCE(eoi.total_amount, 0)) * 100) >= 0 THEN 'marginal'
      ELSE 'loss'
    END AS status
  FROM external_order_items eoi
  INNER JOIN external_orders eo ON eo.id = eoi.external_order_id AND eo.tenant_id = eoi.tenant_id
  LEFT JOIN products p ON p.sku = eoi.sku AND p.tenant_id = eoi.tenant_id
  WHERE eoi.tenant_id = p_tenant_id
    AND eo.order_date >= p_start_date
    AND eo.order_date <= p_end_date
    AND eoi.sku IS NOT NULL
    AND eoi.quantity > 0
  GROUP BY eoi.sku, eoi.product_name, eo.channel
  ORDER BY total_revenue DESC
  LIMIT 500;
END;
$$;