-- ================================================
-- DECISION OUTCOME LEARNING SYSTEM
-- Silent learning from resolved decisions
-- ================================================

-- Table: decision_outcome_records
-- Every resolved alert/decision creates one record
CREATE TABLE IF NOT EXISTS public.decision_outcome_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Source reference
  decision_id UUID, -- Links to decision_cards if from decision system
  alert_id UUID REFERENCES public.early_warning_alerts(id),
  
  -- Decision context
  decision_type TEXT NOT NULL, -- 'STOP_SKU', 'PAUSE_CAMPAIGN', 'SCALE', 'COLLECT_AR', etc.
  metric_code TEXT NOT NULL,
  dimension_key TEXT DEFAULT 'global',
  
  -- Who & When
  decided_by_role TEXT NOT NULL, -- 'CEO', 'CFO', 'COO', 'CMO'
  decided_by_user_id UUID,
  decision_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Action taken
  action_taken TEXT, -- Specific action: 'stopped_reorder', 'paused_ads', etc.
  action_speed TEXT, -- 'immediate', 'delayed_1d', 'delayed_3d', 'delayed_7d'
  
  -- Baseline metrics (captured at decision time)
  metric_before NUMERIC,
  exposure_before NUMERIC,
  context_snapshot JSONB DEFAULT '{}', -- Related metrics at decision time
  
  -- Outcome tracking (updated over time)
  metric_after_7d NUMERIC,
  metric_after_14d NUMERIC,
  metric_after_30d NUMERIC,
  outcome_measured_at TIMESTAMP WITH TIME ZONE,
  
  -- Financial delta
  financial_delta_7d NUMERIC,
  financial_delta_14d NUMERIC,
  financial_delta_30d NUMERIC,
  
  -- Side effects
  side_effects_detected JSONB DEFAULT '[]', -- [{metric, change, severity}]
  unintended_impact_score NUMERIC, -- 0-100, higher = more side effects
  
  -- Outcome classification
  outcome_verdict TEXT, -- 'success', 'partial', 'failure', 'inconclusive'
  outcome_confidence NUMERIC, -- 0-100
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: decision_learning_patterns
-- Aggregated patterns learned from outcomes
CREATE TABLE IF NOT EXISTS public.decision_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Pattern identification
  pattern_code TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  metric_code TEXT NOT NULL,
  
  -- Sample statistics
  sample_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_financial_delta NUMERIC,
  
  -- Role performance
  best_performing_role TEXT,
  avg_resolution_hours_by_role JSONB DEFAULT '{}', -- {"CFO": 12, "CEO": 4}
  success_rate_by_role JSONB DEFAULT '{}', -- {"CFO": 0.75, "CEO": 0.90}
  
  -- Timing insights
  delay_penalty_per_day NUMERIC, -- Average loss per day of delay
  optimal_action_window_hours NUMERIC,
  
  -- Pattern confidence
  confidence_score NUMERIC, -- 0-100, based on sample size and consistency
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  
  -- Insight text (pre-generated, CEO language)
  insight_text TEXT,
  insight_applicable_when TEXT, -- Conditions when to show
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, pattern_code)
);

-- Table: decision_insight_queue
-- Insights ready to surface (only high confidence)
CREATE TABLE IF NOT EXISTS public.decision_insight_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Context
  pattern_id UUID REFERENCES public.decision_learning_patterns(id),
  current_alert_id UUID REFERENCES public.early_warning_alerts(id),
  
  -- Insight content
  insight_type TEXT NOT NULL, -- 'delay_warning', 'role_suggestion', 'similar_case'
  insight_text TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL,
  
  -- When to show
  trigger_condition JSONB, -- {"metric_code": "cash_runway", "decision_type": "STOP_SKU"}
  
  -- Status
  surfaced BOOLEAN DEFAULT false,
  surfaced_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN DEFAULT false,
  
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_lookup 
  ON public.decision_outcome_records(tenant_id, decision_type, outcome_verdict);

CREATE INDEX IF NOT EXISTS idx_decision_patterns_confidence 
  ON public.decision_learning_patterns(tenant_id, confidence_score DESC)
  WHERE confidence_score >= 70;

CREATE INDEX IF NOT EXISTS idx_decision_insights_active 
  ON public.decision_insight_queue(tenant_id, surfaced, confidence_score DESC)
  WHERE surfaced = false AND dismissed = false;

-- Enable RLS
ALTER TABLE public.decision_outcome_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_insight_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for decision_outcome_records" 
  ON public.decision_outcome_records FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for decision_learning_patterns" 
  ON public.decision_learning_patterns FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for decision_insight_queue" 
  ON public.decision_insight_queue FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Function: Create outcome record when alert resolved
