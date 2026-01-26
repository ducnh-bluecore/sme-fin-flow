-- =====================================================
-- FINAL WAVE: Complete remaining cases (3 & 7)
-- =====================================================

-- =====================================================
-- CASE 3: CDP → MDP: Segment LTV → Budget Allocation
-- =====================================================

-- Table to store segment LTV data from CDP for MDP budget targeting
CREATE TABLE IF NOT EXISTS public.cdp_segment_ltv_for_mdp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  segment_id UUID, -- Reference to cdp_segments if applicable
  segment_name TEXT NOT NULL,
  segment_type TEXT DEFAULT 'tier', -- 'tier', 'rfm', 'custom', 'cohort'
  customer_count INTEGER DEFAULT 0,
  avg_ltv DECIMAL(15,2) DEFAULT 0,
  total_equity DECIMAL(15,2) DEFAULT 0,
  avg_order_value DECIMAL(15,2) DEFAULT 0,
  avg_order_frequency DECIMAL(10,4) DEFAULT 0,
  churn_rate DECIMAL(5,4) DEFAULT 0,
  recommended_cac_ceiling DECIMAL(15,2), -- Max CAC to stay profitable
  ltv_cac_target_ratio DECIMAL(5,2) DEFAULT 3.0,
  priority_score INTEGER DEFAULT 50, -- 0-100, higher = more priority for budget
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, segment_name, valid_from)
);

-- Enable RLS
ALTER TABLE public.cdp_segment_ltv_for_mdp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for cdp_segment_ltv_for_mdp"
  ON public.cdp_segment_ltv_for_mdp FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Index
CREATE INDEX IF NOT EXISTS idx_cdp_segment_ltv_tenant 
  ON public.cdp_segment_ltv_for_mdp(tenant_id, valid_from DESC);

-- Function to push segment LTV from CDP to MDP
CREATE OR REPLACE FUNCTION public.cdp_push_segment_ltv_to_mdp(
  p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Insert/update segment LTV data from CDP equity computed
  INSERT INTO cdp_segment_ltv_for_mdp (
    tenant_id, segment_name, segment_type, customer_count,
    avg_ltv, total_equity, avg_order_value, avg_order_frequency,
    recommended_cac_ceiling, priority_score, valid_from
  )
  SELECT 
    p_tenant_id,
    COALESCE(ce.value_tier, 'unknown'),
    'tier',
    COUNT(*)::INTEGER,
    COALESCE(AVG(ce.equity_12m), 0),
    COALESCE(SUM(ce.equity_12m), 0),
    COALESCE(AVG(ce.aov), 0),
    COALESCE(AVG(ce.frequency), 0),
    -- CAC ceiling = LTV / target ratio (3:1)
    COALESCE(AVG(ce.equity_12m), 0) / 3.0,
    -- Priority based on tier
    CASE ce.value_tier
      WHEN 'platinum' THEN 95
      WHEN 'gold' THEN 80
      WHEN 'silver' THEN 60
      WHEN 'bronze' THEN 40
      ELSE 30
    END,
    CURRENT_DATE
  FROM cdp_customer_equity_computed ce
  WHERE ce.tenant_id = p_tenant_id
    AND ce.equity_12m IS NOT NULL
  GROUP BY ce.value_tier
  ON CONFLICT (tenant_id, segment_name, valid_from)
  DO UPDATE SET
    customer_count = EXCLUDED.customer_count,
    avg_ltv = EXCLUDED.avg_ltv,
    total_equity = EXCLUDED.total_equity,
    avg_order_value = EXCLUDED.avg_order_value,
    avg_order_frequency = EXCLUDED.avg_order_frequency,
    recommended_cac_ceiling = EXCLUDED.recommended_cac_ceiling,
    priority_score = EXCLUDED.priority_score,
    synced_at = now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function for MDP to get segment LTV with fallback
CREATE OR REPLACE FUNCTION public.mdp_get_segment_ltv(
  p_tenant_id UUID,
  p_segment_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  segment_name TEXT,
  segment_type TEXT,
  customer_count INTEGER,
  avg_ltv DECIMAL,
  total_equity DECIMAL,
  recommended_cac_ceiling DECIMAL,
  priority_score INTEGER,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- LEVEL 3: Get CDP cross-module data
  RETURN QUERY
  SELECT 
    sl.segment_name,
    sl.segment_type,
    sl.customer_count,
    sl.avg_ltv,
    sl.total_equity,
    sl.recommended_cac_ceiling,
    sl.priority_score,
    CASE 
      WHEN sl.customer_count >= 100 THEN 'LOCKED'
      WHEN sl.customer_count >= 20 THEN 'OBSERVED'
      ELSE 'ESTIMATED'
    END::TEXT,
    'cdp_segment_ltv_for_mdp'::TEXT,
    TRUE
  FROM cdp_segment_ltv_for_mdp sl
  WHERE sl.tenant_id = p_tenant_id
    AND sl.valid_from = (
      SELECT MAX(valid_from) FROM cdp_segment_ltv_for_mdp 
      WHERE tenant_id = p_tenant_id
    )
    AND (p_segment_type IS NULL OR sl.segment_type = p_segment_type)
  ORDER BY sl.priority_score DESC;
  
  IF NOT FOUND THEN
    -- LEVEL 1: Return default segments with estimated values
    RETURN QUERY
    SELECT 
      tier_name::TEXT,
      'tier'::TEXT,
      0::INTEGER,
      default_ltv::DECIMAL,
      0::DECIMAL,
      (default_ltv / 3.0)::DECIMAL,
      priority::INTEGER,
      'ESTIMATED'::TEXT,
      'industry_benchmark'::TEXT,
      FALSE
    FROM (VALUES 
      ('platinum', 10000000, 95),
      ('gold', 5000000, 80),
      ('silver', 2000000, 60),
      ('bronze', 500000, 40)
    ) AS defaults(tier_name, default_ltv, priority);
  END IF;
END;
$$;

-- =====================================================
-- CASE 7: FDP → CDP: Actual Revenue → Equity Recalibration
-- =====================================================

-- Table to store FDP actual revenue for CDP recalibration
CREATE TABLE IF NOT EXISTS public.fdp_actual_revenue_for_cdp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  actual_net_revenue DECIMAL(15,2) NOT NULL,
  actual_gross_revenue DECIMAL(15,2),
  actual_cogs DECIMAL(15,2),
  actual_contribution_margin DECIMAL(15,2),
  actual_order_count INTEGER,
  actual_customer_count INTEGER,
  forecast_variance_percent DECIMAL(5,2), -- vs CDP forecast
  variance_reason TEXT,
  is_finalized BOOLEAN DEFAULT FALSE,
  finalized_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_year, period_month)
);

