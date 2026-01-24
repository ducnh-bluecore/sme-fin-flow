
-- Fix v_cdp_population_catalog to calculate revenue_share correctly against total tenant revenue
DROP VIEW IF EXISTS v_cdp_population_catalog CASCADE;
DROP VIEW IF EXISTS v_cdp_population_summary CASCADE;

CREATE OR REPLACE VIEW v_cdp_population_catalog AS
WITH 
-- Calculate total revenue per tenant for accurate share calculation
tenant_totals AS (
  SELECT 
    tenant_id,
    SUM(net_revenue) as total_revenue,
    COUNT(DISTINCT customer_id) as total_customers
  FROM cdp_orders
  WHERE order_at >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY tenant_id
),
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
    COALESCE((
      SELECT SUM(o.net_revenue)
      FROM cdp_orders o
      WHERE o.tenant_id = s.tenant_id
        AND o.customer_id IN (
          SELECT customer_id FROM cdp_segment_membership_daily sm
          WHERE sm.tenant_id = s.tenant_id 
            AND sm.segment_id = s.id 
            AND sm.is_member = true
            AND sm.as_of_date = (
              SELECT MAX(as_of_date) FROM cdp_segment_membership_daily 
              WHERE tenant_id = s.tenant_id AND segment_id = s.id
            )
        )
        AND o.order_at >= CURRENT_DATE - INTERVAL '365 days'
    ), 0) as total_revenue,
    'stable' as stability,
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
-- Cohort populations with REAL metrics
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
      FROM (
        SELECT customer_id, TO_CHAR(MIN(order_at), 'YYYY-MM') as first_month
        FROM cdp_orders
        WHERE tenant_id = c.tenant_id
        GROUP BY customer_id
      ) cust
      WHERE cust.first_month = c.cohort_key
    ), 0) as customer_count,
    COALESCE((
      SELECT SUM(o.net_revenue)
      FROM cdp_orders o
      WHERE o.tenant_id = c.tenant_id
        AND o.customer_id IN (
          SELECT customer_id FROM (
            SELECT customer_id, TO_CHAR(MIN(order_at), 'YYYY-MM') as first_month
            FROM cdp_orders
            WHERE tenant_id = c.tenant_id
            GROUP BY customer_id
          ) x WHERE x.first_month = c.cohort_key
        )
        AND o.order_at >= CURRENT_DATE - INTERVAL '365 days'
    ), 0) as total_revenue,
    'stable' as stability,
    0 as insight_count,
    c.created_at
  FROM cdp_cohorts c
),
-- Value Tier populations from REAL tier membership data
tier_pops AS (
  SELECT 
    tm.tenant_id,
    'tier-' || tm.tier_label as population_id,
    'tier' as population_type,
    tm.tier_label as name,
    CASE tm.tier_label
      WHEN 'TOP10' THEN 'Top 10% khách hàng theo doanh thu thuần 365 ngày'
      WHEN 'TOP20' THEN 'Top 11-20% khách hàng theo doanh thu thuần 365 ngày'
      WHEN 'TOP30' THEN 'Top 21-30% khách hàng theo doanh thu thuần 365 ngày'
      ELSE 'Bottom 70% khách hàng theo doanh thu thuần 365 ngày'
    END as definition,
    'ACTIVE' as status,
    1 as version,
    COUNT(DISTINCT tm.customer_id)::int as customer_count,
    COALESCE(SUM(tm.metric_value), 0) as total_revenue,
    'stable' as stability,
    0 as insight_count,
    MIN(tm.created_at) as created_at
  FROM cdp_value_tier_membership_daily tm
  WHERE tm.as_of_date = (
    SELECT MAX(as_of_date) FROM cdp_value_tier_membership_daily WHERE tenant_id = tm.tenant_id
  )
  AND tm.is_member = true
  GROUP BY tm.tenant_id, tm.tier_label
),
-- Combined populations
all_pops AS (
  SELECT * FROM segment_pops
  UNION ALL
  SELECT * FROM cohort_pops
  UNION ALL
  SELECT * FROM tier_pops
)
-- Final select with revenue_share calculated against total tenant revenue
SELECT 
  p.*,
  ROUND(
    CASE 
      WHEN COALESCE(t.total_revenue, 0) > 0 
      THEN (p.total_revenue / t.total_revenue * 100)::numeric 
      ELSE 0 
    END,
    1
  ) as revenue_share
FROM all_pops p
LEFT JOIN tenant_totals t ON t.tenant_id = p.tenant_id;

-- Recreate summary view
CREATE OR REPLACE VIEW v_cdp_population_summary AS
SELECT 
  tenant_id,
  COUNT(*) FILTER (WHERE population_type = 'tier') as tier_count,
  COUNT(*) FILTER (WHERE population_type = 'segment') as segment_count,
  COUNT(*) FILTER (WHERE population_type = 'cohort') as cohort_count,
  COUNT(*) as total_count,
  COALESCE(SUM(insight_count), 0) as total_insights
FROM v_cdp_population_catalog
GROUP BY tenant_id;
