-- =====================================================
-- Architecture v1.4.1 - Phase 2: Tenant Template Schema
-- =====================================================

-- Create template schema (source of truth for tenant structure)
CREATE SCHEMA IF NOT EXISTS tenant_template;

-- Grant usage (template should not be accessed directly, only for provisioning)
GRANT USAGE ON SCHEMA tenant_template TO authenticated;

-- =====================================================
-- Layer 1: Foundation Tables (6 tables)
-- =====================================================

-- Organizations (Brands/Divisions within tenant)
CREATE TABLE tenant_template.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(slug)
);

-- Organization members
CREATE TABLE tenant_template.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- User roles within organization
CREATE TYPE tenant_template.org_role AS ENUM ('owner', 'admin', 'analyst', 'viewer');

CREATE TABLE tenant_template.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role tenant_template.org_role NOT NULL DEFAULT 'viewer',
  granted_by uuid,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Channel accounts (connected platforms per organization)
CREATE TABLE tenant_template.channel_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  platform_code text NOT NULL,  -- References platform.global_source_platforms
  account_name text NOT NULL,
  account_id text,              -- External platform account ID
  credentials_encrypted text,
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization data sources
CREATE TABLE tenant_template.organization_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  channel_account_id uuid REFERENCES tenant_template.channel_accounts(id),
  source_type text NOT NULL,    -- orders, products, customers, ads
  is_primary boolean DEFAULT false,
  sync_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Source table mappings (field mapping config)
CREATE TABLE tenant_template.source_table_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_source_id uuid NOT NULL REFERENCES tenant_template.organization_sources(id) ON DELETE CASCADE,
  source_table_name text NOT NULL,
  target_entity text NOT NULL,  -- order, customer, product
  column_mappings jsonb NOT NULL,
  transform_rules jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- Layer 1.5: Ingestion Tables (3 tables)
-- =====================================================

-- Ingestion batches (tracking data imports)
CREATE TABLE tenant_template.ingestion_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  source_id uuid REFERENCES tenant_template.organization_sources(id),
  batch_type text NOT NULL,     -- full, incremental, realtime
  status text NOT NULL DEFAULT 'pending',
  records_total int DEFAULT 0,
  records_processed int DEFAULT 0,
  records_failed int DEFAULT 0,
  error_log jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Source extract versions (versioned source data)
CREATE TABLE tenant_template.source_extract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES tenant_template.ingestion_batches(id),
  source_id uuid REFERENCES tenant_template.organization_sources(id),
  version_number int NOT NULL,
  extract_hash text,            -- Hash for deduplication
  row_count int,
  file_path text,
  created_at timestamptz DEFAULT now()
);

-- Watermark tracking (sync state)
CREATE TABLE tenant_template.watermark_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES tenant_template.organization_sources(id),
  entity_type text NOT NULL,
  last_sync_value text,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(source_id, entity_type)
);

-- =====================================================
-- Layer 2: Master Model Tables (13 tables)
-- =====================================================

-- Entity links (cross-source identity resolution)
CREATE TABLE tenant_template.entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,    -- customer, product, order
  master_id uuid NOT NULL,
  source_id uuid REFERENCES tenant_template.organization_sources(id),
  source_entity_id text NOT NULL,
  confidence_score numeric(5,4) DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, entity_type, source_id, source_entity_id)
);

-- Master customers (golden record)
CREATE TABLE tenant_template.master_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  customer_code text,
  name text,
  email text,
  phone text,
  address jsonb,
  first_order_date date,
  last_order_date date,
  total_orders int DEFAULT 0,
  total_revenue numeric(18,2) DEFAULT 0,
  avg_order_value numeric(18,2) DEFAULT 0,
  customer_segment text,
  ltv numeric(18,2),
  acquisition_source text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Master products (golden record)
CREATE TABLE tenant_template.master_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  category text,
  subcategory text,
  brand text,
  cost_price numeric(18,2),
  selling_price numeric(18,2),
  weight numeric(10,3),
  dimensions jsonb,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, sku)
);

