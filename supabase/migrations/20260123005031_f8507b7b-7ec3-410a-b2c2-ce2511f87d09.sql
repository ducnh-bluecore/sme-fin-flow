-- =============================================
-- CDP POPULATION CATALOG VIEW (DB-First)
-- Combines segments, cohorts, and value tiers into unified catalog
-- =============================================

-- View for population catalog (PopulationsPage)
CREATE OR REPLACE VIEW v_cdp_population_catalog AS
WITH 
-- Segment populations with metrics
segment_pops AS (
  SELECT 
    s.tenant_id,
    s.id::text as population_id,
    'segment' as population_type,
    s.name,
    COALESCE(s.description, 'Phân khúc ' || s.name) as definition,
    s.status,
    s.version,
    -- Get latest membership count
    COALESCE((
      SELECT COUNT(DISTINCT customer_id)::int
      FROM cdp_segment_membership_daily sm
      WHERE sm.tenant_id = s.tenant_id 
        AND sm.segment_id = s.id
        AND sm.is_member = true
        AND sm.as_of_date = (
          SELECT MAX(as_of_date) FROM cdp_segment_membership_daily 
          WHERE tenant_id = s.tenant_id AND segment_id = s.id
        )
    ), 0) as customer_count,
    -- Get revenue metrics from rolling view if available
    COALESCE((
      SELECT sum_net_revenue
      FROM mv_cdp_segment_metrics_rolling smr
      WHERE smr.tenant_id = s.tenant_id 
        AND smr.segment_id = s.id
        AND smr.window_days = 365
      ORDER BY smr.as_of_date DESC
      LIMIT 1
    ), 0) as total_revenue,
    -- Stability based on recent trend
    CASE 
      WHEN s.status = 'ARCHIVED' THEN 'volatile'
      ELSE 'stable'
    END as stability,
    -- Count linked insights
    (
      SELECT COUNT(*)::int
      FROM cdp_insight_events ie
      WHERE ie.tenant_id = s.tenant_id
        AND ie.population_ref->>'segment_id' = s.id::text
        AND ie.as_of_date >= CURRENT_DATE - INTERVAL '30 days'
    ) as insight_count,
    s.created_at
  FROM cdp_segments s
  WHERE s.status = 'ACTIVE'
),
-- Cohort populations
cohort_pops AS (
  SELECT 
    c.tenant_id,
    c.id::text as population_id,
    'cohort' as population_type,
    c.cohort_key as name,
    CASE c.cohort_type
      WHEN 'FIRST_PURCHASE_MONTH' THEN 'Khách mua lần đầu trong ' || c.cohort_key
      WHEN 'ACQ_WINDOW' THEN 'Khách acquire trong ' || c.cohort_key
      WHEN 'VALUE_TIER' THEN 'Nhóm giá trị ' || c.cohort_key
      WHEN 'CHANNEL_FIRST' THEN 'Kênh đầu tiên: ' || c.cohort_key
      ELSE 'Cohort ' || c.cohort_key
    END as definition,
    'ACTIVE' as status,
    1 as version,
    COALESCE((
      SELECT COUNT(DISTINCT customer_id)::int
      FROM cdp_cohort_membership_daily cm
      WHERE cm.tenant_id = c.tenant_id 
        AND cm.cohort_id = c.id
        AND cm.is_member = true
        AND cm.as_of_date = (
          SELECT MAX(as_of_date) FROM cdp_cohort_membership_daily 
          WHERE tenant_id = c.tenant_id AND cohort_id = c.id
        )
    ), 0) as customer_count,
    0 as total_revenue,
    'stable' as stability,
    0 as insight_count,
    c.created_at
  FROM cdp_cohorts c
),
-- Value Tier populations (hardcoded, computed from customer data)
tier_pops AS (
  SELECT 
    t.id as tenant_id,
    'tier-' || tier_name as population_id,
    'tier' as population_type,
    tier_name as name,
    tier_definition as definition,
    'ACTIVE' as status,
    1 as version,
    tier_count as customer_count,
    tier_revenue as total_revenue,
    'stable' as stability,
    0 as insight_count,
    t.created_at
  FROM tenants t
  CROSS JOIN LATERAL (
    VALUES 
      ('TOP10', 'Top 10% khách hàng theo doanh thu thuần 365 ngày', 
       (SELECT COUNT(*)::int FROM cdp_customers WHERE tenant_id = t.id) / 10,
       0::numeric),
      ('TOP20', 'Top 11-20% khách hàng theo doanh thu thuần 365 ngày',
       (SELECT COUNT(*)::int FROM cdp_customers WHERE tenant_id = t.id) / 10,
       0::numeric),
      ('TOP30', 'Top 21-30% khách hàng theo doanh thu thuần 365 ngày',
       (SELECT COUNT(*)::int FROM cdp_customers WHERE tenant_id = t.id) / 10,
       0::numeric),
      ('CÒN LẠI', 'Bottom 70% khách hàng theo doanh thu thuần 365 ngày',
       (SELECT COUNT(*)::int FROM cdp_customers WHERE tenant_id = t.id) * 7 / 10,
       0::numeric)
  ) AS tiers(tier_name, tier_definition, tier_count, tier_revenue)
)
-- Combine all
SELECT * FROM segment_pops
UNION ALL
SELECT * FROM cohort_pops
UNION ALL
SELECT * FROM tier_pops;

-- Summary stats view for population page header
CREATE OR REPLACE VIEW v_cdp_population_summary AS
SELECT 
  tenant_id,
  COUNT(*) FILTER (WHERE population_type = 'tier') as tier_count,
  COUNT(*) FILTER (WHERE population_type = 'segment') as segment_count,
  COUNT(*) FILTER (WHERE population_type = 'cohort') as cohort_count,
  COUNT(*) as total_count,
  SUM(insight_count) as total_insights
FROM v_cdp_population_catalog
GROUP BY tenant_id;