-- ================================================
-- INACTION-BASED ESCALATION SYSTEM
-- ================================================

-- Add escalation tracking to early_warning_alerts
ALTER TABLE public.early_warning_alerts 
ADD COLUMN IF NOT EXISTS current_owner_role TEXT DEFAULT 'CFO',
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalated_from_role TEXT,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
ADD COLUMN IF NOT EXISTS decision_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS escalation_history JSONB DEFAULT '[]';

-- Table: escalation_policies
CREATE TABLE IF NOT EXISTS public.escalation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  policy_name TEXT NOT NULL,
  from_role TEXT NOT NULL, -- 'CFO', 'COO', 'CMO'
  to_role TEXT NOT NULL,   -- 'CEO'
  
  -- Time triggers (in hours)
  unacknowledged_threshold_hours INTEGER DEFAULT 4,
  no_decision_threshold_hours INTEGER DEFAULT 24,
  
  -- Conditions
  min_exposure_amount NUMERIC, -- Only escalate if exposure > X
  applies_to_hierarchy_levels INTEGER[], -- e.g., {1,2} for Cash & CM only
  
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, from_role, to_role)
);

-- Table: escalation_events (audit trail)
CREATE TABLE IF NOT EXISTS public.escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  alert_id UUID NOT NULL REFERENCES public.early_warning_alerts(id),
  policy_id UUID REFERENCES public.escalation_policies(id),
  
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  escalation_reason TEXT NOT NULL, -- 'unacknowledged', 'no_decision'
  hours_elapsed NUMERIC,
  exposure_at_escalation NUMERIC,
  
  escalated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  notification_channel TEXT -- 'email', 'slack', 'push'
);

-- Enable RLS
ALTER TABLE public.escalation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for escalation_policies" 
  ON public.escalation_policies FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for escalation_events" 
  ON public.escalation_events FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Insert default escalation policies for all tenants
INSERT INTO public.escalation_policies (
  tenant_id, policy_name, from_role, to_role,
  unacknowledged_threshold_hours, no_decision_threshold_hours,
  min_exposure_amount, applies_to_hierarchy_levels
)
SELECT 
  t.id,
  'CFO → CEO Escalation',
  'CFO', 'CEO',
  4,  -- 4 hours unacknowledged
  24, -- 24 hours no decision
  100000000, -- 100M VND minimum
  ARRAY[1, 2] -- Cash and CM alerts only
FROM public.tenants t
ON CONFLICT (tenant_id, from_role, to_role) DO NOTHING;

INSERT INTO public.escalation_policies (
  tenant_id, policy_name, from_role, to_role,
  unacknowledged_threshold_hours, no_decision_threshold_hours,
  min_exposure_amount, applies_to_hierarchy_levels
)
SELECT 
  t.id,
  'COO → CEO Escalation',
  'COO', 'CEO',
  6,  -- 6 hours unacknowledged
  48, -- 48 hours no decision
  200000000, -- 200M VND minimum
  ARRAY[3, 4] -- Unit Economics and SKU alerts
FROM public.tenants t
ON CONFLICT (tenant_id, from_role, to_role) DO NOTHING;

INSERT INTO public.escalation_policies (
  tenant_id, policy_name, from_role, to_role,
  unacknowledged_threshold_hours, no_decision_threshold_hours,
  min_exposure_amount, applies_to_hierarchy_levels
)
SELECT 
  t.id,
  'CMO → CEO Escalation',
  'CMO', 'CEO',
  8,  -- 8 hours unacknowledged
  72, -- 72 hours no decision  
  300000000, -- 300M VND minimum
  ARRAY[5, 6] -- Channel and Campaign alerts
FROM public.tenants t
ON CONFLICT (tenant_id, from_role, to_role) DO NOTHING;

