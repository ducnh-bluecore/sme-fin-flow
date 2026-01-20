-- ================================================
-- RISK APPETITE CONFIGURATION
-- Board-defined, System-enforced
-- ================================================

-- A1. Risk Appetites (versioned contracts)
CREATE TABLE IF NOT EXISTS public.risk_appetites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  version INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'retired')),
  
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  
  name TEXT NOT NULL DEFAULT 'Risk Appetite Policy',
  description TEXT NULL,
  
  defined_by UUID NOT NULL,
  approved_by UUID NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: only one active appetite per tenant
CREATE UNIQUE INDEX idx_risk_appetites_active 
  ON public.risk_appetites(tenant_id) 
  WHERE status = 'active';

CREATE INDEX idx_risk_appetites_tenant 
  ON public.risk_appetites(tenant_id, status);

-- A2. Risk Appetite Rules
CREATE TABLE IF NOT EXISTS public.risk_appetite_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  risk_appetite_id UUID NOT NULL REFERENCES public.risk_appetites(id) ON DELETE CASCADE,
  
  risk_domain TEXT NOT NULL CHECK (risk_domain IN (
    'CASH',
    'AR',
    'AP',
    'RECONCILIATION',
    'AUTOMATION',
    'ML',
    'GOVERNANCE'
  )),
  
  metric_code TEXT NOT NULL,          -- e.g. ar_overdue_ratio, false_auto_rate
  metric_label TEXT NOT NULL,         -- Human-readable name
  operator TEXT NOT NULL CHECK (operator IN ('<', '<=', '>', '>=', '=')),
  
  threshold NUMERIC(18,4) NOT NULL,
  unit TEXT NOT NULL,                 -- %, days, amount, ratio
  
  action_on_breach TEXT NOT NULL CHECK (action_on_breach IN (
    'ALERT',
    'REQUIRE_APPROVAL',
    'BLOCK_AUTOMATION',
    'DISABLE_ML',
    'ESCALATE_TO_BOARD'
  )),
  
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_appetite_rules_appetite 
  ON public.risk_appetite_rules(risk_appetite_id);

CREATE INDEX idx_risk_appetite_rules_domain 
  ON public.risk_appetite_rules(tenant_id, risk_domain);

-- C3. Risk Breach Events (append-only)
CREATE TABLE IF NOT EXISTS public.risk_breach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  risk_appetite_id UUID NOT NULL REFERENCES public.risk_appetites(id),
  rule_id UUID NOT NULL REFERENCES public.risk_appetite_rules(id),
  
  metric_code TEXT NOT NULL,
  metric_value NUMERIC(18,4) NOT NULL,
  threshold NUMERIC(18,4) NOT NULL,
  
  breached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  action_taken TEXT NOT NULL,
  action_result JSONB NULL,           -- Details of enforcement action
  
  severity TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL,
  resolution_notes TEXT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_breach_events_tenant 
  ON public.risk_breach_events(tenant_id, breached_at DESC);

CREATE INDEX idx_risk_breach_events_unresolved 
  ON public.risk_breach_events(tenant_id) 
  WHERE is_resolved = false;

-- ================================================
-- RLS POLICIES
-- ================================================

ALTER TABLE public.risk_appetites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_appetite_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_breach_events ENABLE ROW LEVEL SECURITY;

-- Risk Appetites
CREATE POLICY "Users can view their tenant risk appetites"
  ON public.risk_appetites FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can insert risk appetites for their tenant"
  ON public.risk_appetites FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can update risk appetites for their tenant"
  ON public.risk_appetites FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Risk Appetite Rules
CREATE POLICY "Users can view their tenant risk rules"
  ON public.risk_appetite_rules FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can insert risk rules for their tenant"
  ON public.risk_appetite_rules FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can update risk rules for their tenant"
  ON public.risk_appetite_rules FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can delete risk rules for their tenant"
  ON public.risk_appetite_rules FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Risk Breach Events (append-only, only SELECT and INSERT)
CREATE POLICY "Users can view their tenant breach events"
  ON public.risk_breach_events FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can insert breach events for their tenant"
  ON public.risk_breach_events FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Allow update only for resolution
CREATE POLICY "Users can resolve breach events"
  ON public.risk_breach_events FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ================================================
-- AUDIT TRIGGER FOR RISK APPETITE CHANGES
-- ================================================

CREATE OR REPLACE FUNCTION public.log_risk_appetite_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_events (
    tenant_id,
    actor_type,
    actor_id,
    action,
    resource_type,
    resource_id,
    before_state,
    after_state
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    'USER',
    auth.uid(),
    CASE TG_OP
      WHEN 'INSERT' THEN 'CREATE_RISK_APPETITE'
      WHEN 'UPDATE' THEN 'UPDATE_RISK_APPETITE'
      WHEN 'DELETE' THEN 'DELETE_RISK_APPETITE'
    END,
    'risk_appetite',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_risk_appetites
  AFTER INSERT OR UPDATE OR DELETE ON public.risk_appetites
  FOR EACH ROW EXECUTE FUNCTION public.log_risk_appetite_audit();

-- ================================================
-- VIEW: Active Risk Appetite with Rules
-- ================================================

CREATE OR REPLACE VIEW public.v_active_risk_appetite AS
SELECT 
  ra.id,
  ra.tenant_id,
  ra.version,
  ra.name,
  ra.description,
  ra.effective_from,
  ra.effective_to,
  ra.defined_by,
  ra.approved_by,
  ra.approved_at,
  (
    SELECT COUNT(*) 
    FROM public.risk_appetite_rules rar 
    WHERE rar.risk_appetite_id = ra.id AND rar.is_enabled = true
  ) AS rule_count,
  (
    SELECT COUNT(*) 
    FROM public.risk_breach_events rbe 
    WHERE rbe.risk_appetite_id = ra.id AND rbe.is_resolved = false
  ) AS active_breaches
FROM public.risk_appetites ra
WHERE ra.status = 'active';