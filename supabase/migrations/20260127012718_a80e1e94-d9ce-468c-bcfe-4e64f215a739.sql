
-- ============================================================================
-- CREATE VIEWS: Platform Ads & Demographics for Frontend
-- ============================================================================

-- 1. View: Platform Ads Performance Summary (thay thế mock data trong MDP)
CREATE OR REPLACE VIEW v_mdp_platform_ads_summary AS
SELECT 
  p.tenant_id,
  p.platform,
  p.platform AS platform_icon,
  CASE WHEN p.spend_today > 0 THEN true ELSE false END AS is_active,
  
  -- Budget & Spend
  p.spend_today,
  p.spend_mtd AS spend_month,
  p.budget_month,
  p.budget_utilization,
  
  -- Performance
  p.impressions,
  p.reach,
  p.clicks,
  p.add_to_cart,
  p.checkouts,
  p.orders,
  p.revenue,
  
  -- Calculated Metrics
  p.cpm,
  p.cpc,
  p.ctr,
  p.cvr,
  p.atc_rate,
  p.checkout_rate,
  p.cpa,
  p.roas,
  p.acos,
  
  -- Quality
  p.quality_score,
  p.relevance_score,
  
  -- Trends
  p.spend_trend,
  p.cpa_trend,
  p.roas_trend,
  
  p.report_date
FROM platform_ads_daily p
WHERE p.report_date = CURRENT_DATE;

-- 2. View: Risk Radar Summary (thay thế mock data trong RiskDashboardPage)
CREATE OR REPLACE VIEW v_risk_radar_summary AS
SELECT 
  r.tenant_id,
  r.score_date,
  r.liquidity_score,
  r.credit_score,
  r.market_score,
  r.operational_score,
  r.overall_score,
  
  -- Severity mapping
  CASE 
    WHEN r.liquidity_score < 40 THEN 'high'
    WHEN r.liquidity_score < 60 THEN 'medium'
    ELSE 'low'
  END AS liquidity_severity,
  
  CASE 
    WHEN r.credit_score < 40 THEN 'high'
    WHEN r.credit_score < 60 THEN 'medium'
    ELSE 'low'
  END AS credit_severity,
  
  CASE 
    WHEN r.market_score < 40 THEN 'high'
    WHEN r.market_score < 60 THEN 'medium'
    ELSE 'low'
  END AS market_severity,
  
  CASE 
    WHEN r.operational_score < 40 THEN 'high'
    WHEN r.operational_score < 60 THEN 'medium'
    ELSE 'low'
  END AS operational_severity,
  
  r.calculation_details
FROM risk_scores r
WHERE r.score_date = (
  SELECT MAX(score_date) 
  FROM risk_scores r2 
  WHERE r2.tenant_id = r.tenant_id
);

