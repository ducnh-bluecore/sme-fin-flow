
-- Drop and recreate view with REAL data from tier membership and cohort membership
DROP VIEW IF EXISTS v_cdp_population_catalog CASCADE;
DROP VIEW IF EXISTS v_cdp_population_summary CASCADE;

-- Function to populate cohort membership from orders
CREATE OR REPLACE FUNCTION cdp_build_cohort_membership(p_tenant_id uuid, p_as_of_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing membership for this date
  DELETE FROM cdp_cohort_membership_daily 
  WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  
  -- Insert cohort membership based on first purchase month
  INSERT INTO cdp_cohort_membership_daily (tenant_id, cohort_id, customer_id, as_of_date, is_member)
  SELECT DISTINCT
    p_tenant_id,
    c.id as cohort_id,
    o.customer_id,
    p_as_of_date,
    true
  FROM cdp_cohorts c
  JOIN (
    SELECT customer_id, TO_CHAR(MIN(order_at), 'YYYY-MM') as first_month
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
    GROUP BY customer_id
  ) o ON c.cohort_key = o.first_month
  WHERE c.tenant_id = p_tenant_id
    AND c.cohort_type = 'FIRST_PURCHASE_MONTH';
END;
$$;

-- Recreate population catalog view with REAL metrics
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
    -- Get revenue from segment members' orders
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
    -- Count from actual orders (first purchase month matching cohort_key)
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
    -- Revenue from cohort members
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
)
-- Combine all
SELECT * FROM segment_pops
UNION ALL
SELECT * FROM cohort_pops
UNION ALL
SELECT * FROM tier_pops;

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
