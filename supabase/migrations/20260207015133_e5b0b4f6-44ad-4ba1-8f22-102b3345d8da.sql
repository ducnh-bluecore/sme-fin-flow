
CREATE OR REPLACE FUNCTION public.update_order_items_cogs(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE cdp_order_items oi
  SET 
    unit_cogs   = p.cost_price,
    line_cogs   = p.cost_price * oi.qty,
    line_margin = oi.line_revenue - (p.cost_price * oi.qty)
  FROM products p
  WHERE p.tenant_id = oi.tenant_id
    AND p.code = oi.sku
    AND oi.tenant_id = p_tenant_id
    AND p.cost_price > 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
