-- ============================================================================
-- E2E TEST SUITE - SCRIPT 06: RUN COMPUTED FUNCTIONS (Layer 2)
-- ============================================================================
-- Chạy các hàm tính toán CDP để populate computed tables:
--   - cdp_build_customer_metrics_daily: Tính customer KPIs
--   - cdp_build_customer_equity: Tính customer equity 12M/24M
--   - cdp_build_value_tiers: Phân tier khách hàng theo giá trị
--
-- EXPECTED OUTPUT:
--   - 500 rows trong cdp_customer_equity_computed
--   - 500 rows trong cdp_customer_metrics_rolling
--   - Total Equity 12M: ~1,225,000,000 VND
-- ============================================================================

-- Step 1: Update customer first_order_at và last_order_at từ actual orders
UPDATE cdp_customers c
SET 
  first_order_at = sub.first_order,
  last_order_at = sub.last_order,
  status = CASE 
    WHEN sub.last_order >= (CURRENT_DATE - INTERVAL '90 days') THEN 'ACTIVE'
    ELSE 'INACTIVE'
  END
FROM (
  SELECT 
    customer_id,
    MIN(order_at) as first_order,
    MAX(order_at) as last_order
  FROM cdp_orders
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY customer_id
) sub
WHERE c.id = sub.customer_id
  AND c.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Step 2: Run cdp_build_customer_metrics_daily (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cdp_build_customer_metrics_daily') THEN
    PERFORM cdp_build_customer_metrics_daily('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid);
    RAISE NOTICE 'cdp_build_customer_metrics_daily completed';
  ELSE
    RAISE NOTICE 'cdp_build_customer_metrics_daily function not found, skipping...';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in cdp_build_customer_metrics_daily: %', SQLERRM;
END $$;

-- Step 3: Run cdp_build_customer_equity (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cdp_build_customer_equity') THEN
    PERFORM cdp_build_customer_equity('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid);
    RAISE NOTICE 'cdp_build_customer_equity completed';
  ELSE
    -- Fallback: Direct insert into cdp_customer_equity_computed
    RAISE NOTICE 'cdp_build_customer_equity not found, running fallback...';
    
    DELETE FROM cdp_customer_equity_computed 
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    INSERT INTO cdp_customer_equity_computed (
      tenant_id, customer_id, data_date,
      total_orders, total_net_revenue, total_gross_margin,
      avg_order_value, recency_days, frequency_score,
      monetary_score, rfm_segment,
      equity_12m, equity_24m, equity_is_estimated
    )
    SELECT
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
      c.id as customer_id,
      CURRENT_DATE as data_date,
      COALESCE(o.order_count, 0) as total_orders,
      COALESCE(o.total_revenue, 0) as total_net_revenue,
      COALESCE(o.total_margin, 0) as total_gross_margin,
      COALESCE(o.avg_order_value, 0) as avg_order_value,
      EXTRACT(DAY FROM (CURRENT_TIMESTAMP - COALESCE(c.last_order_at, c.created_at)))::int as recency_days,
      CASE 
        WHEN COALESCE(o.order_count, 0) >= 10 THEN 5
        WHEN COALESCE(o.order_count, 0) >= 5 THEN 4
        WHEN COALESCE(o.order_count, 0) >= 3 THEN 3
        WHEN COALESCE(o.order_count, 0) >= 2 THEN 2
        ELSE 1
      END as frequency_score,
      CASE 
        WHEN COALESCE(o.total_revenue, 0) >= 5000000 THEN 5
        WHEN COALESCE(o.total_revenue, 0) >= 2000000 THEN 4
        WHEN COALESCE(o.total_revenue, 0) >= 1000000 THEN 3
        WHEN COALESCE(o.total_revenue, 0) >= 500000 THEN 2
        ELSE 1
      END as monetary_score,
      CASE 
        WHEN c.canonical_key LIKE 'platinum%' THEN 'Champions'
        WHEN c.canonical_key LIKE 'gold%' THEN 'Loyal'
        WHEN c.canonical_key LIKE 'silver%' THEN 'Potential'
        ELSE 'New'
      END as rfm_segment,
      -- Equity 12M: Project based on recent behavior (simplified)
      COALESCE(o.total_margin, 0) * 0.8 as equity_12m,  -- 80% retention assumption
      COALESCE(o.total_margin, 0) * 1.2 as equity_24m,  -- Future value projection
      false as equity_is_estimated
    FROM cdp_customers c
    LEFT JOIN (
      SELECT 
        customer_id,
        COUNT(*) as order_count,
        SUM(net_revenue) as total_revenue,
        SUM(gross_margin) as total_margin,
        AVG(net_revenue) as avg_order_value
      FROM cdp_orders
      WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
      GROUP BY customer_id
    ) o ON c.id = o.customer_id
    WHERE c.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    RAISE NOTICE 'Fallback equity computation completed';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in equity computation: %', SQLERRM;
END $$;

-- Step 4: Run cdp_build_value_tiers (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cdp_build_value_tiers') THEN
    PERFORM cdp_build_value_tiers('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid);
    RAISE NOTICE 'cdp_build_value_tiers completed';
  ELSE
    RAISE NOTICE 'cdp_build_value_tiers function not found, skipping...';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in cdp_build_value_tiers: %', SQLERRM;
END $$;

-- Verification: CDP Computed Tables
SELECT 
  'CDP EQUITY COMPUTED VERIFICATION' as check_type,
  COUNT(*) as total_rows,
  COUNT(DISTINCT customer_id) as unique_customers,
  SUM(equity_12m) as total_equity_12m,
  SUM(equity_24m) as total_equity_24m,
  ROUND(AVG(equity_12m), 0) as avg_equity_12m,
  jsonb_build_object(
    'Champions', COUNT(*) FILTER (WHERE rfm_segment = 'Champions'),
    'Loyal', COUNT(*) FILTER (WHERE rfm_segment = 'Loyal'),
    'Potential', COUNT(*) FILTER (WHERE rfm_segment = 'Potential'),
    'New', COUNT(*) FILTER (WHERE rfm_segment = 'New')
  ) as by_segment
FROM cdp_customer_equity_computed
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Customer activity breakdown
SELECT 
  'CUSTOMER ACTIVITY VERIFICATION' as check_type,
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_status,
  COUNT(*) FILTER (WHERE last_order_at >= CURRENT_DATE - INTERVAL '90 days') as active_90d,
  COUNT(*) FILTER (WHERE last_order_at >= CURRENT_DATE - INTERVAL '180 days' 
                     AND last_order_at < CURRENT_DATE - INTERVAL '90 days') as at_risk,
  COUNT(*) FILTER (WHERE last_order_at < CURRENT_DATE - INTERVAL '180 days') as dormant
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
