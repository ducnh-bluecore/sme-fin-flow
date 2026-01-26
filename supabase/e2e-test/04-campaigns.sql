 -- ============================================================================
 -- E2E TEST SUITE - SCRIPT 04: MARKETING CAMPAIGNS
 -- ============================================================================
 -- Tạo 10 campaigns test cho MDP module
 --
 -- CAMPAIGNS:
 --   - 5 active campaigns (different channels)
 --   - 3 completed campaigns
 --   - 2 paused campaigns
 --
 -- CHANNELS:
 --   - Facebook Ads: 3 campaigns
 --   - Google Ads: 3 campaigns
 --   - TikTok Ads: 2 campaigns
 --   - Email: 2 campaigns
 --
 -- EXPECTED METRICS:
 --   - Total Spend: ~50,000,000 VND
 --   - Total Revenue: ~200,000,000 VND
 --   - Avg ROAS: ~4.0
 -- ============================================================================
 
 -- Delete existing test campaigns
 DELETE FROM promotion_campaigns 
 WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
 
 -- Insert test campaigns
 INSERT INTO promotion_campaigns (
   id, tenant_id, campaign_name, channel, campaign_type,
   status, start_date, end_date,
   budget, actual_cost, total_orders, total_revenue,
   created_at, updated_at
 ) VALUES
 -- Active Campaigns
 (
   '44444444-0001-0000-0000-000000000001'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'Tet 2025 - Facebook',
   'Facebook Ads',
   'acquisition',
   'active',
   '2025-01-01',
   '2025-02-28',
   10000000,
   8500000,
   120,
   48000000,
   NOW(),
   NOW()
 ),
 (
   '44444444-0002-0000-0000-000000000002'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'New Year Sale - Google',
   'Google Ads',
   'acquisition',
   'active',
   '2025-01-10',
   '2025-03-31',
   15000000,
   12000000,
   180,
   72000000,
   NOW(),
   NOW()
 ),
 (
   '44444444-0003-0000-0000-000000000003'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'Retargeting Q1 - Facebook',
   'Facebook Ads',
   'retargeting',
   'active',
   '2025-01-15',
   '2025-03-31',
   8000000,
   6500000,
   95,
   38000000,
   NOW(),
   NOW()
 ),
 (
   '44444444-0004-0000-0000-000000000004'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'Brand Awareness - TikTok',
   'TikTok Ads',
   'awareness',
   'active',
   '2025-01-20',
   '2025-02-28',
   5000000,
   4200000,
   60,
   18000000,
   NOW(),
   NOW()
 ),
 (
   '44444444-0005-0000-0000-000000000005'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'Email Nurture Q1',
   'Email',
   'retention',
   'active',
   '2025-01-01',
   '2025-03-31',
   2000000,
   1500000,
   45,
   12000000,
   NOW(),
   NOW()
 ),
 -- Completed Campaigns
 (
   '44444444-0006-0000-0000-000000000006'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'Christmas 2024 - Facebook',
   'Facebook Ads',
   'acquisition',
   'completed',
   '2024-12-01',
   '2024-12-31',
   12000000,
   11500000,
   150,
   52000000,
   '2024-12-01',
   '2025-01-05'
 ),
 (
   '44444444-0007-0000-0000-000000000007'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'Black Friday - Google',
   'Google Ads',
   'acquisition',
   'completed',
   '2024-11-20',
   '2024-11-30',
   8000000,
   7800000,
   110,
   42000000,
   '2024-11-20',
   '2024-12-05'
 ),
 (
   '44444444-0008-0000-0000-0000000000008'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'App Launch - TikTok',
   'TikTok Ads',
   'awareness',
   'completed',
   '2024-10-01',
   '2024-10-31',
   6000000,
   5500000,
   75,
   22000000,
   '2024-10-01',
   '2024-11-10'
 ),
 -- Paused Campaigns
 (
   '44444444-0009-0000-0000-000000000009'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'Low Performer - Google',
   'Google Ads',
   'acquisition',
   'paused',
   '2024-12-15',
   '2025-02-28',
   10000000,
   3200000,
   25,
   8000000,
   '2024-12-15',
   '2025-01-10'
 ),
 (
   '44444444-0010-0000-0000-000000000010'::uuid,
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   'Budget Hold - Email',
   'Email',
   'retention',
   'paused',
   '2024-12-01',
   '2025-03-31',
   3000000,
   800000,
   12,
   4000000,
   '2024-12-01',
   '2024-12-20'
 );
 
 -- Verification Query
 SELECT 
   'CAMPAIGNS VERIFICATION' as check_type,
   COUNT(*) as total_campaigns,
   COUNT(*) FILTER (WHERE status = 'active') as active_campaigns,
   COUNT(*) FILTER (WHERE status = 'completed') as completed_campaigns,
   COUNT(*) FILTER (WHERE status = 'paused') as paused_campaigns,
   SUM(actual_cost) as total_spend,
   SUM(total_revenue) as total_revenue,
   ROUND(SUM(total_revenue) / NULLIF(SUM(actual_cost), 0), 2) as avg_roas,
   jsonb_build_object(
     'Facebook Ads', COUNT(*) FILTER (WHERE channel = 'Facebook Ads'),
     'Google Ads', COUNT(*) FILTER (WHERE channel = 'Google Ads'),
     'TikTok Ads', COUNT(*) FILTER (WHERE channel = 'TikTok Ads'),
     'Email', COUNT(*) FILTER (WHERE channel = 'Email')
   ) as by_channel
 FROM promotion_campaigns
 WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';