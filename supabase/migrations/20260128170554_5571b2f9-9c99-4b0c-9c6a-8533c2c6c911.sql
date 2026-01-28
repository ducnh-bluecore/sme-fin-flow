-- =====================================================
-- CONTROL TOWER WOW FACTOR - PHASE 1 (CORRECTED)
-- Create new tables that don't exist yet
-- =====================================================

-- 1. MODULE HEALTH STATUS
CREATE TABLE IF NOT EXISTS public.module_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL CHECK (module_code IN ('FDP', 'MDP', 'CDP', 'CONTROL_TOWER')),
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical', 'offline')),
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  active_alerts_count INTEGER DEFAULT 0,
  pending_decisions_count INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module_code)
);

ALTER TABLE public.module_health_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_health_select" ON public.module_health_status FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "module_health_insert" ON public.module_health_status FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "module_health_update" ON public.module_health_status FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- 2. DECISION IMPACT PROJECTIONS
CREATE TABLE IF NOT EXISTS public.decision_impact_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  decision_card_id UUID REFERENCES public.decision_cards(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.alert_instances(id) ON DELETE CASCADE,
  target_module TEXT NOT NULL CHECK (target_module IN ('FDP', 'MDP', 'CDP', 'OPS')),
  impact_type TEXT NOT NULL CHECK (impact_type IN ('cash', 'revenue', 'cost', 'customer', 'risk', 'time')),
  impact_metric TEXT NOT NULL,
  baseline_value NUMERIC,
  projected_value NUMERIC,
  impact_amount NUMERIC,
  impact_percent NUMERIC,
  confidence_score NUMERIC DEFAULT 0.7,
  time_horizon_days INTEGER DEFAULT 30,
  delay_multiplier NUMERIC DEFAULT 1.1,
  computation_method TEXT DEFAULT 'rule_based',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.decision_impact_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impact_projections_select" ON public.decision_impact_projections FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "impact_projections_all" ON public.decision_impact_projections FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- 3. AI PREDICTIONS
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  decision_card_id UUID REFERENCES public.decision_cards(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.alert_instances(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('cost_of_inaction', 'scenario_comparison', 'outcome_forecast')),
  input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  prediction_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC DEFAULT 0.7,
  model_used TEXT DEFAULT 'gemini-3-flash-preview',
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_predictions_select" ON public.ai_predictions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "ai_predictions_all" ON public.ai_predictions FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- 4. PREDICTION ACCURACY LOG
CREATE TABLE IF NOT EXISTS public.prediction_accuracy_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prediction_id UUID NOT NULL REFERENCES public.ai_predictions(id) ON DELETE CASCADE,
  predicted_value NUMERIC,
  actual_value NUMERIC,
  accuracy_percent NUMERIC,
  variance NUMERIC,
  evaluation_date DATE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prediction_accuracy_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accuracy_log_select" ON public.prediction_accuracy_log FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- 5. ESCALATION RULES
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  trigger_severity TEXT[] DEFAULT ARRAY['critical'],
  trigger_card_types TEXT[],
  trigger_categories TEXT[],
  warning_threshold_hours NUMERIC DEFAULT 4,
  escalation_threshold_hours NUMERIC DEFAULT 8,
  final_escalation_hours NUMERIC DEFAULT 24,
  initial_owner_role TEXT DEFAULT 'COO',
  escalate_to_role TEXT DEFAULT 'CFO',
  final_escalate_to_role TEXT DEFAULT 'CEO',
  notify_on_warning BOOLEAN DEFAULT true,
  notify_on_escalation BOOLEAN DEFAULT true,
  notification_channels TEXT[] DEFAULT ARRAY['in_app', 'email'],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalation_rules_select" ON public.escalation_rules FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "escalation_rules_admin" ON public.escalation_rules FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')));

-- 6. ESCALATION HISTORY
CREATE TABLE IF NOT EXISTS public.escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  decision_card_id UUID REFERENCES public.decision_cards(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.alert_instances(id) ON DELETE CASCADE,
  escalation_rule_id UUID REFERENCES public.escalation_rules(id) ON DELETE SET NULL,
  escalation_level INTEGER DEFAULT 1,
  from_owner_id UUID,
  from_owner_role TEXT,
  to_owner_id UUID,
  to_owner_role TEXT,
  reason TEXT NOT NULL,
  time_overdue_hours NUMERIC,
  notification_sent BOOLEAN DEFAULT false,
  notification_channels TEXT[],
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.escalation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalation_history_select" ON public.escalation_history FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_health_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escalation_history;

-- Indexes
CREATE INDEX idx_module_health_tenant ON public.module_health_status(tenant_id);
CREATE INDEX idx_decision_impact_card ON public.decision_impact_projections(decision_card_id);
CREATE INDEX idx_ai_predictions_card ON public.ai_predictions(decision_card_id);
CREATE INDEX idx_ai_predictions_expires ON public.ai_predictions(expires_at);
CREATE INDEX idx_escalation_rules_tenant ON public.escalation_rules(tenant_id, is_active);
CREATE INDEX idx_escalation_history_card ON public.escalation_history(decision_card_id);