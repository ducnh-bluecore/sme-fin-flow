
-- ============================================================
-- Phase 4: Markdown Memory Engine — 3 tables + RPC
-- ============================================================

-- 1. inv_markdown_events — every discount event for a SKU
CREATE TABLE public.inv_markdown_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  fc_id UUID NOT NULL,
  sku TEXT NOT NULL,
  channel TEXT NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(14,2),
  selling_price NUMERIC(14,2),
  units_sold INTEGER NOT NULL DEFAULT 0,
  revenue_collected NUMERIC(14,2) NOT NULL DEFAULT 0,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_markdown_events_tenant ON public.inv_markdown_events(tenant_id);
CREATE INDEX idx_markdown_events_fc ON public.inv_markdown_events(tenant_id, fc_id);
CREATE INDEX idx_markdown_events_date ON public.inv_markdown_events(tenant_id, event_date);
CREATE INDEX idx_markdown_events_channel ON public.inv_markdown_events(tenant_id, channel);

ALTER TABLE public.inv_markdown_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation read" ON public.inv_markdown_events
  FOR SELECT USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation insert" ON public.inv_markdown_events
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation update" ON public.inv_markdown_events
  FOR UPDATE USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation delete" ON public.inv_markdown_events
  FOR DELETE USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

-- 2. sem_markdown_ladders — clearability by discount step & channel
CREATE TABLE public.sem_markdown_ladders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  fc_id UUID NOT NULL,
  channel TEXT NOT NULL,
  discount_step INTEGER NOT NULL, -- 10, 20, 30, 40, 50
  clearability_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_days_to_clear NUMERIC(8,1),
  total_units_cleared INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, fc_id, channel, discount_step)
);

CREATE INDEX idx_markdown_ladders_tenant ON public.sem_markdown_ladders(tenant_id);
CREATE INDEX idx_markdown_ladders_fc ON public.sem_markdown_ladders(tenant_id, fc_id);

ALTER TABLE public.sem_markdown_ladders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation read" ON public.sem_markdown_ladders
  FOR SELECT USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation insert" ON public.sem_markdown_ladders
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation update" ON public.sem_markdown_ladders
  FOR UPDATE USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

-- 3. sem_markdown_caps — discount guardrails per category/FC
CREATE TABLE public.sem_markdown_caps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  fc_id UUID,
  category TEXT,
  max_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 50,
  reason TEXT,
  override_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_markdown_caps_tenant ON public.sem_markdown_caps(tenant_id);
CREATE INDEX idx_markdown_caps_fc ON public.sem_markdown_caps(tenant_id, fc_id);
CREATE INDEX idx_markdown_caps_cat ON public.sem_markdown_caps(tenant_id, category);

ALTER TABLE public.sem_markdown_caps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation read" ON public.sem_markdown_caps
  FOR SELECT USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation insert" ON public.sem_markdown_caps
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation update" ON public.sem_markdown_caps
  FOR UPDATE USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

-- 4. RPC: fn_markdown_ladder_summary
CREATE OR REPLACE FUNCTION public.fn_markdown_ladder_summary(
  p_tenant_id UUID,
  p_fc_id UUID DEFAULT NULL
)
RETURNS TABLE(
  fc_id UUID,
  channel TEXT,
  discount_step INTEGER,
  clearability_score NUMERIC,
  avg_days_to_clear NUMERIC,
  total_units_cleared INTEGER,
  total_revenue NUMERIC,
  sample_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ml.fc_id,
    ml.channel,
    ml.discount_step,
    ml.clearability_score,
    ml.avg_days_to_clear,
    ml.total_units_cleared,
    ml.total_revenue,
    ml.sample_count
  FROM public.sem_markdown_ladders ml
  WHERE ml.tenant_id = p_tenant_id
    AND (p_fc_id IS NULL OR ml.fc_id = p_fc_id)
  ORDER BY ml.fc_id, ml.discount_step, ml.channel;
$$;
