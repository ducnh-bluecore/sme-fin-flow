-- Create notification recipients table
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  slack_user_id TEXT,
  role TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies using tenant_users
CREATE POLICY "Users can view notification recipients in their tenant"
  ON public.notification_recipients FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert notification recipients in their tenant"
  ON public.notification_recipients FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update notification recipients in their tenant"
  ON public.notification_recipients FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete notification recipients in their tenant"
  ON public.notification_recipients FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Create extended alert configurations table
CREATE TABLE IF NOT EXISTS public.extended_alert_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  enabled BOOLEAN DEFAULT true,
  threshold_value NUMERIC,
  threshold_unit TEXT,
  threshold_operator TEXT DEFAULT 'less_than',
  title TEXT NOT NULL,
  description TEXT,
  recipient_role TEXT NOT NULL DEFAULT 'general',
  notify_email BOOLEAN DEFAULT true,
  notify_slack BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  notify_immediately BOOLEAN DEFAULT true,
  notify_in_daily_digest BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, category, alert_type)
);

-- Enable RLS
ALTER TABLE public.extended_alert_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view extended alert configs in their tenant"
  ON public.extended_alert_configs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert extended alert configs in their tenant"
  ON public.extended_alert_configs FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update extended alert configs in their tenant"
  ON public.extended_alert_configs FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete extended alert configs in their tenant"
  ON public.extended_alert_configs FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_notification_recipients_updated_at
  BEFORE UPDATE ON public.notification_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extended_alert_configs_updated_at
  BEFORE UPDATE ON public.extended_alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();