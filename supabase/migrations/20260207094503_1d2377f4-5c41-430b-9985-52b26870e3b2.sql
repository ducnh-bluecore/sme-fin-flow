
-- 1. Add unique constraint to cdp_order_items for upsert support
ALTER TABLE cdp_order_items 
ADD CONSTRAINT cdp_order_items_tenant_order_sku_key 
UNIQUE (tenant_id, order_id, sku);

-- 2. Add unique constraint to promotion_campaigns for upsert support
ALTER TABLE promotion_campaigns 
ADD CONSTRAINT promotion_campaigns_tenant_channel_name_date_key 
UNIQUE (tenant_id, channel, campaign_name, start_date);

-- 3. Optimize update_order_items_cogs() to only update items missing COGS
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
    AND p.cost_price > 0
    AND (oi.unit_cogs IS NULL OR oi.unit_cogs = 0);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
