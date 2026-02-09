
-- =============================================
-- Phase 1: SOP 2-Round Allocation Schema Update
-- =============================================

-- 1a. New table: inv_collections (BST scope)
CREATE TABLE public.inv_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  collection_code TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  air_date DATE,
  is_new_collection BOOLEAN NOT NULL DEFAULT false,
  season TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inv_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for inv_collections"
  ON public.inv_collections FOR ALL
  USING (tenant_id IN (SELECT t.id FROM tenants t JOIN tenant_users tu ON t.id = tu.tenant_id WHERE tu.user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT t.id FROM tenants t JOIN tenant_users tu ON t.id = tu.tenant_id WHERE tu.user_id = auth.uid()));

CREATE INDEX idx_inv_collections_tenant ON public.inv_collections(tenant_id);
CREATE INDEX idx_inv_collections_air_date ON public.inv_collections(tenant_id, air_date DESC);

-- 1b. New table: inv_state_size_integrity
CREATE TABLE public.inv_state_size_integrity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fc_id UUID NOT NULL REFERENCES public.inv_family_codes(id),
  store_id UUID REFERENCES public.inv_stores(id),
  total_sizes_expected INTEGER NOT NULL DEFAULT 0,
  total_sizes_available INTEGER NOT NULL DEFAULT 0,
  is_full_size_run BOOLEAN NOT NULL DEFAULT false,
  missing_sizes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inv_state_size_integrity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for inv_state_size_integrity"
  ON public.inv_state_size_integrity FOR ALL
  USING (tenant_id IN (SELECT t.id FROM tenants t JOIN tenant_users tu ON t.id = tu.tenant_id WHERE tu.user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT t.id FROM tenants t JOIN tenant_users tu ON t.id = tu.tenant_id WHERE tu.user_id = auth.uid()));

CREATE INDEX idx_inv_size_integrity_tenant ON public.inv_state_size_integrity(tenant_id);
CREATE INDEX idx_inv_size_integrity_fc ON public.inv_state_size_integrity(tenant_id, fc_id);

-- 1c. Add columns to existing tables

-- inv_family_codes: collection_id + is_core_hero
ALTER TABLE public.inv_family_codes
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.inv_collections(id),
  ADD COLUMN IF NOT EXISTS is_core_hero BOOLEAN NOT NULL DEFAULT false;

-- inv_sku_fc_mapping: is_core_hero at SKU level
ALTER TABLE public.inv_sku_fc_mapping
  ADD COLUMN IF NOT EXISTS is_core_hero BOOLEAN NOT NULL DEFAULT false;

-- inv_state_demand: V2 priority data
ALTER TABLE public.inv_state_demand
  ADD COLUMN IF NOT EXISTS customer_orders_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_orders_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lost_sales_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forecast_week_qty NUMERIC;

-- inv_state_positions: snapshot linkage
ALTER TABLE public.inv_state_positions
  ADD COLUMN IF NOT EXISTS snapshot_id TEXT;

-- inv_allocation_runs: run_type for V1/V2/rebalance
ALTER TABLE public.inv_allocation_runs
  ADD COLUMN IF NOT EXISTS run_type TEXT NOT NULL DEFAULT 'V1';

-- inv_allocation_recommendations: stage, constraint_checks, explain_text
ALTER TABLE public.inv_allocation_recommendations
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'V1',
  ADD COLUMN IF NOT EXISTS constraint_checks JSONB,
  ADD COLUMN IF NOT EXISTS explain_text TEXT;

-- 1d. Insert new SOP constraint keys
INSERT INTO public.inv_constraint_registry (tenant_id, constraint_key, constraint_value, description, is_active, version)
SELECT t.tenant_id, v.key, v.value::jsonb, v.description, true, 1
FROM (
  SELECT DISTINCT tenant_id FROM public.inv_constraint_registry
) t
CROSS JOIN (
  VALUES
    ('v1_min_store_stock_by_total_sku', '{"ranges": [{"max_sku": 50, "min_qty": 2}, {"max_sku": 100, "min_qty": 3}, {"max_sku": 200, "min_qty": 4}, {"max_sku": 9999, "min_qty": 5}]}', 'SOP V1: Min stock per FC at store based on total SKU count & tier'),
    ('cw_reserved_min_by_total_sku', '{"ranges": [{"max_sku": 50, "min_pcs": 5}, {"max_sku": 100, "min_pcs": 10}, {"max_sku": 200, "min_pcs": 15}, {"max_sku": 9999, "min_pcs": 20}]}', 'Min pieces to keep at CW based on total SKU count'),
    ('cw_core_hero_min_per_sku', '{"min_pcs": 15}', 'Core/Hero items: min 15 pcs per SKU at CW'),
    ('v2_priority_order', '["customer_orders", "store_orders", "top_fc"]', 'V2 allocation priority order'),
    ('v2_min_cover_weeks', '{"weeks": 1}', 'V2: min weeks cover after allocation'),
    ('logistics_cost_by_region', '{"same_region": 20000, "diff_region": 45000, "default": 30000}', 'Logistics cost by region for lateral transfers'),
    ('avg_unit_price_default', '{"amount": 250000}', 'Default avg unit price for revenue calculations'),
    ('bst_scope_recent_count', '{"count": 10}', 'Number of recent collections in V1 scope'),
    ('restock_lookback_days', '{"days": 14}', 'Days to look back for restock batches')
) AS v(key, value, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.inv_constraint_registry cr
  WHERE cr.tenant_id = t.tenant_id AND cr.constraint_key = v.key
);
