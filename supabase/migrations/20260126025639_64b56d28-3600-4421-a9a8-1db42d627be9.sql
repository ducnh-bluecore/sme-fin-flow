-- Fix: control_tower_aggregate_signals function
-- Using simpler counting approach

CREATE OR REPLACE FUNCTION public.control_tower_aggregate_signals(
  p_tenant_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signals_created INTEGER := 0;
  v_count1 INTEGER;
  v_count2 INTEGER;
BEGIN
  -- Import variance alerts
  WITH inserted AS (
    INSERT INTO control_tower_priority_queue (
      tenant_id, signal_type, source_module, source_id,
      priority_score, impact_amount, urgency_hours,
      title, description, recommended_action
    )
    SELECT 
      cda.tenant_id,
      'variance',
      cda.source_module,
      cda.id,
      CASE cda.severity 
        WHEN 'critical' THEN 90
        WHEN 'warning' THEN 70
        ELSE 50 
      END,
      ABS(cda.variance_amount),
      CASE cda.severity WHEN 'critical' THEN 4 WHEN 'warning' THEN 24 ELSE 72 END,
      'Variance: ' || cda.metric_code,
      'Detected ' || ROUND(cda.variance_percent, 1) || '% variance between ' || cda.source_module || ' and ' || cda.target_module,
      'Review and reconcile the variance'
    FROM cross_domain_variance_alerts cda
    WHERE cda.tenant_id = p_tenant_id
    AND cda.status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM control_tower_priority_queue ctpq
      WHERE ctpq.source_id = cda.id
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count1 FROM inserted;

  -- Import active alert instances
  WITH inserted2 AS (
    INSERT INTO control_tower_priority_queue (
      tenant_id, signal_type, source_module, source_id,
      priority_score, impact_amount, urgency_hours,
      title, description, recommended_action
    )
    SELECT 
      ai.tenant_id,
      'alert',
      COALESCE(ai.category, 'FDP'),
      ai.id,
      COALESCE(ai.priority, 50),
      COALESCE(ai.impact_amount, 0),
      24,
      ai.title,
      ai.message,
      ai.suggested_action
    FROM alert_instances ai
    WHERE ai.tenant_id = p_tenant_id
    AND ai.status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM control_tower_priority_queue ctpq
      WHERE ctpq.source_id = ai.id
    )
    LIMIT 20
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count2 FROM inserted2;

  v_signals_created := COALESCE(v_count1, 0) + COALESCE(v_count2, 0);
  
  RETURN v_signals_created;
END;
$$;