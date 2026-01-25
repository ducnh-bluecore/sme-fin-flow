-- Fix validation function: use gross_margin instead of gross_profit
CREATE OR REPLACE FUNCTION public.cdp_validate_insight_accuracy(
  p_tenant_id uuid,
  p_insight_code text DEFAULT NULL
)
RETURNS TABLE (
  insight_code text,
  insight_event_id uuid,
  source_customer_count int,
  reported_customer_count int,
  customer_match boolean,
  source_metric_value numeric,
  reported_metric_value numeric,
  metric_match boolean,
  overall_passed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH recent_insights AS (
    SELECT 
      e.id as event_id,
      e.insight_code as code,
      COALESCE(e.n_customers, 0) as reported_customers,
      (e.metric_snapshot->>'current_value')::numeric as reported_value,
      e.created_at
    FROM cdp_insight_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.status = 'active'
      AND (p_insight_code IS NULL OR e.insight_code = p_insight_code)
      AND e.created_at > NOW() - INTERVAL '30 days'
  ),
  source_metrics AS (
    SELECT 
      COUNT(DISTINCT customer_id)::int as actual_customers,
      ROUND(AVG(gross_margin) * 100, 1) as actual_margin
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND order_at > NOW() - INTERVAL '60 days'
  )
  SELECT 
    ri.code,
    ri.event_id,
    sm.actual_customers as source_customer_count,
    ri.reported_customers as reported_customer_count,
    ABS(sm.actual_customers - ri.reported_customers) <= GREATEST(sm.actual_customers * 0.05, 5) as customer_match,
    sm.actual_margin as source_metric_value,
    ri.reported_value as reported_metric_value,
    ABS(COALESCE(sm.actual_margin, 0) - COALESCE(ri.reported_value, 0)) <= 2 as metric_match,
    (ABS(sm.actual_customers - ri.reported_customers) <= GREATEST(sm.actual_customers * 0.05, 5))
      AND (ABS(COALESCE(sm.actual_margin, 0) - COALESCE(ri.reported_value, 0)) <= 2) as overall_passed
  FROM recent_insights ri
  CROSS JOIN source_metrics sm;
END;
$$;