
-- =====================================================
-- Migration: Tao 29 bang con thieu theo kien truc v1.4.2
-- Khong seed data. Tat ca bang tao trong.
-- =====================================================

-- =====================================================
-- L1 FOUNDATION (4 bang)
-- =====================================================

-- 1. organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.organizations
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 2. organization_members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.organization_members
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 3. tenant_members
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tenant_members
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 4. tenant_roles
CREATE TABLE IF NOT EXISTS public.tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, role_name)
);
ALTER TABLE public.tenant_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tenant_roles
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- =====================================================
-- L1.5 INGESTION (3 bang)
-- =====================================================

-- 5. ingestion_batches
CREATE TABLE IF NOT EXISTS public.ingestion_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','partial')),
  records_total INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ingestion_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.ingestion_batches
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 6. data_watermarks
CREATE TABLE IF NOT EXISTS public.data_watermarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  watermark_type TEXT DEFAULT 'timestamp' CHECK (watermark_type IN ('timestamp','id','offset')),
  watermark_value TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  next_sync_at TIMESTAMPTZ,
  sync_frequency_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, source_type, table_name)
);
ALTER TABLE public.data_watermarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.data_watermarks
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 7. sync_checkpoints
CREATE TABLE IF NOT EXISTS public.sync_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  checkpoint_type TEXT NOT NULL,
  checkpoint_value TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sync_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.sync_checkpoints
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- =====================================================
-- L2.5 EVENTS/MARKETING (1 bang)
-- =====================================================

-- 8. commerce_events
CREATE TABLE IF NOT EXISTS public.commerce_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  customer_id TEXT,
  order_id TEXT,
  product_id TEXT,
  channel TEXT,
  properties JSONB DEFAULT '{}',
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.commerce_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.commerce_events
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));
CREATE INDEX IF NOT EXISTS idx_commerce_events_type ON public.commerce_events(tenant_id, event_type, event_at);

-- =====================================================
-- L3 KPI (3 bang)
-- =====================================================

-- 9. kpi_definitions
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kpi_code TEXT NOT NULL,
  kpi_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  domain TEXT DEFAULT 'fdp' CHECK (domain IN ('fdp','mdp','cdp','ops','control_tower')),
  calculation_type TEXT DEFAULT 'sum' CHECK (calculation_type IN ('sum','average','ratio','count','custom')),
  formula TEXT,
  source_table TEXT,
  source_column TEXT,
  unit TEXT DEFAULT 'VND',
  precision INTEGER DEFAULT 0,
  direction TEXT DEFAULT 'higher_better' CHECK (direction IN ('higher_better','lower_better','target')),
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  thresholds JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, kpi_code)
);
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.kpi_definitions
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 10. kpi_targets
CREATE TABLE IF NOT EXISTS public.kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kpi_code TEXT NOT NULL,
  kpi_name TEXT,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')),
  period_value TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  actual_value NUMERIC,
  variance NUMERIC,
  variance_percent NUMERIC,
  status TEXT CHECK (status IN ('on_track','at_risk','behind','exceeded')),
  owner_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, kpi_code, period_type, period_value)
);
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.kpi_targets
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 11. kpi_thresholds
CREATE TABLE IF NOT EXISTS public.kpi_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kpi_code TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.kpi_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.kpi_thresholds
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- =====================================================
-- L4 ALERT/DECISION (3 bang)
-- =====================================================

