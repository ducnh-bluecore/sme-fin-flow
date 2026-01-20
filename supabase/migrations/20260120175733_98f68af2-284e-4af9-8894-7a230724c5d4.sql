-- ================================================
-- AI ADVISOR RULES
-- One action or silence. No questions. No options.
-- ================================================

-- Table: ai_advisor_config
CREATE TABLE IF NOT EXISTS public.ai_advisor_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) UNIQUE,
  
  -- Confidence thresholds (below = silence)
  min_confidence_to_speak NUMERIC DEFAULT 75,
  min_samples_to_speak INTEGER DEFAULT 10,
  
  -- Silence is default
  default_response TEXT DEFAULT 'SILENT',
  
  -- Output constraints
  max_actions_per_response INTEGER DEFAULT 1, -- Always 1
  allow_questions BOOLEAN DEFAULT false,      -- Always false
  allow_multiple_options BOOLEAN DEFAULT false, -- Always false
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: ai_advisor_responses
-- Pre-computed single-action recommendations
CREATE TABLE IF NOT EXISTS public.ai_advisor_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Context
  alert_id UUID REFERENCES public.early_warning_alerts(id),
  decision_type TEXT,
  metric_code TEXT,
  
  -- The ONE recommendation (or null = silence)
  recommendation TEXT, -- NULL means "No action required" or silence
  action_verb TEXT,    -- 'STOP', 'PAUSE', 'SCALE', 'COLLECT', 'WAIT', NULL
  action_target TEXT,  -- 'SKU-A001', 'Campaign X', 'AR Invoice #123'
  
  -- Confidence
  confidence_score NUMERIC NOT NULL,
  is_silent BOOLEAN DEFAULT false, -- true if confidence < threshold
  
  -- Learning basis
  based_on_pattern_id UUID REFERENCES public.decision_learning_patterns(id),
  based_on_samples INTEGER,
  
  -- Status
  surfaced_at TIMESTAMP WITH TIME ZONE,
  actioned_at TIMESTAMP WITH TIME ZONE,
  outcome_measured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_advisor_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_advisor_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for ai_advisor_config" 
  ON public.ai_advisor_config FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for ai_advisor_responses" 
  ON public.ai_advisor_responses FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Insert default config for all tenants
INSERT INTO public.ai_advisor_config (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Function: Get AI Advisor recommendation (ONE or SILENCE)
CREATE OR REPLACE FUNCTION get_ai_recommendation(
  p_tenant_id UUID,
  p_alert_id UUID DEFAULT NULL,
  p_decision_type TEXT DEFAULT NULL,
  p_metric_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_pattern RECORD;
  v_recommendation TEXT;
  v_action_verb TEXT;
  v_confidence NUMERIC;
BEGIN
  -- Get config
  SELECT * INTO v_config FROM ai_advisor_config WHERE tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    -- No config = silence
    RETURN jsonb_build_object('silent', true);
  END IF;
  
  -- Find best matching pattern
  SELECT * INTO v_pattern
  FROM decision_learning_patterns
  WHERE tenant_id = p_tenant_id
    AND (p_decision_type IS NULL OR decision_type = p_decision_type)
    AND (p_metric_code IS NULL OR metric_code = p_metric_code)
    AND confidence_score >= v_config.min_confidence_to_speak
    AND sample_count >= v_config.min_samples_to_speak
  ORDER BY confidence_score DESC, sample_count DESC
  LIMIT 1;
  
  -- Below threshold = silence
  IF NOT FOUND THEN
    INSERT INTO ai_advisor_responses (
      tenant_id, alert_id, decision_type, metric_code,
      recommendation, confidence_score, is_silent
    ) VALUES (
      p_tenant_id, p_alert_id, p_decision_type, p_metric_code,
      NULL, 0, true
    );
    
    RETURN jsonb_build_object('silent', true);
  END IF;
  
  -- Generate ONE recommendation
  v_confidence := v_pattern.confidence_score;
  
  -- Determine action based on pattern success rate
  IF v_pattern.success_count::FLOAT / NULLIF(v_pattern.sample_count, 0) >= 0.7 THEN
    -- High success rate = recommend the decision type
    v_action_verb := SPLIT_PART(v_pattern.decision_type, '_', 1);
    v_recommendation := v_pattern.insight_text;
  ELSIF v_pattern.avg_financial_delta > 0 THEN
    -- Positive delta = no action required
    v_action_verb := NULL;
    v_recommendation := NULL; -- No action required
  ELSE
    -- Default = recommend the learned action
    v_action_verb := SPLIT_PART(v_pattern.decision_type, '_', 1);
    v_recommendation := v_pattern.insight_text;
  END IF;
  
  -- Record response
  INSERT INTO ai_advisor_responses (
    tenant_id, alert_id, decision_type, metric_code,
    recommendation, action_verb, confidence_score,
    is_silent, based_on_pattern_id, based_on_samples, surfaced_at
  ) VALUES (
    p_tenant_id, p_alert_id, p_decision_type, p_metric_code,
    v_recommendation, v_action_verb, v_confidence,
    false, v_pattern.id, v_pattern.sample_count, now()
  );
  
  -- Return ONE action or "No action required"
  IF v_recommendation IS NULL THEN
    RETURN jsonb_build_object(
      'silent', false,
      'action', 'NO_ACTION',
      'message', 'No action required.',
      'confidence', v_confidence
    );
  ELSE
    RETURN jsonb_build_object(
      'silent', false,
      'action', v_action_verb,
      'message', v_recommendation,
      'confidence', v_confidence
    );
  END IF;
END;
$$;

-- View: Only non-silent advisor responses
CREATE OR REPLACE VIEW v_ai_advisor_active AS
SELECT 
  ar.*,
  CASE 
    WHEN ar.recommendation IS NULL THEN 'No action required.'
    ELSE ar.action_verb || ': ' || ar.recommendation
  END as display_text
FROM ai_advisor_responses ar
WHERE ar.is_silent = false
  AND ar.surfaced_at IS NOT NULL
  AND ar.actioned_at IS NULL
ORDER BY ar.confidence_score DESC, ar.created_at DESC;