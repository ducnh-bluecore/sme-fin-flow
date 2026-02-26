
-- 1. Fix v_transfer_by_destination to exclude stores not eligible for transfer
CREATE OR REPLACE VIEW public.v_transfer_by_destination AS
SELECT t.tenant_id,
    t.as_of_date,
    t.dest_store_id,
    count(*) AS transfer_count,
    sum(t.transfer_qty) AS total_qty,
    sum(t.net_benefit) AS total_net_benefit,
    sum(t.estimated_revenue_gain) AS total_revenue_gain,
    sum(t.estimated_transfer_cost) AS total_transfer_cost,
    count(DISTINCT t.product_id) AS unique_products,
    count(DISTINCT t.source_store_id) AS source_count
FROM state_size_transfer_daily t
JOIN inv_stores src ON src.id = t.source_store_id AND src.is_transfer_eligible = true
JOIN inv_stores dst ON dst.id = t.dest_store_id AND dst.is_transfer_eligible = true
GROUP BY t.tenant_id, t.as_of_date, t.dest_store_id;

-- 2. Fix fn_dest_size_inventory to show ALL sizes (including zero stock)
CREATE OR REPLACE FUNCTION public.fn_dest_size_inventory(p_tenant_id uuid, p_store_id uuid, p_fc_id uuid)
RETURNS TABLE(size_code text, on_hand bigint)
LANGUAGE sql STABLE
AS $$
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
  ORDER BY array_position(
    ARRAY['XXS','XS','S','M','L','XL','XXL','2XL','3XL','FS'], 
    upper(regexp_replace(sku, '.*[0-9]', ''))
  );
$$;

-- 3. Clean up existing transfer data for ineligible stores
DELETE FROM state_size_transfer_daily 
WHERE source_store_id IN (SELECT id FROM inv_stores WHERE is_transfer_eligible = false)
   OR dest_store_id IN (SELECT id FROM inv_stores WHERE is_transfer_eligible = false);
