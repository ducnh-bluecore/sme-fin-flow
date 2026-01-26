-- ============================================================================
-- E2E TEST SUITE - SCRIPT 07: FDP LOCKED COSTS (25 Months)
-- ============================================================================
-- Tạo monthly locked costs cho FDP từ 01/2024 đến 01/2026
-- Đây là data cần thiết cho Cross-Module Flow: FDP → MDP
--
-- EXPECTED OUTPUT:
--   - 25 monthly records
--   - Avg COGS%: ~53%
--   - Avg Fee%: ~4.5%
--   - Avg Marketing Spend: varies by month
-- ============================================================================

-- Xóa FDP locked costs cũ của tenant test
DELETE FROM fdp_locked_costs 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Insert 25 months of locked costs (computed from actual orders)
INSERT INTO fdp_locked_costs (
  tenant_id, year, month,
  total_cogs, total_platform_fees, total_marketing_spend,
  avg_cogs_percent, avg_fee_percent, avg_cac,
  locked_at, locked_by
)
WITH monthly_data AS (
  SELECT 
    EXTRACT(YEAR FROM order_at)::int as year,
    EXTRACT(MONTH FROM order_at)::int as month,
    SUM(cogs) as total_cogs,
    SUM(net_revenue) as total_revenue,
    SUM(gross_margin) as total_margin,
    COUNT(*) as order_count,
    -- Platform fees by channel
    SUM(CASE 
      WHEN channel = 'Shopee' THEN net_revenue * 0.06
      WHEN channel = 'Lazada' THEN net_revenue * 0.05
      WHEN channel = 'TikTok Shop' THEN net_revenue * 0.04
      ELSE 0
    END) as total_fees
  FROM cdp_orders
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY EXTRACT(YEAR FROM order_at), EXTRACT(MONTH FROM order_at)
)
SELECT
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
  year,
  month,
  total_cogs,
  total_fees as total_platform_fees,
  -- Marketing spend: ~8-12% of revenue, varies by month
  total_revenue * (0.08 + (month % 5) * 0.01) as total_marketing_spend,
  -- Avg COGS percent
  ROUND((total_cogs / NULLIF(total_revenue, 0) * 100)::numeric, 2) as avg_cogs_percent,
  -- Avg fee percent
  ROUND((total_fees / NULLIF(total_revenue, 0) * 100)::numeric, 2) as avg_fee_percent,
  -- CAC: Marketing spend / estimated new customers (20% of orders)
  ROUND((total_revenue * (0.08 + (month % 5) * 0.01) / (order_count * 0.2))::numeric, 0) as avg_cac,
  -- Locked at end of next month (to simulate actual locking)
  (make_date(year, month, 1) + INTERVAL '1 month' + INTERVAL '5 days')::timestamptz as locked_at,
  'system_e2e_test' as locked_by
FROM monthly_data
ORDER BY year, month;

-- Also populate marketing_expenses table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_expenses') THEN
    DELETE FROM marketing_expenses 
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    INSERT INTO marketing_expenses (
      tenant_id, expense_date, channel, amount, campaign_type, created_at
    )
    SELECT 
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
      make_date(year, month, 15) as expense_date,
      'Shopee' as channel,
      total_marketing_spend * 0.4 as amount,
      'ads' as campaign_type,
      NOW() as created_at
    FROM fdp_locked_costs
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    
    UNION ALL
    
    SELECT 
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
      make_date(year, month, 15) as expense_date,
      'Lazada' as channel,
      total_marketing_spend * 0.25 as amount,
      'ads' as campaign_type,
      NOW() as created_at
    FROM fdp_locked_costs
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    
    UNION ALL
    
    SELECT 
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
      make_date(year, month, 15) as expense_date,
      'TikTok' as channel,
      total_marketing_spend * 0.25 as amount,
      'ads' as campaign_type,
      NOW() as created_at
    FROM fdp_locked_costs
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    
    UNION ALL
    
    SELECT 
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
      make_date(year, month, 15) as expense_date,
      'Facebook' as channel,
      total_marketing_spend * 0.1 as amount,
      'ads' as campaign_type,
      NOW() as created_at
    FROM fdp_locked_costs
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    RAISE NOTICE 'Marketing expenses populated';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'marketing_expenses table issue: %', SQLERRM;
END $$;

-- Verification Query
SELECT 
  'FDP LOCKED COSTS VERIFICATION' as check_type,
  COUNT(*) as total_months,
  COUNT(*) = 25 as has_25_months,
  SUM(total_cogs) as total_cogs_all_time,
  SUM(total_platform_fees) as total_fees_all_time,
  SUM(total_marketing_spend) as total_marketing_all_time,
  ROUND(AVG(avg_cogs_percent), 1) as avg_cogs_percent,
  ROUND(AVG(avg_fee_percent), 1) as avg_fee_percent,
  ROUND(AVG(avg_cac), 0) as avg_cac,
  MIN(make_date(year, month, 1)) as first_month,
  MAX(make_date(year, month, 1)) as last_month
FROM fdp_locked_costs
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Monthly breakdown
SELECT 
  year,
  month,
  total_cogs,
  total_platform_fees,
  total_marketing_spend,
  avg_cogs_percent,
  avg_fee_percent
FROM fdp_locked_costs
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY year, month;
