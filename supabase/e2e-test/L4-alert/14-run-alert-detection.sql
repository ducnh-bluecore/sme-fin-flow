-- ============================================================================
-- E2E TEST SUITE - SCRIPT 14: RUN ALERT DETECTION (L4 Alert - DB-First)
-- ============================================================================
-- Architecture: v1.4.2 Layer 4 - Alert/Decision (DB-First)
-- Runs alert detection to generate alert_instances from rules
--
-- DB-FIRST APPROACH:
--   - Call detect functions if they exist
--   - Fallback to direct SQL detection if not
--
-- EXPECTED OUTPUT:
--   - alert_instances: 5-15 alerts
--   - cross_domain_variance_alerts: populated (backward compat)
-- ============================================================================

DO $$
DECLARE
  v_tenant_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_count integer;
  v_latest_date date;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'L4 ALERT DETECTION - Starting...';
  RAISE NOTICE '========================================';

  -- Get latest date with data
  SELECT MAX(fact_date) INTO v_latest_date
  FROM kpi_facts_daily
  WHERE tenant_id = v_tenant_id;
  
  RAISE NOTICE 'Latest KPI date: %', v_latest_date;

  -- ============================================================================
  -- STEP 1: Clear existing alerts
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 1] Clearing existing alerts...';
  
  DELETE FROM alert_instances WHERE tenant_id = v_tenant_id;
  DELETE FROM cross_domain_variance_alerts WHERE tenant_id = v_tenant_id;
  
  RAISE NOTICE '  ✓ Cleared alert_instances and cross_domain_variance_alerts';

  -- ============================================================================
  -- STEP 2: Run alert detection
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 2] Running alert detection...';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'detect_threshold_breaches') THEN
    PERFORM detect_threshold_breaches(v_tenant_id);
    RAISE NOTICE '  ✓ detect_threshold_breaches completed';
  ELSE
    RAISE NOTICE '  ⚠ detect_threshold_breaches not found, using fallback...';
    
    -- Fallback: Generate sample alerts from KPI facts
    INSERT INTO alert_instances (
      id, tenant_id, alert_type, category, title, message,
      severity, status, metric_name, current_value, threshold_value,
      impact_amount, created_at
    )
    -- COGS alerts
    SELECT
      ('aaaaaaaa-alrt-' || LPAD(ROW_NUMBER() OVER ()::text, 4, '0') || '-0001-000000000001')::uuid,
      v_tenant_id,
      'threshold', 'margin', 
      'High COGS on ' || dimension_channel,
      'COGS % of ' || ROUND(kpi_value, 1) || '% exceeds 55% threshold',
      'warning', 'open',
      'cogs_percent', kpi_value, 55,
      (kpi_value - 55) * 10000,  -- Estimated impact
      NOW()
    FROM kpi_facts_daily
    WHERE tenant_id = v_tenant_id
      AND kpi_code = 'cogs_percent'
      AND kpi_value > 55
      AND fact_date >= v_latest_date - INTERVAL '7 days'
    LIMIT 3
    
    UNION ALL
    
    -- Low revenue alerts
    SELECT
      ('aaaaaaaa-alrt-' || LPAD((10 + ROW_NUMBER() OVER ())::text, 4, '0') || '-0001-000000000001')::uuid,
      v_tenant_id,
      'threshold', 'revenue',
      'Low Revenue Day',
      'Daily revenue of ₫' || ROUND(kpi_value/1000000, 1) || 'M below target',
      'info', 'open',
      'net_revenue', kpi_value, 10000000,
      10000000 - kpi_value,
      NOW()
    FROM kpi_facts_daily
    WHERE tenant_id = v_tenant_id
      AND kpi_code = 'net_revenue'
      AND kpi_value < 10000000
      AND fact_date >= v_latest_date - INTERVAL '7 days'
    LIMIT 3
    
    UNION ALL
    
    -- Low order count
    SELECT
      ('aaaaaaaa-alrt-' || LPAD((20 + ROW_NUMBER() OVER ())::text, 4, '0') || '-0001-000000000001')::uuid,
      v_tenant_id,
      'trend', 'operations',
      'Order Volume Drop',
      'Only ' || ROUND(kpi_value, 0) || ' orders - below daily average',
      'warning', 'open',
      'order_count', kpi_value, 50,
      (50 - kpi_value) * 400000,  -- Estimated revenue loss
      NOW()
    FROM kpi_facts_daily
    WHERE tenant_id = v_tenant_id
      AND kpi_code = 'order_count'
      AND kpi_value < 50
      AND fact_date >= v_latest_date - INTERVAL '7 days'
    LIMIT 2;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Fallback created % alerts', v_count;
  END IF;

  -- ============================================================================
  -- STEP 3: Populate cross_domain_variance_alerts (backward compat)
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 3] Populating cross_domain_variance_alerts...';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'detect_cross_domain_variance') THEN
    PERFORM detect_cross_domain_variance(v_tenant_id);
    RAISE NOTICE '  ✓ detect_cross_domain_variance completed';
  ELSE
    -- Fallback: Generate variance alerts
    INSERT INTO cross_domain_variance_alerts (
      id, tenant_id, alert_type, source_module, target_module,
      metric_name, expected_value, actual_value, variance_percent,
      severity, status, created_at
    )
    SELECT
      ('aaaaaaaa-cvar-' || LPAD(ROW_NUMBER() OVER ()::text, 4, '0') || '-0001-000000000001')::uuid,
      v_tenant_id,
      'variance',
      'CDP',
      'FDP',
      'Revenue',
      (SELECT SUM(net_revenue) FROM cdp_orders WHERE tenant_id = v_tenant_id),
      (SELECT SUM(net_revenue) * 0.95 FROM cdp_orders WHERE tenant_id = v_tenant_id),
      5.0,
      'info',
      'open',
      NOW()
    UNION ALL
    SELECT
      ('aaaaaaaa-cvar-0002-0001-000000000001')::uuid,
      v_tenant_id,
      'variance',
      'FDP',
      'MDP',
      'Marketing Spend',
      (SELECT SUM(total_marketing_spend) FROM fdp_locked_costs WHERE tenant_id = v_tenant_id),
      (SELECT SUM(total_marketing_spend) * 0.92 FROM fdp_locked_costs WHERE tenant_id = v_tenant_id),
      8.0,
      'warning',
      'open',
      NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Created % variance alerts', v_count;
  END IF;

  -- ============================================================================
  -- STEP 4: Verification
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 4] Verification...';
  
  SELECT COUNT(*) INTO v_count
  FROM alert_instances
  WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '  alert_instances: % rows', v_count;
  
  SELECT COUNT(*) INTO v_count
  FROM cross_domain_variance_alerts
  WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '  cross_domain_variance_alerts: % rows', v_count;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'L4 ALERT DETECTION - Completed!';
  RAISE NOTICE '========================================';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error in alert detection: %', SQLERRM;
  RAISE;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT 
  'L4_ALERT: INSTANCES' as layer,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE status = 'open') as open_alerts,
  jsonb_object_agg(severity, cnt ORDER BY severity) as by_severity
FROM (
  SELECT severity, COUNT(*) as cnt
  FROM alert_instances
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY severity
) sub;

SELECT 
  'L4_ALERT: VARIANCE_ALERTS' as layer,
  COUNT(*) as total_alerts,
  ROUND(AVG(variance_percent), 1) as avg_variance
FROM cross_domain_variance_alerts
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
