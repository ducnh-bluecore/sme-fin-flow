-- =============================================
-- CROSS-MODULE DATA FLYWHEEL - WAVE 1 FOUNDATION
-- =============================================

-- =============================================
-- TABLE 1: fdp_locked_costs
-- FDP monthly locked costs for cross-module consumption
-- =============================================
CREATE TABLE IF NOT EXISTS public.fdp_locked_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Locked financial data
  total_cogs NUMERIC DEFAULT 0,
  total_platform_fees NUMERIC DEFAULT 0,
  total_marketing_spend NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  
  -- Computed percentages for easy consumption
  avg_cogs_percent NUMERIC DEFAULT 0,
  avg_fee_percent NUMERIC DEFAULT 0,
  avg_cac NUMERIC DEFAULT 0,
  
  -- Metadata
  locked_at TIMESTAMPTZ DEFAULT now(),
  locked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, year, month)
);

-- Enable RLS
ALTER TABLE public.fdp_locked_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for fdp_locked_costs"
ON public.fdp_locked_costs FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- =============================================
-- TABLE 2: cdp_customer_cohort_cac
-- MDP → CDP: Attribution data for customer CAC
-- =============================================
CREATE TABLE IF NOT EXISTS public.cdp_customer_cohort_cac (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Cohort identification
  cohort_month TEXT NOT NULL, -- Format: YYYY-MM
  acquisition_channel TEXT,
  campaign_id TEXT,
  
  -- CAC metrics from MDP
  total_spend NUMERIC DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  cac_per_customer NUMERIC DEFAULT 0,
  
  -- Source tracking
  source_module TEXT DEFAULT 'MDP',
  confidence_level TEXT DEFAULT 'OBSERVED', -- LOCKED, OBSERVED, ESTIMATED
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, cohort_month, acquisition_channel)
);

ALTER TABLE public.cdp_customer_cohort_cac ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for cdp_customer_cohort_cac"
ON public.cdp_customer_cohort_cac FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- =============================================
-- TABLE 3: cross_domain_variance_alerts  
-- Control Tower cross-module variance detection
-- =============================================
CREATE TABLE IF NOT EXISTS public.cross_domain_variance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Alert identification
  alert_type TEXT NOT NULL, -- 'REVENUE_VARIANCE', 'COST_VARIANCE', 'LTV_VARIANCE'
  source_module TEXT NOT NULL, -- 'FDP', 'MDP', 'CDP'
  target_module TEXT NOT NULL,
  
  -- Variance details
  metric_code TEXT NOT NULL,
  expected_value NUMERIC,
  actual_value NUMERIC,
  variance_percent NUMERIC,
  variance_amount NUMERIC,
  
  -- Severity and status
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'dismissed'
  
  -- Action tracking
  assigned_to UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Evidence
  evidence_snapshot JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cross_domain_variance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for cross_domain_variance_alerts"
ON public.cross_domain_variance_alerts FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- =============================================
-- TABLE 4: revenue_allocation_bridge
-- CDP → FDP: Revenue forecast bridge
-- =============================================
CREATE TABLE IF NOT EXISTS public.revenue_allocation_bridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Source scenario
  cdp_scenario_id UUID,
  cdp_scenario_name TEXT,
  
  -- Allocation data
  total_equity_12m NUMERIC DEFAULT 0,
  quarterly_weights JSONB DEFAULT '{"Q1": 0.25, "Q2": 0.25, "Q3": 0.25, "Q4": 0.25}',
  monthly_allocation JSONB, -- {month: amount}
  
  -- Target FDP
  fdp_scenario_id UUID,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'archived'
  synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.revenue_allocation_bridge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for revenue_allocation_bridge"
ON public.revenue_allocation_bridge FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- =============================================
-- TABLE 5: cross_module_revenue_forecast
-- CDP revenue projections for FDP consumption
-- =============================================
CREATE TABLE IF NOT EXISTS public.cross_module_revenue_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Forecast values
  projected_revenue NUMERIC DEFAULT 0,
  projected_orders INTEGER DEFAULT 0,
  projected_aov NUMERIC DEFAULT 0,
  
  -- Source tracking
  source_module TEXT DEFAULT 'CDP',
  source_scenario_id UUID,
  confidence_level TEXT DEFAULT 'ESTIMATED',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, year, month, source_scenario_id)
);

