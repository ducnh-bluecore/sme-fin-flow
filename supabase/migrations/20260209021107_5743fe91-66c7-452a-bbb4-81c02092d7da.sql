
-- Knowledge Snapshots table for AI Agent reasoning
CREATE TABLE public.knowledge_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one snapshot per type per day per tenant
ALTER TABLE public.knowledge_snapshots 
  ADD CONSTRAINT uq_knowledge_snapshot UNIQUE (tenant_id, snapshot_type, snapshot_date);

-- Index for fast lookup
CREATE INDEX idx_knowledge_snapshots_tenant_date 
  ON public.knowledge_snapshots (tenant_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.knowledge_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS: users can only read snapshots of their tenant
CREATE POLICY "Users can read own tenant snapshots"
  ON public.knowledge_snapshots FOR SELECT
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = auth.uid()
    )
  );

-- Service role can insert/update (edge functions)
CREATE POLICY "Service role can manage snapshots"
  ON public.knowledge_snapshots FOR ALL
  USING (true)
  WITH CHECK (true);
