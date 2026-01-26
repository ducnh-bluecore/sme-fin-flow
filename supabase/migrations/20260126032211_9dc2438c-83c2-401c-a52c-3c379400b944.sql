
-- Fix control_tower_aggregate_signals - fix UUID type cast
CREATE OR REPLACE FUNCTION control_tower_aggregate_signals(p_tenant_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_record RECORD;
BEGIN
  -- 1. Aggregate variance alerts
  FOR v_record IN 
    SELECT 
      a.id,
      a.alert_type,
      a.source_module,
      a.variance_percent,
      a.variance_amount,
      CASE 
        WHEN a.severity = 'critical' THEN 95
        WHEN a.severity = 'warning' THEN 70
        ELSE 40
      END as priority_score,
      'Variance: ' || a.metric_code as title,
      'Expected: ' || a.expected_value::TEXT || ', Actual: ' || a.actual_value::TEXT as description
    FROM cross_domain_variance_alerts a
    WHERE a.tenant_id = p_tenant_id
      AND a.status = 'open'
      AND NOT EXISTS (
        SELECT 1 FROM control_tower_priority_queue q 
        WHERE q.source_id = a.id::TEXT
          AND q.tenant_id = p_tenant_id
      )
  LOOP
    INSERT INTO control_tower_priority_queue (
      tenant_id, signal_type, source_module, source_id,
      priority_score, impact_amount, title, description, status
    ) VALUES (
      p_tenant_id, 'variance', v_record.source_module, v_record.id::TEXT,
      v_record.priority_score, COALESCE(v_record.variance_amount, 0),
      v_record.title, v_record.description, 'pending'
    );
    v_count := v_count + 1;
  END LOOP;

  -- 2. Aggregate early warning alerts  
  FOR v_record IN
    SELECT 
      e.id,
      e.metric_code,
      CASE 
        WHEN e.severity = 'critical' THEN 90
        WHEN e.severity = 'high' THEN 75
        WHEN e.severity = 'medium' THEN 50
        ELSE 30
      END as priority_score,
      COALESCE(e.impact_amount, 0) as impact,
      e.title,
      e.message as description
    FROM early_warning_alerts e
    WHERE e.tenant_id = p_tenant_id
      AND e.status = 'open'
      AND NOT EXISTS (
        SELECT 1 FROM control_tower_priority_queue q 
        WHERE q.source_id = e.id::TEXT
          AND q.tenant_id = p_tenant_id
      )
  LOOP
    INSERT INTO control_tower_priority_queue (
      tenant_id, signal_type, source_module, source_id,
      priority_score, impact_amount, title, description, status
    ) VALUES (
      p_tenant_id, 'alert', 'CONTROL_TOWER', v_record.id::TEXT,
      v_record.priority_score, v_record.impact,
      v_record.title, v_record.description, 'pending'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION control_tower_aggregate_signals(UUID) TO authenticated;
