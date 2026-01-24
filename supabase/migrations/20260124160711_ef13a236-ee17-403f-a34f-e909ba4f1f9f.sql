-- =====================================================
-- BLUECORE METRIC GOVERNANCE LAYER
-- Single Source of Truth (SSOT) Architecture
-- =====================================================

-- 1. METRIC REGISTRY TABLE
CREATE TABLE IF NOT EXISTS public.metric_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_code text NOT NULL UNIQUE,
  metric_name text NOT NULL,
  metric_name_vi text NOT NULL,
  category text NOT NULL CHECK (category IN ('revenue', 'cost', 'margin', 'cash', 'velocity', 'risk', 'quality')),
  module text NOT NULL CHECK (module IN ('fdp', 'mdp', 'cdp', 'control_tower', 'shared')),
  formula text NOT NULL,
  source_view text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('currency', 'percent', 'days', 'count', 'ratio')),
  time_window text CHECK (time_window IN ('daily', 'weekly', 'monthly', 'rolling_30d', 'rolling_60d', 'rolling_90d', 'rolling_365d', 'lifetime')),
  precision_level int DEFAULT 2,
  is_aggregatable boolean DEFAULT true,
  requires_tenant_filter boolean DEFAULT true,
  deprecation_date date,
  replacement_metric_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.metric_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metric_registry_read_all" ON public.metric_registry;
CREATE POLICY "metric_registry_read_all" ON public.metric_registry
  FOR SELECT USING (true);

-- 2. METRIC CALCULATION LOG
CREATE TABLE IF NOT EXISTS public.metric_calculation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  metric_code text NOT NULL,
  source_location text NOT NULL,
  calculated_value numeric,
  calculation_input jsonb,
  calculated_at timestamptz DEFAULT now(),
  execution_time_ms int,
  is_cached boolean DEFAULT false,
  data_quality_score numeric(5,2)
);

ALTER TABLE public.metric_calculation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metric_calc_log_tenant" ON public.metric_calculation_log;
CREATE POLICY "metric_calc_log_tenant" ON public.metric_calculation_log
  FOR ALL USING (
    tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_metric_calc_log_tenant_metric 
  ON public.metric_calculation_log(tenant_id, metric_code, calculated_at DESC);

-- 3. SSOT VIOLATION LOG
CREATE TABLE IF NOT EXISTS public.ssot_violation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  violation_type text NOT NULL CHECK (violation_type IN (
    'client_calculation', 
    'formula_mismatch', 
    'stale_data', 
    'missing_source',
    'deprecated_metric',
    'unregistered_metric'
  )),
  metric_code text,
  source_file text,
  expected_value numeric,
  actual_value numeric,
  deviation_percent numeric,
  severity text CHECK (severity IN ('info', 'warning', 'critical')),
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text
);

ALTER TABLE public.ssot_violation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ssot_violation_tenant" ON public.ssot_violation_log;
CREATE POLICY "ssot_violation_tenant" ON public.ssot_violation_log
  FOR ALL USING (
    tenant_id IS NULL OR 
    tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid())
  );

