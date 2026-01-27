-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS public.get_sku_profitability_by_date_range(UUID, DATE, DATE);

-- Recreate with explicit TEXT casting to fix type mismatch
CREATE OR REPLACE FUNCTION public.get_sku_profitability_by_date_range(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  sku TEXT,
  product_name TEXT,
  channel TEXT,
  total_quantity BIGINT,
  total_revenue NUMERIC,
  total_cogs NUMERIC,
  total_fees NUMERIC,
  gross_profit NUMERIC,
  margin_percent NUMERIC,
  aov NUMERIC,
  status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.sku, coi.product_id)::TEXT as sku,
    COALESCE(p.name, 'Product ' || coi.product_id)::TEXT as product_name,
    co.channel::TEXT as channel,
    SUM(coi.quantity)::BIGINT as total_quantity,
    SUM(coi.total_amount)::NUMERIC as total_revenue,
    SUM(COALESCE(coi.cogs_amount, coi.total_amount * 0.55))::NUMERIC as total_cogs,
    SUM(COALESCE(co.platform_fee, 0) + COALESCE(co.other_fees, 0))::NUMERIC / 
      NULLIF(COUNT(DISTINCT co.id), 0) * COUNT(coi.id) as total_fees,
    (SUM(coi.total_amount) - SUM(COALESCE(coi.cogs_amount, coi.total_amount * 0.55)))::NUMERIC as gross_profit,
    CASE 
      WHEN SUM(coi.total_amount) > 0 THEN
        ((SUM(coi.total_amount) - SUM(COALESCE(coi.cogs_amount, coi.total_amount * 0.55))) / SUM(coi.total_amount) * 100)::NUMERIC
      ELSE 0
    END as margin_percent,
    CASE 
      WHEN SUM(coi.quantity) > 0 THEN (SUM(coi.total_amount) / SUM(coi.quantity))::NUMERIC
      ELSE 0
    END as aov,
    CASE 
      WHEN SUM(coi.total_amount) > 0 AND 
           ((SUM(coi.total_amount) - SUM(COALESCE(coi.cogs_amount, coi.total_amount * 0.55))) / SUM(coi.total_amount) * 100) >= 10 
      THEN 'profitable'::TEXT
      WHEN SUM(coi.total_amount) > 0 AND 
           ((SUM(coi.total_amount) - SUM(COALESCE(coi.cogs_amount, coi.total_amount * 0.55))) / SUM(coi.total_amount) * 100) >= 0 
      THEN 'marginal'::TEXT
      ELSE 'loss'::TEXT
    END as status
  FROM cdp_order_items coi
  JOIN cdp_orders co ON co.id = coi.order_id AND co.tenant_id = coi.tenant_id
  LEFT JOIN products p ON p.id::TEXT = coi.product_id AND p.tenant_id = coi.tenant_id
  WHERE coi.tenant_id = p_tenant_id
    AND co.order_date >= p_start_date
    AND co.order_date <= p_end_date
    AND co.status NOT IN ('cancelled', 'returned', 'refunded')
  GROUP BY COALESCE(p.sku, coi.product_id), COALESCE(p.name, 'Product ' || coi.product_id), co.channel
  ORDER BY SUM(coi.total_amount) DESC
  LIMIT 500;
END;
$$;