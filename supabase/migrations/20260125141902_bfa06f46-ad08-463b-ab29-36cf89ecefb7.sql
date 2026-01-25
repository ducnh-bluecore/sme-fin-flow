-- Fix wrong column name in cdp_detect_ltv_decay
CREATE OR REPLACE FUNCTION public.cdp_detect_ltv_decay(
  p_tenant_id uuid,
  p_threshold_percent numeric DEFAULT 10.0
)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
BEGIN
  -- Detect cohort-level decay (comparing recent cohorts to older ones)
  RETURN QUERY
  WITH cohort_performance AS (
    SELECT 
      date_trunc('quarter', c.first_order_at)::date as cohort_quarter,
      COUNT(*) as customer_count,
      AVG(ce.equity_12m) as avg_ltv,
      SUM(ce.equity_12m) as total_equity
    FROM cdp_customers c
    JOIN cdp_customer_equity_computed ce ON ce.customer_id = c.id
    WHERE c.tenant_id = p_tenant_id
      AND c.first_order_at >= NOW() - INTERVAL '2 years'
    GROUP BY date_trunc('quarter', c.first_order_at)
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
$function$;

GRANT EXECUTE ON FUNCTION public.cdp_detect_ltv_decay(uuid, numeric) TO anon, authenticated;