-- 12. alert_rules
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  metric_code TEXT,
  condition_type TEXT NOT NULL,
  condition_config JSONB NOT NULL DEFAULT '{}',
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  is_active BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 60,
  notification_channels JSONB DEFAULT '[]',
  owner_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, rule_code)
);
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.alert_rules
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 13. card_actions
CREATE TABLE IF NOT EXISTS public.card_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.decision_cards(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  is_recommended BOOLEAN DEFAULT false,
  label TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  risk_note TEXT,
  expected_outcome TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.card_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.card_actions
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 14. evidence_logs
CREATE TABLE IF NOT EXISTS public.evidence_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.decision_cards(id) ON DELETE SET NULL,
  alert_id UUID REFERENCES public.alert_instances(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',
  source_module TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.evidence_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.evidence_logs
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- =====================================================
-- L5 AI QUERY - TENANT-SCOPED (5 bang)
-- =====================================================

-- 15. ai_conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.ai_conversations
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 16. ai_messages
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  sql_query TEXT,
  query_result JSONB,
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.ai_messages
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 17. ai_query_history
CREATE TABLE IF NOT EXISTS public.ai_query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  sql_generated TEXT,
  result_summary TEXT,
  is_successful BOOLEAN DEFAULT true,
  execution_time_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_query_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.ai_query_history
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 18. ai_favorites
CREATE TABLE IF NOT EXISTS public.ai_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  sql_query TEXT,
  category TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.ai_favorites
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 19. ai_insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  domain TEXT,
  metric_code TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_actionable BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.ai_insights
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- =====================================================
-- L5 AI QUERY - PLATFORM-SCOPED (7 bang, read-only)
-- =====================================================

-- 20. ai_metric_definitions
CREATE TABLE IF NOT EXISTS public.ai_metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_metric_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_only_all" ON public.ai_metric_definitions
  FOR SELECT USING (true);

-- 21. ai_semantic_models
CREATE TABLE IF NOT EXISTS public.ai_semantic_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  schema_version TEXT DEFAULT '1.0',
  columns JSONB NOT NULL DEFAULT '{}',
  relationships JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_semantic_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_only_all" ON public.ai_semantic_models
  FOR SELECT USING (true);

-- 22. ai_query_templates
CREATE TABLE IF NOT EXISTS public.ai_query_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  sql_template TEXT NOT NULL,
  parameters JSONB,
  required_tables TEXT[],
  success_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_query_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_only_all" ON public.ai_query_templates
  FOR SELECT USING (true);

-- 23. kpi_definition_templates
CREATE TABLE IF NOT EXISTS public.kpi_definition_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  category TEXT NOT NULL,
  thresholds JSONB DEFAULT '{}',
  industry_benchmarks JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.kpi_definition_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_only_all" ON public.kpi_definition_templates
  FOR SELECT USING (true);

-- 24. alert_rule_templates
CREATE TABLE IF NOT EXISTS public.alert_rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition_template TEXT NOT NULL,
  severity_default TEXT DEFAULT 'warning' CHECK (severity_default IN ('info','warning','critical')),
  decision_framing JSONB,
  suggested_actions TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.alert_rule_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_only_all" ON public.alert_rule_templates
  FOR SELECT USING (true);

-- 25. decision_taxonomy
CREATE TABLE IF NOT EXISTS public.decision_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  action_templates TEXT[],
  owner_role_default TEXT,
  urgency_level TEXT CHECK (urgency_level IN ('immediate','today','this_week','this_month')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.decision_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_only_all" ON public.decision_taxonomy
  FOR SELECT USING (true);

-- 26. global_source_platforms
CREATE TABLE IF NOT EXISTS public.global_source_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ecommerce','ads','erp','data_warehouse','payment','logistics')),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  auth_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.global_source_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_only_all" ON public.global_source_platforms
  FOR SELECT USING (true);

-- =====================================================
-- L6 AUDIT (3 bang)
-- =====================================================

-- 27. sync_jobs
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.sync_jobs
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 28. sync_errors
CREATE TABLE IF NOT EXISTS public.sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.sync_jobs(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  source TEXT,
  table_name TEXT,
  record_id TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sync_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.sync_errors
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- 29. event_logs
CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  actor_id UUID,
  entity_type TEXT,
  entity_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.event_logs
  FOR ALL USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));
CREATE INDEX IF NOT EXISTS idx_event_logs_type ON public.event_logs(tenant_id, event_type, created_at);
