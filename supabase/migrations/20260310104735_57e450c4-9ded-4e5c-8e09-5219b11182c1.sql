
-- Update batch_update_sku_color to include tenant_id
CREATE OR REPLACE FUNCTION public.batch_update_sku_color(updates jsonb, p_tenant_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  total_updated int := 0;
  row_cnt int;
  v_tenant_id uuid;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, current_setting('app.tenant_id', true)::uuid);
  
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE inv_sku_fc_mapping
    SET color = item->>'color'
    WHERE sku = item->>'sku'
      AND (v_tenant_id IS NULL OR tenant_id = v_tenant_id)
      AND (color IS NULL OR color != item->>'color');
    
    GET DIAGNOSTICS row_cnt = ROW_COUNT;
    total_updated := total_updated + row_cnt;
  END LOOP;

  RETURN jsonb_build_object('updated', total_updated);
END;
$$;
