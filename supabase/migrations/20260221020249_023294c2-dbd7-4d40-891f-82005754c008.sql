
CREATE OR REPLACE FUNCTION public.update_order_discounts_batch(
  p_tenant_id UUID,
  p_updates JSONB
) RETURNS INT AS $$
DECLARE
  updated_count INT := 0;
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE cdp_orders 
    SET 
      discount_amount = (item->>'discount')::NUMERIC,
      net_revenue = COALESCE(gross_revenue, 0) - (item->>'discount')::NUMERIC
    WHERE tenant_id = p_tenant_id
      AND channel = 'kiotviet'
      AND order_key = item->>'order_key';
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
