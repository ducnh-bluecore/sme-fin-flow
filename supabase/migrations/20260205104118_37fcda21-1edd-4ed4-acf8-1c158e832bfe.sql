-- =====================================================
-- Architecture v1.4.1 - Phase 1: Platform Schema (Control Plane)
-- =====================================================

-- Create platform schema for global/shared data (AI registry, templates, configs)
CREATE SCHEMA IF NOT EXISTS platform;

-- Grant access to authenticated users (read-only for most tables)
GRANT USAGE ON SCHEMA platform TO authenticated;

-- =====================================================
-- AI Registry Tables (cross-tenant learning)
-- =====================================================

-- AI metric definitions (shared understanding of metrics)
CREATE TABLE platform.ai_metric_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  formula text NOT NULL,
  category text NOT NULL CHECK (category IN ('revenue', 'cost', 'margin', 'cash', 'customer', 'product', 'marketing', 'operations')),
  description text,
  unit text,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI dimension catalog (shared dimensions for analysis)
CREATE TABLE platform.ai_dimension_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  entity_type text NOT NULL,  -- order, customer, product, campaign
  data_type text NOT NULL,    -- string, number, date, boolean
  description text,
  sample_values jsonb,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Semantic models (entity schemas for AI understanding)
CREATE TABLE platform.ai_semantic_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL UNIQUE,  -- order, customer, product, campaign
  schema_version text NOT NULL DEFAULT '1.0',
  columns jsonb NOT NULL,            -- column definitions + meanings
  relationships jsonb,               -- links to other entities
  business_rules jsonb,              -- validation rules
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Query templates (proven SQL patterns)
CREATE TABLE platform.ai_query_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_pattern text NOT NULL,      -- "top customers by LTV"
  category text NOT NULL,            -- revenue, customer, product, marketing
  sql_template text NOT NULL,
  parameters jsonb,
  required_tables text[],
  success_count int DEFAULT 0,
  avg_execution_ms int,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI model registry (for ML models)
CREATE TABLE platform.ai_model_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL UNIQUE,
  model_type text NOT NULL,          -- forecasting, classification, clustering
  version text NOT NULL DEFAULT '1.0',
  config jsonb NOT NULL,
  training_stats jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- Rule Registry Tables (shared business rules)
-- =====================================================

-- KPI definition templates (industry-standard KPIs)
CREATE TABLE platform.kpi_definition_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  formula text NOT NULL,
  category text NOT NULL CHECK (category IN ('revenue', 'cost', 'margin', 'cash', 'customer', 'product', 'marketing', 'operations')),
  thresholds jsonb NOT NULL DEFAULT '{}',
  industry_benchmarks jsonb,
  description text,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Alert rule templates (reusable alert patterns)
CREATE TABLE platform.alert_rule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  condition_template text NOT NULL,
  severity_default text NOT NULL CHECK (severity_default IN ('info', 'warning', 'critical')),
  decision_framing jsonb,            -- how to present the decision
  suggested_actions jsonb,           -- recommended responses
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Decision taxonomy (action categories)
CREATE TABLE platform.decision_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subcategory text,
  action_templates jsonb,
  owner_role_default text,
  urgency_level text CHECK (urgency_level IN ('immediate', 'today', 'this_week', 'this_month')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insight taxonomy (insight categories)
CREATE TABLE platform.insight_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subcategory text,
  insight_template text,
  visualization_type text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Platform Config Tables
-- =====================================================

-- Global source platforms (Shopee, Lazada, etc.)
CREATE TABLE platform.global_source_platforms (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('ecommerce', 'ads', 'erp', 'data_warehouse', 'payment', 'logistics')),
  logo_url text,
  is_active boolean DEFAULT true,
  config_schema jsonb DEFAULT '{}',
  auth_type text,                    -- oauth, api_key, credentials
  created_at timestamptz DEFAULT now()
);

