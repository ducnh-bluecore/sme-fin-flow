-- =====================================================
-- WAVE 3: ENHANCEMENT FLOWS
-- Cases 4, 6, 9, 10
-- =====================================================

-- =====================================================
-- CASE 4: CDP → MDP: Churn Signal → Retention Campaign
-- =====================================================

-- Table to store churn signals from CDP for MDP consumption
CREATE TABLE IF NOT EXISTS public.cdp_churn_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  customer_segment TEXT,
  churn_probability DECIMAL(5,4), -- 0.0000 to 1.0000
  days_since_last_purchase INTEGER,
  ltv_at_risk DECIMAL(15,2),
  recommended_action TEXT, -- 'WINBACK', 'RETENTION', 'VIP_SAVE'
  urgency_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  signal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  consumed_by_mdp BOOLEAN DEFAULT FALSE,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cdp_churn_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for cdp_churn_signals"
  ON public.cdp_churn_signals FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_cdp_churn_signals_tenant_date 
  ON public.cdp_churn_signals(tenant_id, signal_date DESC);
CREATE INDEX IF NOT EXISTS idx_cdp_churn_signals_unconsumed 
  ON public.cdp_churn_signals(tenant_id, consumed_by_mdp) WHERE consumed_by_mdp = FALSE;

-- Function to generate churn signals from CDP data
CREATE OR REPLACE FUNCTION public.cdp_generate_churn_signals(
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
  -- Insert churn signals based on customer equity data
  INSERT INTO cdp_churn_signals (
    tenant_id, customer_id, customer_segment, churn_probability,
    days_since_last_purchase, ltv_at_risk, recommended_action, urgency_level, signal_date
  )
  SELECT 
    p_tenant_id,
    ce.customer_id,
    COALESCE(ce.value_tier, 'unknown'),
    -- Calculate churn probability based on recency
    CASE 
      WHEN ce.recency_days > 180 THEN 0.85
      WHEN ce.recency_days > 90 THEN 0.60
      WHEN ce.recency_days > 60 THEN 0.40
      WHEN ce.recency_days > 30 THEN 0.20
      ELSE 0.05
    END,
    ce.recency_days,
    COALESCE(ce.equity_12m, 0),
    -- Recommended action based on tier and recency
    CASE 
      WHEN ce.value_tier IN ('platinum', 'gold') AND ce.recency_days > 60 THEN 'VIP_SAVE'
      WHEN ce.recency_days > 90 THEN 'WINBACK'
      ELSE 'RETENTION'
    END,
    -- Urgency based on value and recency
    CASE 
      WHEN ce.value_tier IN ('platinum', 'gold') AND ce.recency_days > 60 THEN 'critical'
      WHEN ce.equity_12m > 5000000 AND ce.recency_days > 45 THEN 'high'
      WHEN ce.recency_days > 90 THEN 'high'
      WHEN ce.recency_days > 60 THEN 'medium'
      ELSE 'low'
    END,
    CURRENT_DATE
  FROM cdp_customer_equity_computed ce
  WHERE ce.tenant_id = p_tenant_id
    AND ce.recency_days > 30 -- Only customers showing churn signals
    AND NOT EXISTS (
      -- Don't duplicate signals for same customer on same date
      SELECT 1 FROM cdp_churn_signals cs
      WHERE cs.tenant_id = p_tenant_id
        AND cs.customer_id = ce.customer_id
        AND cs.signal_date = CURRENT_DATE
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function for MDP to consume churn signals
CREATE OR REPLACE FUNCTION public.mdp_get_churn_signals(
  p_tenant_id UUID,
  p_min_urgency TEXT DEFAULT 'low'
)
RETURNS TABLE (
  signal_id UUID,
  customer_id TEXT,
  customer_segment TEXT,
  churn_probability DECIMAL,
  days_inactive INTEGER,
  ltv_at_risk DECIMAL,
  recommended_action TEXT,
  urgency_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.customer_id,
    cs.customer_segment,
    cs.churn_probability,
    cs.days_since_last_purchase,
    cs.ltv_at_risk,
    cs.recommended_action,
    cs.urgency_level
  FROM cdp_churn_signals cs
  WHERE cs.tenant_id = p_tenant_id
    AND cs.consumed_by_mdp = FALSE
    AND cs.urgency_level >= p_min_urgency
  ORDER BY 
    CASE cs.urgency_level 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      ELSE 4 
    END,
    cs.ltv_at_risk DESC;
END;
$$;

-- =====================================================
-- CASE 6: MDP → CDP: New Customer Source → Tagging
-- =====================================================

-- Table to store new customer acquisition source from MDP
CREATE TABLE IF NOT EXISTS public.mdp_customer_acquisition_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  first_order_id TEXT,
  acquisition_channel TEXT NOT NULL, -- 'facebook', 'google', 'tiktok', 'organic', etc.
  campaign_id TEXT,
  campaign_name TEXT,
  ad_group_id TEXT,
  acquisition_cost DECIMAL(15,2),
  acquisition_date DATE NOT NULL,
  synced_to_cdp BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.mdp_customer_acquisition_source ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for mdp_customer_acquisition_source"
  ON public.mdp_customer_acquisition_source FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Index
CREATE INDEX IF NOT EXISTS idx_mdp_customer_acq_tenant 
  ON public.mdp_customer_acquisition_source(tenant_id, acquisition_date DESC);

-- Function to push acquisition source to CDP
CREATE OR REPLACE FUNCTION public.mdp_push_acquisition_to_cdp(
  p_tenant_id UUID,
  p_customer_id TEXT,
  p_channel TEXT,
  p_campaign_id TEXT DEFAULT NULL,
  p_campaign_name TEXT DEFAULT NULL,
  p_acquisition_cost DECIMAL DEFAULT NULL,
  p_acquisition_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO mdp_customer_acquisition_source (
    tenant_id, customer_id, acquisition_channel, campaign_id, 
    campaign_name, acquisition_cost, acquisition_date, synced_to_cdp, synced_at
  )
  VALUES (
    p_tenant_id, p_customer_id, p_channel, p_campaign_id,
    p_campaign_name, p_acquisition_cost, p_acquisition_date, TRUE, now()
  )
  ON CONFLICT (tenant_id, customer_id) 
  DO UPDATE SET
    acquisition_channel = EXCLUDED.acquisition_channel,
    campaign_id = EXCLUDED.campaign_id,
    campaign_name = EXCLUDED.campaign_name,
    acquisition_cost = EXCLUDED.acquisition_cost,
    synced_to_cdp = TRUE,
    synced_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function for CDP to get acquisition source with fallback
CREATE OR REPLACE FUNCTION public.cdp_get_customer_acquisition_source(
  p_tenant_id UUID,
  p_customer_id TEXT
)
RETURNS TABLE (
  acquisition_channel TEXT,
  campaign_name TEXT,
  acquisition_cost DECIMAL,
  acquisition_date DATE,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- LEVEL 3: Try MDP cross-module data first
  RETURN QUERY
  SELECT 
    mas.acquisition_channel,
    mas.campaign_name,
    mas.acquisition_cost,
    mas.acquisition_date,
    'LOCKED'::TEXT as confidence_level,
    'mdp_customer_acquisition_source'::TEXT as data_source,
    TRUE as is_cross_module
  FROM mdp_customer_acquisition_source mas
  WHERE mas.tenant_id = p_tenant_id
    AND mas.customer_id = p_customer_id
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- LEVEL 2: Try to derive from first order
  RETURN QUERY
  SELECT 
    COALESCE(o.source_name, 'unknown')::TEXT,
    NULL::TEXT,
    NULL::DECIMAL,
    o.order_date::DATE,
    'OBSERVED'::TEXT,
    'cdp_orders'::TEXT,
    FALSE
  FROM cdp_orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.customer_id = p_customer_id
  ORDER BY o.order_date ASC
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- LEVEL 1: Return unknown with estimated flag
  RETURN QUERY
  SELECT 
    'unknown'::TEXT,
    NULL::TEXT,
    NULL::DECIMAL,
    NULL::DATE,
    'ESTIMATED'::TEXT,
    'fallback'::TEXT,
    FALSE;
END;
$$;

-- =====================================================
-- CASE 9: MDP → FDP: Seasonal Patterns → Revenue Forecast
-- =====================================================

-- Table to store seasonal patterns detected by MDP
CREATE TABLE IF NOT EXISTS public.mdp_seasonal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'monthly', 'weekly', 'event', 'campaign'
  period_key TEXT NOT NULL, -- e.g., '01' for January, 'tet', 'black_friday'
  revenue_multiplier DECIMAL(5,2) DEFAULT 1.00, -- e.g., 1.5 = 50% higher
  order_multiplier DECIMAL(5,2) DEFAULT 1.00,
  confidence_score DECIMAL(5,2) DEFAULT 0.50,
  sample_size INTEGER DEFAULT 0,
  analysis_period_start DATE,
  analysis_period_end DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, pattern_type, period_key)
);

-- Enable RLS
ALTER TABLE public.mdp_seasonal_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for mdp_seasonal_patterns"
  ON public.mdp_seasonal_patterns FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Function to push seasonal pattern to FDP
CREATE OR REPLACE FUNCTION public.mdp_push_seasonal_to_fdp(
  p_tenant_id UUID,
  p_pattern_type TEXT,
  p_period_key TEXT,
  p_revenue_multiplier DECIMAL,
  p_order_multiplier DECIMAL DEFAULT 1.00,
  p_confidence_score DECIMAL DEFAULT 0.50,
  p_sample_size INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO mdp_seasonal_patterns (
    tenant_id, pattern_type, period_key, revenue_multiplier,
    order_multiplier, confidence_score, sample_size,
    analysis_period_start, analysis_period_end
  )
  VALUES (
    p_tenant_id, p_pattern_type, p_period_key, p_revenue_multiplier,
    p_order_multiplier, p_confidence_score, p_sample_size,
    CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE
  )
  ON CONFLICT (tenant_id, pattern_type, period_key)
  DO UPDATE SET
    revenue_multiplier = EXCLUDED.revenue_multiplier,
    order_multiplier = EXCLUDED.order_multiplier,
    confidence_score = EXCLUDED.confidence_score,
    sample_size = EXCLUDED.sample_size,
    analysis_period_end = CURRENT_DATE,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function for FDP to get seasonal adjustments
CREATE OR REPLACE FUNCTION public.fdp_get_seasonal_adjustments(
  p_tenant_id UUID,
  p_target_month INTEGER -- 1-12
)
RETURNS TABLE (
  pattern_type TEXT,
  period_key TEXT,
  revenue_multiplier DECIMAL,
  order_multiplier DECIMAL,
  confidence_score DECIMAL,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- LEVEL 3: Get MDP patterns
  RETURN QUERY
  SELECT 
    sp.pattern_type,
    sp.period_key,
    sp.revenue_multiplier,
    sp.order_multiplier,
    sp.confidence_score,
    CASE 
      WHEN sp.sample_size >= 100 AND sp.confidence_score >= 0.7 THEN 'LOCKED'
      WHEN sp.sample_size >= 30 THEN 'OBSERVED'
      ELSE 'ESTIMATED'
    END::TEXT,
    'mdp_seasonal_patterns'::TEXT,
    TRUE
  FROM mdp_seasonal_patterns sp
  WHERE sp.tenant_id = p_tenant_id
    AND sp.is_active = TRUE
    AND (
      (sp.pattern_type = 'monthly' AND sp.period_key = LPAD(p_target_month::TEXT, 2, '0'))
      OR sp.pattern_type IN ('event', 'campaign')
    );
  
  IF NOT FOUND THEN
    -- LEVEL 1: Return default (no adjustment)
    RETURN QUERY
    SELECT 
      'default'::TEXT,
      LPAD(p_target_month::TEXT, 2, '0')::TEXT,
      1.00::DECIMAL,
      1.00::DECIMAL,
      0.30::DECIMAL,
      'ESTIMATED'::TEXT,
      'fallback'::TEXT,
      FALSE;
  END IF;
END;
$$;

-- =====================================================
-- CASE 10: MDP → FDP: Channel ROI → Budget Reallocation
-- =====================================================

-- Table to store channel ROI data from MDP
CREATE TABLE IF NOT EXISTS public.mdp_channel_roi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'facebook', 'google', 'tiktok', etc.
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_spend DECIMAL(15,2) DEFAULT 0,
  attributed_revenue DECIMAL(15,2) DEFAULT 0,
  attributed_orders INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  roas DECIMAL(10,4), -- Return on Ad Spend
  profit_roas DECIMAL(10,4), -- After COGS/fees
  contribution_margin DECIMAL(15,2),
  cac DECIMAL(15,2), -- Customer Acquisition Cost
  recommended_budget_change DECIMAL(5,2), -- e.g., 1.2 = increase 20%
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, channel, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.mdp_channel_roi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for mdp_channel_roi"
  ON public.mdp_channel_roi FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Index
CREATE INDEX IF NOT EXISTS idx_mdp_channel_roi_tenant_period 
  ON public.mdp_channel_roi(tenant_id, period_end DESC);

-- Function to push channel ROI to FDP
CREATE OR REPLACE FUNCTION public.mdp_push_channel_roi_to_fdp(
  p_tenant_id UUID,
  p_channel TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_total_spend DECIMAL,
  p_attributed_revenue DECIMAL,
  p_attributed_orders INTEGER,
  p_new_customers INTEGER,
  p_profit_roas DECIMAL DEFAULT NULL,
  p_contribution_margin DECIMAL DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_roas DECIMAL;
  v_cac DECIMAL;
  v_budget_change DECIMAL;
  v_reason TEXT;
BEGIN
  -- Calculate ROAS
  v_roas := CASE WHEN p_total_spend > 0 THEN p_attributed_revenue / p_total_spend ELSE 0 END;
  
  -- Calculate CAC
  v_cac := CASE WHEN p_new_customers > 0 THEN p_total_spend / p_new_customers ELSE NULL END;
  
  -- Determine budget recommendation
  IF p_profit_roas IS NOT NULL THEN
    IF p_profit_roas >= 3.0 THEN
      v_budget_change := 1.30; -- Increase 30%
      v_reason := 'High profit ROAS - scale aggressively';
    ELSIF p_profit_roas >= 2.0 THEN
      v_budget_change := 1.15; -- Increase 15%
      v_reason := 'Good profit ROAS - scale moderately';
    ELSIF p_profit_roas >= 1.0 THEN
      v_budget_change := 1.00; -- Maintain
      v_reason := 'Breakeven profit ROAS - maintain and optimize';
    ELSIF p_profit_roas >= 0.5 THEN
      v_budget_change := 0.70; -- Reduce 30%
      v_reason := 'Low profit ROAS - reduce and test';
    ELSE
      v_budget_change := 0.00; -- Stop
      v_reason := 'Negative profit ROAS - pause immediately';
    END IF;
  ELSE
    -- Use ROAS if profit ROAS not available
    IF v_roas >= 5.0 THEN
      v_budget_change := 1.20;
      v_reason := 'High ROAS - consider scaling';
    ELSIF v_roas >= 3.0 THEN
      v_budget_change := 1.00;
      v_reason := 'Moderate ROAS - maintain';
    ELSE
      v_budget_change := 0.80;
      v_reason := 'Low ROAS - needs review';
    END IF;
  END IF;
  
  INSERT INTO mdp_channel_roi (
    tenant_id, channel, period_start, period_end,
    total_spend, attributed_revenue, attributed_orders, new_customers,
    roas, profit_roas, contribution_margin, cac,
    recommended_budget_change, recommendation_reason
  )
  VALUES (
    p_tenant_id, p_channel, p_period_start, p_period_end,
    p_total_spend, p_attributed_revenue, p_attributed_orders, p_new_customers,
    v_roas, p_profit_roas, p_contribution_margin, v_cac,
    v_budget_change, v_reason
  )
  ON CONFLICT (tenant_id, channel, period_start, period_end)
  DO UPDATE SET
    total_spend = EXCLUDED.total_spend,
    attributed_revenue = EXCLUDED.attributed_revenue,
    attributed_orders = EXCLUDED.attributed_orders,
    new_customers = EXCLUDED.new_customers,
    roas = EXCLUDED.roas,
    profit_roas = EXCLUDED.profit_roas,
    contribution_margin = EXCLUDED.contribution_margin,
    cac = EXCLUDED.cac,
    recommended_budget_change = EXCLUDED.recommended_budget_change,
    recommendation_reason = EXCLUDED.recommendation_reason,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function for FDP to get budget reallocation recommendations
CREATE OR REPLACE FUNCTION public.fdp_get_budget_recommendations(
  p_tenant_id UUID,
  p_lookback_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  channel TEXT,
  current_spend DECIMAL,
  attributed_revenue DECIMAL,
  roas DECIMAL,
  profit_roas DECIMAL,
  recommended_change DECIMAL,
  recommendation_reason TEXT,
  new_customers INTEGER,
  cac DECIMAL,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- LEVEL 3: Get MDP channel ROI data
  RETURN QUERY
  SELECT 
    cr.channel,
    cr.total_spend,
    cr.attributed_revenue,
    cr.roas,
    cr.profit_roas,
    cr.recommended_budget_change,
    cr.recommendation_reason,
    cr.new_customers,
    cr.cac,
    CASE 
      WHEN cr.profit_roas IS NOT NULL THEN 'LOCKED'
      WHEN cr.roas IS NOT NULL THEN 'OBSERVED'
      ELSE 'ESTIMATED'
    END::TEXT,
    'mdp_channel_roi'::TEXT,
    TRUE
  FROM mdp_channel_roi cr
  WHERE cr.tenant_id = p_tenant_id
    AND cr.period_end >= CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL
  ORDER BY cr.total_spend DESC;
  
  IF NOT FOUND THEN
    -- LEVEL 1: Return empty with note
    RETURN QUERY
    SELECT 
      'no_data'::TEXT,
      0::DECIMAL,
      0::DECIMAL,
      0::DECIMAL,
      NULL::DECIMAL,
      1.00::DECIMAL,
      'No channel data available - awaiting MDP sync'::TEXT,
      0::INTEGER,
      NULL::DECIMAL,
      'ESTIMATED'::TEXT,
      'fallback'::TEXT,
      FALSE;
  END IF;
END;
$$;