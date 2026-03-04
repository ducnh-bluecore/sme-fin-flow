
-- Store KPI targets table
CREATE TABLE public.store_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  period_value TEXT NOT NULL,
  revenue_target NUMERIC DEFAULT 0,
  orders_target INTEGER DEFAULT 0,
  customers_target INTEGER DEFAULT 0,
  aov_target NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, store_id, period_type, period_value)
);

-- RLS
ALTER TABLE public.store_kpi_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for store_kpi_targets"
ON public.store_kpi_targets
FOR ALL
TO authenticated
USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id))
WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

-- Index for fast lookups
CREATE INDEX idx_store_kpi_targets_tenant_store ON public.store_kpi_targets(tenant_id, store_id, period_type);