-- Feature flags (platform-wide)
CREATE TABLE platform.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  rollout_percentage int DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  allowed_tiers text[],              -- which tenant tiers can access
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enterprise provisioning requests (for manual setup)
CREATE TABLE platform.enterprise_provisioning_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  slug text NOT NULL,
  requested_by uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Seed Data
-- =====================================================

-- Seed global source platforms
INSERT INTO platform.global_source_platforms (code, display_name, category, auth_type) VALUES
  ('shopee', 'Shopee', 'ecommerce', 'oauth'),
  ('lazada', 'Lazada', 'ecommerce', 'oauth'),
  ('tiktok_shop', 'TikTok Shop', 'ecommerce', 'oauth'),
  ('tiki', 'Tiki', 'ecommerce', 'api_key'),
  ('haravan', 'Haravan', 'erp', 'api_key'),
  ('sapo', 'Sapo', 'erp', 'api_key'),
  ('kiotviet', 'KiotViet', 'erp', 'api_key'),
  ('facebook_ads', 'Facebook Ads', 'ads', 'oauth'),
  ('google_ads', 'Google Ads', 'ads', 'oauth'),
  ('tiktok_ads', 'TikTok Ads', 'ads', 'oauth'),
  ('bigquery', 'BigQuery', 'data_warehouse', 'credentials')
ON CONFLICT (code) DO NOTHING;

-- Seed core metric definitions
INSERT INTO platform.ai_metric_definitions (code, name, formula, category, description, unit) VALUES
  ('net_revenue', 'Net Revenue', 'gross_revenue - returns - discounts', 'revenue', 'Revenue after returns and discounts', 'VND'),
  ('gross_profit', 'Gross Profit', 'net_revenue - cogs', 'margin', 'Profit before operating expenses', 'VND'),
  ('contribution_margin', 'Contribution Margin', 'gross_profit - variable_costs', 'margin', 'Margin after variable costs', 'VND'),
  ('cac', 'Customer Acquisition Cost', 'marketing_spend / new_customers', 'marketing', 'Cost to acquire one customer', 'VND'),
  ('ltv', 'Customer Lifetime Value', 'avg_order_value * purchase_frequency * customer_lifespan', 'customer', 'Total value from a customer', 'VND'),
  ('roas', 'Return on Ad Spend', 'revenue_from_ads / ad_spend', 'marketing', 'Revenue per dollar of ad spend', 'ratio'),
  ('inventory_turnover', 'Inventory Turnover', 'cogs / avg_inventory', 'operations', 'How often inventory is sold', 'ratio'),
  ('cash_conversion_cycle', 'Cash Conversion Cycle', 'dio + dso - dpo', 'cash', 'Days to convert investment to cash', 'days')
ON CONFLICT (code) DO NOTHING;

-- Seed KPI templates
INSERT INTO platform.kpi_definition_templates (code, name, formula, category, thresholds, industry_benchmarks) VALUES
  ('gross_margin_pct', 'Gross Margin %', '(net_revenue - cogs) / net_revenue * 100', 'margin', 
   '{"warning": 20, "critical": 10}', '{"retail": 25, "fmcg": 30, "fashion": 50}'),
  ('net_profit_margin', 'Net Profit Margin', 'net_profit / net_revenue * 100', 'margin',
   '{"warning": 5, "critical": 0}', '{"retail": 3, "fmcg": 5, "fashion": 8}'),
  ('inventory_days', 'Days of Inventory', 'avg_inventory / cogs * 365', 'operations',
   '{"warning": 60, "critical": 90}', '{"retail": 45, "fmcg": 30, "fashion": 60}'),
  ('ar_days', 'Days Sales Outstanding', 'avg_ar / net_revenue * 365', 'cash',
   '{"warning": 45, "critical": 60}', '{"retail": 30, "b2b": 60}'),
  ('ltv_cac_ratio', 'LTV:CAC Ratio', 'ltv / cac', 'customer',
   '{"warning": 3, "critical": 1}', '{"ecommerce": 3, "subscription": 5}')
ON CONFLICT (code) DO NOTHING;

