-- Phase 8.2: Add CDP Insight Detection to Daily Pipeline
-- Trigger cdp_detect_behavioral_changes after cdp_run_daily_build

-- First, create a wrapper function that runs full CDP pipeline including insights
CREATE OR REPLACE FUNCTION public.cdp_run_full_daily_pipeline(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_build_result jsonb;
  v_insight_count integer := 0;
BEGIN
  -- Step 1: Run daily build (customer equity, RFM, etc.)
  BEGIN
    PERFORM cdp_run_daily_build(p_tenant_id, p_as_of_date);
    v_result := v_result || '{"daily_build": "success"}'::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_result := v_result || jsonb_build_object('daily_build', 'error: ' || SQLERRM);
  END;
  
  -- Step 2: Run behavioral change detection (insight engine)
  BEGIN
    -- Check if the function exists before calling
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname = 'cdp_detect_behavioral_changes'
    ) THEN
      PERFORM cdp_detect_behavioral_changes(p_tenant_id, p_as_of_date);
      
      -- Count new insights
      SELECT COUNT(*) INTO v_insight_count
      FROM cdp_insight_events
      WHERE tenant_id = p_tenant_id
        AND detected_at >= p_as_of_date;
      
      v_result := v_result || jsonb_build_object(
        'insight_detection', 'success',
        'new_insights', v_insight_count
      );
    ELSE
      v_result := v_result || '{"insight_detection": "skipped - function not found"}'::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_result := v_result || jsonb_build_object('insight_detection', 'error: ' || SQLERRM);
  END;
  
  -- Step 3: Refresh central metrics snapshot
  BEGIN
    PERFORM compute_central_metrics_snapshot(p_tenant_id);
    v_result := v_result || '{"metrics_snapshot": "success"}'::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_result := v_result || jsonb_build_object('metrics_snapshot', 'error: ' || SQLERRM);
  END;
  
  v_result := v_result || jsonb_build_object(
    'completed_at', NOW()::text,
    'tenant_id', p_tenant_id::text
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.cdp_run_full_daily_pipeline(uuid, date) IS 
'Phase 8.2: Full CDP daily pipeline - runs daily build, insight detection, and metrics snapshot. Call this from scheduled-sync edge function.';