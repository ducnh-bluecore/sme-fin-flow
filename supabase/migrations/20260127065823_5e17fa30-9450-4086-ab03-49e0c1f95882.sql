-- PHASE 3: Create v_executive_health_scores view
-- Pre-computes all 6 health dimensions from SSOT data
-- Uses hardcoded defaults (can be refactored to config table later)

CREATE OR REPLACE VIEW v_executive_health_scores AS
WITH latest_snapshot AS (
  SELECT DISTINCT ON (tenant_id) *
  FROM central_metrics_snapshots
  ORDER BY tenant_id, snapshot_at DESC
),
growth_data AS (
  SELECT 
    tenant_id,
    COALESCE(revenue_yoy_change, 0) as revenue_yoy
  FROM finance_monthly_summary
  WHERE month_start = date_trunc('month', CURRENT_DATE - interval '1 month')
),
raw_scores AS (
  SELECT
    s.tenant_id,
    -- Default thresholds
    70::numeric as good_thresh,
    50::numeric as warning_thresh,
    75::numeric as overall_good,
    55::numeric as overall_warning,
    
    -- LIQUIDITY: min(100, runway * 15)
    COALESCE(s.cash_runway_months, 4) as runway_months,
    LEAST(100, COALESCE(s.cash_runway_months, 4) * 15) as liquidity_score,
    
    -- RECEIVABLES: max(0, 100 - (dso - 30) * 2)
    COALESCE(NULLIF(s.dso, 0), 45) as dso_value,
    GREATEST(0, 100 - (COALESCE(NULLIF(s.dso, 0), 45) - 30) * 2) as receivables_score,
    
    -- PROFITABILITY: min(100, gross_margin * 2.5)
    COALESCE(NULLIF(s.gross_margin_percent, 0), 28) as gross_margin,
    LEAST(100, COALESCE(NULLIF(s.gross_margin_percent, 0), 28) * 2.5) as profitability_score,
    
    -- EFFICIENCY: max(0, 100 - ccc)
    COALESCE(s.ccc, 45) as ccc_value,
    GREATEST(0, LEAST(100, 100 - COALESCE(s.ccc, 45))) as efficiency_score,
    
    -- GROWTH: normalized to 0-100 scale
    COALESCE(g.revenue_yoy, 0) as revenue_yoy,
    LEAST(100, GREATEST(0, 50 + COALESCE(g.revenue_yoy, 0) * 1.75)) as growth_score,
    
    -- STABILITY: min(100, ebitda_margin * 4)
    COALESCE(NULLIF(s.ebitda_margin_percent, 0), 15) as ebitda_margin,
    LEAST(100, COALESCE(NULLIF(s.ebitda_margin_percent, 0), 15) * 4) as stability_score,
    
    s.snapshot_at
    
  FROM latest_snapshot s
  LEFT JOIN growth_data g ON s.tenant_id = g.tenant_id
)
SELECT
  r.tenant_id,
  
  -- Liquidity
  ROUND(r.liquidity_score::numeric, 1) as liquidity_score,
  CASE 
    WHEN r.liquidity_score >= r.good_thresh THEN 'good'
    WHEN r.liquidity_score >= r.warning_thresh THEN 'warning'
    ELSE 'critical'
  END as liquidity_status,
  r.runway_months,
  
  -- Receivables
  ROUND(r.receivables_score::numeric, 1) as receivables_score,
  CASE 
    WHEN r.receivables_score >= r.good_thresh THEN 'good'
    WHEN r.receivables_score >= r.warning_thresh THEN 'warning'
    ELSE 'critical'
  END as receivables_status,
  r.dso_value as dso,
  
  -- Profitability
  ROUND(r.profitability_score::numeric, 1) as profitability_score,
  CASE 
    WHEN r.profitability_score >= r.good_thresh THEN 'good'
    WHEN r.profitability_score >= r.warning_thresh THEN 'warning'
    ELSE 'critical'
  END as profitability_status,
  r.gross_margin,
  
  -- Efficiency
  ROUND(r.efficiency_score::numeric, 1) as efficiency_score,
  CASE 
    WHEN r.efficiency_score >= r.good_thresh THEN 'good'
    WHEN r.efficiency_score >= r.warning_thresh THEN 'warning'
    ELSE 'critical'
  END as efficiency_status,
  r.ccc_value as ccc,
  
  -- Growth
  ROUND(r.growth_score::numeric, 1) as growth_score,
  CASE 
    WHEN r.growth_score >= r.good_thresh THEN 'good'
    WHEN r.growth_score >= r.warning_thresh THEN 'warning'
    ELSE 'critical'
  END as growth_status,
  r.revenue_yoy,
  
  -- Stability
  ROUND(r.stability_score::numeric, 1) as stability_score,
  CASE 
    WHEN r.stability_score >= r.good_thresh THEN 'good'
    WHEN r.stability_score >= r.warning_thresh THEN 'warning'
    ELSE 'critical'
  END as stability_status,
  r.ebitda_margin,
  
  -- Overall score (average of 6 dimensions)
  ROUND(
    (r.liquidity_score + r.receivables_score + r.profitability_score + 
     r.efficiency_score + r.growth_score + r.stability_score) / 6
  ::numeric, 0) as overall_score,
  
  -- Overall status
  CASE 
    WHEN (r.liquidity_score + r.receivables_score + r.profitability_score + 
          r.efficiency_score + r.growth_score + r.stability_score) / 6 >= r.overall_good 
      THEN 'good'
    WHEN (r.liquidity_score + r.receivables_score + r.profitability_score + 
          r.efficiency_score + r.growth_score + r.stability_score) / 6 >= r.overall_warning 
      THEN 'warning'
    ELSE 'critical'
  END as overall_status,
  
  -- Status counts
  (
    CASE WHEN r.liquidity_score >= r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.receivables_score >= r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.profitability_score >= r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.efficiency_score >= r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.growth_score >= r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.stability_score >= r.good_thresh THEN 1 ELSE 0 END
  ) as good_count,
  
  (
    CASE WHEN r.liquidity_score >= r.warning_thresh AND r.liquidity_score < r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.receivables_score >= r.warning_thresh AND r.receivables_score < r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.profitability_score >= r.warning_thresh AND r.profitability_score < r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.efficiency_score >= r.warning_thresh AND r.efficiency_score < r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.growth_score >= r.warning_thresh AND r.growth_score < r.good_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.stability_score >= r.warning_thresh AND r.stability_score < r.good_thresh THEN 1 ELSE 0 END
  ) as warning_count,
  
  (
    CASE WHEN r.liquidity_score < r.warning_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.receivables_score < r.warning_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.profitability_score < r.warning_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.efficiency_score < r.warning_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.growth_score < r.warning_thresh THEN 1 ELSE 0 END +
    CASE WHEN r.stability_score < r.warning_thresh THEN 1 ELSE 0 END
  ) as critical_count,
  
  r.snapshot_at,
  r.good_thresh as good_threshold,
  r.warning_thresh as warning_threshold

FROM raw_scores r;