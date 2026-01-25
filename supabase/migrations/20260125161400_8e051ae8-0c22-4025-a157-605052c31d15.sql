-- Phase 1: Create v_cdp_population_detail view for population detail page
-- Simplified version without cdp_segment_membership (table doesn't exist)
-- Uses data from v_cdp_population_catalog + cdp_segments only

CREATE OR REPLACE VIEW public.v_cdp_population_detail AS
SELECT 
  pc.tenant_id,
  pc.population_id,
  pc.name,
  pc.population_type,
  pc.definition,
  pc.customer_count,
  pc.revenue_share,
  pc.stability,
  pc.insight_count,
  -- Additional detail metrics from catalog
  pc.total_revenue,
  ROUND(pc.customer_count * 100.0 / NULLIF(tenant_totals.total_customers, 0), 2) as customer_share,
  -- Estimated equity based on revenue (30% margin proxy as per CDP manifesto)
  ROUND(pc.total_revenue * 0.3, 0) as estimated_equity,
  -- Average order value (revenue / customer count as proxy)
  CASE 
    WHEN pc.customer_count > 0 THEN ROUND(pc.total_revenue / pc.customer_count, 0)
    ELSE 0
  END as avg_order_value,
  -- Default purchase cycle (will be computed when more data available)
  30 as purchase_cycle_days,
  -- Default return rate (placeholder)
  0::numeric as return_rate,
  -- Natural language description
  COALESCE(s.description, 
    CASE pc.population_type
      WHEN 'tier' THEN 'Tập khách hàng phân theo giá trị - ' || pc.definition
      WHEN 'segment' THEN 'Phân khúc hành vi - ' || pc.definition  
      WHEN 'cohort' THEN 'Nhóm khách theo thời gian - ' || pc.definition
      ELSE pc.definition
    END
  ) as natural_language_description,
  -- Criteria JSON for display
  s.definition_json as criteria_json,
  -- Version tracking
  COALESCE(s.version, pc.version, 1) as version,
  COALESCE(s.updated_at, pc.created_at, NOW()) as last_updated
FROM public.v_cdp_population_catalog pc
-- Get tenant totals for share calculation
LEFT JOIN (
  SELECT tenant_id, SUM(customer_count) as total_customers
  FROM public.v_cdp_population_catalog
  GROUP BY tenant_id
) tenant_totals ON tenant_totals.tenant_id = pc.tenant_id
-- Get segment definition if exists (cast population_id to uuid for segments table)
LEFT JOIN public.cdp_segments s ON s.id = pc.population_id::uuid AND s.tenant_id = pc.tenant_id;

-- Add comment for documentation
COMMENT ON VIEW public.v_cdp_population_detail IS 'CDP Population Detail View - provides comprehensive metrics for individual population viewing. Equity is estimated using REVENUE_PROXY (30% margin) when COGS unavailable.';