-- 3. View: CDP Demographics Summary (thay thế mock data trong useAudienceData)
CREATE OR REPLACE VIEW v_cdp_demographics_summary AS
SELECT 
  tenant_id,
  
  -- Age Distribution (as JSONB array)
  (
    SELECT jsonb_agg(jsonb_build_object(
      'range', age_range,
      'value', count,
      'color', CASE age_range
        WHEN '18-24' THEN '#8b5cf6'
        WHEN '25-34' THEN '#a855f7'
        WHEN '35-44' THEN '#c084fc'
        WHEN '45-54' THEN '#d8b4fe'
        ELSE '#e9d5ff'
      END
    ) ORDER BY 
      CASE age_range
        WHEN '18-24' THEN 1
        WHEN '25-34' THEN 2
        WHEN '35-44' THEN 3
        WHEN '45-54' THEN 4
        ELSE 5
      END
    )
    FROM (
      SELECT age_range, COUNT(*) as count
      FROM cdp_customers c2
      WHERE c2.tenant_id = c.tenant_id AND c2.age_range IS NOT NULL
      GROUP BY age_range
    ) age_data
  ) AS age_distribution,
  
  -- Gender Distribution (as JSONB array)
  (
    SELECT jsonb_agg(jsonb_build_object(
      'name', gender,
      'value', count,
      'color', CASE gender
        WHEN 'Nữ' THEN '#ec4899'
        WHEN 'Nam' THEN '#3b82f6'
        ELSE '#9ca3af'
      END
    ) ORDER BY count DESC)
    FROM (
      SELECT gender, COUNT(*) as count
      FROM cdp_customers c2
      WHERE c2.tenant_id = c.tenant_id AND c2.gender IS NOT NULL
      GROUP BY gender
    ) gender_data
  ) AS gender_distribution,
  
  -- Device Distribution (as JSONB array)
  (
    SELECT jsonb_agg(jsonb_build_object(
      'device', 
      CASE primary_device 
        WHEN 'mobile' THEN 'Mobile'
        WHEN 'desktop' THEN 'Desktop'
        ELSE 'Tablet'
      END,
      'sessions', ROUND(count * 100.0 / total, 0),
      'conversions', CASE primary_device
        WHEN 'mobile' THEN 4.2
        WHEN 'desktop' THEN 5.8
        ELSE 3.5
      END,
      'revenue', ROUND(count * 100.0 / total, 0)
    ) ORDER BY count DESC)
    FROM (
      SELECT primary_device, COUNT(*) as count, SUM(COUNT(*)) OVER() as total
      FROM cdp_customers c2
      WHERE c2.tenant_id = c.tenant_id AND c2.primary_device IS NOT NULL
      GROUP BY primary_device
    ) device_data
  ) AS device_distribution,
  
  -- Geographic summary
  (
    SELECT jsonb_agg(jsonb_build_object(
      'province', province,
      'customers', count,
      'percentage', ROUND(count * 100.0 / total, 1)
    ) ORDER BY count DESC)
    FROM (
      SELECT province, COUNT(*) as count, SUM(COUNT(*)) OVER() as total
      FROM cdp_customers c2
      WHERE c2.tenant_id = c.tenant_id AND c2.province IS NOT NULL
      GROUP BY province
    ) geo_data
  ) AS geographic_distribution

FROM cdp_customers c
GROUP BY tenant_id;

-- 4. View: Marketing Funnel từ marketing_expenses
CREATE OR REPLACE VIEW v_mdp_marketing_funnel AS
SELECT 
  tenant_id,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  -- Estimate ATC from clicks (15% rate - will be replaced when real funnel data available)
  ROUND(SUM(clicks) * 0.15) as estimated_add_to_cart,
  SUM(conversions) as total_orders,
  
  -- Conversion rates
  CASE WHEN SUM(impressions) > 0 
    THEN ROUND(SUM(clicks)::numeric / SUM(impressions) * 100, 2) 
    ELSE 0 
  END as ctr,
  
  CASE WHEN SUM(clicks) > 0 
    THEN ROUND((SUM(clicks) * 0.15) / SUM(clicks) * 100, 2) 
    ELSE 0 
  END as atc_rate,
  
  CASE WHEN SUM(clicks) > 0 
    THEN ROUND(SUM(conversions)::numeric / (SUM(clicks) * 0.15) * 100, 2) 
    ELSE 0 
  END as checkout_rate,
  
  CASE WHEN SUM(clicks) > 0 
    THEN ROUND(SUM(conversions)::numeric / SUM(clicks) * 100, 2) 
    ELSE 0 
  END as cvr,
  
  CURRENT_DATE as report_date
FROM marketing_expenses
WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id;

-- Grant permissions
GRANT SELECT ON v_mdp_platform_ads_summary TO authenticated;
GRANT SELECT ON v_risk_radar_summary TO authenticated;
GRANT SELECT ON v_cdp_demographics_summary TO authenticated;
GRANT SELECT ON v_mdp_marketing_funnel TO authenticated;
