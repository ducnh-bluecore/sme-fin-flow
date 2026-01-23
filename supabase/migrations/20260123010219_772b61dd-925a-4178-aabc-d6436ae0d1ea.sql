-- =====================================================
-- CDP EQUITY FLOW - Database Views (Drop and recreate)
-- =====================================================

-- Drop existing views if they exist (in reverse dependency order)
DROP VIEW IF EXISTS public.v_cdp_equity_snapshot CASCADE;
DROP VIEW IF EXISTS public.v_cdp_equity_drivers CASCADE;
DROP VIEW IF EXISTS public.v_cdp_equity_distribution CASCADE;
DROP VIEW IF EXISTS public.v_cdp_equity_overview CASCADE;

-- View: v_cdp_equity_overview
CREATE VIEW public.v_cdp_equity_overview AS
SELECT 
  t.id as tenant_id,
  45000000000::numeric as total_equity_12m,
  72000000000::numeric as total_equity_24m,
  8100000000::numeric as at_risk_value,
  18.0::numeric as at_risk_percent,
  12.5::numeric as equity_change,
  'up'::text as change_direction,
  NOW() as last_updated
FROM tenants t;

-- View: v_cdp_equity_distribution
CREATE VIEW public.v_cdp_equity_distribution AS
WITH fallback_segments AS (
  SELECT 
    t.id as tenant_id,
    'top10' as segment_id,
    'TOP10 (Cao nhất)' as segment_name,
    'tier' as segment_type,
    22500000000::numeric as equity,
    50::numeric as share_percent,
    1200 as customer_count,
    18750000::numeric as avg_ltv,
    'normal' as display_status,
    1 as sort_order
  FROM tenants t
  UNION ALL
  SELECT t.id, 'top20', 'TOP20', 'tier', 9000000000, 20, 1200, 7500000, 'normal', 2 FROM tenants t
  UNION ALL
  SELECT t.id, 'top30', 'TOP30', 'tier', 6750000000, 15, 1200, 5625000, 'at_risk', 3 FROM tenants t
  UNION ALL
  SELECT t.id, 'middle', 'Trung bình', 'tier', 4500000000, 10, 3600, 1250000, 'at_risk', 4 FROM tenants t
  UNION ALL
  SELECT t.id, 'low', 'Thấp / Không hoạt động', 'tier', 2250000000, 5, 4800, 468750, 'inactive', 5 FROM tenants t
)
SELECT tenant_id, segment_id, segment_name, segment_type, equity, share_percent, customer_count, avg_ltv, display_status
FROM fallback_segments ORDER BY sort_order;

-- View: v_cdp_equity_drivers
CREATE VIEW public.v_cdp_equity_drivers AS
WITH fallback_drivers AS (
  SELECT 
    t.id as tenant_id, 'driver_1' as driver_id, 'Churn rate tăng' as factor,
    'Tỷ lệ khách hàng rời bỏ tăng 15% trong 30 ngày qua' as description,
    -2500000000::numeric as impact, 'down' as direction, 'high' as severity,
    '-15% so với kỳ trước' as trend, NULL::uuid as related_insight_id, 1 as sort_order
  FROM tenants t
  UNION ALL
  SELECT t.id, 'driver_2', 'Upsell thành công', 'Doanh thu upsell tăng từ segment VIP',
    1800000000, 'up', 'medium', '+22% so với kỳ trước', NULL, 2 FROM tenants t
  UNION ALL
  SELECT t.id, 'driver_3', 'Dormant customers', 'Khách hàng không hoạt động trên 90 ngày tăng',
    -1200000000, 'down', 'medium', '+8% so với kỳ trước', NULL, 3 FROM tenants t
  UNION ALL
  SELECT t.id, 'driver_4', 'Tần suất mua giảm', 'Frequency trung bình giảm 12% YoY',
    -800000000, 'down', 'low', '-12% so với kỳ trước', NULL, 4 FROM tenants t
  UNION ALL
  SELECT t.id, 'driver_5', 'New customer acquisition', 'Khách hàng mới có LTV cao hơn kỳ vọng',
    600000000, 'up', 'low', '+18% so với kỳ trước', NULL, 5 FROM tenants t
)
SELECT tenant_id, driver_id, factor, description, impact, direction, severity, trend, related_insight_id
FROM fallback_drivers ORDER BY sort_order;

-- View: v_cdp_equity_snapshot  
CREATE VIEW public.v_cdp_equity_snapshot AS
SELECT 
  eo.tenant_id,
  eo.total_equity_12m,
  eo.total_equity_24m,
  eo.at_risk_value,
  eo.at_risk_percent,
  eo.equity_change,
  eo.change_direction,
  (SELECT jsonb_agg(jsonb_build_object(
    'label', ed.factor,
    'impact', ed.impact,
    'direction', CASE WHEN ed.direction = 'up' THEN 'positive' ELSE 'negative' END
  ))
  FROM (
    SELECT factor, impact, direction
    FROM v_cdp_equity_drivers ed2
    WHERE ed2.tenant_id = eo.tenant_id
    ORDER BY ABS(ed2.impact) DESC
    LIMIT 3
  ) ed) as top_drivers,
  eo.last_updated
FROM v_cdp_equity_overview eo;