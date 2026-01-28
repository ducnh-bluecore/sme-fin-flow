-- ============================================================
-- PHASE 1.3: ALERT ESCALATION - Move logic from frontend to DB
-- Fixed: Handle existing view with different column names
-- ============================================================

-- 1. Create escalations tracking table if not exists
CREATE TABLE IF NOT EXISTS public.alert_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_id uuid NOT NULL REFERENCES public.alert_instances(id) ON DELETE CASCADE,
  escalated_at timestamptz DEFAULT now(),
  escalated_to_role text NOT NULL,
  escalation_reason text,
  original_owner text,
  resolution_status text DEFAULT 'pending',
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already
ALTER TABLE public.alert_escalations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own tenant escalations" ON public.alert_escalations;
DROP POLICY IF EXISTS "Users can manage own tenant escalations" ON public.alert_escalations;

-- Create RLS policies
CREATE POLICY "Users can view own tenant escalations"
  ON public.alert_escalations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own tenant escalations"
  ON public.alert_escalations FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 2. Drop existing view and recreate with new schema
DROP VIEW IF EXISTS public.v_alerts_pending_escalation CASCADE;

CREATE VIEW public.v_alerts_pending_escalation AS
SELECT 
  a.id,
  a.tenant_id,
  a.title,
  a.severity,
  a.status,
  a.created_at,
  a.acknowledged_at,
  a.assigned_to,
  a.deadline_at,
  EXTRACT(EPOCH FROM (now() - a.created_at)) / 3600 as age_hours,
  er.escalate_after_minutes,
  er.escalate_to_role,
  er.notify_channels,
  CASE 
    WHEN a.status = 'resolved' THEN false
    WHEN a.acknowledged_at IS NOT NULL THEN false
    WHEN er.escalate_after_minutes IS NULL THEN false
    WHEN EXTRACT(EPOCH FROM (now() - a.created_at)) / 60 > er.escalate_after_minutes THEN true
    ELSE false
  END as should_escalate,
  EXISTS (
    SELECT 1 FROM alert_escalations ae 
    WHERE ae.alert_id = a.id 
    AND ae.resolution_status = 'pending'
  ) as is_escalated
FROM alert_instances a
LEFT JOIN alert_escalation_rules er 
  ON a.tenant_id = er.tenant_id 
  AND a.severity = er.severity 
  AND er.is_active = true
WHERE a.status IN ('active', 'open', 'pending', 'escalated');

-- 3. Create auto-escalation function
CREATE OR REPLACE FUNCTION public.auto_escalate_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_rec RECORD;
BEGIN
  FOR alert_rec IN 
    SELECT id, tenant_id, title, severity, escalate_to_role, notify_channels, age_hours
    FROM v_alerts_pending_escalation
    WHERE should_escalate = true AND is_escalated = false
  LOOP
    INSERT INTO alert_escalations (tenant_id, alert_id, escalated_to_role, escalation_reason)
    VALUES (
      alert_rec.tenant_id,
      alert_rec.id,
      alert_rec.escalate_to_role,
      format('Auto-escalated after %s hours. Severity: %s', round(alert_rec.age_hours::numeric, 1), alert_rec.severity)
    );
    
    UPDATE alert_instances 
    SET status = 'escalated', updated_at = now()
    WHERE id = alert_rec.id;
  END LOOP;
END;
$$;

-- 4. Create trigger function
CREATE OR REPLACE FUNCTION public.check_alert_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_rec RECORD;
  age_minutes numeric;
BEGIN
  IF NEW.status IN ('resolved', 'closed') THEN
    RETURN NEW;
  END IF;
  
  SELECT * INTO rule_rec
  FROM alert_escalation_rules
  WHERE tenant_id = NEW.tenant_id AND severity = NEW.severity AND is_active = true
  LIMIT 1;
  
  IF rule_rec IS NULL THEN
    RETURN NEW;
  END IF;
  
  age_minutes := EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 60;
  
  IF age_minutes > rule_rec.escalate_after_minutes 
     AND NEW.acknowledged_at IS NULL 
     AND NOT EXISTS (SELECT 1 FROM alert_escalations WHERE alert_id = NEW.id AND resolution_status = 'pending')
  THEN
    INSERT INTO alert_escalations (tenant_id, alert_id, escalated_to_role, escalation_reason)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      rule_rec.escalate_to_role,
      format('Auto-escalated: %s severity, %s minutes old', NEW.severity, round(age_minutes))
    );
    NEW.status := 'escalated';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger
DROP TRIGGER IF EXISTS trigger_check_alert_escalation ON alert_instances;
CREATE TRIGGER trigger_check_alert_escalation
  BEFORE UPDATE ON alert_instances
  FOR EACH ROW
  EXECUTE FUNCTION check_alert_escalation();

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_alert_escalations_alert_id ON public.alert_escalations(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_escalations_tenant_status ON public.alert_escalations(tenant_id, resolution_status);

-- 7. Grant permissions
GRANT SELECT ON public.v_alerts_pending_escalation TO authenticated;
GRANT ALL ON public.alert_escalations TO authenticated;