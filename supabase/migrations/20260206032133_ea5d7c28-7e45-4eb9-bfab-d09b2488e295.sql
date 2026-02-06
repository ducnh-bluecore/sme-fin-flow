-- ============================================
-- PHASE 2: SSOT INFRASTRUCTURE TABLES
-- ============================================

-- 1. JOB_RUNS TABLE
CREATE TABLE IF NOT EXISTS public.job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  lock_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' 
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  input_params JSONB,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.job_runs IS 'Tracks edge function executions for idempotency';

CREATE INDEX IF NOT EXISTS idx_job_runs_tenant_function 
  ON public.job_runs(tenant_id, function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_status_running 
  ON public.job_runs(status) WHERE status = 'running';
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_runs_lock_active 
  ON public.job_runs(lock_key) WHERE status = 'running';

ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_runs_tenant_isolation ON public.job_runs
  FOR ALL USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

-- 2. EVIDENCE_PACKS TABLE
CREATE TABLE IF NOT EXISTS public.evidence_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  watermark JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  reconciliation_diffs JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

COMMENT ON TABLE public.evidence_packs IS 'Audit trail for data state at decision time. TTL 30 days';

CREATE INDEX IF NOT EXISTS idx_evidence_packs_tenant ON public.evidence_packs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_packs_as_of ON public.evidence_packs(as_of DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_packs_expires ON public.evidence_packs(expires_at);

ALTER TABLE public.evidence_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY evidence_packs_tenant_isolation ON public.evidence_packs
  FOR ALL USING (tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  ));

-- 3. ADD EVIDENCE_PACK_ID TO EXISTING TABLES
ALTER TABLE public.alert_instances 
  ADD COLUMN IF NOT EXISTS evidence_pack_id UUID REFERENCES public.evidence_packs(id);

ALTER TABLE public.decision_cards 
  ADD COLUMN IF NOT EXISTS evidence_pack_id UUID REFERENCES public.evidence_packs(id);

CREATE INDEX IF NOT EXISTS idx_alert_instances_evidence 
  ON public.alert_instances(evidence_pack_id) WHERE evidence_pack_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_cards_evidence 
  ON public.decision_cards(evidence_pack_id) WHERE evidence_pack_id IS NOT NULL;

-- 4. CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION public.cleanup_expired_evidence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.evidence_packs ep
  WHERE ep.expires_at < now()
    AND NOT EXISTS (SELECT 1 FROM public.alert_instances ai WHERE ai.evidence_pack_id = ep.id)
    AND NOT EXISTS (SELECT 1 FROM public.decision_cards dc WHERE dc.evidence_pack_id = ep.id);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 5. HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.create_evidence_pack(
  p_tenant_id UUID,
  p_watermark JSONB DEFAULT '{}'::jsonb,
  p_row_counts JSONB DEFAULT '{}'::jsonb,
  p_quality_scores JSONB DEFAULT '{}'::jsonb,
  p_reconciliation_diffs JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence_id UUID;
BEGIN
  INSERT INTO public.evidence_packs (tenant_id, as_of, watermark, row_counts, quality_scores, reconciliation_diffs, expires_at)
  VALUES (p_tenant_id, now(), p_watermark, p_row_counts, p_quality_scores, p_reconciliation_diffs, now() + INTERVAL '30 days')
  RETURNING id INTO v_evidence_id;
  RETURN v_evidence_id;
END;
$$;