
CREATE OR REPLACE VIEW v_inv_avg_unit_price AS
SELECT 
  tenant_id,
  sku,
  AVG(unit_price) as avg_unit_price,
  SUM(line_revenue) as total_revenue,
  SUM(qty) as total_qty
FROM cdp_order_items
WHERE unit_price > 0 AND qty > 0
GROUP BY tenant_id, sku;
