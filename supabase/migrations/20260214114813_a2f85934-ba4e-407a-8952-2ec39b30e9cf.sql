
-- Create dedicated Size Intelligence evidence packs table
-- The existing evidence_packs table is for data quality auditing, not SI
CREATE TABLE IF NOT EXISTS public.si_evidence_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  product_id TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'size_intelligence',
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  summary TEXT NOT NULL,
  data_snapshot JSONB NOT NULL DEFAULT '{}',
  source_tables TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_si_evidence_packs_tenant_date ON public.si_evidence_packs(tenant_id, as_of_date);
CREATE INDEX idx_si_evidence_packs_product ON public.si_evidence_packs(tenant_id, product_id, as_of_date);
CREATE INDEX idx_si_evidence_packs_severity ON public.si_evidence_packs(tenant_id, severity);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_si_evidence_packs_unique ON public.si_evidence_packs(tenant_id, product_id, as_of_date);

-- Enable RLS
ALTER TABLE public.si_evidence_packs ENABLE ROW LEVEL SECURITY;

-- RLS policies (tenant isolation via service role for engine writes, user reads via tenant membership)
CREATE POLICY "Users can view own tenant evidence packs"
  ON public.si_evidence_packs FOR SELECT
  USING (tenant_id IN (
    SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage evidence packs"
  ON public.si_evidence_packs FOR ALL
  USING (true)
  WITH CHECK (true);