CREATE OR REPLACE FUNCTION create_decision_outcome_on_resolve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    INSERT INTO decision_outcome_records (
      tenant_id, alert_id, decision_type, metric_code, dimension_key,
      decided_by_role, decided_by_user_id, decision_date,
      metric_before, exposure_before, context_snapshot
    ) VALUES (
      NEW.tenant_id, NEW.id, 
      COALESCE(NEW.metadata->>'decision_type', 'RESOLVE'),
      NEW.metric_code, NEW.dimension_key,
      NEW.current_owner_role, NEW.resolved_by, NEW.resolved_at,
      NEW.current_value, NEW.exposure_amount,
      jsonb_build_object(
        'confidence', NEW.confidence_level,
        'days_to_breach', NEW.days_to_breach,
        'hierarchy_level', NEW.hierarchy_level
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_outcome_on_resolve ON early_warning_alerts;
CREATE TRIGGER trg_create_outcome_on_resolve
  AFTER UPDATE ON early_warning_alerts
  FOR EACH ROW
  EXECUTE FUNCTION create_decision_outcome_on_resolve();

-- Function: Calculate learning patterns
CREATE OR REPLACE FUNCTION calculate_decision_patterns(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern RECORD;
  v_stats RECORD;
  v_insight_text TEXT;
  v_patterns_updated INTEGER := 0;
BEGIN
  -- Aggregate by decision_type + metric_code
  FOR v_pattern IN
    SELECT 
      decision_type,
      metric_code,
      COUNT(*) as sample_count,
      COUNT(*) FILTER (WHERE outcome_verdict = 'success') as success_count,
      COUNT(*) FILTER (WHERE outcome_verdict = 'failure') as failure_count,
      AVG(financial_delta_30d) as avg_delta,
      jsonb_object_agg(
        decided_by_role, 
        AVG(EXTRACT(EPOCH FROM (decision_date - created_at)) / 3600)
      ) FILTER (WHERE decided_by_role IS NOT NULL) as avg_hours_by_role,
      jsonb_object_agg(
        decided_by_role,
        (COUNT(*) FILTER (WHERE outcome_verdict = 'success'))::FLOAT / NULLIF(COUNT(*), 0)
      ) FILTER (WHERE decided_by_role IS NOT NULL) as success_rate_by_role
    FROM decision_outcome_records
    WHERE tenant_id = p_tenant_id
      AND outcome_verdict IS NOT NULL
    GROUP BY decision_type, metric_code
    HAVING COUNT(*) >= 5 -- Minimum samples for pattern
  LOOP
    -- Generate insight text based on pattern
    IF v_pattern.avg_delta < 0 THEN
      v_insight_text := 'Quyết định ' || v_pattern.decision_type || ' thường cứu được ' || 
                        ABS(ROUND(v_pattern.avg_delta / 1000000)) || 'M VND.';
    ELSE
      v_insight_text := 'Quyết định ' || v_pattern.decision_type || ' cần cân nhắc - ' ||
                        'historical delta: +' || ROUND(v_pattern.avg_delta / 1000000) || 'M VND.';
    END IF;
    
    -- Upsert pattern
    INSERT INTO decision_learning_patterns (
      tenant_id, pattern_code, decision_type, metric_code,
      sample_count, success_count, failure_count, avg_financial_delta,
      avg_resolution_hours_by_role, success_rate_by_role,
      confidence_score, insight_text, last_calculated_at
    ) VALUES (
      p_tenant_id,
      v_pattern.decision_type || '_' || v_pattern.metric_code,
      v_pattern.decision_type, v_pattern.metric_code,
      v_pattern.sample_count, v_pattern.success_count, v_pattern.failure_count,
      v_pattern.avg_delta,
      v_pattern.avg_hours_by_role, v_pattern.success_rate_by_role,
      LEAST(100, v_pattern.sample_count * 10), -- Confidence based on samples
      v_insight_text, now()
    )
    ON CONFLICT (tenant_id, pattern_code) DO UPDATE SET
      sample_count = EXCLUDED.sample_count,
      success_count = EXCLUDED.success_count,
      failure_count = EXCLUDED.failure_count,
      avg_financial_delta = EXCLUDED.avg_financial_delta,
      avg_resolution_hours_by_role = EXCLUDED.avg_resolution_hours_by_role,
      success_rate_by_role = EXCLUDED.success_rate_by_role,
      confidence_score = EXCLUDED.confidence_score,
      insight_text = EXCLUDED.insight_text,
      last_calculated_at = now(),
      updated_at = now();
    
    v_patterns_updated := v_patterns_updated + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'patterns_updated', v_patterns_updated,
    'calculated_at', now()
  );
END;
$$;

-- Function: Get applicable insight for current alert
CREATE OR REPLACE FUNCTION get_decision_insight(
  p_tenant_id UUID,
  p_decision_type TEXT,
  p_metric_code TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insight TEXT;
  v_pattern RECORD;
BEGIN
  -- Only return high-confidence insights
  SELECT * INTO v_pattern
  FROM decision_learning_patterns
  WHERE tenant_id = p_tenant_id
    AND decision_type = p_decision_type
    AND metric_code = p_metric_code
    AND confidence_score >= 70
    AND sample_count >= 10
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  RETURN v_pattern.insight_text;
END;
$$;