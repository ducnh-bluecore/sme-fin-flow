
CREATE OR REPLACE VIEW v_top_products_30d AS
SELECT 
  oi.tenant_id,
  oi.sku,
  COALESCE(p.name, MAX(oi.product_name), oi.sku) as product_name,
  COALESCE(p.category, MAX(oi.category)) as category,
  SUM(oi.qty) as total_qty,
  SUM(oi.line_revenue) as total_revenue,
  COUNT(DISTINCT oi.order_id) as order_count
FROM cdp_order_items oi
LEFT JOIN products p ON oi.sku = p.sku AND oi.tenant_id = p.tenant_id
WHERE oi.line_revenue > 0
GROUP BY oi.tenant_id, oi.sku, p.name, p.category
ORDER BY total_revenue DESC;