-- Master product variants
CREATE TABLE tenant_template.master_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES tenant_template.master_products(id) ON DELETE CASCADE,
  variant_sku text NOT NULL,
  variant_name text,
  attributes jsonb,             -- size, color, etc.
  cost_price numeric(18,2),
  selling_price numeric(18,2),
  current_stock int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Master orders (golden record)
CREATE TABLE tenant_template.master_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  customer_id uuid REFERENCES tenant_template.master_customers(id),
  channel_account_id uuid REFERENCES tenant_template.channel_accounts(id),
  order_date timestamptz NOT NULL,
  status text NOT NULL,
  gross_revenue numeric(18,2) DEFAULT 0,
  discount_amount numeric(18,2) DEFAULT 0,
  shipping_fee numeric(18,2) DEFAULT 0,
  net_revenue numeric(18,2) DEFAULT 0,
  cogs numeric(18,2) DEFAULT 0,
  gross_profit numeric(18,2) DEFAULT 0,
  payment_status text,
  payment_method text,
  shipping_address jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, order_number)
);

-- Master order items
CREATE TABLE tenant_template.master_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES tenant_template.master_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES tenant_template.master_products(id),
  variant_id uuid REFERENCES tenant_template.master_product_variants(id),
  sku text,
  product_name text,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(18,2) NOT NULL,
  discount_amount numeric(18,2) DEFAULT 0,
  line_total numeric(18,2) NOT NULL,
  cogs numeric(18,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Master refunds
CREATE TABLE tenant_template.master_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES tenant_template.master_orders(id),
  refund_number text,
  refund_date timestamptz NOT NULL,
  refund_amount numeric(18,2) NOT NULL,
  reason text,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Master payments
CREATE TABLE tenant_template.master_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES tenant_template.master_orders(id),
  payment_number text,
  payment_date timestamptz NOT NULL,
  amount numeric(18,2) NOT NULL,
  payment_method text,
  payment_gateway text,
  status text NOT NULL,
  fee_amount numeric(18,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Master fulfillments
CREATE TABLE tenant_template.master_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES tenant_template.master_orders(id) ON DELETE CASCADE,
  fulfillment_number text,
  carrier text,
  tracking_number text,
  status text NOT NULL,
  shipped_at timestamptz,
  delivered_at timestamptz,
  shipping_cost numeric(18,2),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Master inventory
CREATE TABLE tenant_template.master_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES tenant_template.master_products(id),
  variant_id uuid REFERENCES tenant_template.master_product_variants(id),
  warehouse_id text,
  warehouse_name text,
  quantity_on_hand int DEFAULT 0,
  quantity_reserved int DEFAULT 0,
  quantity_available int DEFAULT 0,
  reorder_point int,
  safety_stock int,
  lead_time_days int,
  last_count_date date,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Master costs (COGS breakdown)
CREATE TABLE tenant_template.master_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES tenant_template.master_products(id),
  variant_id uuid REFERENCES tenant_template.master_product_variants(id),
  cost_type text NOT NULL,      -- material, labor, overhead, packaging
  amount numeric(18,2) NOT NULL,
  effective_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Master suppliers
CREATE TABLE tenant_template.master_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  supplier_code text,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address jsonb,
  payment_terms text,
  lead_time_days int,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- Layer 2.5: Events + Marketing Tables (4 tables)
-- =====================================================

-- Commerce events (unified event stream)
CREATE TABLE tenant_template.commerce_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,     -- order_placed, order_shipped, order_delivered, refund_issued
  event_date timestamptz NOT NULL,
  entity_type text NOT NULL,    -- order, customer, product
  entity_id uuid,
  event_data jsonb NOT NULL,
  source_id uuid REFERENCES tenant_template.organization_sources(id),
  created_at timestamptz DEFAULT now()
);

-- Master ad accounts
CREATE TABLE tenant_template.master_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  channel_account_id uuid REFERENCES tenant_template.channel_accounts(id),
  platform text NOT NULL,       -- facebook, google, tiktok
  account_id text NOT NULL,
  account_name text,
  currency text DEFAULT 'VND',
  timezone text DEFAULT 'Asia/Ho_Chi_Minh',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Master campaigns
CREATE TABLE tenant_template.master_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id uuid NOT NULL REFERENCES tenant_template.master_ad_accounts(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  campaign_name text NOT NULL,
  objective text,
  status text,
  budget_daily numeric(18,2),
  budget_lifetime numeric(18,2),
  start_date date,
  end_date date,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Master ad spend daily (daily aggregates)
CREATE TABLE tenant_template.master_ad_spend_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  ad_account_id uuid REFERENCES tenant_template.master_ad_accounts(id),
  campaign_id uuid REFERENCES tenant_template.master_campaigns(id),
  date date NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(18,2) DEFAULT 0,
  conversions int DEFAULT 0,
  revenue_attributed numeric(18,2) DEFAULT 0,
  roas numeric(10,4),
  cpc numeric(10,4),
  cpm numeric(10,4),
  ctr numeric(10,6),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Layer 3: KPI Tables (5 tables)
-- =====================================================

-- KPI definitions (tenant-specific, references platform templates)
CREATE TABLE tenant_template.kpi_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  template_id uuid,             -- References platform.kpi_definition_templates
  code text NOT NULL,
  name text NOT NULL,
  formula text,
  custom_thresholds jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- KPI thresholds (custom thresholds per org)
CREATE TABLE tenant_template.kpi_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_definition_id uuid NOT NULL REFERENCES tenant_template.kpi_definitions(id) ON DELETE CASCADE,
  dimension_type text,          -- product_category, channel, segment
  dimension_value text,
  warning_threshold numeric(18,4),
  critical_threshold numeric(18,4),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- KPI facts daily (daily KPI values)
CREATE TABLE tenant_template.kpi_facts_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  kpi_definition_id uuid REFERENCES tenant_template.kpi_definitions(id),
  date date NOT NULL,
  value numeric(18,4),
  previous_value numeric(18,4),
  change_percent numeric(10,4),
  dimension_type text,
  dimension_value text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, kpi_definition_id, date, dimension_type, dimension_value)
);

