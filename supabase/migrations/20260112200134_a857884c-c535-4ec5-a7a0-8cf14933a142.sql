-- Bảng liên kết rule với người nhận thông báo
CREATE TABLE IF NOT EXISTS public.alert_rule_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.intelligent_alert_rules(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.notification_recipients(id) ON DELETE CASCADE,
  notify_on_critical BOOLEAN DEFAULT true,
  notify_on_warning BOOLEAN DEFAULT true,
  notify_on_info BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rule_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.alert_rule_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant rule recipients"
  ON public.alert_rule_recipients FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant rule recipients"
  ON public.alert_rule_recipients FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_alert_rule_recipients_rule ON public.alert_rule_recipients(rule_id);
CREATE INDEX idx_alert_rule_recipients_recipient ON public.alert_rule_recipients(recipient_id);