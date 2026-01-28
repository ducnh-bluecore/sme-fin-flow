-- =====================================================
-- PHASE 2: CROSS-MODULE INTEGRATION
-- =====================================================

-- =====================================================
-- CASE 8: FDP → CDP: AR Aging → Credit Risk Score
-- =====================================================

-- Table: cdp_customer_credit_risk
CREATE TABLE IF NOT EXISTS public.cdp_customer_credit_risk (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  total_ar NUMERIC DEFAULT 0,
  overdue_ar NUMERIC DEFAULT 0,
  days_overdue INTEGER DEFAULT 0,
  credit_score NUMERIC DEFAULT 100,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  equity_risk_multiplier NUMERIC DEFAULT 1.0,
  source_module TEXT DEFAULT 'FDP',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.cdp_customer_credit_risk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cdp_customer_credit_risk_tenant_access"
ON public.cdp_customer_credit_risk
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cdp_credit_risk_tenant_customer ON public.cdp_customer_credit_risk(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_cdp_credit_risk_level ON public.cdp_customer_credit_risk(tenant_id, risk_level);

-- =====================================================
-- RPC: fdp_push_ar_to_cdp - Push AR aging to CDP credit risk
-- Fixed to join via customer external_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.fdp_push_ar_to_cdp(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_synced_count INTEGER := 0;
BEGIN
  -- Insert/Update credit risk scores from AR aging data
  INSERT INTO public.cdp_customer_credit_risk (
    tenant_id,
    customer_id,
    total_ar,
    overdue_ar,
    days_overdue,
    credit_score,
    risk_level,
    equity_risk_multiplier,
    source_module,
    last_sync_at
  )
  SELECT 
    p_tenant_id,
    cc.id AS customer_id,
    COALESCE(ar.total_ar, 0),
    COALESCE(ar.overdue_ar, 0),
    COALESCE(ar.max_days_overdue, 0),
    -- Credit score: 100 - penalties
    GREATEST(0, LEAST(100, 
      100 
      - (CASE WHEN ar.overdue_ar > 0 THEN 20 ELSE 0 END)
      - (CASE WHEN ar.max_days_overdue > 30 THEN 15 ELSE 0 END)
      - (CASE WHEN ar.max_days_overdue > 60 THEN 20 ELSE 0 END)
      - (CASE WHEN ar.max_days_overdue > 90 THEN 30 ELSE 0 END)
      - (LEAST(15, COALESCE(ar.overdue_ar, 0) / NULLIF(ar.total_ar, 0) * 15))
    )),
    -- Risk level based on days overdue and amount
    CASE 
      WHEN ar.max_days_overdue > 90 OR COALESCE(ar.overdue_ar, 0) / NULLIF(ar.total_ar, 0) > 0.5 THEN 'critical'
      WHEN ar.max_days_overdue > 60 OR COALESCE(ar.overdue_ar, 0) / NULLIF(ar.total_ar, 0) > 0.3 THEN 'high'
      WHEN ar.max_days_overdue > 30 OR COALESCE(ar.overdue_ar, 0) / NULLIF(ar.total_ar, 0) > 0.1 THEN 'medium'
      ELSE 'low'
    END,
    -- Equity risk multiplier (reduce equity weight for risky customers)
    CASE 
      WHEN ar.max_days_overdue > 90 THEN 0.5
      WHEN ar.max_days_overdue > 60 THEN 0.7
      WHEN ar.max_days_overdue > 30 THEN 0.85
      ELSE 1.0
    END,
    'FDP',
    now()
  FROM (
    -- Aggregate AR by customer (using customer_name from invoices)
    SELECT 
      i.tenant_id,
      i.customer_name,
      SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS total_ar,
      SUM(CASE WHEN i.due_date < CURRENT_DATE THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS overdue_ar,
      MAX(CASE WHEN i.due_date < CURRENT_DATE THEN CURRENT_DATE - i.due_date ELSE 0 END) AS max_days_overdue
    FROM invoices i
    WHERE i.tenant_id = p_tenant_id
      AND i.status NOT IN ('paid', 'cancelled', 'voided')
      AND i.total_amount - COALESCE(i.paid_amount, 0) > 0
    GROUP BY i.tenant_id, i.customer_name
  ) ar
  -- Join via customer name or external_id matching
  INNER JOIN cdp_customers cc ON cc.tenant_id = p_tenant_id 
    AND (
      cc.name ILIKE ar.customer_name 
      OR cc.external_id = ar.customer_name
      OR cc.email ILIKE ar.customer_name
    )
  ON CONFLICT (tenant_id, customer_id) 
  DO UPDATE SET
    total_ar = EXCLUDED.total_ar,
    overdue_ar = EXCLUDED.overdue_ar,
    days_overdue = EXCLUDED.days_overdue,
    credit_score = EXCLUDED.credit_score,
    risk_level = EXCLUDED.risk_level,
    equity_risk_multiplier = EXCLUDED.equity_risk_multiplier,
    last_sync_at = EXCLUDED.last_sync_at,
    updated_at = now();
    
  GET DIAGNOSTICS v_synced_count = ROW_COUNT;
  
  RETURN v_synced_count;
END;
$$;

-- =====================================================
-- CASE 9: MDP → FDP: Seasonal Patterns → Revenue Forecast
-- =====================================================

-- Table: mdp_seasonal_patterns
CREATE TABLE IF NOT EXISTS public.mdp_seasonal_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('monthly', 'weekly', 'event', 'campaign')),
  period_key TEXT NOT NULL, -- 'M01'-'M12' for monthly, 'W1'-'W52' for weekly, event names
  revenue_multiplier NUMERIC DEFAULT 1.0,
  order_multiplier NUMERIC DEFAULT 1.0,
  aov_multiplier NUMERIC DEFAULT 1.0,
  confidence_score NUMERIC DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sample_size INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  source_data_start DATE,
  source_data_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, pattern_type, period_key)
);

-- Enable RLS
ALTER TABLE public.mdp_seasonal_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mdp_seasonal_patterns_tenant_access"
ON public.mdp_seasonal_patterns
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
));