-- Anomaly scores (for anomaly detection)
CREATE TABLE tenant_template.anomaly_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  kpi_definition_id uuid REFERENCES tenant_template.kpi_definitions(id),
  date date NOT NULL,
  expected_value numeric(18,4),
  actual_value numeric(18,4),
  anomaly_score numeric(10,6),
  is_anomaly boolean DEFAULT false,
  detection_method text,
  created_at timestamptz DEFAULT now()
);

-- Period comparisons (WoW, MoM, YoY)
CREATE TABLE tenant_template.period_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  kpi_definition_id uuid REFERENCES tenant_template.kpi_definitions(id),
  comparison_type text NOT NULL, -- wow, mom, yoy
  current_period_start date,
  current_period_end date,
  previous_period_start date,
  previous_period_end date,
  current_value numeric(18,4),
  previous_value numeric(18,4),
  change_amount numeric(18,4),
  change_percent numeric(10,4),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Layer 4: Alert & Decision Tables (7 tables)
-- =====================================================

-- Alert rules (tenant-specific, references platform templates)
CREATE TABLE tenant_template.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  template_id uuid,             -- References platform.alert_rule_templates
  code text NOT NULL,
  name text NOT NULL,
  condition_sql text,
  severity text NOT NULL DEFAULT 'warning',
  is_active boolean DEFAULT true,
  cooldown_minutes int DEFAULT 60,
  notification_channels jsonb DEFAULT '["app"]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Alert instances (triggered alerts)
CREATE TABLE tenant_template.alert_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES tenant_template.alert_rules(id),
  title text NOT NULL,
  message text,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  current_value numeric(18,4),
  threshold_value numeric(18,4),
  impact_amount numeric(18,2),
  entity_type text,
  entity_id uuid,
  assigned_to uuid,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Evidence logs (supporting data for alerts)
