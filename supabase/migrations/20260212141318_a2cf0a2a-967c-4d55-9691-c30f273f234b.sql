
-- ============================================
-- BLUECORE COMMAND: Phase 1 Foundation Tables
-- L3 KPI + L4 Decision Layer
-- ============================================

-- L3: Size Completeness Score
CREATE TABLE public.kpi_size_completeness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  as_of_date DATE NOT NULL,
  store_id UUID NOT NULL,
  style_id TEXT NOT NULL,
  sizes_present INT,
  sizes_total INT,
  size_completeness_score NUMERIC(5,4),
  missing_sizes JSONB,
  status TEXT DEFAULT 'HEALTHY',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kpi_size_completeness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.kpi_size_completeness FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_kpi_size_completeness_tenant ON public.kpi_size_completeness(tenant_id, as_of_date);

-- L3: Curve Health Index
CREATE TABLE public.kpi_curve_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  as_of_date DATE NOT NULL,
  style_id TEXT NOT NULL,
  curve_health_index NUMERIC(5,4),
  markdown_risk_band TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kpi_curve_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.kpi_curve_health FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_kpi_curve_health_tenant ON public.kpi_curve_health(tenant_id, as_of_date);

-- L3: Inventory Distortion
CREATE TABLE public.kpi_inventory_distortion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  as_of_date DATE NOT NULL,
  fc_id TEXT NOT NULL,
  distortion_score NUMERIC(8,4),
  overstock_locations JSONB,
  understock_locations JSONB,
  locked_cash_estimate NUMERIC(18,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kpi_inventory_distortion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.kpi_inventory_distortion FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_kpi_inv_distortion_tenant ON public.kpi_inventory_distortion(tenant_id, as_of_date);

-- L3: Network Gap
CREATE TABLE public.kpi_network_gap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  as_of_date DATE NOT NULL,
  style_id TEXT NOT NULL,
  reallocatable_units INT,
  true_shortage_units INT,
  net_gap_units INT,
  revenue_at_risk NUMERIC(18,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kpi_network_gap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.kpi_network_gap FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_kpi_network_gap_tenant ON public.kpi_network_gap(tenant_id, as_of_date);

-- L4: Decision Packages
CREATE TABLE public.dec_decision_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  as_of_date DATE,
  package_type TEXT NOT NULL,
  scope_summary JSONB,
  impact_summary JSONB,
  risk_level TEXT DEFAULT 'LOW',
  confidence NUMERIC(5,4),
  status TEXT DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.dec_decision_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.dec_decision_packages FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_dec_packages_tenant_status ON public.dec_decision_packages(tenant_id, status);

-- L4: Decision Package Lines
CREATE TABLE public.dec_decision_package_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  package_id UUID REFERENCES public.dec_decision_packages(id),
  sku_id TEXT,
  fc_id TEXT,
  from_location_id UUID,
  to_location_id UUID,
  qty_suggested INT,
  qty_approved INT,
  reason_code TEXT,
  line_impact JSONB,
  exceptions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dec_decision_package_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.dec_decision_package_lines FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_dec_pkg_lines_package ON public.dec_decision_package_lines(package_id);

-- L4: Decision Approvals
CREATE TABLE public.dec_decision_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  package_id UUID REFERENCES public.dec_decision_packages(id),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  decision TEXT,
  override_summary JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dec_decision_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.dec_decision_approvals FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_dec_approvals_package ON public.dec_decision_approvals(package_id);

-- L4: Decision Outcomes
CREATE TABLE public.dec_decision_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  package_id UUID REFERENCES public.dec_decision_packages(id),
  evaluation_date DATE,
  predicted_impact JSONB,
  actual_impact JSONB,
  accuracy_score NUMERIC(5,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dec_decision_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.dec_decision_outcomes FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_dec_outcomes_package ON public.dec_decision_outcomes(package_id);

-- L4: Production Candidates
CREATE TABLE public.dec_production_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  as_of_date DATE,
  style_id TEXT NOT NULL,
  recommended_qty INT,
  size_breakdown JSONB,
  cash_required NUMERIC(18,2),
  margin_projection NUMERIC(18,2),
  payback_days INT,
  urgency_score NUMERIC(5,2),
  status TEXT DEFAULT 'PROPOSED',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dec_production_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.dec_production_candidates FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants));
CREATE INDEX idx_dec_prod_candidates_tenant ON public.dec_production_candidates(tenant_id, status);
