
-- Decision Cards System V1
-- Core table for decision cards
CREATE TABLE public.decision_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Card Type & Entity
  card_type TEXT NOT NULL CHECK (card_type IN (
    'GROWTH_SCALE_CHANNEL',
    'GROWTH_SCALE_SKU', 
    'CASH_SURVIVAL',
    'INVENTORY_CASH_LOCK',
    'OPS_REVENUE_AT_RISK',
    'CUSTOMER_PROTECT_OR_AVOID'
  )),
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  
  -- Entity Reference
  entity_type TEXT NOT NULL CHECK (entity_type IN ('CHANNEL', 'SKU', 'COHORT', 'CASH', 'OPS_NODE', 'INVENTORY')),
  entity_id TEXT,
  entity_label TEXT NOT NULL,
  
  -- Owner & Assignment
  owner_role TEXT NOT NULL CHECK (owner_role IN ('CEO', 'CFO', 'CMO', 'COO')),
  owner_user_id UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Status & Priority
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'DECIDED', 'DISMISSED', 'EXPIRED')),
  priority TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1', 'P2', 'P3')),
  severity_score INTEGER DEFAULT 50 CHECK (severity_score >= 0 AND severity_score <= 100),
  confidence TEXT DEFAULT 'HIGH' CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  
  -- Impact
  impact_amount NUMERIC DEFAULT 0,
  impact_currency TEXT DEFAULT 'VND',
  impact_window_days INTEGER DEFAULT 30,
  impact_description TEXT,
  
  -- Deadline
  deadline_at TIMESTAMP WITH TIME ZONE NOT NULL,
  snoozed_until TIMESTAMP WITH TIME ZONE,
  snooze_count INTEGER DEFAULT 0,
  
  -- Source & Version
  source_modules TEXT[] DEFAULT '{}',
  vertical TEXT DEFAULT 'retail' CHECK (vertical IN ('retail', 'distributor', 'marketplace')),
  rule_version INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Decision Card Facts (max 6 primary facts per card)
CREATE TABLE public.decision_card_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.decision_cards(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  fact_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  numeric_value NUMERIC,
  unit TEXT,
  trend TEXT CHECK (trend IN ('UP', 'DOWN', 'FLAT', 'NA')),
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Decision Card Actions (recommendations)
CREATE TABLE public.decision_card_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.decision_cards(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL CHECK (action_type IN (
    'STOP', 'PAUSE', 'SCALE', 'SCALE_WITH_CONDITION', 
    'INVESTIGATE', 'ACCEPT_LOSS', 'PROTECT', 'AVOID',
    'COLLECT', 'DISCOUNT', 'RENEGOTIATE', 'SWITCH'
  )),
  is_recommended BOOLEAN DEFAULT false,
  label TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  risk_note TEXT,
  expected_outcome TEXT,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Decision Log (audit trail)
CREATE TABLE public.decision_card_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.decision_cards(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  decided_by UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_label TEXT,
  comment TEXT,
  parameters JSONB DEFAULT '{}',
  
  -- For dismissed cards
  dismiss_reason TEXT CHECK (dismiss_reason IN (
    'NOT_RELEVANT', 'ALREADY_HANDLED', 'FALSE_POSITIVE', 'AWAITING_DATA', 'OTHER'
  )),
  
  -- Outcome tracking (for learning loop)
  outcome_tracking_key TEXT,
  outcome_recorded_at TIMESTAMP WITH TIME ZONE,
  outcome_value NUMERIC,
  outcome_notes TEXT,
  
  decided_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bluecore Scores (proprietary scores)
CREATE TABLE public.bluecore_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  score_type TEXT NOT NULL CHECK (score_type IN (
    'CASH_HEALTH',
    'GROWTH_QUALITY', 
    'MARKETING_ACCOUNTABILITY',
    'CUSTOMER_VALUE_RISK'
  )),
  
  score_value INTEGER NOT NULL CHECK (score_value >= 0 AND score_value <= 100),
  score_grade TEXT NOT NULL CHECK (score_grade IN ('EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL')),
  
  -- Components (stored but not exposed in detail)
  components JSONB DEFAULT '{}',
  
  -- Trend
  previous_score INTEGER,
  trend TEXT CHECK (trend IN ('UP', 'DOWN', 'STABLE')),
  trend_percent NUMERIC,
  
  -- Context
  primary_driver TEXT,
  recommendation TEXT,
  
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vertical Configuration (threshold rules per vertical)
CREATE TABLE public.vertical_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  vertical TEXT NOT NULL CHECK (vertical IN ('retail', 'distributor', 'marketplace')),
  is_active BOOLEAN DEFAULT true,
  
  -- Thresholds stored as JSONB for flexibility
  thresholds JSONB NOT NULL DEFAULT '{
    "contribution_margin_critical": 0,
    "contribution_margin_warning": 5,
    "return_rate_critical": 8,
    "return_rate_warning": 5,
    "runway_critical_days": 45,
    "runway_warning_days": 60,
    "inventory_cash_ratio_critical": 70,
    "inventory_days_warning": 60,
    "cac_increase_warning_pct": 25,
    "ads_spend_increase_warning_pct": 20
  }',
  
  locked_until TIMESTAMP WITH TIME ZONE, -- No custom rules for 90 days
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, vertical)
);

-- Indexes
CREATE INDEX idx_decision_cards_tenant_status ON public.decision_cards(tenant_id, status);
CREATE INDEX idx_decision_cards_priority ON public.decision_cards(tenant_id, priority, severity_score DESC);
CREATE INDEX idx_decision_cards_deadline ON public.decision_cards(tenant_id, deadline_at);
CREATE INDEX idx_decision_cards_entity ON public.decision_cards(tenant_id, entity_type, entity_id);
CREATE INDEX idx_decision_card_facts_card ON public.decision_card_facts(card_id);
CREATE INDEX idx_decision_card_actions_card ON public.decision_card_actions(card_id);
CREATE INDEX idx_decision_card_decisions_card ON public.decision_card_decisions(card_id);
CREATE INDEX idx_bluecore_scores_tenant_type ON public.bluecore_scores(tenant_id, score_type);
CREATE INDEX idx_bluecore_scores_latest ON public.bluecore_scores(tenant_id, score_type, calculated_at DESC);

-- Enable RLS
ALTER TABLE public.decision_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_card_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_card_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_card_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bluecore_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies using tenant_users table
CREATE POLICY "Users can view decision cards for their tenant"
  ON public.decision_cards FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update decision cards for their tenant"
  ON public.decision_cards FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert decision cards for their tenant"
  ON public.decision_cards FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view decision card facts for their tenant"
  ON public.decision_card_facts FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage decision card facts"
  ON public.decision_card_facts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view decision card actions for their tenant"
  ON public.decision_card_actions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage decision card actions"
  ON public.decision_card_actions FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view decision card decisions for their tenant"
  ON public.decision_card_decisions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert decision card decisions for their tenant"
  ON public.decision_card_decisions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view bluecore scores for their tenant"
  ON public.bluecore_scores FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage bluecore scores"
  ON public.bluecore_scores FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view vertical configs for their tenant"
  ON public.vertical_configs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage vertical configs"
  ON public.vertical_configs FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Trigger for updated_at
CREATE TRIGGER update_decision_cards_updated_at
  BEFORE UPDATE ON public.decision_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bluecore_scores_updated_at
  BEFORE UPDATE ON public.bluecore_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vertical_configs_updated_at
  BEFORE UPDATE ON public.vertical_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
