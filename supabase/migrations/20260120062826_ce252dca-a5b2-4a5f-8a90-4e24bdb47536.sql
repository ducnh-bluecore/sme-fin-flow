-- =====================================================
-- INVESTOR RISK DISCLOSURE, STRESS TESTING & SCENARIOS
-- =====================================================

-- A1. Investor Risk Disclosures (sanitized for external stakeholders)
CREATE TABLE IF NOT EXISTS public.investor_risk_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  risk_appetite_version int NOT NULL,
  
  disclosure_period_start date NOT NULL,
  disclosure_period_end date NOT NULL,
  
  summary text NOT NULL,
  key_risks jsonb NOT NULL DEFAULT '[]',
  mitigations jsonb NOT NULL DEFAULT '[]',
  
  compliance_statement text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'published')),
  
  approved_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_risk_disclosures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view disclosures"
  ON public.investor_risk_disclosures FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Tenant users can manage disclosures"
  ON public.investor_risk_disclosures FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- B1. Risk Stress Tests
CREATE TABLE IF NOT EXISTS public.risk_stress_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  test_name text NOT NULL,
  description text,
  
  base_risk_appetite_id uuid REFERENCES public.risk_appetites(id),
  simulated_risk_appetite jsonb NOT NULL,
  
  impact_summary jsonb NOT NULL,
  detailed_impacts jsonb,
  
  baseline_metrics jsonb,
  simulated_metrics jsonb,
  
  simulated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_stress_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view stress tests"
  ON public.risk_stress_tests FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Tenant users can manage stress tests"
  ON public.risk_stress_tests FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- C1. Board Scenarios
CREATE TABLE IF NOT EXISTS public.board_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  scenario_name text NOT NULL,
  scenario_type text NOT NULL CHECK (scenario_type IN (
    'REVENUE_SHOCK', 'AR_DELAY', 'COST_INFLATION', 'AUTOMATION_PAUSE', 'CUSTOM'
  )),
  description text,
  
  assumptions jsonb NOT NULL,
  projected_outcomes jsonb NOT NULL,
  risk_breaches jsonb NOT NULL DEFAULT '[]',
  control_impacts jsonb,
  
  baseline_snapshot jsonb,
  comparison_notes text,
  
  is_archived boolean DEFAULT false,
  
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.board_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view scenarios"
  ON public.board_scenarios FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Tenant users can manage scenarios"
  ON public.board_scenarios FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Indexes
CREATE INDEX idx_investor_disclosures_tenant_period 
  ON public.investor_risk_disclosures(tenant_id, disclosure_period_start, disclosure_period_end);

CREATE INDEX idx_risk_stress_tests_tenant 
  ON public.risk_stress_tests(tenant_id, simulated_at DESC);

CREATE INDEX idx_board_scenarios_tenant 
  ON public.board_scenarios(tenant_id, created_at DESC);