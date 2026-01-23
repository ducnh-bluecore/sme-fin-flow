
-- =============================================================
-- CDP EXPLORE & RESEARCH VIEWS
-- =============================================================

-- View: Customer Research List
CREATE OR REPLACE VIEW public.v_cdp_customer_research AS
SELECT 
  c.id,
  c.tenant_id,
  'KH-' || LPAD(ROW_NUMBER() OVER (PARTITION BY c.tenant_id ORDER BY c.id)::TEXT, 6, '0') as anonymous_id,
  CASE 
    WHEN c.last_order_at >= NOW() - INTERVAL '30 days' THEN 'active'
    WHEN c.last_order_at >= NOW() - INTERVAL '90 days' THEN 'dormant'
    WHEN c.last_order_at >= NOW() - INTERVAL '180 days' THEN 'at_risk'
    ELSE 'new'
  END as behavior_status,
  COALESCE(m.net_revenue, 0) as total_spend,
  COALESCE(m.orders_count, 0) as order_count,
  c.last_order_at as last_purchase,
  COALESCE(m.inter_purchase_days, 30)::INT as repurchase_cycle,
  COALESCE(m.aov, 0) as aov,
  CASE 
    WHEN m.net_revenue > 0 AND m.orders_count > 1 THEN 'up'
    WHEN m.return_rate > 20 THEN 'down'
    ELSE 'stable'
  END as trend,
  COALESCE(m.return_rate, 0) as return_rate,
  COALESCE(m.gross_margin, 0) as margin_contribution,
  c.created_at
FROM public.cdp_customers c
LEFT JOIN LATERAL (
  SELECT * FROM public.cdp_customer_metrics_rolling cmr 
  WHERE cmr.customer_id = c.id AND cmr.window_days = 365
  ORDER BY cmr.as_of_date DESC LIMIT 1
) m ON true
WHERE c.status = 'active';

-- View: Research Stats Summary
CREATE OR REPLACE VIEW public.v_cdp_research_stats AS
SELECT 
  c.tenant_id,
  COUNT(DISTINCT c.id) as customer_count,
  COALESCE(SUM(m.net_revenue), 0) as total_revenue,
  COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.aov), 0) as median_aov,
  COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.inter_purchase_days), 30) as median_repurchase_cycle,
  COALESCE(AVG(m.return_rate), 0) as avg_return_rate,
  COALESCE(AVG(m.discounted_order_share) * 100, 0) as promotion_dependency
FROM public.cdp_customers c
LEFT JOIN LATERAL (
  SELECT * FROM public.cdp_customer_metrics_rolling cmr 
  WHERE cmr.customer_id = c.id AND cmr.window_days = 365
  ORDER BY cmr.as_of_date DESC LIMIT 1
) m ON true
WHERE c.status = 'active'
GROUP BY c.tenant_id;

-- View: Population Comparison Metrics
CREATE OR REPLACE VIEW public.v_cdp_population_comparison AS
WITH populations AS (
  SELECT id, tenant_id, name, 'segment' as type FROM public.cdp_segments WHERE status = 'active'
  UNION ALL
  SELECT id, tenant_id, cohort_key as name, 'cohort' as type FROM public.cdp_cohorts
),
segment_members AS (
  SELECT sm.segment_id as population_id, sm.customer_id
  FROM public.cdp_segment_membership_daily sm
  WHERE sm.as_of_date = (SELECT MAX(as_of_date) FROM public.cdp_segment_membership_daily)
    AND sm.is_member = true
),
cohort_members AS (
  SELECT cm.cohort_id as population_id, cm.customer_id
  FROM public.cdp_cohort_membership_daily cm
  WHERE cm.as_of_date = (SELECT MAX(as_of_date) FROM public.cdp_cohort_membership_daily)
    AND cm.is_member = true
),
all_members AS (
  SELECT * FROM segment_members
  UNION ALL
  SELECT * FROM cohort_members
)
SELECT 
  p.id as population_id,
  p.tenant_id,
  p.name as population_name,
  p.type as population_type,
  COUNT(DISTINCT am.customer_id) as customer_count,
  COALESCE(AVG(m.aov), 0) as avg_aov,
  COALESCE(AVG(m.orders_count), 0) as avg_frequency,
  COALESCE(AVG(m.return_rate), 0) as avg_return_rate,
  COALESCE(AVG(m.inter_purchase_days), 30) as avg_repurchase_cycle,
  CASE WHEN SUM(m.net_revenue) > 0 
    THEN (SUM(m.gross_margin) / SUM(m.net_revenue)) * 100 
    ELSE 0 
  END as avg_margin_percent,
  COALESCE(SUM(m.net_revenue), 0) as total_revenue
