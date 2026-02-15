
CREATE OR REPLACE VIEW v_clearance_history_by_product WITH (security_invoker = on) AS
SELECT 
  oi.tenant_id,
  oi.product_name,
  oi.sku,
  o.channel,
  date_trunc('month', o.order_at) as sale_month,
  CASE 
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.2 THEN '0-20%'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.3 THEN '20-30%'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.5 THEN '30-50%'
    ELSE '>50%'
  END as discount_band,
  count(*) as units_sold,
  sum(oi.line_revenue) as revenue_collected,
  sum(oi.discount_amount) as total_discount_given,
  round(avg(oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) * 100)) as avg_discount_pct
FROM cdp_order_items oi
JOIN cdp_orders o ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
WHERE oi.discount_amount > 0
GROUP BY 1,2,3,4,5,6;