-- Index
CREATE INDEX IF NOT EXISTS idx_mdp_seasonal_tenant_type ON public.mdp_seasonal_patterns(tenant_id, pattern_type);

-- =====================================================
-- RPC: mdp_push_seasonal_to_fdp - Push seasonal pattern from MDP
-- =====================================================
CREATE OR REPLACE FUNCTION public.mdp_push_seasonal_to_fdp(
  p_tenant_id UUID,
  p_pattern_type TEXT,
  p_period_key TEXT,
  p_revenue_multiplier NUMERIC,
  p_order_multiplier NUMERIC DEFAULT 1.0,
  p_confidence_score NUMERIC DEFAULT 0.5,
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
  INSERT INTO public.mdp_seasonal_patterns (
    tenant_id,
    pattern_type,
    period_key,
    revenue_multiplier,
    order_multiplier,
    confidence_score,
    sample_size,
    is_active
  )
  VALUES (
    p_tenant_id,
    p_pattern_type,
    p_period_key,
    p_revenue_multiplier,
    p_order_multiplier,
    p_confidence_score,
    p_sample_size,
    true
  )
  ON CONFLICT (tenant_id, pattern_type, period_key)
  DO UPDATE SET
    revenue_multiplier = EXCLUDED.revenue_multiplier,
    order_multiplier = EXCLUDED.order_multiplier,
    confidence_score = EXCLUDED.confidence_score,
    sample_size = EXCLUDED.sample_size,
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- =====================================================
-- RPC: fdp_get_seasonal_adjustments - Get seasonal adjustments for FDP
-- =====================================================
CREATE OR REPLACE FUNCTION public.fdp_get_seasonal_adjustments(
  p_tenant_id UUID,
  p_target_month INTEGER
)
RETURNS TABLE (
  pattern_type TEXT,
  period_key TEXT,
  revenue_multiplier NUMERIC,
  order_multiplier NUMERIC,
  confidence_score NUMERIC,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.pattern_type,
    sp.period_key,
    sp.revenue_multiplier,
    sp.order_multiplier,
    sp.confidence_score,
    CASE 
      WHEN sp.confidence_score >= 0.8 AND sp.sample_size >= 12 THEN 'LOCKED'
      WHEN sp.confidence_score >= 0.5 AND sp.sample_size >= 3 THEN 'OBSERVED'
      ELSE 'ESTIMATED'
    END AS confidence_level,
    'mdp_seasonal_patterns' AS data_source,
    true AS is_cross_module
  FROM public.mdp_seasonal_patterns sp
  WHERE sp.tenant_id = p_tenant_id
    AND sp.is_active = true
    AND (
      -- Monthly pattern matching
      (sp.pattern_type = 'monthly' AND sp.period_key = 'M' || LPAD(p_target_month::TEXT, 2, '0'))
      -- Or event patterns that are always applicable
      OR sp.pattern_type = 'event'
    )
  ORDER BY sp.confidence_score DESC;
END;
$$;

-- =====================================================
-- CASE 10: MDP → FDP: Channel ROI → Budget Reallocation
-- =====================================================

-- Table: mdp_channel_roi
CREATE TABLE IF NOT EXISTS public.mdp_channel_roi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_spend NUMERIC DEFAULT 0,
  attributed_revenue NUMERIC DEFAULT 0,
  attributed_orders INTEGER DEFAULT 0,
  roas NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_spend > 0 THEN attributed_revenue / total_spend ELSE 0 END
  ) STORED,
  profit_roas NUMERIC,
  contribution_margin NUMERIC,
  new_customers INTEGER DEFAULT 0,
  cac NUMERIC GENERATED ALWAYS AS (
    CASE WHEN new_customers > 0 THEN total_spend / new_customers ELSE NULL END
  ) STORED,
  recommended_budget_change NUMERIC DEFAULT 1.0,
  recommendation_reason TEXT,
  source_module TEXT DEFAULT 'MDP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, channel, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.mdp_channel_roi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mdp_channel_roi_tenant_access"
ON public.mdp_channel_roi
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
));