FROM populations p
LEFT JOIN all_members am ON am.population_id = p.id
LEFT JOIN LATERAL (
  SELECT * FROM public.cdp_customer_metrics_rolling cmr 
  WHERE cmr.customer_id = am.customer_id AND cmr.window_days = 365
  ORDER BY cmr.as_of_date DESC LIMIT 1
) m ON true
GROUP BY p.id, p.tenant_id, p.name, p.type;

-- View: Customer Audit Detail
CREATE OR REPLACE VIEW public.v_cdp_customer_audit AS
SELECT 
  c.id,
  c.tenant_id,
  'CDP-KH-' || TO_CHAR(c.created_at, 'YYYY') || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY c.tenant_id ORDER BY c.id)::TEXT, 5, '0') as internal_id,
  (SELECT SUBSTRING(ci.id_value, 1, 3) || '***' || SUBSTRING(ci.id_value, LENGTH(ci.id_value) - 2, 3) 
   FROM public.cdp_customer_identities ci 
   WHERE ci.customer_id = c.id AND ci.id_type = 'phone' LIMIT 1) as anonymized_phone,
  (SELECT SUBSTRING(ci.id_value, 1, 1) || '***' || SUBSTRING(ci.id_value, POSITION('@' IN ci.id_value) - 1, 1) || '@' || SPLIT_PART(ci.id_value, '@', 2)
   FROM public.cdp_customer_identities ci 
   WHERE ci.customer_id = c.id AND ci.id_type = 'email' LIMIT 1) as anonymized_email,
  COALESCE((SELECT AVG(confidence) FROM public.cdp_customer_identities ci WHERE ci.customer_id = c.id), 85)::INT as merge_confidence,
  (SELECT COUNT(DISTINCT source_system) FROM public.cdp_customer_identities ci WHERE ci.customer_id = c.id) as source_count,
  'verified' as merge_status,
  COALESCE(m.net_revenue, 0) as total_spend,
  COALESCE(m.orders_count, 0) as order_count,
  COALESCE(m.aov, 0) as aov,
  EXTRACT(DAY FROM NOW() - c.last_order_at)::INT as days_since_last_purchase,
  CASE 
    WHEN EXTRACT(DAY FROM NOW() - c.last_order_at) <= 30 THEN 5
    WHEN EXTRACT(DAY FROM NOW() - c.last_order_at) <= 60 THEN 4
    WHEN EXTRACT(DAY FROM NOW() - c.last_order_at) <= 90 THEN 3
    WHEN EXTRACT(DAY FROM NOW() - c.last_order_at) <= 180 THEN 2
    ELSE 1
  END as rfm_r,
  CASE 
    WHEN COALESCE(m.orders_count, 0) >= 10 THEN 5
    WHEN COALESCE(m.orders_count, 0) >= 6 THEN 4
    WHEN COALESCE(m.orders_count, 0) >= 3 THEN 3
    WHEN COALESCE(m.orders_count, 0) >= 2 THEN 2
    ELSE 1
  END as rfm_f,
  CASE 
    WHEN COALESCE(m.net_revenue, 0) >= 50000000 THEN 5
    WHEN COALESCE(m.net_revenue, 0) >= 20000000 THEN 4
    WHEN COALESCE(m.net_revenue, 0) >= 10000000 THEN 3
    WHEN COALESCE(m.net_revenue, 0) >= 5000000 THEN 2
    ELSE 1
  END as rfm_m,
  COALESCE(m.net_revenue, 0) as clv,
  c.created_at