-- Seed alert rule templates
INSERT INTO platform.alert_rule_templates (code, name, category, condition_template, severity_default, decision_framing) VALUES
  ('margin_drop', 'Margin Drop Alert', 'margin', 
   'gross_margin < threshold_warning', 'warning',
   '{"question": "Gross margin đang giảm. Có nên điều chỉnh pricing?", "options": ["Tăng giá", "Giảm COGS", "Xem xét thêm"]}'),
  ('stockout_risk', 'Stockout Risk', 'operations',
   'days_of_stock < reorder_point', 'critical',
   '{"question": "SKU có nguy cơ hết hàng. Đặt hàng bổ sung?", "options": ["Đặt hàng ngay", "Chờ thêm data", "Không đặt"]}'),
  ('cac_spike', 'CAC Spike', 'marketing',
   'cac > cac_7d_avg * 1.5', 'warning',
   '{"question": "CAC tăng đột biến. Có nên pause campaign?", "options": ["Pause ngay", "Giảm budget", "Theo dõi thêm"]}'),
  ('revenue_anomaly', 'Revenue Anomaly', 'revenue',
   'daily_revenue < daily_revenue_7d_avg * 0.7', 'critical',
   '{"question": "Doanh thu giảm bất thường. Kiểm tra ngay?", "options": ["Kiểm tra platform", "Kiểm tra pricing", "Xem ads performance"]}')
ON CONFLICT (code) DO NOTHING;

-- Seed decision taxonomy
INSERT INTO platform.decision_taxonomy (category, subcategory, urgency_level, owner_role_default, action_templates) VALUES
  ('pricing', 'price_increase', 'this_week', 'admin', '["Tăng giá 5%", "Tăng giá 10%", "Tăng giá theo segment"]'),
  ('pricing', 'discount', 'today', 'admin', '["Flash sale", "Giảm giá clearance", "Bundle deal"]'),
  ('inventory', 'reorder', 'immediate', 'member', '["Đặt hàng standard", "Đặt hàng express", "Chuyển kho"]'),
  ('inventory', 'clearance', 'this_week', 'admin', '["Markdown 30%", "Bundle với best seller", "Donate"]'),
  ('marketing', 'budget_adjustment', 'today', 'admin', '["Tăng budget", "Giảm budget", "Reallocate"]'),
  ('marketing', 'campaign_control', 'immediate', 'member', '["Pause", "Scale up", "Chỉnh creative"]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- RLS Policies for Platform Schema
-- =====================================================

-- Enable RLS on all platform tables
ALTER TABLE platform.ai_metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ai_dimension_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ai_semantic_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ai_query_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ai_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.kpi_definition_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.alert_rule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.decision_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.insight_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.global_source_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.enterprise_provisioning_requests ENABLE ROW LEVEL SECURITY;

-- Read-only access for all authenticated users (platform data is shared)
CREATE POLICY "authenticated_read_ai_metrics" ON platform.ai_metric_definitions 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_ai_dimensions" ON platform.ai_dimension_catalog 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_semantic_models" ON platform.ai_semantic_models 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_query_templates" ON platform.ai_query_templates 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_model_registry" ON platform.ai_model_registry 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_kpi_templates" ON platform.kpi_definition_templates 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_alert_templates" ON platform.alert_rule_templates 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_decision_taxonomy" ON platform.decision_taxonomy 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_insight_taxonomy" ON platform.insight_taxonomy 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_source_platforms" ON platform.global_source_platforms 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_feature_flags" ON platform.feature_flags 
FOR SELECT TO authenticated USING (true);

-- Enterprise requests: only tenant owners can view their requests
CREATE POLICY "tenant_owners_view_requests" ON platform.enterprise_provisioning_requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = platform.enterprise_provisioning_requests.tenant_id
    AND tu.user_id = auth.uid()
    AND tu.role = 'owner'
  )
);

-- Grant SELECT on all platform tables to authenticated
GRANT SELECT ON ALL TABLES IN SCHEMA platform TO authenticated;