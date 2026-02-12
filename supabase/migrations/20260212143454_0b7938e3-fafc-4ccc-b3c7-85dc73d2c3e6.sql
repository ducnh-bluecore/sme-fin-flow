
-- Semantic registry: Allocation Policies
CREATE TABLE sem_allocation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  policy_type TEXT NOT NULL CHECK (policy_type IN ('BASE','DYNAMIC','SCARCITY','REPAIR')),
  name TEXT NOT NULL,
  weights JSONB DEFAULT '{}',
  constraints JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sem_allocation_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON sem_allocation_policies FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

-- Semantic registry: SKU Criticality
CREATE TABLE sem_sku_criticality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sku_id TEXT NOT NULL,
  style_id TEXT,
  criticality_class TEXT NOT NULL DEFAULT 'LONGTAIL' CHECK (criticality_class IN ('CORE','HERO','LONGTAIL')),
  min_presence_rule JSONB DEFAULT '{}',
  is_current BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sem_sku_criticality ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON sem_sku_criticality FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

-- Semantic registry: Size Curve Profiles
CREATE TABLE sem_size_curve_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  profile_name TEXT NOT NULL,
  category_id TEXT,
  brand_id TEXT,
  season_code TEXT,
  size_ratios JSONB NOT NULL DEFAULT '{}',
  is_current BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sem_size_curve_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON sem_size_curve_profiles FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

-- Indexes
CREATE INDEX idx_sem_policies_tenant ON sem_allocation_policies(tenant_id, is_active);
CREATE INDEX idx_sem_criticality_tenant ON sem_sku_criticality(tenant_id, is_current);
CREATE INDEX idx_sem_curves_tenant ON sem_size_curve_profiles(tenant_id, is_current);
