
CREATE TABLE IF NOT EXISTS public.inv_size_curves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  fc_id uuid NOT NULL,
  size_ratios jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, fc_id)
);
ALTER TABLE public.inv_size_curves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access inv_size_curves" ON public.inv_size_curves FOR ALL TO authenticated USING (true) WITH CHECK (true);
