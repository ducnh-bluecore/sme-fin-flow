
-- ============================================================
-- 6.1 Seed enterprise policies (skip if exists)
-- ============================================================
INSERT INTO public.enterprise_policies (tenant_id, policy_name, policy_type, condition, required_approvals, approver_roles, priority, enabled, created_by)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Exception Resolution Policy',
  'EXCEPTION_RESOLUTION',
  jsonb_build_object('severity', 'CRITICAL'),
  1,
  ARRAY['CFO'],
  4,
  true,
  '283eb81f-18b3-4628-a81d-341a8f8cff9f'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.enterprise_policies
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
    AND policy_type = 'EXCEPTION_RESOLUTION'
);

-- ============================================================
-- 6.2 Seed SOC controls registry
-- ============================================================
INSERT INTO public.soc_controls (tenant_id, control_code, control_name, description, category, mapped_table, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'CC-01', 'Append-Only Ledger', 'Reconciliation is append-only ledger', 'DATA_INTEGRITY', 'reconciliation_links', true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'CC-02', 'Settlement Tracking', 'Settlements tracked as allocations', 'DATA_INTEGRITY', 'settlement_allocations', true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'CC-03', 'Audit Logging', 'Auto actions logged with actor and meta', 'AUDIT', 'audit_events', true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'CC-04', 'Risk Breach Recording', 'Risk appetite evaluated and breaches recorded', 'RISK', 'risk_breach_events', true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'CC-05', 'ML Kill-Switch', 'ML opt-in + drift kill-switch', 'ML_GOVERNANCE', 'tenant_ml_settings', true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'CC-06', 'Segregation of Duties', 'Approval segregation of duties', 'ACCESS_CONTROL', 'approval_decisions', true)
ON CONFLICT (control_code, tenant_id) DO NOTHING;

-- ============================================================
-- 6.3 Evidence pack views (using correct column names)
-- ============================================================
CREATE OR REPLACE VIEW public.v_audit_auto_reconcile_evidence AS
SELECT
  ae.tenant_id,
  ae.created_at,
  ae.actor_type,
  ae.actor_service_id,
  ae.action,
  ae.resource_type AS entity_type,
  ae.resource_id AS entity_id,
  ae.before_state,
  ae.after_state
FROM public.audit_events ae
WHERE ae.action = 'AUTO_RECONCILE';

CREATE OR REPLACE VIEW public.v_audit_risk_breaches AS
SELECT
  rbe.tenant_id,
  rbe.breached_at AS detected_at,
  rbe.metric_code,
  rbe.metric_value,
  rbe.threshold,
  rbe.severity,
  rbe.is_resolved,
  rbe.action_taken
FROM public.risk_breach_events rbe;