CREATE TABLE tenant_template.evidence_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES tenant_template.alert_instances(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,  -- data_point, trend, comparison, context
  description text,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Decision cards (decisions arising from alerts)
CREATE TABLE tenant_template.decision_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES tenant_template.alert_instances(id),
  title text NOT NULL,
  question text NOT NULL,
  context jsonb,
  options jsonb NOT NULL,       -- Array of decision options
  recommended_option text,
  selected_option text,
  decision_by uuid,
  decision_at timestamptz,
  deadline_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  outcome_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Card actions (actions taken on decisions)
CREATE TABLE tenant_template.card_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_card_id uuid NOT NULL REFERENCES tenant_template.decision_cards(id) ON DELETE CASCADE,
  action_type text NOT NULL,    -- approve, reject, defer, escalate
  action_by uuid NOT NULL,
  action_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}'
);

-- Decision outcomes (tracking decision effectiveness)
CREATE TABLE tenant_template.decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_card_id uuid NOT NULL REFERENCES tenant_template.decision_cards(id) ON DELETE CASCADE,
  outcome_type text NOT NULL,   -- positive, negative, neutral
  measured_at timestamptz DEFAULT now(),
  impact_value numeric(18,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Alert escalations
CREATE TABLE tenant_template.alert_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES tenant_template.alert_instances(id) ON DELETE CASCADE,
  escalated_from uuid,
  escalated_to uuid NOT NULL,
  escalation_reason text,
  escalated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text
);

-- =====================================================
-- Layer 5: AI Query Tables (7 tables)
-- =====================================================

-- AI conversations (chat history)
CREATE TABLE tenant_template.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI messages (individual messages)
CREATE TABLE tenant_template.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES tenant_template.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,           -- user, assistant, system
  content text NOT NULL,
  template_id uuid,             -- References platform.ai_query_templates if used
  generated_sql text,
  execution_time_ms int,
  tokens_used int,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- AI query history (successful queries)
CREATE TABLE tenant_template.ai_query_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  natural_query text NOT NULL,
  generated_sql text NOT NULL,
  execution_status text,
  execution_time_ms int,
  result_row_count int,
  user_rating int,              -- 1-5 star rating
  created_at timestamptz DEFAULT now()
);

-- AI favorites (saved queries)
CREATE TABLE tenant_template.ai_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  natural_query text NOT NULL,
  generated_sql text,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- AI scheduled reports
CREATE TABLE tenant_template.ai_scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  query_id uuid REFERENCES tenant_template.ai_favorites(id),
  schedule_cron text NOT NULL,
  recipients jsonb,
  delivery_method text DEFAULT 'email',
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- AI insights (generated insights)
CREATE TABLE tenant_template.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  summary text,
  details jsonb,
  importance_score numeric(5,4),
  is_actionable boolean DEFAULT false,
  related_entity_type text,
  related_entity_id uuid,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- AI feedback (user feedback on AI responses)
CREATE TABLE tenant_template.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES tenant_template.ai_messages(id),
  query_history_id uuid REFERENCES tenant_template.ai_query_history(id),
  user_id uuid NOT NULL,
  feedback_type text NOT NULL,  -- helpful, not_helpful, incorrect, missing_data
  feedback_text text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Layer 6: Audit Tables (4 tables)
-- =====================================================

-- Sync jobs (data sync tracking)
CREATE TABLE tenant_template.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  source_id uuid REFERENCES tenant_template.organization_sources(id),
  job_type text NOT NULL,       -- full_sync, incremental, realtime
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  records_processed int DEFAULT 0,
  records_created int DEFAULT 0,
  records_updated int DEFAULT 0,
  records_failed int DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Sync errors (detailed error logs)
CREATE TABLE tenant_template.sync_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id uuid NOT NULL REFERENCES tenant_template.sync_jobs(id) ON DELETE CASCADE,
  record_id text,
  error_type text NOT NULL,
  error_message text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Batch lineage (data lineage tracking)
