-- =============================================
-- PHASE 3: INSIGHT QUALITY GATE (Complete)
-- =============================================

-- 3.1 Create Insight Audit Log table
CREATE TABLE IF NOT EXISTS public.cdp_insight_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  insight_code text NOT NULL,
  insight_event_id uuid REFERENCES public.cdp_insight_events(id) ON DELETE SET NULL,
  validation_result jsonb NOT NULL DEFAULT '{}',
  source_metrics jsonb,
  insight_metrics jsonb,
  passed boolean NOT NULL DEFAULT false,
  failure_reasons text[],
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cdp_insight_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view audit logs for their tenant'
  ) THEN
    CREATE POLICY "Users can view audit logs for their tenant"
      ON public.cdp_insight_audit_log FOR SELECT
      USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cdp_insight_audit_log_tenant ON public.cdp_insight_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cdp_insight_audit_log_code ON public.cdp_insight_audit_log(insight_code);
CREATE INDEX IF NOT EXISTS idx_cdp_insight_audit_log_passed ON public.cdp_insight_audit_log(passed);

-- 3.2 Create Insight Quality Metrics View
CREATE OR REPLACE VIEW public.v_cdp_insight_quality_summary AS
SELECT 
  tenant_id,
  COUNT(*) as total_insights,
  COUNT(*) FILTER (WHERE passed) as passed_count,
  COUNT(*) FILTER (WHERE NOT passed) as failed_count,
  ROUND(
    COUNT(*) FILTER (WHERE passed)::numeric / NULLIF(COUNT(*), 0) * 100, 
    1
  ) as pass_rate,
  COUNT(DISTINCT insight_code) as codes_tested,
  MAX(checked_at) as last_check_at
FROM public.cdp_insight_audit_log
WHERE checked_at > NOW() - INTERVAL '7 days'
GROUP BY tenant_id;

-- 3.3 Create Validation Function
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
      ROUND(
        CASE 
          WHEN SUM(net_revenue) > 0 
          THEN (SUM(gross_profit) / SUM(net_revenue) * 100)
          ELSE 0 
        END, 
        1
      ) as actual_margin
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

-- 3.4 Create Insight Registry Summary View
DROP VIEW IF EXISTS public.v_cdp_insight_registry_summary;
CREATE VIEW public.v_cdp_insight_registry_summary AS
SELECT 
  r.insight_code as code,
  r.name,
  COALESCE(r.category, '') as description,
  r.category as topic,
  COALESCE(r.threshold_json::text, '') as threshold,
  r.cooldown_days,
  ARRAY[COALESCE(r.owner_role, 'CEO')] as owners,
  r.is_enabled,
  r.category,
  r.window_days,
  r.baseline_days,
  r.population_type,
  NULL::uuid as tenant_id,
  EXISTS(
    SELECT 1 
    FROM cdp_insight_events e 
    WHERE e.insight_code = r.insight_code 
      AND e.status = 'active'
  ) as is_triggered,
  (SELECT COUNT(*)::int 
   FROM cdp_insight_events e 
   WHERE e.insight_code = r.insight_code
  ) as triggered_count,
  (SELECT MAX(e.created_at)::text 
   FROM cdp_insight_events e 
   WHERE e.insight_code = r.insight_code
  ) as last_triggered_date
FROM cdp_insight_registry r;

-- Grant access
GRANT SELECT ON public.v_cdp_insight_quality_summary TO authenticated;
GRANT SELECT ON public.v_cdp_insight_registry_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.cdp_validate_insight_accuracy TO authenticated;