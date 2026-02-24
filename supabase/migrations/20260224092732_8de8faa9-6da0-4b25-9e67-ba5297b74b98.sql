
CREATE OR REPLACE VIEW public.v_inv_store_profile AS
SELECT
  d.tenant_id,
  d.store_id,
  m.size,
  m.color,
  f.demand_space,
  SUM(d.total_sold) AS units_sold
FROM public.inv_state_demand d
JOIN public.inv_sku_fc_mapping m ON m.sku = d.sku AND m.tenant_id = d.tenant_id
JOIN public.inv_family_codes f ON f.id = m.fc_id AND f.tenant_id = d.tenant_id
GROUP BY d.tenant_id, d.store_id, m.size, m.color, f.demand_space;
