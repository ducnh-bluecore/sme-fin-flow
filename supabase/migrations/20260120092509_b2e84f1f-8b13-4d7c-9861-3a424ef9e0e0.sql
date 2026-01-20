
-- ============================================================
-- SOC / AUDIT & ENTERPRISE POLICIES - Adapted to existing schemas
-- ============================================================

-- 1) Insert example enterprise policies for tenants that don't have one
INSERT INTO public.enterprise_policies (
  tenant_id, policy_name, policy_type, condition, required_approvals, approver_roles, priority, enabled
)
SELECT DISTINCT
  eo.tenant_id,
  'High Value Reconciliation Approval',
  'auto_reconciliation',
  jsonb_build_object('amount_gt', 50000000),
  1,
  ARRAY['cfo', 'admin'],
  1,
  true
FROM public.external_orders eo
WHERE NOT EXISTS (
  SELECT 1 FROM public.enterprise_policies ep 
  WHERE ep.tenant_id = eo.tenant_id 
    AND ep.policy_type = 'auto_reconciliation'
);

-- 2) Approval Evidence Pack materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_audit_approval_evidence AS
SELECT
  ar.id AS approval_request_id,
  ar.tenant_id,
  ar.policy_id,
  ar.action,
  ar.resource_type,
  ar.resource_id,
  ar.resource_data,
  ar.required_approvals,
  ar.current_approvals,
  ar.requested_by,
  ar.status,
  ar.created_at AS requested_at,
  ar.resolved_at,
  ad.id AS decision_id,
  ad.decided_by,
  ad.decision,
  ad.comment AS decision_comment,
  ad.decided_at
FROM public.approval_requests ar
LEFT JOIN public.approval_decisions ad ON ad.approval_request_id = ar.id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_audit_approval_evidence
ON public.mv_audit_approval_evidence (approval_request_id, decision_id);

-- 3) SOC Control Mapping table
CREATE TABLE IF NOT EXISTS public.soc_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  control_code text NOT NULL,
  control_name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'CC',
  mapped_table text NOT NULL,
  mapped_column text,
  validation_query text,
  is_active boolean NOT NULL DEFAULT true,
  last_validated_at timestamptz,
  validation_status text CHECK (validation_status IN ('pass','fail','pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (control_code, tenant_id)
);

ALTER TABLE public.soc_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SOC controls"
  ON public.soc_controls FOR SELECT
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 4) Insert SOC control mappings
INSERT INTO public.soc_controls (control_code, control_name, description, category, mapped_table)
VALUES
  ('CC-01', 'Automated Reconciliation', 'System enforces matching rules before ledger writes', 'CC', 'reconciliation_links'),
  ('CC-02', 'Segregation of Duties', 'Approval workflow prevents self-approval of sensitive actions', 'CC', 'approval_decisions'),
  ('CC-03', 'Audit Trail Immutability', 'All financial actions logged to append-only audit ledger', 'CC', 'audit_events'),
  ('CC-04', 'ML Kill-Switch', 'System auto-disables ML on critical drift detection', 'CC', 'tenant_ml_settings'),
  ('CC-05', 'Risk Appetite Enforcement', 'Automatic enforcement actions when thresholds breached', 'CC', 'risk_breach_events'),
  ('CC-06', 'Guardrail Blocks', 'Policy-based blocks on high-risk automated actions', 'CC', 'enterprise_policies')
ON CONFLICT DO NOTHING;

-- 5) SOC Validation Log table
CREATE TABLE IF NOT EXISTS public.soc_validation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  control_id uuid REFERENCES public.soc_controls(id),
  validation_result text NOT NULL CHECK (validation_result IN ('pass','fail','warning')),
  evidence_hash text,
  validated_by text NOT NULL DEFAULT 'SYSTEM',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soc_validation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant SOC validation logs"
  ON public.soc_validation_logs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_soc_controls_code ON public.soc_controls (control_code);
CREATE INDEX IF NOT EXISTS idx_soc_validation_logs_tenant ON public.soc_validation_logs (tenant_id, created_at);
