
-- =============================================
-- ADS COMMAND CENTER V2 - Database Schema
-- =============================================

-- 1. ads_platform_connections - API credentials for each platform
CREATE TABLE public.ads_platform_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'meta', 'google', 'shopee')),
  account_id text NOT NULL,
  account_name text,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  token_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, platform, account_id)
);

ALTER TABLE public.ads_platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view connections"
  ON public.ads_platform_connections FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can insert connections"
  ON public.ads_platform_connections FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can update connections"
  ON public.ads_platform_connections FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can delete connections"
  ON public.ads_platform_connections FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- 2. ads_rules - Automation rules
CREATE TABLE public.ads_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'meta', 'google', 'shopee', 'all')),
  rule_type text NOT NULL CHECK (rule_type IN ('pause', 'increase_budget', 'decrease_budget', 'kill', 'scale')),
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ads_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view rules"
  ON public.ads_rules FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can insert rules"
  ON public.ads_rules FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can update rules"
  ON public.ads_rules FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can delete rules"
  ON public.ads_rules FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- 3. ads_content - AI-generated content
CREATE TABLE public.ads_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'meta', 'google', 'shopee')),
  product_id text,
  content_type text NOT NULL CHECK (content_type IN ('image_caption', 'video_script', 'product_listing')),
  title text,
  body text,
  hashtags text[] DEFAULT '{}',
  media_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'scheduled', 'published')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_comment text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ads_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view content"
  ON public.ads_content FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can insert content"
  ON public.ads_content FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can update content"
  ON public.ads_content FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can delete content"
  ON public.ads_content FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- 4. ads_recommendations - Engine-generated suggestions
CREATE TABLE public.ads_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'meta', 'google', 'shopee')),
  campaign_id text,
  campaign_name text,
  ad_group_id text,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('pause', 'resume', 'increase_budget', 'decrease_budget', 'kill', 'scale')),
  reason text,
  evidence jsonb DEFAULT '{}'::jsonb,
  current_value numeric,
  recommended_value numeric,
  impact_estimate numeric,
  confidence integer DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executing', 'executed', 'failed', 'expired')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  execution_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.ads_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view recommendations"
  ON public.ads_recommendations FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can insert recommendations"
  ON public.ads_recommendations FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can update recommendations"
  ON public.ads_recommendations FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- 5. ads_execution_log - Audit trail
CREATE TABLE public.ads_execution_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.ads_recommendations(id),
  platform text NOT NULL CHECK (platform IN ('tiktok', 'meta', 'google', 'shopee')),
  action_type text NOT NULL,
  campaign_id text,
  request_payload jsonb,
  response_payload jsonb,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'retrying')),
  executed_by uuid REFERENCES auth.users(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  error_message text
);

ALTER TABLE public.ads_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view execution logs"
  ON public.ads_execution_log FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant members can insert execution logs"
  ON public.ads_execution_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- Updated_at triggers
CREATE TRIGGER update_ads_platform_connections_updated_at
  BEFORE UPDATE ON public.ads_platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ads_rules_updated_at
  BEFORE UPDATE ON public.ads_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ads_content_updated_at
  BEFORE UPDATE ON public.ads_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_ads_platform_connections_tenant ON public.ads_platform_connections(tenant_id);
CREATE INDEX idx_ads_rules_tenant ON public.ads_rules(tenant_id);
CREATE INDEX idx_ads_content_tenant_status ON public.ads_content(tenant_id, status);
CREATE INDEX idx_ads_recommendations_tenant_status ON public.ads_recommendations(tenant_id, status);
CREATE INDEX idx_ads_execution_log_tenant ON public.ads_execution_log(tenant_id);
CREATE INDEX idx_ads_execution_log_recommendation ON public.ads_execution_log(recommendation_id);
