-- ============================================================================
-- E2E TEST SUITE - SCRIPT 09: MARKETING CAMPAIGNS (L2.5 Events)
-- ============================================================================
-- Architecture: v1.4.2 Layer 2.5 - Events
-- Creates:
--   - 4 Ad Accounts (1 per channel)
--   - 50 Campaigns (25 months × 2 per month)
--   - 100 Ad Spend records (monthly spend per channel)
--
-- EXPECTED VALUES:
--   - Total Ad Spend: ~₫300M VND
--   - Avg Monthly Spend: ~₫12M VND
-- ============================================================================

-- Clean existing data
DO $$
BEGIN
  -- Clean ad accounts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_ad_accounts') THEN
    DELETE FROM master_ad_accounts 
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  END IF;
  
  -- Clean campaigns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_campaigns') THEN
    DELETE FROM master_campaigns 
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  END IF;
  
  -- Clean ad spend
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_ad_spend') THEN
    DELETE FROM master_ad_spend 
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  END IF;
END $$;

-- ============================================================================
-- CREATE AD ACCOUNTS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_ad_accounts') THEN
    INSERT INTO master_ad_accounts (
      id, tenant_id, connector_integration_id, platform,
      account_name, account_id, status, created_at
    )
    VALUES
      ('66666666-0001-0001-0001-000000000001',
       'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
       'eeeeeeee-1111-1111-1111-111111111111',
       'shopee', 'Shopee Ads', 'shopee_ads_001', 'active', '2024-01-01'::timestamptz),
       
      ('66666666-0001-0001-0001-000000000002',
       'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
       'eeeeeeee-2222-2222-2222-222222222222',
       'lazada', 'Lazada Ads', 'lazada_ads_001', 'active', '2024-01-01'::timestamptz),
       
      ('66666666-0001-0001-0001-000000000003',
       'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
       'eeeeeeee-3333-3333-3333-333333333333',
       'tiktok', 'TikTok Ads', 'tiktok_ads_001', 'active', '2024-01-01'::timestamptz),
       
      ('66666666-0001-0001-0001-000000000004',
       'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
       'eeeeeeee-4444-4444-4444-444444444444',
       'facebook', 'Facebook Ads', 'fb_ads_001', 'active', '2024-01-01'::timestamptz)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created 4 ad accounts';
  END IF;
END $$;

-- ============================================================================
-- CREATE CAMPAIGNS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_campaigns') THEN
    INSERT INTO master_campaigns (
      id, tenant_id, ad_account_id, campaign_name, campaign_type,
      start_date, end_date, budget, status, created_at
    )
    SELECT
      ('77777777-' || LPAD(n::text, 4, '0') || '-0001-0001-000000000001')::uuid as id,
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
      ('66666666-0001-0001-0001-00000000000' || ((n % 4) + 1)::text)::uuid as ad_account_id,
      'Campaign ' || TO_CHAR(DATE '2024-01-01' + ((n - 1) * 15 || ' days')::interval, 'YYYY-MM') || 
        ' #' || ((n % 2) + 1)::text as campaign_name,
      CASE (n % 3)
        WHEN 0 THEN 'awareness'
        WHEN 1 THEN 'conversion'
        ELSE 'retargeting'
      END as campaign_type,
      (DATE '2024-01-01' + ((n - 1) * 15 || ' days')::interval)::date as start_date,
      (DATE '2024-01-01' + ((n - 1) * 15 + 14 || ' days')::interval)::date as end_date,
      (5000000 + (n % 10) * 500000)::numeric as budget,
      'completed' as status,
      '2024-01-01'::timestamptz as created_at
    FROM generate_series(1, 50) as n;
    
    RAISE NOTICE 'Created 50 campaigns';
  END IF;
END $$;

-- ============================================================================
-- CREATE AD SPEND (from existing fdp_locked_costs logic)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_ad_spend') THEN
    INSERT INTO master_ad_spend (
      id, tenant_id, ad_account_id, campaign_id, spend_date,
      amount, impressions, clicks, conversions, created_at
    )
    WITH monthly_revenue AS (
      SELECT 
        DATE_TRUNC('month', order_at)::date as month_start,
        SUM(net_revenue) as total_revenue,
        COUNT(*) as order_count
      FROM cdp_orders
      WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
      GROUP BY DATE_TRUNC('month', order_at)
    ),
    spend_by_channel AS (
      SELECT
        month_start,
        total_revenue,
        order_count,
        -- 10% of revenue goes to marketing
        total_revenue * 0.10 as total_spend
      FROM monthly_revenue
    )
    SELECT
      ('88888888-' || LPAD(ROW_NUMBER() OVER ()::text, 4, '0') || '-0001-0001-000000000001')::uuid as id,
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
      ('66666666-0001-0001-0001-00000000000' || channel_num::text)::uuid as ad_account_id,
      NULL as campaign_id,  -- Aggregated at account level
      (month_start + 15)::date as spend_date,
      CASE channel_num
        WHEN 1 THEN total_spend * 0.40  -- Shopee 40%
        WHEN 2 THEN total_spend * 0.25  -- Lazada 25%
        WHEN 3 THEN total_spend * 0.25  -- TikTok 25%
        ELSE total_spend * 0.10         -- Facebook 10%
      END as amount,
      (order_count * 100 * channel_num)::int as impressions,
      (order_count * 10 * channel_num)::int as clicks,
      (order_count * channel_num / 4)::int as conversions,
      NOW() as created_at
    FROM spend_by_channel
    CROSS JOIN generate_series(1, 4) as channel_num;
    
    RAISE NOTICE 'Created ad spend records';
  END IF;
END $$;

-- ============================================================================
-- FALLBACK: Create marketing_expenses if master_ad_spend doesn't exist
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_expenses') THEN
    DELETE FROM marketing_expenses 
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    INSERT INTO marketing_expenses (
      tenant_id, expense_date, channel, amount, campaign_type, created_at
    )
    WITH monthly_revenue AS (
      SELECT 
        DATE_TRUNC('month', order_at)::date as month_start,
        SUM(net_revenue) as total_revenue
      FROM cdp_orders
      WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
      GROUP BY DATE_TRUNC('month', order_at)
    )
    SELECT 
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
      (month_start + 15)::date as expense_date,
      channel,
      total_revenue * 0.10 * pct as amount,
      'ads' as campaign_type,
      NOW() as created_at
    FROM monthly_revenue
    CROSS JOIN (
      VALUES ('Shopee', 0.40), ('Lazada', 0.25), ('TikTok', 0.25), ('Facebook', 0.10)
    ) as channels(channel, pct);
    
    RAISE NOTICE 'Created marketing_expenses fallback';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L2.5_EVENTS: MARKETING' as layer,
  'ad_accounts' as table_name,
  COUNT(*) as row_count
FROM master_ad_accounts
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 
  'L2.5_EVENTS: MARKETING',
  'campaigns',
  COUNT(*)
FROM master_campaigns
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
UNION ALL
SELECT 
  'L2.5_EVENTS: MARKETING',
  'ad_spend',
  COUNT(*)
FROM master_ad_spend
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
