-- Create alert escalation rules table
CREATE TABLE public.alert_escalation_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    escalate_after_minutes INTEGER NOT NULL DEFAULT 30,
    escalate_to_role TEXT NOT NULL DEFAULT 'manager',
    notify_channels JSONB NOT NULL DEFAULT '["email", "push"]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert digest configs table  
CREATE TABLE public.alert_digest_configs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    daily_enabled BOOLEAN NOT NULL DEFAULT true,
    daily_time TIME NOT NULL DEFAULT '08:00',
    weekly_enabled BOOLEAN NOT NULL DEFAULT true,
    weekly_day INTEGER NOT NULL DEFAULT 1,
    weekly_time TIME NOT NULL DEFAULT '09:00',
    include_resolved BOOLEAN NOT NULL DEFAULT true,
    include_summary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.alert_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_digest_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for escalation rules
CREATE POLICY "Users can view escalation rules for their tenant" 
ON public.alert_escalation_rules FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create escalation rules for their tenant" 
ON public.alert_escalation_rules FOR INSERT 
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update escalation rules for their tenant" 
ON public.alert_escalation_rules FOR UPDATE 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete escalation rules for their tenant" 
ON public.alert_escalation_rules FOR DELETE 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS policies for digest configs
CREATE POLICY "Users can view digest configs for their tenant" 
ON public.alert_digest_configs FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create digest configs for their tenant" 
ON public.alert_digest_configs FOR INSERT 
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update digest configs for their tenant" 
ON public.alert_digest_configs FOR UPDATE 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Create indexes
CREATE INDEX idx_alert_escalation_rules_tenant ON public.alert_escalation_rules(tenant_id);
CREATE INDEX idx_alert_escalation_rules_severity ON public.alert_escalation_rules(severity);
CREATE INDEX idx_alert_digest_configs_tenant ON public.alert_digest_configs(tenant_id);

-- Create trigger for updated_at
CREATE TRIGGER update_alert_escalation_rules_updated_at
BEFORE UPDATE ON public.alert_escalation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alert_digest_configs_updated_at
BEFORE UPDATE ON public.alert_digest_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();