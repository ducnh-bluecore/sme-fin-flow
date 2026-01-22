-- ============================================
-- CDP POPULATION DEFINITIONS (Segments/Cohorts)
-- ============================================

-- 6. cdp_segments (versioned segment definitions)
CREATE TABLE public.cdp_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  definition_json jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  owner_role text NOT NULL DEFAULT 'Growth' CHECK (owner_role IN ('CEO', 'CFO', 'Growth', 'Ops')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdp_segments_tenant_status ON public.cdp_segments(tenant_id, status);

ALTER TABLE public.cdp_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_segments in their tenant"
ON public.cdp_segments FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 7. cdp_segment_versions
CREATE TABLE public.cdp_segment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  segment_id uuid NOT NULL REFERENCES cdp_segments(id) ON DELETE CASCADE,
  version integer NOT NULL,
  definition_json jsonb NOT NULL,
  effective_from date NOT NULL,
  effective_to date NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cdp_segment_versions_unique ON public.cdp_segment_versions(tenant_id, segment_id, version);

ALTER TABLE public.cdp_segment_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_segment_versions in their tenant"
ON public.cdp_segment_versions FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 8. cdp_segment_membership_daily
CREATE TABLE public.cdp_segment_membership_daily (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  segment_id uuid NOT NULL REFERENCES cdp_segments(id) ON DELETE CASCADE,
  segment_version integer NOT NULL,
  customer_id uuid NOT NULL REFERENCES cdp_customers(id) ON DELETE CASCADE,
  is_member boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, as_of_date, segment_id, customer_id)
);

CREATE INDEX idx_cdp_segment_membership_segment ON public.cdp_segment_membership_daily(tenant_id, segment_id, as_of_date);
CREATE INDEX idx_cdp_segment_membership_customer ON public.cdp_segment_membership_daily(tenant_id, customer_id, as_of_date);

ALTER TABLE public.cdp_segment_membership_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_segment_membership_daily in their tenant"
ON public.cdp_segment_membership_daily FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 9. cdp_cohorts
CREATE TABLE public.cdp_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cohort_type text NOT NULL CHECK (cohort_type IN ('FIRST_PURCHASE_MONTH', 'ACQ_WINDOW', 'VALUE_TIER', 'CHANNEL_FIRST')),
  cohort_key text NOT NULL,
  definition_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cdp_cohorts_unique ON public.cdp_cohorts(tenant_id, cohort_type, cohort_key);

ALTER TABLE public.cdp_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_cohorts in their tenant"
ON public.cdp_cohorts FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 10. cdp_cohort_membership_daily
CREATE TABLE public.cdp_cohort_membership_daily (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  cohort_id uuid NOT NULL REFERENCES cdp_cohorts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES cdp_customers(id) ON DELETE CASCADE,
  is_member boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, as_of_date, cohort_id, customer_id)
);

CREATE INDEX idx_cdp_cohort_membership_cohort ON public.cdp_cohort_membership_daily(tenant_id, cohort_id, as_of_date);

ALTER TABLE public.cdp_cohort_membership_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_cohort_membership_daily in their tenant"
ON public.cdp_cohort_membership_daily FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));