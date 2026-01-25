
-- Fix v_cdp_equity_overview to use the latest date WITH actual equity data
DROP VIEW IF EXISTS public.v_cdp_equity_snapshot CASCADE;
DROP VIEW IF EXISTS public.v_cdp_equity_overview CASCADE;

-- v_cdp_equity_overview: Aggregated equity summary per tenant
-- Fixed: Get latest date that HAS equity data, not just any date
CREATE VIEW public.v_cdp_equity_overview AS
WITH latest_date AS (
  SELECT tenant_id, MAX(as_of_date) as latest_date
  FROM cdp_customer_equity_computed
  WHERE equity_12m IS NOT NULL  -- Only consider dates with actual equity data
  GROUP BY tenant_id
),
tenant_metrics AS (
  SELECT 
    c.tenant_id,
    ld.latest_date as as_of_date,
    COUNT(*) as total_customers,
    COUNT(*) FILTER (WHERE c.equity_12m IS NOT NULL) as customers_with_equity,
    SUM(c.equity_12m) as total_equity_12m,
    SUM(c.equity_24m) as total_equity_24m,
    AVG(c.equity_12m) FILTER (WHERE c.equity_12m IS NOT NULL) as avg_equity_12m,
    -- At-risk value: sum of equity for high/critical risk customers
    SUM(c.equity_12m) FILTER (WHERE c.risk_level IN ('high', 'critical')) as at_risk_value,
    -- At-risk percent
    CASE WHEN SUM(c.equity_12m) > 0 THEN
      (SUM(c.equity_12m) FILTER (WHERE c.risk_level IN ('high', 'critical')) / SUM(c.equity_12m)) * 100
    ELSE NULL END as at_risk_percent,
    -- Estimated share
    CASE WHEN COUNT(*) FILTER (WHERE c.equity_12m IS NOT NULL) > 0 THEN
      COUNT(*) FILTER (WHERE c.equity_is_estimated AND c.equity_12m IS NOT NULL)::numeric / 
      COUNT(*) FILTER (WHERE c.equity_12m IS NOT NULL)
    ELSE NULL END as estimated_share,
    -- Data quality summary
    jsonb_build_object(
      'total_with_real_profit', COUNT(*) FILTER (WHERE NOT c.equity_is_estimated AND c.equity_12m IS NOT NULL),
      'total_estimated', COUNT(*) FILTER (WHERE c.equity_is_estimated AND c.equity_12m IS NOT NULL),
      'has_cogs_data', COUNT(*) FILTER (WHERE NOT c.equity_is_estimated) > 0,
      'has_fees_data', false
    ) as data_quality_summary
  FROM cdp_customer_equity_computed c
  INNER JOIN latest_date ld ON c.tenant_id = ld.tenant_id AND c.as_of_date = ld.latest_date
  GROUP BY c.tenant_id, ld.latest_date
)
SELECT 
  tm.tenant_id,
  tm.as_of_date,
  tm.total_customers,
  tm.customers_with_equity,
  tm.total_equity_12m,
  tm.total_equity_24m,
  tm.avg_equity_12m,
  tm.at_risk_value,
  tm.at_risk_percent,
  NULL::numeric as equity_change,  -- To be calculated with historical comparison
  NULL::text as change_direction,
  tm.estimated_share,
  tm.data_quality_summary,
  NOW() as last_updated
FROM tenant_metrics tm;

-- Recreate v_cdp_equity_snapshot
CREATE VIEW public.v_cdp_equity_snapshot AS
SELECT 
  eo.tenant_id,
  eo.as_of_date,
  eo.total_equity_12m,
  eo.total_equity_24m,
  eo.at_risk_value,
  eo.at_risk_percent,
  eo.equity_change,
  eo.change_direction,
  eo.estimated_share,
  eo.data_quality_summary,
  -- Top drivers placeholder
  NULL::jsonb as top_drivers,
  eo.last_updated
FROM v_cdp_equity_overview eo;
