-- Fix cdp_detect_ltv_decay: remove non-existent ce.tier usage, use risk_level instead
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

  -- Risk concentration (using available risk_level field)
  RETURN QUERY
  WITH risk_stats AS (
    SELECT 
      COALESCE(NULLIF(ce.risk_level, ''), 'unknown') as risk_level,
      COUNT(*) as customer_count,
      AVG(ce.equity_12m) as avg_equity,
      SUM(ce.equity_12m) as total_equity
    FROM cdp_customer_equity_computed ce
    JOIN cdp_customers c ON c.id = ce.customer_id
    WHERE c.tenant_id = p_tenant_id
      AND c.status = 'ACTIVE'
    GROUP BY COALESCE(NULLIF(ce.risk_level, ''), 'unknown')
  ),
  totals AS (
    SELECT SUM(customer_count)::numeric as total_customers,
           SUM(total_equity)::numeric as total_equity
    FROM risk_stats
  )
  SELECT
    'RISK_CONCENTRATION'::text as decay_type,
    'Risk ' || INITCAP(rs.risk_level) as population_name,
    rs.customer_count::numeric as current_value,
    t.total_customers as previous_value,
    ROUND((rs.customer_count::numeric / NULLIF(t.total_customers, 0)) * 100, 1) as decline_percent,
    ROUND(rs.total_equity * 0.10, 0) as revenue_at_risk,
    CASE
      WHEN rs.risk_level IN ('high','critical') AND (rs.customer_count::numeric / NULLIF(t.total_customers,0)) * 100 >= 20 THEN 'critical'
      WHEN rs.risk_level IN ('high','critical') THEN 'warning'
      ELSE 'info'
    END as severity,
    'Ưu tiên xử lý nhóm rủi ro cao: winback/retention và kiểm tra chất lượng dữ liệu' as recommendation
  FROM risk_stats rs
  CROSS JOIN totals t
  WHERE rs.risk_level IN ('high','critical','medium','unknown');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cdp_detect_ltv_decay(uuid, numeric) TO anon, authenticated;