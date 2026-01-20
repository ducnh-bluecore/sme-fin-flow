-- A1. Table: enterprise_policies
CREATE TABLE IF NOT EXISTS public.enterprise_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  policy_name text NOT NULL,
  policy_type text NOT NULL CHECK (policy_type IN (
    'AUTO_RECONCILIATION',
    'MANUAL_RECONCILIATION', 
    'VOID_RECONCILIATION',
    'ML_ENABLEMENT',
    'LARGE_PAYMENT',
    'EXCEPTION_RESOLUTION'
  )),
  
  condition jsonb NOT NULL,
  required_approvals int NOT NULL DEFAULT 1,
  approver_roles text[] NOT NULL DEFAULT ARRAY['owner', 'admin'],
  
  priority int NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  
  created_by uuid NOT NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policies_tenant_type
  ON public.enterprise_policies(tenant_id, policy_type, enabled);

ALTER TABLE public.enterprise_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant policies"
  ON public.enterprise_policies FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage policies"
  ON public.enterprise_policies FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- B1. Table: approval_requests
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  policy_id uuid NOT NULL REFERENCES public.enterprise_policies(id),
  
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NULL,
  resource_data jsonb NULL,
  
  required_approvals int NOT NULL DEFAULT 1,
  current_approvals int NOT NULL DEFAULT 0,
  
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  
  expires_at timestamptz NULL,
  resolved_at timestamptz NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON public.approval_requests(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_requests_resource
  ON public.approval_requests(tenant_id, resource_type, resource_id);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant approval requests"
  ON public.approval_requests FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create approval requests"
  ON public.approval_requests FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update approval requests"
  ON public.approval_requests FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- B2. Table: approval_decisions
CREATE TABLE IF NOT EXISTS public.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  approval_request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  
  decided_by uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject')),
  comment text NULL,
  
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_decisions_request
  ON public.approval_decisions(approval_request_id);

ALTER TABLE public.approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant approval decisions"
  ON public.approval_decisions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Approvers can create decisions"
  ON public.approval_decisions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Function to check if action requires approval
CREATE OR REPLACE FUNCTION public.check_policy_approval(
  p_tenant_id uuid,
  p_policy_type text,
  p_context jsonb
)
RETURNS TABLE (
  requires_approval boolean,
  policy_id uuid,
  policy_name text,
  required_approvals int,
  approver_roles text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as requires_approval,
    ep.id as policy_id,
    ep.policy_name,
    ep.required_approvals,
    ep.approver_roles
  FROM public.enterprise_policies ep
  WHERE ep.tenant_id = p_tenant_id
    AND ep.policy_type = p_policy_type
    AND ep.enabled = true
    AND (
      -- Amount condition
      (ep.condition->>'amount_gt' IS NOT NULL 
       AND (p_context->>'amount')::numeric > (ep.condition->>'amount_gt')::numeric)
      OR
      (ep.condition->>'amount_gte' IS NOT NULL 
       AND (p_context->>'amount')::numeric >= (ep.condition->>'amount_gte')::numeric)
      OR
      -- Always require approval
      (ep.condition->>'always' IS NOT NULL AND (ep.condition->>'always')::boolean = true)
      OR
      -- Confidence threshold
      (ep.condition->>'confidence_lt' IS NOT NULL 
       AND (p_context->>'confidence')::numeric < (ep.condition->>'confidence_lt')::numeric)
      OR
      -- Risk level
      (ep.condition->>'risk_level' IS NOT NULL 
       AND p_context->>'risk_level' = ep.condition->>'risk_level')
    )
  ORDER BY ep.priority ASC
  LIMIT 1;
  
  -- If no matching policy, return no approval required
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, 0, NULL::text[];
  END IF;
END;
$$;

-- Function to process approval decision
CREATE OR REPLACE FUNCTION public.process_approval_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_new_status text;
BEGIN
  -- Get the approval request
  SELECT * INTO v_request
  FROM public.approval_requests
  WHERE id = NEW.approval_request_id;
  
  IF NEW.decision = 'reject' THEN
    -- Immediate rejection
    v_new_status := 'rejected';
  ELSE
    -- Check if we have enough approvals
    IF v_request.current_approvals + 1 >= v_request.required_approvals THEN
      v_new_status := 'approved';
    ELSE
      v_new_status := 'pending';
    END IF;
  END IF;
  
  -- Update request
  UPDATE public.approval_requests
  SET 
    current_approvals = CASE WHEN NEW.decision = 'approve' THEN current_approvals + 1 ELSE current_approvals END,
    status = v_new_status,
    resolved_at = CASE WHEN v_new_status IN ('approved', 'rejected') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = NEW.approval_request_id;
  
  -- Log audit event
  PERFORM public.log_audit_event(
    v_request.tenant_id,
    'USER',
    NEW.decided_by,
    NULL,
    'APPROVAL_DECISION',
    'approval_request',
    NEW.approval_request_id,
    NEW.decision,
    NULL,
    NEW.comment,
    NULL,
    jsonb_build_object('decision', NEW.decision, 'new_status', v_new_status)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for approval decisions
DROP TRIGGER IF EXISTS trg_process_approval_decision ON public.approval_decisions;
CREATE TRIGGER trg_process_approval_decision
  AFTER INSERT ON public.approval_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_approval_decision();

-- Insert default policies for new tenants
CREATE OR REPLACE FUNCTION public.create_default_policies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-reconciliation > 100M requires approval
  INSERT INTO public.enterprise_policies (
    tenant_id, policy_name, policy_type, condition, required_approvals, approver_roles, created_by
  ) VALUES (
    NEW.id,
    'Large Auto-Reconciliation Review',
    'AUTO_RECONCILIATION',
    '{"amount_gt": 100000000}'::jsonb,
    1,
    ARRAY['owner', 'admin'],
    NEW.id
  );
  
  -- Void reconciliation always requires approval
  INSERT INTO public.enterprise_policies (
    tenant_id, policy_name, policy_type, condition, required_approvals, approver_roles, created_by
  ) VALUES (
    NEW.id,
    'Void Reconciliation Approval',
    'VOID_RECONCILIATION', 
    '{"always": true}'::jsonb,
    2,
    ARRAY['owner'],
    NEW.id
  );
  
  -- ML enablement requires CFO approval
  INSERT INTO public.enterprise_policies (
    tenant_id, policy_name, policy_type, condition, required_approvals, approver_roles, created_by
  ) VALUES (
    NEW.id,
    'ML Feature Enablement',
    'ML_ENABLEMENT',
    '{"always": true}'::jsonb,
    1,
    ARRAY['owner'],
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create default policies for new tenants
DROP TRIGGER IF EXISTS trg_create_default_policies ON public.tenants;
CREATE TRIGGER trg_create_default_policies
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_policies();

-- View for pending approvals with details
CREATE OR REPLACE VIEW public.v_pending_approvals AS
SELECT 
  ar.id,
  ar.tenant_id,
  ar.policy_id,
  ep.policy_name,
  ep.policy_type,
  ar.action,
  ar.resource_type,
  ar.resource_id,
  ar.resource_data,
  ar.required_approvals,
  ar.current_approvals,
  ar.requested_by,
  p.full_name as requester_name,
  ar.status,
  ar.expires_at,
  ar.created_at,
  (ar.required_approvals - ar.current_approvals) as approvals_remaining
FROM public.approval_requests ar
JOIN public.enterprise_policies ep ON ar.policy_id = ep.id
LEFT JOIN public.profiles p ON ar.requested_by = p.id
WHERE ar.status = 'pending';