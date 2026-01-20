-- A1. Table: audit_events (append-only, global)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  actor_type text NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM', 'ML', 'GUARDRAIL')),
  actor_id uuid NULL,
  actor_role text NULL,
  
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NULL,
  
  decision_context text NULL,
  reason_code text NULL,
  reason_detail text NULL,
  
  before_state jsonb NULL,
  after_state jsonb NULL,
  
  evidence_hash text NULL,
  session_id text NULL,
  ip_address text NULL,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_events_time
  ON public.audit_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_resource
  ON public.audit_events(tenant_id, resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor
  ON public.audit_events(tenant_id, actor_type, actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_action
  ON public.audit_events(tenant_id, action);

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Audit events are read-only for authenticated users
CREATE POLICY "Users can view their tenant audit events"
  ON public.audit_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Only system can insert (via service role key)
CREATE POLICY "System can insert audit events"
  ON public.audit_events FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- NO UPDATE OR DELETE POLICIES - Immutable by design

-- C1. Auditor Read-Only Access Table
CREATE TABLE IF NOT EXISTS public.auditor_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  access_scope text[] NOT NULL DEFAULT ARRAY['audit_events', 'reconciliation_links', 'decision_snapshots'],
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auditor_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auditor access"
  ON public.auditor_access FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Audit evidence exports tracking
CREATE TABLE IF NOT EXISTS public.audit_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  export_type text NOT NULL CHECK (export_type IN ('EVENTS', 'EVIDENCE_PACK', 'FULL_AUDIT')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  filters jsonb NULL,
  record_count int NOT NULL DEFAULT 0,
  file_hash text NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  download_url text NULL,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

ALTER TABLE public.audit_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant exports"
  ON public.audit_exports FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create exports"
  ON public.audit_exports FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Function to log audit events (used by triggers and edge functions)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_tenant_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_actor_role text,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_decision_context text DEFAULT NULL,
  p_reason_code text DEFAULT NULL,
  p_reason_detail text DEFAULT NULL,
  p_before_state jsonb DEFAULT NULL,
  p_after_state jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.audit_events (
    tenant_id, actor_type, actor_id, actor_role,
    action, resource_type, resource_id,
    decision_context, reason_code, reason_detail,
    before_state, after_state
  ) VALUES (
    p_tenant_id, p_actor_type, p_actor_id, p_actor_role,
    p_action, p_resource_type, p_resource_id,
    p_decision_context, p_reason_code, p_reason_detail,
    p_before_state, p_after_state
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Trigger function for reconciliation_links audit
CREATE OR REPLACE FUNCTION public.audit_reconciliation_link_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      NEW.tenant_id,
      COALESCE(NEW.created_by_type, 'SYSTEM'),
      NEW.created_by,
      NULL,
      'CREATE_RECONCILIATION',
      'reconciliation_link',
      NEW.id,
      NEW.match_method,
      NULL,
      NULL,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false THEN
    PERFORM public.log_audit_event(
      NEW.tenant_id,
      'USER',
      NEW.voided_by,
      NULL,
      'VOID_RECONCILIATION',
      'reconciliation_link',
      NEW.id,
      'MANUAL_VOID',
      NEW.void_reason,
      NULL,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to reconciliation_links
DROP TRIGGER IF EXISTS trg_audit_reconciliation_links ON public.reconciliation_links;
CREATE TRIGGER trg_audit_reconciliation_links
  AFTER INSERT OR UPDATE ON public.reconciliation_links
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_reconciliation_link_changes();

-- Trigger function for decision_snapshots audit
CREATE OR REPLACE FUNCTION public.audit_decision_snapshot_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      NEW.tenant_id,
      COALESCE(NEW.authority, 'SYSTEM'),
      NULL,
      NULL,
      'CREATE_DECISION_SNAPSHOT',
      'decision_snapshot',
      NEW.id,
      NEW.truth_level,
      NEW.metric_code,
      NULL,
      NULL,
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to decision_snapshots
DROP TRIGGER IF EXISTS trg_audit_decision_snapshots ON public.decision_snapshots;
CREATE TRIGGER trg_audit_decision_snapshots
  AFTER INSERT ON public.decision_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_decision_snapshot_changes();

-- View for audit summary stats
CREATE OR REPLACE VIEW public.v_audit_summary AS
SELECT 
  tenant_id,
  date_trunc('day', created_at) as audit_date,
  action,
  actor_type,
  resource_type,
  count(*) as event_count
FROM public.audit_events
GROUP BY tenant_id, date_trunc('day', created_at), action, actor_type, resource_type;

-- SOC Control attestations table
CREATE TABLE IF NOT EXISTS public.soc_control_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_id text NOT NULL,
  control_name text NOT NULL,
  control_description text NOT NULL,
  implementation_status text NOT NULL CHECK (implementation_status IN ('IMPLEMENTED', 'PARTIAL', 'NOT_IMPLEMENTED', 'NOT_APPLICABLE')),
  evidence_type text NOT NULL,
  evidence_reference text NULL,
  last_tested_at timestamptz NULL,
  tested_by uuid NULL,
  test_result text NULL CHECK (test_result IN ('PASS', 'FAIL', 'PENDING')),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soc_control_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant attestations"
  ON public.soc_control_attestations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage attestations"
  ON public.soc_control_attestations FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Insert default SOC controls
INSERT INTO public.soc_control_attestations (tenant_id, control_id, control_name, control_description, implementation_status, evidence_type)
SELECT 
  t.id,
  c.control_id,
  c.control_name,
  c.control_description,
  'IMPLEMENTED',
  c.evidence_type
FROM public.tenants t
CROSS JOIN (VALUES
  ('CC-1', 'Change Management', 'All changes to ledger are append-only with audit trails', 'audit_events'),
  ('CC-2', 'Least Privilege', 'RLS policies enforce tenant isolation and role-based access', 'rls_policies'),
  ('CC-3', 'Traceability', 'All actions linked via audit_events and derived_from fields', 'audit_events'),
  ('CC-4', 'Automation Risk', 'Guardrails and ML kill-switch prevent unsafe automation', 'guardrail_events'),
  ('CC-5', 'Data Integrity', 'UUID primary keys and immutable ledger design', 'reconciliation_links'),
  ('CC-6', 'Access Logging', 'All financial actions logged with actor and timestamp', 'audit_events'),
  ('CC-7', 'Separation of Duties', 'Auditors have read-only access, operators cannot void without reason', 'auditor_access')
) AS c(control_id, control_name, control_description, evidence_type)
ON CONFLICT DO NOTHING;