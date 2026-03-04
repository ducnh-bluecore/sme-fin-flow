
-- Lifecycle templates: configurable milestones per category
CREATE TABLE public.inv_lifecycle_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  lifecycle_days INTEGER NOT NULL DEFAULT 180,
  milestones JSONB NOT NULL DEFAULT '[{"day":60,"target_pct":50},{"day":120,"target_pct":70},{"day":180,"target_pct":100}]',
  markdown_after_days INTEGER DEFAULT 120,
  markdown_pct NUMERIC(5,2) DEFAULT 30,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inv_lifecycle_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view lifecycle templates"
  ON public.inv_lifecycle_templates FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage lifecycle templates"
  ON public.inv_lifecycle_templates FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Lifecycle batches: tracks each import batch (initial + restocks)
CREATE TABLE public.inv_lifecycle_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fc_id UUID NOT NULL REFERENCES public.inv_family_codes(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL DEFAULT 1,
  batch_qty INTEGER NOT NULL,
  batch_start_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto_detected',
  lifecycle_template_id UUID REFERENCES public.inv_lifecycle_templates(id),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, fc_id, batch_number)
);

ALTER TABLE public.inv_lifecycle_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view lifecycle batches"
  ON public.inv_lifecycle_batches FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage lifecycle batches"
  ON public.inv_lifecycle_batches FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Insert a default template
-- (tenant_id will need to be set per tenant; this is a system-level default marker)
