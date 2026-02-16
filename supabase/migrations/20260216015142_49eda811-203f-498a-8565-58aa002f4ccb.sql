
-- New view: clearance history matched by SKU via inv_sku_fc_mapping
-- This correctly links cdp_order_items to inv_family_codes through SKU mapping
CREATE OR REPLACE VIEW v_clearance_history_by_fc AS
SELECT 
  fc.tenant_id,
  fc.id as fc_id,
  fc.fc_name as product_name,
  o.channel,
  date_trunc('month', o.order_at)::date as sale_month,
  CASE 
    WHEN oi.discount_amount <= 0 OR oi.discount_amount IS NULL THEN 'full_price'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.2 THEN '0-20%'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.3 THEN '20-30%'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.5 THEN '30-50%'
    ELSE '>50%'
  END as discount_band,
  count(*) as units_sold,
  sum(oi.line_revenue) as revenue_collected,
  sum(COALESCE(oi.discount_amount, 0)) as total_discount_given,
  round(avg(
    CASE WHEN oi.discount_amount > 0 
    THEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) * 100 
    ELSE 0 END
  )) as avg_discount_pct
FROM cdp_order_items oi
JOIN inv_sku_fc_mapping m ON m.sku = oi.sku AND m.tenant_id = oi.tenant_id
JOIN inv_family_codes fc ON fc.id = m.fc_id AND fc.tenant_id = m.tenant_id
JOIN cdp_orders o ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
GROUP BY fc.tenant_id, fc.id, fc.fc_name, o.channel, date_trunc('month', o.order_at)::date,
  CASE 
    WHEN oi.discount_amount <= 0 OR oi.discount_amount IS NULL THEN 'full_price'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.2 THEN '0-20%'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.3 THEN '20-30%'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.5 THEN '30-50%'
    ELSE '>50%'
  END;