-- 4. UNIFIED METRICS VIEW (using actual column names)
CREATE OR REPLACE VIEW v_unified_metrics AS
WITH fdp_metrics AS (
  SELECT 
    tenant_id,
    'fdp' as module,
    metric_date as metric_date,
    'FDP_TOTAL_REVENUE' as metric_code,
    SUM(total_revenue) as value
  FROM fdp_daily_metrics
  WHERE metric_date = CURRENT_DATE
  GROUP BY tenant_id, metric_date
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'fdp' as module,
    metric_date as metric_date,
    'FDP_CONTRIBUTION_MARGIN' as metric_code,
    SUM(contribution_margin) as value
  FROM fdp_daily_metrics
  WHERE metric_date = CURRENT_DATE
  GROUP BY tenant_id, metric_date
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'fdp' as module,
    metric_date as metric_date,
    'FDP_ORDER_COUNT' as metric_code,
    SUM(order_count)::numeric as value
  FROM fdp_daily_metrics
  WHERE metric_date = CURRENT_DATE
  GROUP BY tenant_id, metric_date
),
central_metrics AS (
  SELECT 
    tenant_id,
    'shared' as module,
    snapshot_at::date as metric_date,
    'NET_REVENUE' as metric_code,
    net_revenue as value
  FROM central_metrics_snapshots
  WHERE snapshot_at::date = CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'shared' as module,
    snapshot_at::date as metric_date,
    'CONTRIBUTION_MARGIN' as metric_code,
    contribution_margin as value
  FROM central_metrics_snapshots
  WHERE snapshot_at::date = CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'shared' as module,
    snapshot_at::date as metric_date,
    'EBITDA' as metric_code,
    ebitda as value
  FROM central_metrics_snapshots
  WHERE snapshot_at::date = CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    tenant_id,
    'shared' as module,
    snapshot_at::date as metric_date,
    'CASH_TODAY' as metric_code,
    cash_today as value
  FROM central_metrics_snapshots
  WHERE snapshot_at::date = CURRENT_DATE
),
cdp_metrics AS (
  SELECT 
    o.tenant_id,
    'cdp' as module,
    CURRENT_DATE as metric_date,
    'CDP_NET_REVENUE_365D' as metric_code,
    SUM(o.net_revenue) as value
  FROM cdp_orders o
  WHERE o.order_at >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY o.tenant_id
  
  UNION ALL
  
  SELECT 
    o.tenant_id,
    'cdp' as module,
    CURRENT_DATE as metric_date,
    'CDP_ORDER_COUNT_365D' as metric_code,
    COUNT(*)::numeric as value
  FROM cdp_orders o
  WHERE o.order_at >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY o.tenant_id
  
  UNION ALL
  
  SELECT 
    o.tenant_id,
    'cdp' as module,
    CURRENT_DATE as metric_date,
    'CDP_AVG_ORDER_VALUE' as metric_code,
    CASE WHEN COUNT(*) > 0 THEN SUM(o.net_revenue) / COUNT(*) ELSE 0 END as value
  FROM cdp_orders o
  WHERE o.order_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY o.tenant_id
  
  UNION ALL
  
  SELECT 
    o.tenant_id,
    'cdp' as module,
    CURRENT_DATE as metric_date,
    'CDP_CUSTOMER_COUNT' as metric_code,
    COUNT(DISTINCT o.customer_id)::numeric as value
  FROM cdp_orders o
  WHERE o.order_at >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY o.tenant_id
)
SELECT * FROM fdp_metrics
UNION ALL
SELECT * FROM central_metrics
UNION ALL
SELECT * FROM cdp_metrics;

