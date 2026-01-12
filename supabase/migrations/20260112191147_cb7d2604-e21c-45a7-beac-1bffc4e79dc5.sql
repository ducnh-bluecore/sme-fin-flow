-- Phase 1: Add impact_amount and deadline fields to alert_instances
ALTER TABLE public.alert_instances 
ADD COLUMN IF NOT EXISTS impact_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS impact_currency text DEFAULT 'VND',
ADD COLUMN IF NOT EXISTS deadline_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS time_to_resolve_hours integer,
ADD COLUMN IF NOT EXISTS impact_description text;

-- Add index for quick filtering by impact
CREATE INDEX IF NOT EXISTS idx_alert_instances_impact ON public.alert_instances(impact_amount DESC) WHERE status = 'active';

-- Add index for deadline alerts
CREATE INDEX IF NOT EXISTS idx_alert_instances_deadline ON public.alert_instances(deadline_at) WHERE status = 'active' AND deadline_at IS NOT NULL;

-- Phase 2: Create cross-domain alert rules table for complex multi-metric conditions
CREATE TABLE IF NOT EXISTS public.cross_domain_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  rule_code text NOT NULL UNIQUE,
  description text,
  is_enabled boolean DEFAULT true,
  severity text DEFAULT 'warning',
  
  -- Multi-condition logic
  conditions jsonb NOT NULL DEFAULT '[]',
  -- Example: [
  --   {"metric": "ads_spend_change", "operator": ">", "value": 20, "period": "7d"},
  --   {"metric": "contribution_margin_change", "operator": "<", "value": 0, "period": "7d"}
  -- ]
  
  condition_logic text DEFAULT 'AND', -- AND, OR
  
  -- Impact calculation
  impact_formula text, -- e.g., "ads_spend * 0.5" or "inventory_value * days_excess / 30"
  impact_unit text DEFAULT 'VND',
  
  -- Alert template
  alert_title_template text NOT NULL,
  alert_message_template text NOT NULL,
  suggested_action text,
  
  -- Timing
  check_frequency_minutes integer DEFAULT 60,
  last_checked_at timestamp with time zone,
  cooldown_minutes integer DEFAULT 1440, -- Don't re-alert for 24h by default
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cross_domain_alert_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant cross_domain_alert_rules"
ON public.cross_domain_alert_rules FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert cross_domain_alert_rules for their tenant"
ON public.cross_domain_alert_rules FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant cross_domain_alert_rules"
ON public.cross_domain_alert_rules FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant cross_domain_alert_rules"
ON public.cross_domain_alert_rules FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Create index
CREATE INDEX IF NOT EXISTS idx_cross_domain_rules_tenant ON public.cross_domain_alert_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cross_domain_rules_enabled ON public.cross_domain_alert_rules(is_enabled) WHERE is_enabled = true;

-- Add trigger for updated_at
CREATE TRIGGER update_cross_domain_alert_rules_updated_at
BEFORE UPDATE ON public.cross_domain_alert_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();