ALTER TABLE public.cross_module_revenue_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for cross_module_revenue_forecast"
ON public.cross_module_revenue_forecast FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- =============================================
-- FUNCTION 1: mdp_get_costs_for_roas
-- 3-Level Fallback Chain for MDP cost data
-- =============================================
CREATE OR REPLACE FUNCTION public.mdp_get_costs_for_roas(
  p_tenant_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
) RETURNS TABLE (
  cogs_percent NUMERIC,
  fee_percent NUMERIC,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- LEVEL 3: Try locked costs from FDP
  IF EXISTS (
    SELECT 1 FROM fdp_locked_costs 
    WHERE tenant_id = p_tenant_id 
    AND year = p_year AND month = p_month
  ) THEN
    RETURN QUERY
    SELECT 
      flc.avg_cogs_percent,
      flc.avg_fee_percent,
      'LOCKED'::TEXT,
      'fdp_locked_costs'::TEXT,
      TRUE
    FROM fdp_locked_costs flc
    WHERE flc.tenant_id = p_tenant_id 
    AND flc.year = p_year AND flc.month = p_month;
    RETURN;
  END IF;

  -- LEVEL 2: Try actual order data
  IF EXISTS (
    SELECT 1 FROM external_order_items eoi
    JOIN external_orders eo ON eoi.order_id = eo.id
    WHERE eo.tenant_id = p_tenant_id
    AND eoi.cogs_amount IS NOT NULL
    AND EXTRACT(YEAR FROM eo.order_date) = p_year
    AND EXTRACT(MONTH FROM eo.order_date) = p_month
    LIMIT 1
  ) THEN
    RETURN QUERY
    SELECT 
      COALESCE((SUM(eoi.cogs_amount) / NULLIF(SUM(eo.total_amount), 0) * 100), 55)::NUMERIC,
      8::NUMERIC,
      'OBSERVED'::TEXT,
      'external_order_items'::TEXT,
      FALSE
    FROM external_orders eo
    JOIN external_order_items eoi ON eoi.order_id = eo.id
    WHERE eo.tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM eo.order_date) = p_year
    AND EXTRACT(MONTH FROM eo.order_date) = p_month;
    RETURN;
  END IF;

  -- LEVEL 1: Fallback to industry benchmark
  RETURN QUERY
  SELECT 
    55::NUMERIC,
    12::NUMERIC,
    'ESTIMATED'::TEXT,
    'industry_benchmark'::TEXT,
    FALSE;
END;
$$;

