
CREATE OR REPLACE FUNCTION public.populate_first_sale_dates(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE inv_lifecycle_batches lb
  SET first_sale_date = sub.first_order_date
  FROM (
    SELECT m.fc_id, MIN(o.order_at::DATE) AS first_order_date
    FROM inv_sku_fc_mapping m
    JOIN cdp_order_items oi ON TRIM(oi.sku) = m.sku AND oi.tenant_id = m.tenant_id
    JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    WHERE m.tenant_id = p_tenant_id
    GROUP BY m.fc_id
  ) sub
  WHERE lb.fc_id = sub.fc_id
    AND lb.batch_number = 1
    AND lb.tenant_id = p_tenant_id
    AND lb.first_sale_date IS DISTINCT FROM sub.first_order_date;
END;
$function$;