-- Index
CREATE INDEX IF NOT EXISTS idx_mdp_channel_roi_tenant_period ON public.mdp_channel_roi(tenant_id, period_end DESC);

-- =====================================================
-- RPC: mdp_push_channel_roi_to_fdp
-- =====================================================
CREATE OR REPLACE FUNCTION public.mdp_push_channel_roi_to_fdp(
  p_tenant_id UUID,
  p_channel TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_total_spend NUMERIC,
  p_attributed_revenue NUMERIC,
  p_attributed_orders INTEGER,
  p_new_customers INTEGER,
  p_profit_roas NUMERIC DEFAULT NULL,
  p_contribution_margin NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_roas NUMERIC;
  v_recommendation_reason TEXT;
  v_recommended_change NUMERIC;
BEGIN
  -- Calculate ROAS
  v_roas := CASE WHEN p_total_spend > 0 THEN p_attributed_revenue / p_total_spend ELSE 0 END;
  
  -- Determine recommendation based on performance
  IF COALESCE(p_profit_roas, v_roas) < 0 THEN
    v_recommended_change := 0; -- KILL
    v_recommendation_reason := 'Profit ROAS âm - Dừng chi tiêu';
  ELSIF COALESCE(p_profit_roas, v_roas) < 1.0 THEN
    v_recommended_change := 0.5; -- REDUCE
    v_recommendation_reason := 'ROAS dưới 1.0 - Giảm 50% ngân sách';
  ELSIF COALESCE(p_profit_roas, v_roas) >= 3.0 AND p_contribution_margin IS NOT NULL AND p_contribution_margin >= 0.15 THEN
    v_recommended_change := 1.5; -- SCALE
    v_recommendation_reason := 'Hiệu quả cao - Tăng 50% ngân sách';
  ELSE
    v_recommended_change := 1.0; -- MAINTAIN
    v_recommendation_reason := 'Hiệu quả ổn định - Duy trì ngân sách';
  END IF;

  INSERT INTO public.mdp_channel_roi (
    tenant_id,
    channel,
    period_start,
    period_end,
    total_spend,
    attributed_revenue,
    attributed_orders,
    new_customers,
    profit_roas,
    contribution_margin,
    recommended_budget_change,
    recommendation_reason,
    source_module
  )
  VALUES (
    p_tenant_id,
    p_channel,
    p_period_start,
    p_period_end,
    p_total_spend,
    p_attributed_revenue,
    p_attributed_orders,
    p_new_customers,
    p_profit_roas,
    p_contribution_margin,
    v_recommended_change,
    v_recommendation_reason,
    'MDP'
  )
  ON CONFLICT (tenant_id, channel, period_start, period_end)
  DO UPDATE SET
    total_spend = EXCLUDED.total_spend,
    attributed_revenue = EXCLUDED.attributed_revenue,
    attributed_orders = EXCLUDED.attributed_orders,
    new_customers = EXCLUDED.new_customers,
    profit_roas = EXCLUDED.profit_roas,
    contribution_margin = EXCLUDED.contribution_margin,
    recommended_budget_change = EXCLUDED.recommended_budget_change,
    recommendation_reason = EXCLUDED.recommendation_reason,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- =====================================================
-- View: v_budget_reallocation_suggestions
-- =====================================================
CREATE OR REPLACE VIEW public.v_budget_reallocation_suggestions AS
SELECT 
  r.tenant_id,
  r.channel,
  r.period_start,
  r.period_end,
  r.total_spend AS current_spend,
  r.attributed_revenue,
  r.roas,
  r.profit_roas,
  r.new_customers,
  r.cac,
  r.recommended_budget_change,
  r.recommendation_reason,
  -- Calculate suggested new budget
  r.total_spend * r.recommended_budget_change AS suggested_budget,
  -- Categorize action
  CASE 
    WHEN r.recommended_budget_change = 0 THEN 'KILL'
    WHEN r.recommended_budget_change < 1 THEN 'REDUCE'
    WHEN r.recommended_budget_change > 1 THEN 'SCALE'
    ELSE 'MAINTAIN'
  END AS action_type,
  -- Confidence level
  CASE 
    WHEN r.profit_roas IS NOT NULL THEN 'LOCKED'
    WHEN r.attributed_orders >= 10 THEN 'OBSERVED'
    ELSE 'ESTIMATED'
  END AS confidence_level
FROM public.mdp_channel_roi r
WHERE r.period_end >= CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- RPC: fdp_get_budget_recommendations
-- =====================================================
CREATE OR REPLACE FUNCTION public.fdp_get_budget_recommendations(
  p_tenant_id UUID,
  p_lookback_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  channel TEXT,
  current_spend NUMERIC,
  attributed_revenue NUMERIC,
  roas NUMERIC,
  profit_roas NUMERIC,
  recommended_change NUMERIC,
  recommendation_reason TEXT,
  new_customers INTEGER,
  cac NUMERIC,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.channel,
    SUM(r.total_spend)::NUMERIC AS current_spend,
    SUM(r.attributed_revenue)::NUMERIC AS attributed_revenue,
    CASE WHEN SUM(r.total_spend) > 0 
      THEN SUM(r.attributed_revenue) / SUM(r.total_spend) 
      ELSE 0 
    END AS roas,
    AVG(r.profit_roas)::NUMERIC AS profit_roas,
    AVG(r.recommended_budget_change)::NUMERIC AS recommended_change,
    MAX(r.recommendation_reason) AS recommendation_reason,
    SUM(r.new_customers)::INTEGER AS new_customers,
    CASE WHEN SUM(r.new_customers) > 0 
      THEN SUM(r.total_spend) / SUM(r.new_customers) 
      ELSE NULL 
    END AS cac,
    CASE 
      WHEN MAX(r.profit_roas) IS NOT NULL THEN 'LOCKED'
      WHEN SUM(r.attributed_orders) >= 30 THEN 'OBSERVED'
      ELSE 'ESTIMATED'
    END AS confidence_level,
    'mdp_channel_roi' AS data_source,
    true AS is_cross_module
  FROM public.mdp_channel_roi r
  WHERE r.tenant_id = p_tenant_id
    AND r.period_end >= CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL
  GROUP BY r.channel
  ORDER BY SUM(r.total_spend) DESC;
END;
$$;