-- Enable RLS
ALTER TABLE public.fdp_actual_revenue_for_cdp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for fdp_actual_revenue_for_cdp"
  ON public.fdp_actual_revenue_for_cdp FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Index
CREATE INDEX IF NOT EXISTS idx_fdp_actual_revenue_tenant_period 
  ON public.fdp_actual_revenue_for_cdp(tenant_id, period_year DESC, period_month DESC);

-- Function for FDP to push actual revenue to CDP
CREATE OR REPLACE FUNCTION public.fdp_push_actual_revenue_to_cdp(
  p_tenant_id UUID,
  p_year INTEGER,
  p_month INTEGER,
  p_net_revenue DECIMAL,
  p_gross_revenue DECIMAL DEFAULT NULL,
  p_cogs DECIMAL DEFAULT NULL,
  p_contribution_margin DECIMAL DEFAULT NULL,
  p_order_count INTEGER DEFAULT NULL,
  p_customer_count INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_forecast_revenue DECIMAL;
  v_variance DECIMAL;
BEGIN
  -- Get CDP forecast for this period to calculate variance
  SELECT projected_revenue INTO v_forecast_revenue
  FROM cross_module_revenue_forecast
  WHERE tenant_id = p_tenant_id
    AND year = p_year
    AND month = p_month
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate variance if forecast exists
  IF v_forecast_revenue IS NOT NULL AND v_forecast_revenue > 0 THEN
    v_variance := ((p_net_revenue - v_forecast_revenue) / v_forecast_revenue) * 100;
  END IF;
  
  INSERT INTO fdp_actual_revenue_for_cdp (
    tenant_id, period_year, period_month,
    actual_net_revenue, actual_gross_revenue, actual_cogs,
    actual_contribution_margin, actual_order_count, actual_customer_count,
    forecast_variance_percent
  )
  VALUES (
    p_tenant_id, p_year, p_month,
    p_net_revenue, p_gross_revenue, p_cogs,
    p_contribution_margin, p_order_count, p_customer_count,
    v_variance
  )
  ON CONFLICT (tenant_id, period_year, period_month)
  DO UPDATE SET
    actual_net_revenue = EXCLUDED.actual_net_revenue,
    actual_gross_revenue = EXCLUDED.actual_gross_revenue,
    actual_cogs = EXCLUDED.actual_cogs,
    actual_contribution_margin = EXCLUDED.actual_contribution_margin,
    actual_order_count = EXCLUDED.actual_order_count,
    actual_customer_count = EXCLUDED.actual_customer_count,
    forecast_variance_percent = v_variance,
    synced_at = now()
  RETURNING id INTO v_id;
  
  -- Log calibration event if variance is significant (>10%)
  IF ABS(COALESCE(v_variance, 0)) > 10 THEN
    INSERT INTO cdp_equity_calibration_log (
      tenant_id, calibration_type, calibration_reason,
      old_value, new_value, variance_percent, source_module
    )
    VALUES (
      p_tenant_id, 'revenue_actual', 
      'FDP actual revenue differs from CDP forecast by ' || ROUND(v_variance, 1) || '%',
      v_forecast_revenue, p_net_revenue, v_variance, 'FDP'
    );
  END IF;
  
  RETURN v_id;
END;
$$;

-- Function for CDP to get actual revenue for recalibration
CREATE OR REPLACE FUNCTION public.cdp_get_actual_revenue_for_calibration(
  p_tenant_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
  period_year INTEGER,
  period_month INTEGER,
  actual_revenue DECIMAL,
  actual_margin DECIMAL,
  forecast_variance_percent DECIMAL,
  is_finalized BOOLEAN,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- LEVEL 3: Get FDP actual data
  RETURN QUERY
  SELECT 
    ar.period_year,
    ar.period_month,
    ar.actual_net_revenue,
    ar.actual_contribution_margin,
    ar.forecast_variance_percent,
    ar.is_finalized,
    CASE 
      WHEN ar.is_finalized THEN 'LOCKED'
      ELSE 'OBSERVED'
    END::TEXT,
    'fdp_actual_revenue_for_cdp'::TEXT,
    TRUE
  FROM fdp_actual_revenue_for_cdp ar
  WHERE ar.tenant_id = p_tenant_id
    AND (p_year IS NULL OR ar.period_year = p_year)
    AND (p_month IS NULL OR ar.period_month = p_month)
  ORDER BY ar.period_year DESC, ar.period_month DESC;
  
  IF NOT FOUND THEN
    -- LEVEL 1: Return empty with estimated flag
    RETURN QUERY
    SELECT 
      COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
      COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER),
      NULL::DECIMAL,
      NULL::DECIMAL,
      NULL::DECIMAL,
      FALSE,
      'ESTIMATED'::TEXT,
      'no_fdp_data'::TEXT,
      FALSE;
  END IF;
END;
$$;

-- =====================================================
-- ORCHESTRATION: Master sync function
-- =====================================================

CREATE OR REPLACE FUNCTION public.cross_module_run_daily_sync(
  p_tenant_id UUID
)
RETURNS TABLE (
  sync_step TEXT,
  records_affected INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Step 1: CDP → MDP: Push segment LTV
  SELECT cdp_push_segment_ltv_to_mdp(p_tenant_id) INTO v_count;
  sync_step := 'cdp_segment_ltv_to_mdp';
  records_affected := v_count;
  status := 'success';
  RETURN NEXT;
  
  -- Step 2: CDP → MDP: Generate churn signals
  SELECT cdp_generate_churn_signals(p_tenant_id) INTO v_count;
  sync_step := 'cdp_churn_signals';
  records_affected := v_count;
  status := 'success';
  RETURN NEXT;
  
  -- Step 3: Control Tower: Aggregate signals
  SELECT control_tower_aggregate_signals(p_tenant_id) INTO v_count;
  sync_step := 'control_tower_signals';
  records_affected := v_count;
  status := 'success';
  RETURN NEXT;
  
  -- Step 4: Detect cross-domain variances
  SELECT detect_cross_domain_variance(p_tenant_id) INTO v_count;
  sync_step := 'variance_detection';
  records_affected := v_count;
  status := 'success';
  RETURN NEXT;
  
EXCEPTION WHEN OTHERS THEN
  sync_step := 'error';
  records_affected := 0;
  status := SQLERRM;
  RETURN NEXT;
END;
$$;