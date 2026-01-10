
-- =====================================================
-- ALERT DATA SOURCES - Nguồn dữ liệu cảnh báo
-- =====================================================
CREATE TABLE public.alert_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'connector', 'bigquery', 'manual', 'api', 'webhook'
  source_name TEXT NOT NULL,
  source_config JSONB DEFAULT '{}',
  connector_integration_id UUID REFERENCES public.connector_integrations(id) ON DELETE SET NULL,
  sync_frequency_minutes INTEGER DEFAULT 60,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
  error_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ALERT OBJECTS - Đối tượng được giám sát
-- =====================================================
CREATE TABLE public.alert_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  data_source_id UUID REFERENCES public.alert_data_sources(id) ON DELETE SET NULL,
  object_type TEXT NOT NULL, -- 'product', 'order', 'customer', 'store', 'inventory', 'cashflow', 'kpi', 'channel'
  object_category TEXT, -- sub-category
  external_id TEXT, -- ID từ nguồn bên ngoài
  object_name TEXT NOT NULL,
  object_data JSONB DEFAULT '{}', -- Dữ liệu đầy đủ của object
  current_metrics JSONB DEFAULT '{}', -- Metric hiện tại
  previous_metrics JSONB DEFAULT '{}', -- Metric kỳ trước (để so sánh)
  threshold_overrides JSONB DEFAULT '{}', -- Override threshold cho object cụ thể
  alert_status TEXT DEFAULT 'normal', -- 'normal', 'warning', 'critical', 'acknowledged'
  last_alert_at TIMESTAMP WITH TIME ZONE,
  is_monitored BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, object_type, external_id)
);

-- =====================================================
-- ALERT OBJECT METRICS - Lịch sử metric của đối tượng
-- =====================================================
CREATE TABLE public.alert_object_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_object_id UUID NOT NULL REFERENCES public.alert_objects(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- 'stock_quantity', 'revenue', 'margin', 'order_count', etc.
  metric_value NUMERIC,
  metric_unit TEXT, -- 'count', 'percentage', 'amount', 'days', 'hours'
  metric_period TEXT, -- 'realtime', 'hourly', 'daily', 'weekly', 'monthly'
  comparison_value NUMERIC, -- Giá trị kỳ trước để so sánh
  change_percent NUMERIC, -- % thay đổi
  threshold_config_id UUID REFERENCES public.extended_alert_configs(id) ON DELETE SET NULL,
  is_threshold_breached BOOLEAN DEFAULT false,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ALERT INSTANCES - Các cảnh báo thực tế
-- =====================================================
CREATE TABLE public.alert_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_config_id UUID REFERENCES public.extended_alert_configs(id) ON DELETE SET NULL,
  alert_object_id UUID REFERENCES public.alert_objects(id) ON DELETE SET NULL,
  data_source_id UUID REFERENCES public.alert_data_sources(id) ON DELETE SET NULL,
  
  -- Alert info
  alert_type TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  
  -- Object context
  object_type TEXT,
  object_name TEXT,
  external_object_id TEXT,
  
  -- Metric info
  metric_name TEXT,
  current_value NUMERIC,
  threshold_value NUMERIC,
  threshold_operator TEXT, -- 'less_than', 'greater_than', 'equals'
  change_percent NUMERIC,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'snoozed'
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
  
  -- Notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_channels JSONB DEFAULT '[]', -- ['email', 'slack', 'push', 'sms']
  sent_to JSONB DEFAULT '[]', -- user IDs or emails
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Snooze
  snoozed_until TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  related_alerts UUID[], -- Các alert liên quan
  action_url TEXT, -- Link để xử lý
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ALERT NOTIFICATION LOG - Lịch sử gửi thông báo
-- =====================================================
CREATE TABLE public.alert_notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_instance_id UUID NOT NULL REFERENCES public.alert_instances(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'email', 'slack', 'push', 'sms', 'webhook'
  recipient TEXT NOT NULL, -- email, user_id, phone, webhook_url
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_alert_data_sources_tenant ON public.alert_data_sources(tenant_id);
CREATE INDEX idx_alert_data_sources_status ON public.alert_data_sources(sync_status);

CREATE INDEX idx_alert_objects_tenant ON public.alert_objects(tenant_id);
CREATE INDEX idx_alert_objects_type ON public.alert_objects(object_type);
CREATE INDEX idx_alert_objects_status ON public.alert_objects(alert_status);
CREATE INDEX idx_alert_objects_external ON public.alert_objects(tenant_id, object_type, external_id);

CREATE INDEX idx_alert_object_metrics_object ON public.alert_object_metrics(alert_object_id);
CREATE INDEX idx_alert_object_metrics_recorded ON public.alert_object_metrics(recorded_at);
CREATE INDEX idx_alert_object_metrics_breached ON public.alert_object_metrics(is_threshold_breached) WHERE is_threshold_breached = true;

CREATE INDEX idx_alert_instances_tenant ON public.alert_instances(tenant_id);
CREATE INDEX idx_alert_instances_status ON public.alert_instances(status);
CREATE INDEX idx_alert_instances_severity ON public.alert_instances(severity);
CREATE INDEX idx_alert_instances_object ON public.alert_instances(alert_object_id);
CREATE INDEX idx_alert_instances_created ON public.alert_instances(created_at);
CREATE INDEX idx_alert_instances_active ON public.alert_instances(tenant_id, status) WHERE status = 'active';

CREATE INDEX idx_alert_notification_logs_instance ON public.alert_notification_logs(alert_instance_id);
CREATE INDEX idx_alert_notification_logs_status ON public.alert_notification_logs(status);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.alert_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_object_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies for alert_data_sources
CREATE POLICY "Users can view their tenant alert data sources"
  ON public.alert_data_sources FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant alert data sources"
  ON public.alert_data_sources FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Policies for alert_objects
CREATE POLICY "Users can view their tenant alert objects"
  ON public.alert_objects FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant alert objects"
  ON public.alert_objects FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Policies for alert_object_metrics
CREATE POLICY "Users can view their tenant alert object metrics"
  ON public.alert_object_metrics FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant alert object metrics"
  ON public.alert_object_metrics FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Policies for alert_instances
CREATE POLICY "Users can view their tenant alert instances"
  ON public.alert_instances FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant alert instances"
  ON public.alert_instances FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Policies for alert_notification_logs
CREATE POLICY "Users can view their tenant notification logs"
  ON public.alert_notification_logs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant notification logs"
  ON public.alert_notification_logs FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE TRIGGER update_alert_data_sources_updated_at
  BEFORE UPDATE ON public.alert_data_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alert_objects_updated_at
  BEFORE UPDATE ON public.alert_objects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alert_instances_updated_at
  BEFORE UPDATE ON public.alert_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Enable Realtime for alert_instances
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_instances;
