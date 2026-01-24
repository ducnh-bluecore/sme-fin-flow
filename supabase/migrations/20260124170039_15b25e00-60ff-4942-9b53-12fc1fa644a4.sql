-- Sprint 3: What-If Scenarios & Decay Detection

-- Function: Compare LTV scenarios with different assumptions
CREATE OR REPLACE FUNCTION cdp_compare_ltv_scenarios(
  p_tenant_id uuid,
  p_base_model_id uuid,
  p_scenarios jsonb DEFAULT '[]'::jsonb
  -- Format: [{"name": "Optimistic", "retention_boost": 0.1, "aov_boost": 0.05, "discount_adjust": -0.02}]
)
RETURNS TABLE (
  scenario_name text,
  total_customers bigint,
  total_equity_12m numeric,
  total_equity_24m numeric,
  avg_ltv_12m numeric,
  delta_vs_base_12m numeric,
  delta_percent_12m numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_model record;
  v_scenario jsonb;
  v_adjusted_retention_1 numeric;
  v_adjusted_retention_2 numeric;
  v_adjusted_aov_growth numeric;
  v_adjusted_discount numeric;
  v_base_equity_12m numeric;
BEGIN
  -- Get base model assumptions
  SELECT * INTO v_base_model
  FROM cdp_ltv_model_assumptions
  WHERE id = p_base_model_id AND tenant_id = p_tenant_id;
  
  IF v_base_model IS NULL THEN
    RAISE EXCEPTION 'Model not found';
  END IF;

  -- Calculate base scenario first
  SELECT 
    COUNT(DISTINCT c.id),
    COALESCE(SUM(ce.equity_12m), 0),
    COALESCE(SUM(ce.equity_24m), 0),
    COALESCE(AVG(ce.equity_12m), 0)
  INTO total_customers, total_equity_12m, total_equity_24m, avg_ltv_12m
  FROM cdp_customers c
  LEFT JOIN cdp_customer_equity_computed ce ON ce.customer_id = c.id
  WHERE c.tenant_id = p_tenant_id AND c.status = 'ACTIVE';
  
  v_base_equity_12m := total_equity_12m;
  
  -- Return base scenario
  scenario_name := 'Hiện tại (Base)';
  delta_vs_base_12m := 0;
  delta_percent_12m := 0;
  RETURN NEXT;
  
  -- Process each scenario
  FOR v_scenario IN SELECT * FROM jsonb_array_elements(p_scenarios)
  LOOP
    scenario_name := v_scenario->>'name';
    
    -- Calculate adjusted parameters
    v_adjusted_retention_1 := LEAST(1.0, v_base_model.retention_year_1 + COALESCE((v_scenario->>'retention_boost')::numeric, 0));
    v_adjusted_retention_2 := LEAST(1.0, v_base_model.retention_year_2 + COALESCE((v_scenario->>'retention_boost')::numeric, 0) * 0.8);
    v_adjusted_aov_growth := v_base_model.aov_growth_rate + COALESCE((v_scenario->>'aov_boost')::numeric, 0);
    v_adjusted_discount := GREATEST(0.01, v_base_model.discount_rate + COALESCE((v_scenario->>'discount_adjust')::numeric, 0));
    
    -- Calculate scenario equity (simplified projection)
    -- Apply adjustment factor based on parameter changes
    WITH scenario_calc AS (
      SELECT 
        c.id,
        ce.equity_12m * (1 + COALESCE((v_scenario->>'retention_boost')::numeric, 0) * 2) 
                      * (1 + COALESCE((v_scenario->>'aov_boost')::numeric, 0))
                      / (1 + COALESCE((v_scenario->>'discount_adjust')::numeric, 0)) as adjusted_equity_12m,
        ce.equity_24m * (1 + COALESCE((v_scenario->>'retention_boost')::numeric, 0) * 3)
                      * (1 + COALESCE((v_scenario->>'aov_boost')::numeric, 0) * 1.5)
                      / (1 + COALESCE((v_scenario->>'discount_adjust')::numeric, 0) * 1.5) as adjusted_equity_24m
      FROM cdp_customers c
      LEFT JOIN cdp_customer_equity_computed ce ON ce.customer_id = c.id
      WHERE c.tenant_id = p_tenant_id AND c.status = 'ACTIVE'
    )
    SELECT 
      COUNT(*),
      COALESCE(SUM(adjusted_equity_12m), 0),
      COALESCE(SUM(adjusted_equity_24m), 0),
      COALESCE(AVG(adjusted_equity_12m), 0)
    INTO total_customers, total_equity_12m, total_equity_24m, avg_ltv_12m
    FROM scenario_calc;
    
    delta_vs_base_12m := total_equity_12m - v_base_equity_12m;
    delta_percent_12m := CASE WHEN v_base_equity_12m > 0 
      THEN ROUND((delta_vs_base_12m / v_base_equity_12m) * 100, 2)
      ELSE 0 END;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Function: Detect LTV decay patterns
CREATE OR REPLACE FUNCTION cdp_detect_ltv_decay(
  p_tenant_id uuid,
  p_threshold_percent numeric DEFAULT 10.0
)
RETURNS TABLE (
  decay_type text,
  population_name text,
  current_value numeric,
  previous_value numeric,
  decline_percent numeric,
  revenue_at_risk numeric,
  severity text,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Detect cohort-level decay (comparing recent cohorts to older ones)
  RETURN QUERY
  WITH cohort_performance AS (
    SELECT 
      date_trunc('quarter', c.first_order_date)::date as cohort_quarter,
      COUNT(*) as customer_count,
      AVG(ce.equity_12m) as avg_ltv,
      SUM(ce.equity_12m) as total_equity
    FROM cdp_customers c
    JOIN cdp_customer_equity_computed ce ON ce.customer_id = c.id
    WHERE c.tenant_id = p_tenant_id
      AND c.first_order_date >= NOW() - INTERVAL '2 years'
    GROUP BY date_trunc('quarter', c.first_order_date)
    ORDER BY cohort_quarter DESC
  ),
  cohort_comparison AS (
    SELECT 
      cohort_quarter,
      avg_ltv as current_value,
      LAG(avg_ltv) OVER (ORDER BY cohort_quarter) as previous_value,
      total_equity
    FROM cohort_performance
  )
  SELECT 
    'COHORT_DECAY'::text as decay_type,
    'Cohort Q' || EXTRACT(QUARTER FROM cohort_quarter)::text || '/' || EXTRACT(YEAR FROM cohort_quarter)::text as population_name,
    ROUND(cc.current_value, 0) as current_value,
    ROUND(cc.previous_value, 0) as previous_value,
    ROUND(((cc.previous_value - cc.current_value) / NULLIF(cc.previous_value, 0)) * 100, 1) as decline_percent,
    ROUND(total_equity * 0.1, 0) as revenue_at_risk, -- 10% of cohort equity at risk
    CASE 
      WHEN ((cc.previous_value - cc.current_value) / NULLIF(cc.previous_value, 0)) * 100 > 20 THEN 'critical'
      WHEN ((cc.previous_value - cc.current_value) / NULLIF(cc.previous_value, 0)) * 100 > 10 THEN 'warning'
      ELSE 'info'
    END as severity,
    'Xem xét chiến dịch retention cho cohort này' as recommendation
  FROM cohort_comparison cc
  WHERE cc.previous_value IS NOT NULL
    AND cc.current_value < cc.previous_value
    AND ((cc.previous_value - cc.current_value) / NULLIF(cc.previous_value, 0)) * 100 >= p_threshold_percent;

  -- Detect tier migration decay (customers dropping tiers)
  RETURN QUERY
  WITH tier_stats AS (
    SELECT 
      ce.tier,
      COUNT(*) as customer_count,
      AVG(ce.equity_12m) as avg_ltv,
      SUM(ce.equity_12m) as total_equity
    FROM cdp_customer_equity_computed ce
    JOIN cdp_customers c ON c.id = ce.customer_id
    WHERE c.tenant_id = p_tenant_id
      AND c.status = 'ACTIVE'
    GROUP BY ce.tier
  ),
  tier_health AS (
    SELECT 
      tier,
      customer_count,
      avg_ltv,
      total_equity,
      LAG(customer_count) OVER (ORDER BY 
        CASE tier 
          WHEN 'platinum' THEN 1 
          WHEN 'gold' THEN 2 
          WHEN 'silver' THEN 3 
          ELSE 4 
        END
      ) as higher_tier_count
    FROM tier_stats
  )
  SELECT 
    'TIER_IMBALANCE'::text as decay_type,
    'Tier ' || INITCAP(th.tier) as population_name,
    th.customer_count::numeric as current_value,
    th.higher_tier_count::numeric as previous_value,
    ROUND((th.customer_count::numeric / NULLIF(th.higher_tier_count, 0) - 1) * 100, 1) as decline_percent,
    ROUND(th.total_equity * 0.05, 0) as revenue_at_risk,
    CASE 
      WHEN th.customer_count > th.higher_tier_count * 5 THEN 'warning'
      ELSE 'info'
    END as severity,
    'Cân nhắc chương trình upgrade tier' as recommendation
  FROM tier_health th
  WHERE th.higher_tier_count IS NOT NULL
    AND th.customer_count > th.higher_tier_count * 3; -- Alert if lower tier has 3x more customers
END;
$$;

-- View: LTV decay alerts for Control Tower integration
CREATE OR REPLACE VIEW v_cdp_ltv_decay_alerts AS
SELECT 
  d.decay_type,
  d.population_name,
  d.current_value,
  d.previous_value,
  d.decline_percent,
  d.revenue_at_risk,
  d.severity,
  d.recommendation,
  t.id as tenant_id
FROM tenants t
CROSS JOIN LATERAL cdp_detect_ltv_decay(t.id, 10.0) d
WHERE d.severity IN ('critical', 'warning');

COMMENT ON VIEW v_cdp_ltv_decay_alerts IS 'CDP LTV decay alerts for Control Tower integration';