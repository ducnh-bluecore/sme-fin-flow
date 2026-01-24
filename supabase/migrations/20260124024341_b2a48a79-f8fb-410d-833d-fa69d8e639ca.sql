
-- Create detailed view for population detail page with REAL metrics
CREATE OR REPLACE VIEW v_cdp_population_detail AS
WITH 
-- Calculate total metrics for share calculation
total_metrics AS (
  SELECT 
    tenant_id,
    SUM(customer_count) as total_customers,
    SUM(total_revenue) as total_revenue
  FROM v_cdp_population_catalog
  GROUP BY tenant_id
),
-- Segment details with computed metrics
segment_details AS (
  SELECT 
    s.tenant_id,
    s.id::text as population_id,
    'segment' as population_type,
    s.name,
    COALESCE(s.description, 'Phân khúc ' || s.name) as definition,
    s.description as natural_language_description,
    s.definition_json as criteria_json,
    s.status,
    s.version::int,
    s.created_at,
    s.updated_at as last_updated,
    -- Size
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
    -- Revenue
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
    -- AOV
    COALESCE((
      SELECT AVG(o.net_revenue)
      FROM cdp_orders o
      WHERE o.tenant_id = s.tenant_id
        AND o.customer_id IN (
          SELECT customer_id FROM cdp_segment_membership_daily sm
          WHERE sm.tenant_id = s.tenant_id AND sm.segment_id = s.id AND sm.is_member = true
        )
        AND o.order_at >= CURRENT_DATE - INTERVAL '365 days'
    ), 0) as avg_order_value,
    -- Purchase cycle (avg days between orders)
    COALESCE((
      SELECT AVG(days_between)
      FROM (
        SELECT customer_id, 
          EXTRACT(DAY FROM (MAX(order_at) - MIN(order_at))) / NULLIF(COUNT(*) - 1, 0) as days_between
        FROM cdp_orders o
        WHERE o.tenant_id = s.tenant_id
          AND o.customer_id IN (
            SELECT customer_id FROM cdp_segment_membership_daily sm
            WHERE sm.tenant_id = s.tenant_id AND sm.segment_id = s.id AND sm.is_member = true
          )
        GROUP BY customer_id
        HAVING COUNT(*) > 1
      ) sub
    ), 30) as purchase_cycle_days,
    -- Return rate placeholder
    0::numeric as return_rate,
    'stable' as stability,
    -- Insight count
    (
      SELECT COUNT(*)::int FROM cdp_insight_events ie
      WHERE ie.tenant_id = s.tenant_id
        AND ie.population_ref->>'segment_id' = s.id::text
        AND ie.as_of_date >= CURRENT_DATE - INTERVAL '30 days'
    ) as insight_count
  FROM cdp_segments s
  WHERE s.status = 'ACTIVE'
),
-- Cohort details
cohort_details AS (
  SELECT 
    c.tenant_id,
    c.id::text as population_id,
    'cohort' as population_type,
    c.cohort_key as name,
    CASE c.cohort_type
      WHEN 'FIRST_PURCHASE_MONTH' THEN 'Khách mua lần đầu trong ' || c.cohort_key
      ELSE 'Cohort ' || c.cohort_key
    END as definition,
    'Khách hàng có lần mua đầu tiên trong tháng ' || c.cohort_key || '. Đây là đơn vị phân tích theo thời điểm acquisition.' as natural_language_description,
    c.definition_json as criteria_json,
    'ACTIVE' as status,
    1 as version,
    c.created_at,
    c.created_at as last_updated,
    -- Customer count from orders
    COALESCE((
      SELECT COUNT(DISTINCT customer_id)::int
      FROM (
        SELECT customer_id, TO_CHAR(MIN(order_at), 'YYYY-MM') as first_month
        FROM cdp_orders WHERE tenant_id = c.tenant_id GROUP BY customer_id
      ) cust WHERE cust.first_month = c.cohort_key
    ), 0) as customer_count,
    -- Total revenue
    COALESCE((
      SELECT SUM(o.net_revenue)
      FROM cdp_orders o
      WHERE o.tenant_id = c.tenant_id
        AND o.customer_id IN (
          SELECT customer_id FROM (
            SELECT customer_id, TO_CHAR(MIN(order_at), 'YYYY-MM') as first_month
            FROM cdp_orders WHERE tenant_id = c.tenant_id GROUP BY customer_id
          ) x WHERE x.first_month = c.cohort_key
        )
        AND o.order_at >= CURRENT_DATE - INTERVAL '365 days'
    ), 0) as total_revenue,
    -- AOV
    COALESCE((
      SELECT AVG(o.net_revenue)
      FROM cdp_orders o
      WHERE o.tenant_id = c.tenant_id
        AND o.customer_id IN (
          SELECT customer_id FROM (
            SELECT customer_id, TO_CHAR(MIN(order_at), 'YYYY-MM') as first_month
            FROM cdp_orders WHERE tenant_id = c.tenant_id GROUP BY customer_id
          ) x WHERE x.first_month = c.cohort_key
        )
        AND o.order_at >= CURRENT_DATE - INTERVAL '365 days'
    ), 0) as avg_order_value,
    -- Purchase cycle
    COALESCE((
      SELECT AVG(days_between)
      FROM (
        SELECT customer_id, 
          EXTRACT(DAY FROM (MAX(order_at) - MIN(order_at))) / NULLIF(COUNT(*) - 1, 0) as days_between
        FROM cdp_orders o
        WHERE o.tenant_id = c.tenant_id
          AND o.customer_id IN (
            SELECT customer_id FROM (
              SELECT customer_id, TO_CHAR(MIN(order_at), 'YYYY-MM') as first_month
              FROM cdp_orders WHERE tenant_id = c.tenant_id GROUP BY customer_id
            ) x WHERE x.first_month = c.cohort_key
          )
        GROUP BY customer_id
        HAVING COUNT(*) > 1
      ) sub
    ), 30) as purchase_cycle_days,
    0::numeric as return_rate,
    'stable' as stability,
    0 as insight_count
  FROM cdp_cohorts c
),
-- Tier details from membership
tier_details AS (
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
    CASE tm.tier_label
      WHEN 'TOP10' THEN 'Khách hàng thuộc top 10% theo tổng doanh thu thuần trong 365 ngày gần nhất. Đây là nhóm có giá trị cao nhất.'
      WHEN 'TOP20' THEN 'Khách hàng thuộc nhóm 11-20% theo tổng doanh thu thuần 365 ngày.'
      WHEN 'TOP30' THEN 'Khách hàng thuộc nhóm 21-30% theo tổng doanh thu thuần 365 ngày.'
      ELSE 'Khách hàng thuộc nhóm 70% còn lại theo doanh thu thuần.'
    END as natural_language_description,
    NULL::jsonb as criteria_json,
    'ACTIVE' as status,
    1 as version,
    MIN(tm.created_at) as created_at,
    MAX(tm.created_at) as last_updated,
    COUNT(DISTINCT tm.customer_id)::int as customer_count,
    COALESCE(SUM(tm.metric_value), 0) as total_revenue,
    -- AOV from actual orders
    COALESCE((
      SELECT AVG(o.net_revenue)
      FROM cdp_orders o
      WHERE o.tenant_id = tm.tenant_id
        AND o.customer_id IN (
          SELECT customer_id FROM cdp_value_tier_membership_daily t2
          WHERE t2.tenant_id = tm.tenant_id AND t2.tier_label = tm.tier_label
            AND t2.as_of_date = tm.as_of_date AND t2.is_member = true
        )
        AND o.order_at >= CURRENT_DATE - INTERVAL '365 days'
    ), 0) as avg_order_value,
    -- Purchase cycle
    COALESCE((
      SELECT AVG(sub.days_between)
      FROM (
        SELECT customer_id, 
          EXTRACT(DAY FROM (MAX(order_at) - MIN(order_at))) / NULLIF(COUNT(*) - 1, 0) as days_between
        FROM cdp_orders o
        WHERE o.tenant_id = tm.tenant_id
          AND o.customer_id IN (
            SELECT customer_id FROM cdp_value_tier_membership_daily t2
            WHERE t2.tenant_id = tm.tenant_id AND t2.tier_label = tm.tier_label
              AND t2.as_of_date = tm.as_of_date AND t2.is_member = true
          )
        GROUP BY customer_id
        HAVING COUNT(*) > 1
      ) sub
    ), 30) as purchase_cycle_days,
    0::numeric as return_rate,
    'stable' as stability,
    0 as insight_count
  FROM cdp_value_tier_membership_daily tm
  WHERE tm.as_of_date = (
    SELECT MAX(as_of_date) FROM cdp_value_tier_membership_daily WHERE tenant_id = tm.tenant_id
  )
  AND tm.is_member = true
  GROUP BY tm.tenant_id, tm.tier_label, tm.as_of_date
),
-- Union all
all_populations AS (
  SELECT * FROM segment_details
  UNION ALL
  SELECT * FROM cohort_details
  UNION ALL
  SELECT * FROM tier_details
)
SELECT 
  p.*,
  -- Calculate shares
  CASE WHEN t.total_customers > 0 THEN (p.customer_count::numeric / t.total_customers * 100) ELSE 0 END as customer_share,
  CASE WHEN t.total_revenue > 0 THEN (p.total_revenue / t.total_revenue * 100) ELSE 0 END as revenue_share,
  -- Equity estimate (simplified: 2x annual revenue for high value tiers)
  CASE 
    WHEN p.name IN ('TOP10', 'VIP Customers') THEN p.total_revenue * 2
    WHEN p.name IN ('TOP20') THEN p.total_revenue * 1.5
    ELSE p.total_revenue * 1.2
  END as estimated_equity
FROM all_populations p
LEFT JOIN total_metrics t ON t.tenant_id = p.tenant_id;