-- 5. METRIC CONSISTENCY CHECK FUNCTION
CREATE OR REPLACE FUNCTION check_metric_consistency(p_tenant_id uuid)
RETURNS TABLE (
  metric_pair text,
  source_a text,
  value_a numeric,
  source_b text,
  value_b numeric,
  deviation_percent numeric,
  status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH fdp AS (
    SELECT SUM(total_revenue) as total_revenue, SUM(contribution_margin) as contribution_margin
    FROM fdp_daily_metrics
    WHERE tenant_id = p_tenant_id AND metric_date = CURRENT_DATE
  ),
  central AS (
    SELECT net_revenue, contribution_margin
    FROM central_metrics_snapshots
    WHERE tenant_id = p_tenant_id AND snapshot_at::date = CURRENT_DATE
    ORDER BY snapshot_at DESC
    LIMIT 1
  ),
  cdp_30d AS (
    SELECT SUM(net_revenue) as total_revenue
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id AND order_at >= CURRENT_DATE - INTERVAL '30 days'
  )
  -- FDP vs Central comparison
  SELECT 
    'FDP vs Central Revenue'::text as metric_pair,
    'fdp_daily_metrics'::text as source_a,
    COALESCE(fdp.total_revenue, 0) as value_a,
    'central_metrics_snapshots'::text as source_b,
    COALESCE(central.net_revenue, 0) as value_b,
    CASE 
      WHEN GREATEST(COALESCE(fdp.total_revenue, 0), COALESCE(central.net_revenue, 0)) = 0 THEN 0
      ELSE ROUND(ABS(COALESCE(fdp.total_revenue, 0) - COALESCE(central.net_revenue, 0)) / GREATEST(fdp.total_revenue, central.net_revenue) * 100, 2)
    END as deviation_percent,
    CASE 
      WHEN COALESCE(fdp.total_revenue, 0) = 0 AND COALESCE(central.net_revenue, 0) = 0 THEN 'NO_DATA'
      WHEN ABS(COALESCE(fdp.total_revenue, 0) - COALESCE(central.net_revenue, 0)) / NULLIF(GREATEST(fdp.total_revenue, central.net_revenue), 0) * 100 > 5 
      THEN 'MISMATCH'
      ELSE 'OK'
    END as status
  FROM fdp, central
  
  UNION ALL
  
  -- FDP vs CDP (30d) comparison  
  SELECT 
    'FDP vs CDP Revenue (30d)'::text,
    'fdp_daily_metrics'::text,
    COALESCE(fdp.total_revenue, 0),
    'cdp_orders (30d)'::text,
    COALESCE(cdp_30d.total_revenue, 0),
    CASE 
      WHEN GREATEST(COALESCE(fdp.total_revenue, 0), COALESCE(cdp_30d.total_revenue, 0)) = 0 THEN 0
      ELSE ROUND(ABS(COALESCE(fdp.total_revenue, 0) - COALESCE(cdp_30d.total_revenue, 0)) / GREATEST(fdp.total_revenue, cdp_30d.total_revenue) * 100, 2)
    END,
    CASE 
      WHEN COALESCE(fdp.total_revenue, 0) = 0 AND COALESCE(cdp_30d.total_revenue, 0) = 0 THEN 'NO_DATA'
      WHEN ABS(COALESCE(fdp.total_revenue, 0) - COALESCE(cdp_30d.total_revenue, 0)) / NULLIF(GREATEST(fdp.total_revenue, cdp_30d.total_revenue), 0) * 100 > 10 
      THEN 'MISMATCH'
      ELSE 'OK'
    END
  FROM fdp, cdp_30d;
END;
$$;

-- 6. SEED CORE METRICS INTO REGISTRY
INSERT INTO metric_registry (metric_code, metric_name, metric_name_vi, category, module, formula, source_view, unit, time_window) VALUES
('NET_REVENUE', 'Net Revenue', 'Doanh thu thuần', 'revenue', 'shared', 'gross_revenue - discounts - returns', 'central_metrics_snapshots', 'currency', 'daily'),
('FDP_TOTAL_REVENUE', 'FDP Total Revenue', 'Tổng DT theo FDP', 'revenue', 'fdp', 'SUM(total_revenue) by channel', 'fdp_daily_metrics', 'currency', 'daily'),
('FDP_CONTRIBUTION_MARGIN', 'FDP CM', 'CM theo FDP', 'margin', 'fdp', 'SUM(contribution_margin)', 'fdp_daily_metrics', 'currency', 'daily'),
('CONTRIBUTION_MARGIN', 'Contribution Margin', 'Lợi nhuận đóng góp', 'margin', 'shared', 'gross_profit - variable_costs', 'central_metrics_snapshots', 'currency', 'daily'),
('EBITDA', 'EBITDA', 'EBITDA', 'margin', 'shared', 'contribution_margin - fixed_costs', 'central_metrics_snapshots', 'currency', 'daily'),
('CASH_TODAY', 'Cash Position', 'Tiền mặt hiện tại', 'cash', 'shared', 'bank_balance + pending - payables', 'central_metrics_snapshots', 'currency', 'daily'),
('CDP_NET_REVENUE_365D', 'CDP Revenue 365d', 'DT thuần CDP 365 ngày', 'revenue', 'cdp', 'SUM(net_revenue) WHERE 365d', 'cdp_orders', 'currency', 'rolling_365d'),
('CDP_ORDER_COUNT_365D', 'CDP Orders 365d', 'Số đơn CDP 365 ngày', 'velocity', 'cdp', 'COUNT(*) WHERE 365d', 'cdp_orders', 'count', 'rolling_365d'),
('CDP_AVG_ORDER_VALUE', 'CDP AOV', 'Giá trị đơn TB', 'velocity', 'cdp', 'SUM(revenue)/COUNT(*) WHERE 90d', 'cdp_orders', 'currency', 'rolling_90d'),
('CDP_CUSTOMER_COUNT', 'Total Customers', 'Tổng khách hàng', 'velocity', 'cdp', 'COUNT(DISTINCT customer_id)', 'cdp_orders', 'count', 'rolling_365d')
ON CONFLICT (metric_code) DO UPDATE SET
  formula = EXCLUDED.formula,
  source_view = EXCLUDED.source_view,
  updated_at = now();

-- 7. GOVERNANCE DASHBOARD VIEW
CREATE OR REPLACE VIEW v_governance_dashboard AS
SELECT 
  mr.module,
  mr.category,
  COUNT(*) as total_metrics,
  COUNT(*) FILTER (WHERE mr.deprecation_date IS NOT NULL) as deprecated_metrics,
  COUNT(DISTINCT svl.id) FILTER (WHERE svl.detected_at >= CURRENT_DATE - INTERVAL '7 days') as violations_7d,
  COUNT(DISTINCT svl.id) FILTER (WHERE svl.severity = 'critical' AND svl.resolved_at IS NULL) as critical_unresolved
FROM metric_registry mr
LEFT JOIN ssot_violation_log svl ON svl.metric_code = mr.metric_code
GROUP BY mr.module, mr.category
ORDER BY mr.module, mr.category;

-- 8. Helper function to get metric value
CREATE OR REPLACE FUNCTION get_metric_value(
  p_tenant_id uuid,
  p_metric_code text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value numeric;
BEGIN
  SELECT value INTO v_value
  FROM v_unified_metrics
  WHERE tenant_id = p_tenant_id 
    AND metric_code = p_metric_code
    AND metric_date = p_date
  LIMIT 1;
  
  RETURN COALESCE(v_value, 0);
END;
$$;