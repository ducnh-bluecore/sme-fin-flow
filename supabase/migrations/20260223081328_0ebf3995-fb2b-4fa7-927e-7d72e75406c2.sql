
CREATE OR REPLACE FUNCTION fn_dest_size_inventory(
  p_tenant_id UUID,
  p_store_id UUID,
  p_fc_id UUID
)
RETURNS TABLE(size_code TEXT, on_hand BIGINT) AS $$
  SELECT 
    upper(regexp_replace(sku, '.*[0-9]', '')) AS size_code,
    SUM(isp.on_hand)::BIGINT AS on_hand
  FROM inv_state_positions isp
  WHERE isp.tenant_id = p_tenant_id
    AND isp.store_id = p_store_id
    AND isp.fc_id = p_fc_id
    AND isp.snapshot_date = (
      SELECT MAX(snapshot_date) FROM inv_state_positions 
      WHERE tenant_id = p_tenant_id
    )
  GROUP BY upper(regexp_replace(sku, '.*[0-9]', ''))
  HAVING SUM(isp.on_hand) > 0
  ORDER BY array_position(
    ARRAY['XXS','XS','S','M','L','XL','XXL','2XL','3XL','FS'], 
    upper(regexp_replace(sku, '.*[0-9]', ''))
  );
$$ LANGUAGE sql STABLE;
