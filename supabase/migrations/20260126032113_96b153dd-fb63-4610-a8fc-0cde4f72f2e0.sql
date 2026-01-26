
-- ============================================
-- 1. CREATE TABLE IF NOT EXISTS (with safety)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'control_tower_priority_queue') THEN
    CREATE TABLE public.control_tower_priority_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      signal_type TEXT NOT NULL,
      source_module TEXT NOT NULL,
      source_id TEXT,
      priority_score INT DEFAULT 50,
      impact_amount NUMERIC(15,2) DEFAULT 0,
      urgency_hours INT DEFAULT 24,
      title TEXT NOT NULL,
      description TEXT,
      recommended_action TEXT,
      action_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_to UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    
    CREATE INDEX idx_priority_queue_tenant_status ON control_tower_priority_queue(tenant_id, status);
    CREATE INDEX idx_priority_queue_priority ON control_tower_priority_queue(priority_score DESC);
    
    ALTER TABLE control_tower_priority_queue ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "queue_select_policy" ON control_tower_priority_queue FOR SELECT
      USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    CREATE POLICY "queue_update_policy" ON control_tower_priority_queue FOR UPDATE
      USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    CREATE POLICY "queue_insert_policy" ON control_tower_priority_queue FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 2. FIX cross_module_run_daily_sync - use locked_at instead of is_locked
-- ============================================
DROP FUNCTION IF EXISTS cross_module_run_daily_sync(UUID);

CREATE FUNCTION cross_module_run_daily_sync(p_tenant_id UUID)
RETURNS TABLE(sync_step TEXT, status TEXT, records_affected INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Step 1: Check FDP locked costs (use locked_at IS NOT NULL)
  sync_step := 'fdp_locked_costs_check';
  SELECT COUNT(*) INTO v_count FROM fdp_locked_costs WHERE tenant_id = p_tenant_id AND locked_at IS NOT NULL;
  status := 'ok'; records_affected := v_count; RETURN NEXT;

  -- Step 2: CDP segment LTV
  sync_step := 'cdp_segment_ltv_sync';
  BEGIN
    SELECT COUNT(*) INTO v_count FROM cdp_segment_ltv_for_mdp WHERE tenant_id = p_tenant_id;
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := 'skipped'; records_affected := 0;
  END;
  RETURN NEXT;

  -- Step 3: MDP attribution
  sync_step := 'mdp_attribution_check';
  BEGIN
    SELECT COUNT(*) INTO v_count FROM cdp_customer_cohort_cac WHERE tenant_id = p_tenant_id AND source_module = 'MDP';
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := 'skipped'; records_affected := 0;
  END;
  RETURN NEXT;

  -- Step 4: Revenue forecast
  sync_step := 'cdp_revenue_forecast_check';
  BEGIN
    SELECT COUNT(*) INTO v_count FROM cross_module_revenue_forecast WHERE tenant_id = p_tenant_id;
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := 'skipped'; records_affected := 0;
  END;
  RETURN NEXT;

  -- Step 5: Variance detection
  sync_step := 'variance_detection';
  BEGIN
    PERFORM detect_cross_domain_variance(p_tenant_id);
    SELECT COUNT(*) INTO v_count FROM cross_domain_variance_alerts WHERE tenant_id = p_tenant_id AND status = 'open';
    status := 'ok'; records_affected := v_count;
  EXCEPTION WHEN OTHERS THEN status := SQLERRM; records_affected := 0;
  END;
  RETURN NEXT;

  -- Step 6: Aggregate to Control Tower
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
