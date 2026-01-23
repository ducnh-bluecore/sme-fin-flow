-- Fix cdp_run_daily_build to handle void return from cdp_build_customer_metrics_rolling
DROP FUNCTION IF EXISTS cdp_run_daily_build(uuid, date);

CREATE OR REPLACE FUNCTION cdp_run_daily_build(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS jsonb AS $$
DECLARE
  v_daily_count integer;
  v_equity_result jsonb;
  v_start_ts timestamptz;
  v_daily_ts timestamptz;
  v_rolling_ts timestamptz;
  v_equity_ts timestamptz;
BEGIN
  v_start_ts := clock_timestamp();
  
  -- Step 1: Build daily metrics
  v_daily_count := cdp_build_customer_metrics_daily(p_tenant_id, p_as_of_date);
  v_daily_ts := clock_timestamp();
  
  -- Step 2: Build rolling metrics (returns void, just execute)
  PERFORM cdp_build_customer_metrics_rolling(p_tenant_id, p_as_of_date);
  v_rolling_ts := clock_timestamp();
  
  -- Step 3: Build customer equity
  v_equity_result := cdp_build_customer_equity(p_tenant_id, p_as_of_date);
  v_equity_ts := clock_timestamp();
  
  -- Step 4: Refresh MVs concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_segment_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_cohort_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_value_tier_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_data_quality_daily;
  
  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'as_of_date', p_as_of_date,
    'daily_customers', v_daily_count,
    'rolling_customers', (SELECT COUNT(DISTINCT customer_id) FROM cdp_customer_metrics_rolling WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date),
    'equity_result', v_equity_result,
    'duration_daily_ms', EXTRACT(MILLISECONDS FROM v_daily_ts - v_start_ts)::integer,
    'duration_rolling_ms', EXTRACT(MILLISECONDS FROM v_rolling_ts - v_daily_ts)::integer,
    'duration_equity_ms', EXTRACT(MILLISECONDS FROM v_equity_ts - v_rolling_ts)::integer,
    'duration_total_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_ts)::integer
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;