-- Function: Check and execute escalations
CREATE OR REPLACE FUNCTION check_alert_escalations(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert RECORD;
  v_policy RECORD;
  v_hours_since_created NUMERIC;
  v_hours_since_acknowledged NUMERIC;
  v_should_escalate BOOLEAN;
  v_reason TEXT;
  v_escalated_count INTEGER := 0;
  v_checked_count INTEGER := 0;
BEGIN
  -- Loop through active, non-escalated alerts
  FOR v_alert IN
    SELECT *
    FROM early_warning_alerts
    WHERE tenant_id = p_tenant_id
      AND status = 'active'
      AND escalation_level = 0
      AND parent_alert_id IS NULL -- Only top-level alerts
    ORDER BY exposure_amount DESC NULLS LAST
  LOOP
    v_checked_count := v_checked_count + 1;
    v_should_escalate := false;
    v_reason := NULL;
    
    -- Find applicable policy
    SELECT * INTO v_policy
    FROM escalation_policies
    WHERE tenant_id = p_tenant_id
      AND from_role = v_alert.current_owner_role
      AND is_enabled = true
      AND (applies_to_hierarchy_levels IS NULL 
           OR v_alert.hierarchy_level = ANY(applies_to_hierarchy_levels))
      AND (min_exposure_amount IS NULL 
           OR COALESCE(v_alert.exposure_amount, 0) >= min_exposure_amount)
    LIMIT 1;
    
    IF v_policy IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Calculate hours elapsed
    v_hours_since_created := EXTRACT(EPOCH FROM (now() - v_alert.created_at)) / 3600;
    
    -- Check escalation conditions
    IF v_alert.acknowledged_at IS NULL THEN
      -- Not acknowledged
      IF v_hours_since_created >= v_policy.unacknowledged_threshold_hours THEN
        v_should_escalate := true;
        v_reason := 'unacknowledged_' || v_policy.unacknowledged_threshold_hours || 'h';
      END IF;
    ELSE
      -- Acknowledged but no decision
      v_hours_since_acknowledged := EXTRACT(EPOCH FROM (now() - v_alert.acknowledged_at)) / 3600;
      IF v_hours_since_acknowledged >= v_policy.no_decision_threshold_hours 
         AND v_alert.resolved_at IS NULL THEN
        v_should_escalate := true;
        v_reason := 'no_decision_' || v_policy.no_decision_threshold_hours || 'h';
      END IF;
    END IF;
    
    -- Execute escalation
    IF v_should_escalate THEN
      -- Update alert
      UPDATE early_warning_alerts
      SET current_owner_role = v_policy.to_role,
          escalation_level = escalation_level + 1,
          escalated_at = now(),
          escalated_from_role = v_alert.current_owner_role,
          escalation_reason = v_reason,
          escalation_history = escalation_history || jsonb_build_object(
            'from', v_alert.current_owner_role,
            'to', v_policy.to_role,
            'reason', v_reason,
            'at', now(),
            'hours_elapsed', CASE 
              WHEN v_alert.acknowledged_at IS NULL THEN v_hours_since_created
              ELSE v_hours_since_acknowledged
            END
          ),
          updated_at = now()
      WHERE id = v_alert.id;
      
      -- Log escalation event
      INSERT INTO escalation_events (
        tenant_id, alert_id, policy_id,
        from_role, to_role, escalation_reason,
        hours_elapsed, exposure_at_escalation
      ) VALUES (
        p_tenant_id, v_alert.id, v_policy.id,
        v_alert.current_owner_role, v_policy.to_role, v_reason,
        CASE WHEN v_alert.acknowledged_at IS NULL THEN v_hours_since_created ELSE v_hours_since_acknowledged END,
        v_alert.exposure_amount
      );
      
      v_escalated_count := v_escalated_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'checked', v_checked_count,
    'escalated', v_escalated_count,
    'tenant_id', p_tenant_id,
    'checked_at', now()
  );
END;
$$;

-- View: Alerts pending escalation (for monitoring)
CREATE OR REPLACE VIEW v_alerts_pending_escalation AS
SELECT 
  ewa.id,
  ewa.tenant_id,
  ewa.title,
  ewa.current_owner_role,
  ewa.exposure_amount,
  ewa.hierarchy_level,
  ewa.created_at,
  ewa.acknowledged_at,
  EXTRACT(EPOCH FROM (now() - ewa.created_at)) / 3600 as hours_since_created,
  EXTRACT(EPOCH FROM (now() - COALESCE(ewa.acknowledged_at, ewa.created_at))) / 3600 as hours_since_last_action,
  ep.unacknowledged_threshold_hours,
  ep.no_decision_threshold_hours,
  ep.to_role as escalates_to,
  CASE 
    WHEN ewa.acknowledged_at IS NULL THEN
      ep.unacknowledged_threshold_hours - EXTRACT(EPOCH FROM (now() - ewa.created_at)) / 3600
    ELSE
      ep.no_decision_threshold_hours - EXTRACT(EPOCH FROM (now() - ewa.acknowledged_at)) / 3600
  END as hours_until_escalation
FROM early_warning_alerts ewa
LEFT JOIN escalation_policies ep ON ep.tenant_id = ewa.tenant_id
  AND ep.from_role = ewa.current_owner_role
  AND ep.is_enabled = true
WHERE ewa.status = 'active'
  AND ewa.escalation_level = 0
  AND ewa.parent_alert_id IS NULL
ORDER BY hours_until_escalation ASC NULLS LAST;