FROM public.cdp_customers c
LEFT JOIN LATERAL (
  SELECT * FROM public.cdp_customer_metrics_rolling cmr 
  WHERE cmr.customer_id = c.id AND cmr.window_days = 365
  ORDER BY cmr.as_of_date DESC LIMIT 1
) m ON true
WHERE c.status = 'active';

-- View: Decision Cards Detail
CREATE OR REPLACE VIEW public.v_cdp_decision_cards_detail AS
SELECT 
  dc.id,
  dc.tenant_id,
  dc.title,
  dc.status,
  dc.severity,
  dc.priority,
  dc.owner_role as owner,
  dc.review_by as review_deadline,
  dc.created_at,
  dc.problem_statement,
  COALESCE(dc.source_ref, '[]'::jsonb) as source_insights,
  dc.source_type = 'equity' as source_equity,
  (dc.population_ref->>'size')::INT as population_size,
  (dc.population_ref->>'equity_impact')::NUMERIC as equity_impact,
  dc.population_ref as affected_population,
  jsonb_build_object(
    'revenue', 'Potential revenue impact',
    'cashflow', 'Cash flow implications',
    'longTerm', 'Long-term customer relationship',
    'level', COALESCE(dc.severity, 'medium')
  ) as risks,
  NULL::text[] as options,
  NULL::jsonb as decision,
  NULL::text as post_decision_review
FROM public.cdp_decision_cards dc;

-- =============================================================
-- TABLES FOR SAVED VIEWS & CHANGELOG
-- =============================================================

CREATE TABLE IF NOT EXISTS public.cdp_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  customer_count INT DEFAULT 0,
  revenue_share NUMERIC DEFAULT 0,
  purpose TEXT DEFAULT 'exploration',
  linked_insights INT DEFAULT 0,
  linked_decisions INT DEFAULT 0,
  filter_criteria JSONB,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.cdp_population_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  population_id UUID,
  population_type TEXT,
  population_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'locked')),
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  version TEXT DEFAULT '1.0',
  purpose TEXT,
  changes TEXT,
  metadata JSONB
);

-- Views for tables
CREATE OR REPLACE VIEW public.v_cdp_saved_research_views AS
SELECT 
  id, tenant_id, name, description, created_by as creator, created_at,
  COALESCE(customer_count, 0) as customer_count,
  COALESCE(revenue_share, 0) as revenue_share,
  COALESCE(purpose, 'exploration') as purpose,
  COALESCE(linked_insights, 0) as linked_insights,
  COALESCE(linked_decisions, 0) as linked_decisions,
  filter_criteria, is_active
FROM public.cdp_saved_views WHERE is_active = true;

CREATE OR REPLACE VIEW public.v_cdp_population_changelog AS
SELECT 
  id, tenant_id, population_name, action, changed_by, changed_at, version, purpose, changes, metadata
FROM public.cdp_population_changelog ORDER BY changed_at DESC;

-- Enable RLS
ALTER TABLE public.cdp_saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cdp_population_changelog ENABLE ROW LEVEL SECURITY;

-- RLS Policies using tenant_users
DROP POLICY IF EXISTS "saved_views_tenant_access" ON public.cdp_saved_views;
DROP POLICY IF EXISTS "changelog_tenant_access" ON public.cdp_population_changelog;

CREATE POLICY "saved_views_tenant_access" ON public.cdp_saved_views
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "changelog_tenant_access" ON public.cdp_population_changelog
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
