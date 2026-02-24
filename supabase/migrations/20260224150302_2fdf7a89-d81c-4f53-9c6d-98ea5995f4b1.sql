CREATE OR REPLACE FUNCTION public.batch_update_sku_color(
  updates jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  updated_count int := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE inv_sku_fc_mapping
    SET color = item->>'color'
    WHERE sku = item->>'sku'
      AND (color IS NULL OR color != item->>'color');
    
    updated_count := updated_count + GET_DIAGNOSTICS(ROW_COUNT);
  END LOOP;

  RETURN jsonb_build_object('updated', updated_count);
END;
$$;