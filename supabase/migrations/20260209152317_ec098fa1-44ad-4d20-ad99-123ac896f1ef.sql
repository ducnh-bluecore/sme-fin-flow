
-- ============================================================
-- Inventory Allocation Engine - 12 Tables
-- ============================================================

-- 1. inv_stores
CREATE TABLE public.inv_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  store_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'store' CHECK (location_type IN ('central_warehouse', 'sub_warehouse', 'store')),
  tier TEXT DEFAULT 'standard',
  region TEXT,
  capacity INTEGER,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, store_code)
);

-- 2. inv_family_codes
CREATE TABLE public.inv_family_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  fc_code TEXT NOT NULL,
  fc_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  season TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, fc_code)
);

-- 3. inv_sku_fc_mapping
CREATE TABLE public.inv_sku_fc_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  sku TEXT NOT NULL,
  fc_id UUID NOT NULL REFERENCES public.inv_family_codes(id),
  size TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku)
);

-- 4. inv_state_positions
CREATE TABLE public.inv_state_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  store_id UUID NOT NULL REFERENCES public.inv_stores(id),
  fc_id UUID NOT NULL REFERENCES public.inv_family_codes(id),
  sku TEXT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  on_hand INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  in_transit INTEGER NOT NULL DEFAULT 0,
  available INTEGER GENERATED ALWAYS AS (on_hand - reserved) STORED,
  safety_stock INTEGER NOT NULL DEFAULT 0,
  weeks_of_cover NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_state_positions_lookup 
  ON public.inv_state_positions(tenant_id, store_id, fc_id, snapshot_date);

-- 5. inv_state_demand
CREATE TABLE public.inv_state_demand (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  store_id UUID NOT NULL REFERENCES public.inv_stores(id),
  fc_id UUID NOT NULL REFERENCES public.inv_family_codes(id),
  sku TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sold INTEGER NOT NULL DEFAULT 0,
  avg_daily_sales NUMERIC(10,2) NOT NULL DEFAULT 0,
  sales_velocity NUMERIC(10,2) NOT NULL DEFAULT 0,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('growing', 'stable', 'declining')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_state_demand_lookup 
  ON public.inv_state_demand(tenant_id, store_id, fc_id);

-- 6. inv_constraint_registry
CREATE TABLE public.inv_constraint_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  constraint_key TEXT NOT NULL,
  constraint_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(tenant_id, constraint_key, version)
);

-- 7. inv_allocation_runs
CREATE TABLE public.inv_allocation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_recommendations INTEGER DEFAULT 0,
  total_units INTEGER DEFAULT 0,
  snapshot_id TEXT,
  constraints_version INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 8. inv_allocation_recommendations
CREATE TABLE public.inv_allocation_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  run_id UUID NOT NULL REFERENCES public.inv_allocation_runs(id),
  fc_id UUID NOT NULL REFERENCES public.inv_family_codes(id),
  fc_name TEXT,
  store_id UUID NOT NULL REFERENCES public.inv_stores(id),
  store_name TEXT,
  sku TEXT,
  recommended_qty INTEGER NOT NULL,
  current_on_hand INTEGER DEFAULT 0,
  current_weeks_cover NUMERIC(6,2),
  projected_weeks_cover NUMERIC(6,2),
  sales_velocity NUMERIC(10,2),
  priority TEXT DEFAULT 'P3' CHECK (priority IN ('P1', 'P2', 'P3')),
  reason TEXT,
  potential_revenue NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_alloc_recs_run ON public.inv_allocation_recommendations(tenant_id, run_id);

-- 9. inv_allocation_audit_log
CREATE TABLE public.inv_allocation_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_inv_audit_log_entity ON public.inv_allocation_audit_log(tenant_id, entity_type, entity_id);

-- 10. inv_transfer_orders
CREATE TABLE public.inv_transfer_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('allocation', 'rebalance')),
  source_id UUID NOT NULL,
  from_store_id UUID NOT NULL REFERENCES public.inv_stores(id),
  to_store_id UUID NOT NULL REFERENCES public.inv_stores(id),
  fc_id UUID NOT NULL REFERENCES public.inv_family_codes(id),
  sku TEXT,
  qty INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'in_transit', 'received', 'cancelled')),
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 11. inv_rebalance_runs
CREATE TABLE public.inv_rebalance_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_suggestions INTEGER DEFAULT 0,
  total_units INTEGER DEFAULT 0,
  push_units INTEGER DEFAULT 0,
  lateral_units INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 12. inv_rebalance_suggestions
CREATE TABLE public.inv_rebalance_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  run_id UUID NOT NULL REFERENCES public.inv_rebalance_runs(id),
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('push', 'lateral')),
  fc_id UUID NOT NULL REFERENCES public.inv_family_codes(id),
  fc_name TEXT,
  from_location UUID NOT NULL REFERENCES public.inv_stores(id),
  from_location_name TEXT,
  from_location_type TEXT,
  to_location UUID NOT NULL REFERENCES public.inv_stores(id),
  to_location_name TEXT,
  to_location_type TEXT,
  qty INTEGER NOT NULL,
  reason TEXT,
  from_weeks_cover NUMERIC(6,2),
  to_weeks_cover NUMERIC(6,2),
  balanced_weeks_cover NUMERIC(6,2),
  priority TEXT DEFAULT 'P3' CHECK (priority IN ('P1', 'P2', 'P3')),
  potential_revenue_gain NUMERIC(14,2),
  logistics_cost_estimate NUMERIC(14,2) DEFAULT 0,
  net_benefit NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_rebalance_sugg_run ON public.inv_rebalance_suggestions(tenant_id, run_id);
CREATE INDEX idx_inv_rebalance_sugg_type ON public.inv_rebalance_suggestions(tenant_id, transfer_type, status);

-- ============================================================
-- RLS Policies for all 12 tables
-- ============================================================

ALTER TABLE public.inv_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_family_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_sku_fc_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_state_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_state_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_constraint_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_allocation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_allocation_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_allocation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_transfer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_rebalance_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_rebalance_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS helper: check user belongs to tenant
-- Using same pattern as existing tables

CREATE POLICY "inv_stores_tenant_isolation" ON public.inv_stores
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_family_codes_tenant_isolation" ON public.inv_family_codes
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_sku_fc_mapping_tenant_isolation" ON public.inv_sku_fc_mapping
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_state_positions_tenant_isolation" ON public.inv_state_positions
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_state_demand_tenant_isolation" ON public.inv_state_demand
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_constraint_registry_tenant_isolation" ON public.inv_constraint_registry
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_allocation_runs_tenant_isolation" ON public.inv_allocation_runs
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_allocation_recommendations_tenant_isolation" ON public.inv_allocation_recommendations
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_allocation_audit_log_tenant_isolation" ON public.inv_allocation_audit_log
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_transfer_orders_tenant_isolation" ON public.inv_transfer_orders
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_rebalance_runs_tenant_isolation" ON public.inv_rebalance_runs
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "inv_rebalance_suggestions_tenant_isolation" ON public.inv_rebalance_suggestions
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
