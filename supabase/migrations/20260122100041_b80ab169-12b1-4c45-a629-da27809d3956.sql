-- Create a single SSOT unit cost resolver for a SKU
-- Priority: products.cost_price -> derived from external_order_items historical total_cogs/qty
CREATE OR REPLACE FUNCTION public.get_sku_master_unit_cost(
  p_tenant_id uuid,
  p_sku text
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT NULLIF(p.cost_price, 0)
      FROM public.products p
      WHERE p.tenant_id = p_tenant_id
        AND p.sku = p_sku
      LIMIT 1
    ),
    (
      SELECT
        CASE
          WHEN SUM(COALESCE(eoi.quantity,0)) > 0
            THEN SUM(COALESCE(eoi.total_cogs,0)) / NULLIF(SUM(COALESCE(eoi.quantity,0)), 0)
          ELSE NULL
        END
      FROM public.external_order_items eoi
      WHERE eoi.tenant_id = p_tenant_id
        AND eoi.sku = p_sku
        AND COALESCE(eoi.total_cogs,0) > 0
    )
  );
$$;

-- Recreate RPC using the master unit cost to keep COGS consistent across channels
DROP FUNCTION IF EXISTS public.get_sku_profitability_by_date_range(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_sku_profitability_by_date_range(
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
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      eoi.sku::text AS sku,
      MAX(eoi.product_name)::text AS product_name,
      COALESCE(eo.channel, 'Unknown')::text AS channel,
      SUM(COALESCE(eoi.quantity, 0))::numeric AS total_quantity,
      SUM(COALESCE(eoi.total_amount, 0))::numeric AS total_revenue,
      SUM(
        COALESCE(eo.platform_fee, 0) +
        COALESCE(eo.commission_fee, 0) +
        COALESCE(eo.payment_fee, 0) +
        COALESCE(eo.shipping_fee, 0)
      )::numeric AS total_fees
    FROM public.external_order_items eoi
    JOIN public.external_orders eo
      ON eo.id = eoi.external_order_id
     AND eo.tenant_id = eoi.tenant_id
    WHERE eoi.tenant_id = p_tenant_id
      AND eo.order_date >= p_start_date
      AND eo.order_date <= p_end_date
      AND eoi.sku IS NOT NULL
      AND COALESCE(eoi.quantity, 0) > 0
    GROUP BY eoi.sku, eo.channel
  ), costed AS (
    SELECT
      b.*,
      (public.get_sku_master_unit_cost(p_tenant_id, b.sku) * b.total_quantity)::numeric AS total_cogs
    FROM base b
  )
  SELECT
    c.sku,
    c.product_name,
    c.channel,
    c.total_quantity,
    c.total_revenue,
    COALESCE(c.total_cogs, 0)::numeric AS total_cogs,
    c.total_fees,
    (c.total_revenue - COALESCE(c.total_cogs, 0) - c.total_fees)::numeric AS gross_profit,
    CASE
      WHEN c.total_revenue > 0 THEN
        ROUND(((c.total_revenue - COALESCE(c.total_cogs, 0) - c.total_fees) / c.total_revenue * 100)::numeric, 2)
      ELSE 0
    END AS margin_percent,
    CASE
      WHEN c.total_quantity > 0 THEN ROUND((c.total_revenue / c.total_quantity)::numeric, 0)
      ELSE 0
    END AS aov,
    CASE
      WHEN c.total_revenue <= 0 THEN 'unknown'
      WHEN ((c.total_revenue - COALESCE(c.total_cogs, 0) - c.total_fees) / c.total_revenue * 100) >= 10 THEN 'profitable'
      WHEN ((c.total_revenue - COALESCE(c.total_cogs, 0) - c.total_fees) / c.total_revenue * 100) >= 0 THEN 'marginal'
      ELSE 'loss'
    END AS status
  FROM costed c
  ORDER BY total_revenue DESC
  LIMIT 500;
$$;