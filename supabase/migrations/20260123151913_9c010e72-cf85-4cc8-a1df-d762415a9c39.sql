-- ============================================================
-- PRIORITY 3: Move frontend computations to database
-- ============================================================

-- 1. RPC for Decision Audit Stats (replaces frontend reduce/filter)
CREATE OR REPLACE FUNCTION public.get_decision_audit_stats(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_now TIMESTAMPTZ := NOW();
  v_7days_ago TIMESTAMPTZ := v_now - INTERVAL '7 days';
  v_30days_ago TIMESTAMPTZ := v_now - INTERVAL '30 days';
BEGIN
  SELECT json_build_object(
    'total_decisions', COUNT(*),
    'db_card_decisions', COUNT(*) FILTER (WHERE card_id IS NOT NULL),
    'auto_card_decisions', COUNT(*) FILTER (WHERE auto_card_id IS NOT NULL),
    'decided_count', COUNT(*) FILTER (WHERE decision_status = 'DECIDED'),
    'dismissed_count', COUNT(*) FILTER (WHERE decision_status = 'DISMISSED'),
    'snoozed_count', COUNT(*) FILTER (WHERE decision_status = 'SNOOZED'),
    'last_7_days_count', COUNT(*) FILTER (WHERE decided_at > v_7days_ago),
    'last_30_days_count', COUNT(*) FILTER (WHERE decided_at > v_30days_ago),
    'total_impact', COALESCE(SUM(ABS(COALESCE(impact_amount, 0))), 0)
  ) INTO v_result
  FROM decision_audit_log
  WHERE tenant_id = p_tenant_id;

  RETURN v_result;
END;
$$;

-- 2. RPC for AI Usage Stats (replaces frontend aggregation)
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(
  p_tenant_id UUID,
  p_days INT DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  WITH logs AS (
    SELECT * FROM ai_usage_logs
    WHERE tenant_id = p_tenant_id
      AND created_at >= v_start_date
  ),
  by_model AS (
    SELECT 
      model,
      SUM(total_tokens) as tokens,
      SUM(COALESCE(estimated_cost, 0)) as cost,
      COUNT(*) as count
    FROM logs
    GROUP BY model
  ),
  by_day AS (
    SELECT 
      DATE(created_at) as date,
      SUM(total_tokens) as tokens,
      SUM(COALESCE(estimated_cost, 0)) as cost,
      COUNT(*) as count
    FROM logs
    GROUP BY DATE(created_at)
    ORDER BY date
  ),
  totals AS (
    SELECT
      COALESCE(SUM(total_tokens), 0) as total_tokens,
      COALESCE(SUM(estimated_cost), 0) as total_cost,
      COUNT(*) as request_count
    FROM logs
  )
  SELECT json_build_object(
    'total_tokens', t.total_tokens,
    'total_cost', t.total_cost,
    'request_count', t.request_count,
    'avg_tokens_per_request', CASE WHEN t.request_count > 0 
      THEN ROUND(t.total_tokens::NUMERIC / t.request_count) 
      ELSE 0 END,
    'by_model', COALESCE((SELECT json_object_agg(model, json_build_object(
      'tokens', tokens,
      'cost', cost,
      'count', count
    )) FROM by_model), '{}'::json),
    'by_day', COALESCE((SELECT json_agg(json_build_object(
      'date', date,
      'tokens', tokens,
      'cost', cost,
      'count', count
    ) ORDER BY date) FROM by_day), '[]'::json)
  ) INTO v_result
  FROM totals t;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_decision_audit_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_stats(UUID, INT) TO authenticated;