-- =============================================
-- FUNCTION 2: cdp_push_revenue_to_fdp
-- Push CDP revenue forecast to FDP
-- =============================================
CREATE OR REPLACE FUNCTION public.cdp_push_revenue_to_fdp(
  p_tenant_id UUID,
  p_equity_12m NUMERIC,
  p_quarterly_weights JSONB DEFAULT '{"Q1": 0.25, "Q2": 0.25, "Q3": 0.25, "Q4": 0.25}',
  p_fdp_scenario_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bridge_id UUID;
  v_monthly_allocation JSONB := '{}';
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_q1_weight NUMERIC;
  v_q2_weight NUMERIC;
  v_q3_weight NUMERIC;
  v_q4_weight NUMERIC;
BEGIN
  -- Extract quarterly weights
  v_q1_weight := COALESCE((p_quarterly_weights->>'Q1')::NUMERIC, 0.25);
  v_q2_weight := COALESCE((p_quarterly_weights->>'Q2')::NUMERIC, 0.25);
  v_q3_weight := COALESCE((p_quarterly_weights->>'Q3')::NUMERIC, 0.25);
  v_q4_weight := COALESCE((p_quarterly_weights->>'Q4')::NUMERIC, 0.25);
  
  -- Calculate monthly allocation
  v_monthly_allocation := jsonb_build_object(
    '1', ROUND(p_equity_12m * v_q1_weight / 3),
    '2', ROUND(p_equity_12m * v_q1_weight / 3),
    '3', ROUND(p_equity_12m * v_q1_weight / 3),
    '4', ROUND(p_equity_12m * v_q2_weight / 3),
    '5', ROUND(p_equity_12m * v_q2_weight / 3),
    '6', ROUND(p_equity_12m * v_q2_weight / 3),
    '7', ROUND(p_equity_12m * v_q3_weight / 3),
    '8', ROUND(p_equity_12m * v_q3_weight / 3),
    '9', ROUND(p_equity_12m * v_q3_weight / 3),
    '10', ROUND(p_equity_12m * v_q4_weight / 3),
    '11', ROUND(p_equity_12m * v_q4_weight / 3),
    '12', ROUND(p_equity_12m * v_q4_weight / 3)
  );

  -- Insert bridge record
  INSERT INTO revenue_allocation_bridge (
    tenant_id,
    total_equity_12m,
    quarterly_weights,
    monthly_allocation,
    fdp_scenario_id,
    status,
    synced_at
  ) VALUES (
    p_tenant_id,
    p_equity_12m,
    p_quarterly_weights,
    v_monthly_allocation,
    p_fdp_scenario_id,
    'active',
    now()
  )
  RETURNING id INTO v_bridge_id;

  -- Insert monthly forecasts
  FOR i IN 1..12 LOOP
    INSERT INTO cross_module_revenue_forecast (
      tenant_id,
      year,
      month,
      projected_revenue,
      source_module,
      source_scenario_id,
      confidence_level
    ) VALUES (
      p_tenant_id,
      v_current_year,
      i,
      (v_monthly_allocation->>i::TEXT)::NUMERIC,
      'CDP',
      v_bridge_id,
      'OBSERVED'
    )
    ON CONFLICT (tenant_id, year, month, source_scenario_id)
    DO UPDATE SET
      projected_revenue = EXCLUDED.projected_revenue,
      updated_at = now();
  END LOOP;

  RETURN v_bridge_id;
END;
$$;

-- =============================================
-- FUNCTION 3: detect_cross_domain_variance
-- Detect variance between modules
-- =============================================
CREATE OR REPLACE FUNCTION public.detect_cross_domain_variance(
  p_tenant_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerts_created INTEGER := 0;
  v_fdp_revenue NUMERIC;
  v_cdp_revenue NUMERIC;
  v_variance_percent NUMERIC;
BEGIN
  -- Get FDP actual revenue (last 30 days)
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_fdp_revenue
  FROM external_orders
  WHERE tenant_id = p_tenant_id
  AND order_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Get CDP projected revenue (if exists)
  SELECT COALESCE(SUM(projected_revenue), 0)
  INTO v_cdp_revenue
  FROM cross_module_revenue_forecast
  WHERE tenant_id = p_tenant_id
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE);

  -- Check for significant variance (>20%)
  IF v_cdp_revenue > 0 THEN
    v_variance_percent := ABS((v_fdp_revenue - v_cdp_revenue) / v_cdp_revenue * 100);
    
    IF v_variance_percent > 20 THEN
      INSERT INTO cross_domain_variance_alerts (
        tenant_id,
        alert_type,
        source_module,
        target_module,
        metric_code,
        expected_value,
        actual_value,
        variance_percent,
        variance_amount,
        severity,
        evidence_snapshot
      ) VALUES (
        p_tenant_id,
        'REVENUE_VARIANCE',
        'CDP',
        'FDP',
        'NET_REVENUE',
        v_cdp_revenue,
        v_fdp_revenue,
        v_variance_percent,
        v_fdp_revenue - v_cdp_revenue,
        CASE WHEN v_variance_percent > 30 THEN 'critical' ELSE 'warning' END,
        jsonb_build_object(
          'period', TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
          'cdp_forecast', v_cdp_revenue,
          'fdp_actual', v_fdp_revenue,
          'detected_at', now()
        )
      );
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END IF;

  RETURN v_alerts_created;
END;
$$;

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_fdp_locked_costs_lookup 
ON fdp_locked_costs(tenant_id, year, month);

CREATE INDEX IF NOT EXISTS idx_cdp_cohort_cac_lookup 
ON cdp_customer_cohort_cac(tenant_id, cohort_month);

CREATE INDEX IF NOT EXISTS idx_cross_variance_alerts_active 
ON cross_domain_variance_alerts(tenant_id, status) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_revenue_forecast_lookup 
ON cross_module_revenue_forecast(tenant_id, year, month);