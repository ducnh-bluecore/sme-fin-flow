-- ============================================================================
-- SSOT FIX: FDP SKU Summary now reads from cdp_order_items (Layer 2)
-- ============================================================================
-- Problem: fdp_sku_summary was reading from external_order_items (Layer 0)
--          while CDP uses cdp_order_items (Layer 2) → SSOT violation
-- Solution: Both FDP and CDP read from cdp_order_items as Single Source of Truth
-- ============================================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS fdp_sku_summary;

-- Create SSOT-compliant view reading from cdp_order_items (Layer 2)
CREATE OR REPLACE VIEW fdp_sku_summary AS
SELECT 
  coi.tenant_id,
  COALESCE(p.sku, coi.product_id) as sku,
  COALESCE(p.name, 'Product ' || coi.product_id) as product_name,
  coi.category,
  COUNT(DISTINCT coi.order_id) as order_count,
  SUM(coi.qty) as total_quantity,
  SUM(coi.line_revenue) as total_revenue,
  SUM(coi.line_cogs) as total_cogs,
  SUM(coi.line_margin) as gross_profit,
  CASE WHEN SUM(coi.line_revenue) > 0 
    THEN ROUND((SUM(coi.line_margin) / SUM(coi.line_revenue) * 100)::numeric, 2)
    ELSE 0 
  END as margin_percent,
  -- Average metrics
  CASE WHEN SUM(coi.qty) > 0 
    THEN ROUND((SUM(coi.line_revenue) / SUM(coi.qty))::numeric, 0)
    ELSE 0 
  END as avg_unit_price,
  CASE WHEN SUM(coi.qty) > 0 
    THEN ROUND((SUM(coi.line_cogs) / SUM(coi.qty))::numeric, 0)
    ELSE 0 
  END as avg_unit_cogs
FROM cdp_order_items coi
LEFT JOIN products p ON p.id = coi.product_id::uuid
GROUP BY coi.tenant_id, COALESCE(p.sku, coi.product_id), COALESCE(p.name, 'Product ' || coi.product_id), coi.category;

-- Add comment for documentation
COMMENT ON VIEW fdp_sku_summary IS 
'FDP SKU Summary - SSOT Compliant. Reads from cdp_order_items (Layer 2) to ensure consistency with CDP module. 
Both FDP and CDP now share single source of truth for line-item metrics.';

-- Grant access
GRANT SELECT ON fdp_sku_summary TO authenticated;
GRANT SELECT ON fdp_sku_summary TO anon;