CREATE TABLE tenant_template.batch_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES tenant_template.ingestion_batches(id),
  target_table text NOT NULL,
  target_record_id uuid,
  source_table text,
  source_record_id text,
  transform_type text,
  created_at timestamptz DEFAULT now()
);

-- Audit logs (user action tracking)
CREATE TABLE tenant_template.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Layer 10: BigQuery Sync Tables (4 tables)
-- =====================================================

-- BigQuery connections
CREATE TABLE tenant_template.bigquery_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  dataset_id text NOT NULL,
  credentials_encrypted text,
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- BigQuery sync configs
CREATE TABLE tenant_template.bigquery_sync_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES tenant_template.bigquery_connections(id) ON DELETE CASCADE,
  source_table text NOT NULL,
  target_table text NOT NULL,
  sync_mode text NOT NULL DEFAULT 'incremental',
  sync_schedule text,           -- cron expression
  last_sync_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- BigQuery sync logs
CREATE TABLE tenant_template.bigquery_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES tenant_template.bigquery_sync_configs(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  status text NOT NULL,
  rows_synced int DEFAULT 0,
  bytes_synced bigint DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Query cache (cached query results)
CREATE TABLE tenant_template.query_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES tenant_template.organizations(id) ON DELETE CASCADE,
  query_hash text NOT NULL,
  query_sql text NOT NULL,
  result_data jsonb,
  row_count int,
  execution_time_ms int,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, query_hash)
);

-- =====================================================
-- Create Indexes for Performance
-- =====================================================

-- Organizations
CREATE INDEX idx_template_organizations_slug ON tenant_template.organizations(slug);

-- Master orders
CREATE INDEX idx_template_master_orders_org ON tenant_template.master_orders(organization_id);
CREATE INDEX idx_template_master_orders_date ON tenant_template.master_orders(order_date);
CREATE INDEX idx_template_master_orders_customer ON tenant_template.master_orders(customer_id);
CREATE INDEX idx_template_master_orders_channel ON tenant_template.master_orders(channel_account_id);

-- Master customers
CREATE INDEX idx_template_master_customers_org ON tenant_template.master_customers(organization_id);
CREATE INDEX idx_template_master_customers_segment ON tenant_template.master_customers(customer_segment);

-- Master products
CREATE INDEX idx_template_master_products_org ON tenant_template.master_products(organization_id);
CREATE INDEX idx_template_master_products_category ON tenant_template.master_products(category);

-- KPI facts
CREATE INDEX idx_template_kpi_facts_org_date ON tenant_template.kpi_facts_daily(organization_id, date);
CREATE INDEX idx_template_kpi_facts_kpi ON tenant_template.kpi_facts_daily(kpi_definition_id);

-- Alert instances
CREATE INDEX idx_template_alerts_org ON tenant_template.alert_instances(organization_id);
CREATE INDEX idx_template_alerts_status ON tenant_template.alert_instances(status);
CREATE INDEX idx_template_alerts_created ON tenant_template.alert_instances(created_at);

-- Decision cards
CREATE INDEX idx_template_decisions_org ON tenant_template.decision_cards(organization_id);
CREATE INDEX idx_template_decisions_status ON tenant_template.decision_cards(status);

-- Commerce events
CREATE INDEX idx_template_events_org_date ON tenant_template.commerce_events(organization_id, event_date);
CREATE INDEX idx_template_events_type ON tenant_template.commerce_events(event_type);

-- AI conversations
CREATE INDEX idx_template_ai_conv_org ON tenant_template.ai_conversations(organization_id);
CREATE INDEX idx_template_ai_conv_user ON tenant_template.ai_conversations(user_id);

-- Audit logs
CREATE INDEX idx_template_audit_org ON tenant_template.audit_logs(organization_id);
CREATE INDEX idx_template_audit_user ON tenant_template.audit_logs(user_id);
CREATE INDEX idx_template_audit_created ON tenant_template.audit_logs(created_at);

-- =====================================================
-- Grant permissions on template schema
-- =====================================================
GRANT SELECT ON ALL TABLES IN SCHEMA tenant_template TO authenticated;