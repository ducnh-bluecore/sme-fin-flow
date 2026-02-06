-- ============================================================================
-- E2E TEST SUITE - SCRIPT 11: RUN KPI AGGREGATION (L3 KPI - DB-First)
-- ============================================================================
-- Architecture: v1.4.2 Layer 3 - KPI (DB-First)
-- Aggregates data from L2 Master Model into kpi_facts_daily
--
-- DB-FIRST APPROACH:
--   - Call compute functions if they exist
--   - Fallback to direct SQL aggregation if not
--
-- EXPECTED OUTPUT:
--   - kpi_facts_daily: ~760 rows (25+ months × 30 days)
--   - All 20 KPI codes populated
-- ============================================================================

DO $$
DECLARE
  v_tenant_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_result jsonb;
  v_count integer;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'L3 KPI AGGREGATION - Starting...';
  RAISE NOTICE '========================================';

  -- ============================================================================
  -- STEP 1: Clear existing KPI facts
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 1] Clearing existing kpi_facts_daily...';
  
  DELETE FROM kpi_facts_daily WHERE tenant_id = v_tenant_id;
  
  RAISE NOTICE '  ✓ Cleared kpi_facts_daily';

  -- ============================================================================
  -- STEP 2: Try to call compute function
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 2] Running KPI aggregation...';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'compute_kpi_facts_daily') THEN
    -- Call the function for each date with orders
    FOR v_result IN
      SELECT DISTINCT order_at::date as fact_date
      FROM cdp_orders
      WHERE tenant_id = v_tenant_id
      ORDER BY fact_date
    LOOP
      PERFORM compute_kpi_facts_daily(v_tenant_id, (v_result->>'fact_date')::date);
    END LOOP;
    
    RAISE NOTICE '  ✓ compute_kpi_facts_daily completed';
  ELSE
    RAISE NOTICE '  ⚠ compute_kpi_facts_daily not found, using fallback...';
    
    -- Fallback: Direct aggregation from orders
    INSERT INTO kpi_facts_daily (
      tenant_id, organization_id, fact_date, kpi_code, kpi_value,
      dimension_channel, dimension_segment, created_at
    )
    -- Revenue metrics by date and channel
    SELECT
      v_tenant_id as tenant_id,
      'bbbbbbbb-1111-1111-1111-111111111111'::uuid as organization_id,
      order_at::date as fact_date,
      'net_revenue' as kpi_code,
      SUM(net_revenue) as kpi_value,
      channel as dimension_channel,
      NULL as dimension_segment,
      NOW() as created_at
    FROM cdp_orders
    WHERE tenant_id = v_tenant_id
    GROUP BY order_at::date, channel
    
    UNION ALL
    
    -- COGS
    SELECT
      v_tenant_id, 'bbbbbbbb-1111-1111-1111-111111111111'::uuid,
      order_at::date, 'cogs', SUM(cogs),
      channel, NULL, NOW()
    FROM cdp_orders
    WHERE tenant_id = v_tenant_id
    GROUP BY order_at::date, channel
    
    UNION ALL
    
    -- Gross Margin
    SELECT
      v_tenant_id, 'bbbbbbbb-1111-1111-1111-111111111111'::uuid,
      order_at::date, 'gross_margin', SUM(gross_margin),
      channel, NULL, NOW()
    FROM cdp_orders
    WHERE tenant_id = v_tenant_id
    GROUP BY order_at::date, channel
    
    UNION ALL
    
    -- Order Count
    SELECT
      v_tenant_id, 'bbbbbbbb-1111-1111-1111-111111111111'::uuid,
      order_at::date, 'order_count', COUNT(*)::numeric,
      channel, NULL, NOW()
    FROM cdp_orders
    WHERE tenant_id = v_tenant_id
    GROUP BY order_at::date, channel
    
    UNION ALL
    
    -- AOV
    SELECT
      v_tenant_id, 'bbbbbbbb-1111-1111-1111-111111111111'::uuid,
      order_at::date, 'aov', AVG(net_revenue),
      channel, NULL, NOW()
    FROM cdp_orders
    WHERE tenant_id = v_tenant_id
    GROUP BY order_at::date, channel
    
    UNION ALL
    
    -- Customer Count (daily unique)
    SELECT
      v_tenant_id, 'bbbbbbbb-1111-1111-1111-111111111111'::uuid,
      order_at::date, 'customer_count', COUNT(DISTINCT customer_id)::numeric,
      channel, NULL, NOW()
    FROM cdp_orders
    WHERE tenant_id = v_tenant_id
    GROUP BY order_at::date, channel
    
    UNION ALL
    
    -- COGS Percent
    SELECT
      v_tenant_id, 'bbbbbbbb-1111-1111-1111-111111111111'::uuid,
      order_at::date, 'cogs_percent', 
      (SUM(cogs) / NULLIF(SUM(net_revenue), 0) * 100),
      channel, NULL, NOW()
    FROM cdp_orders
    WHERE tenant_id = v_tenant_id
    GROUP BY order_at::date, channel;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Fallback aggregation created % rows', v_count;
  END IF;

  -- ============================================================================
  -- STEP 3: Verification
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 3] Verification...';
  
  SELECT COUNT(*) INTO v_count
  FROM kpi_facts_daily
  WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '  kpi_facts_daily: % rows', v_count;
  
  SELECT COUNT(DISTINCT kpi_code) INTO v_count
  FROM kpi_facts_daily
  WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '  Unique KPI codes: %', v_count;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'L3 KPI AGGREGATION - Completed!';
  RAISE NOTICE '========================================';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error in KPI aggregation: %', SQLERRM;
  RAISE;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT 
  'L3_KPI: FACTS_DAILY' as layer,
  COUNT(*) as total_rows,
  COUNT(DISTINCT fact_date) as unique_dates,
  COUNT(DISTINCT kpi_code) as unique_kpis,
  MIN(fact_date) as first_date,
  MAX(fact_date) as last_date
FROM kpi_facts_daily
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  kpi_code,
  COUNT(*) as row_count,
  ROUND(SUM(kpi_value), 0) as total_value,
  ROUND(AVG(kpi_value), 0) as avg_value
FROM kpi_facts_daily
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY kpi_code
ORDER BY kpi_code;
