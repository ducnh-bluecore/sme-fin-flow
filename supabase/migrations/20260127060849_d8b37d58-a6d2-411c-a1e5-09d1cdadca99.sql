-- Create view for category P&L summary
-- Joins cdp_order_items with cdp_orders for date filtering
CREATE OR REPLACE VIEW v_category_pl_summary AS
SELECT 
  oi.tenant_id,
  DATE_TRUNC('month', o.order_at)::DATE as period,
  COALESCE(oi.category, 'Không phân loại') as category,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.line_revenue) as total_revenue,
  SUM(oi.line_cogs) as total_cogs,
  SUM(oi.line_revenue) - SUM(oi.line_cogs) as gross_profit,
  CASE 
    WHEN SUM(oi.line_revenue) > 0 
    THEN ((SUM(oi.line_revenue) - SUM(oi.line_cogs)) / SUM(oi.line_revenue) * 100)
    ELSE 0 
  END as margin_percent
FROM cdp_order_items oi
JOIN cdp_orders o ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
GROUP BY oi.tenant_id, DATE_TRUNC('month', o.order_at), oi.category;