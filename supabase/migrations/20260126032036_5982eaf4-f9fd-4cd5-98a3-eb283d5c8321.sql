
-- Drop existing function first
DROP FUNCTION IF EXISTS cross_module_run_daily_sync(UUID);

-- Recreate function
CREATE OR REPLACE FUNCTION cross_module_run_daily_sync(p_tenant_id UUID)
RETURNS TABLE(sync_step TEXT, status TEXT, records_affected INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  sync_step := 'fdp_locked_costs_check';
  SELECT COUNT(*) INTO v_count FROM fdp_locked_costs WHERE tenant_id = p_tenant_id AND is_locked = true;
  status := 'ok'; records_affected := v_count; RETURN NEXT;

  sync_step := 'cdp_segment_ltv_sync';
  BEGIN
    SELECT COUNT(*) INTO v_count FROM cdp_segment_ltv_for_mdp WHERE tenant_id = p_tenant_id;
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := 'skipped'; records_affected := 0;
  END;
  RETURN NEXT;

  sync_step := 'mdp_attribution_check';
  BEGIN
    SELECT COUNT(*) INTO v_count FROM cdp_customer_cohort_cac WHERE tenant_id = p_tenant_id AND source_module = 'MDP';
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := 'skipped'; records_affected := 0;
  END;
  RETURN NEXT;

  sync_step := 'cdp_revenue_forecast_check';
  BEGIN
    SELECT COUNT(*) INTO v_count FROM cross_module_revenue_forecast WHERE tenant_id = p_tenant_id;
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := 'skipped'; records_affected := 0;
  END;
  RETURN NEXT;

  sync_step := 'variance_detection';
  BEGIN
    PERFORM detect_cross_domain_variance(p_tenant_id);
    SELECT COUNT(*) INTO v_count FROM cross_domain_variance_alerts WHERE tenant_id = p_tenant_id AND status = 'open';
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := SQLERRM; records_affected := 0;
  END;
  RETURN NEXT;

  sync_step := 'control_tower_aggregate';
  BEGIN
    SELECT control_tower_aggregate_signals(p_tenant_id) INTO v_count;
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := SQLERRM; records_affected := 0;
  END;
  RETURN NEXT;

  sync_step := 'sync_complete';
  status := 'success'; records_affected := 0; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION cross_module_run_daily_sync(UUID) TO authenticated;
