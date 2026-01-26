-- ============================================================
-- PHASE 1: DECISION LINEAGE & EVIDENCE LAYER
-- Audit-grade tracking: Which data + function version produced each decision
-- ============================================================

-- 1.1 Decision Evidence Packs - Links decisions to their source snapshots
CREATE TABLE public.decision_evidence_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.cdp_decision_cards(id) ON DELETE CASCADE,
  
  -- SNAPSHOT REFERENCES
  snapshot_ids UUID[] NOT NULL DEFAULT '{}',
  snapshot_table TEXT NOT NULL,
  snapshot_computed_at TIMESTAMPTZ NOT NULL,
  
  -- FUNCTION VERSIONING
  compute_function_name TEXT NOT NULL,
  compute_function_version TEXT NOT NULL DEFAULT 'v1.0.0',
  computation_duration_ms INTEGER,
  
  -- INPUT DATA INTEGRITY
  input_data_hash JSONB NOT NULL DEFAULT '{}',
  input_row_counts JSONB NOT NULL DEFAULT '{}',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- CONFIDENCE & QUALITY
  confidence_level TEXT DEFAULT 'HIGH' CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW', 'ESTIMATED')),
  data_quality_score NUMERIC(5,2),
  estimation_notes TEXT,
  
  -- METADATA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_decision_evidence UNIQUE (decision_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_evidence_tenant ON public.decision_evidence_packs(tenant_id);
CREATE INDEX idx_evidence_decision ON public.decision_evidence_packs(decision_id);
CREATE INDEX idx_evidence_function ON public.decision_evidence_packs(compute_function_name);
CREATE INDEX idx_evidence_period ON public.decision_evidence_packs(period_start, period_end);

-- Enable RLS
ALTER TABLE public.decision_evidence_packs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view evidence for their tenant"
  ON public.decision_evidence_packs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "System can insert evidence"
  ON public.decision_evidence_packs FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 1.2 Add compute_version to central_metrics_snapshots if not exists
ALTER TABLE public.central_metrics_snapshots 
  ADD COLUMN IF NOT EXISTS compute_version TEXT DEFAULT 'v1.0.0',
  ADD COLUMN IF NOT EXISTS compute_function TEXT DEFAULT 'compute_central_metrics_snapshot',
  ADD COLUMN IF NOT EXISTS input_hash TEXT;

-- 1.3 Add compute tracking to cdp_customer_equity_computed
ALTER TABLE public.cdp_customer_equity_computed
  ADD COLUMN IF NOT EXISTS compute_version TEXT DEFAULT 'v1.0.0',
  ADD COLUMN IF NOT EXISTS compute_function TEXT DEFAULT 'cdp_build_customer_equity';

-- 1.4 Function to attach evidence when creating a decision
CREATE OR REPLACE FUNCTION public.attach_evidence_to_decision(
  p_tenant_id UUID,
  p_decision_id UUID,
  p_snapshot_ids UUID[],
  p_snapshot_table TEXT,
  p_function_name TEXT,
  p_function_version TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_input_hash JSONB DEFAULT '{}',
  p_input_counts JSONB DEFAULT '{}',
  p_confidence TEXT DEFAULT 'HIGH',
  p_quality_score NUMERIC DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence_id UUID;
BEGIN
  INSERT INTO public.decision_evidence_packs (
    tenant_id,
    decision_id,
    snapshot_ids,
    snapshot_table,
    snapshot_computed_at,
    compute_function_name,
    compute_function_version,
    computation_duration_ms,
    input_data_hash,
    input_row_counts,
    period_start,
    period_end,
    confidence_level,
    data_quality_score
  ) VALUES (
    p_tenant_id,
    p_decision_id,
    p_snapshot_ids,
    p_snapshot_table,
    NOW(),
    p_function_name,
    p_function_version,
    p_duration_ms,
    p_input_hash,
    p_input_counts,
    p_period_start,
    p_period_end,
    p_confidence,
    p_quality_score
  )
  RETURNING id INTO v_evidence_id;
  
  RETURN v_evidence_id;
END;
$$;

-- 1.5 Function to get evidence for a decision (audit query)
CREATE OR REPLACE FUNCTION public.get_decision_evidence(p_decision_id UUID)
RETURNS TABLE (
  evidence_id UUID,
  decision_id UUID,
  snapshot_ids UUID[],
  snapshot_table TEXT,
  computed_at TIMESTAMPTZ,
  function_name TEXT,
  function_version TEXT,
  duration_ms INTEGER,
  input_hash JSONB,
  input_counts JSONB,
  period_start DATE,
  period_end DATE,
  confidence TEXT,
  quality_score NUMERIC,
  decision_title TEXT,
  decision_status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id as evidence_id,
    e.decision_id,
    e.snapshot_ids,
    e.snapshot_table,
    e.snapshot_computed_at as computed_at,
    e.compute_function_name as function_name,
    e.compute_function_version as function_version,
    e.computation_duration_ms as duration_ms,
    e.input_data_hash as input_hash,
    e.input_row_counts as input_counts,
    e.period_start,
    e.period_end,
    e.confidence_level as confidence,
    e.data_quality_score as quality_score,
    d.title as decision_title,
    d.status as decision_status
  FROM decision_evidence_packs e
  JOIN cdp_decision_cards d ON d.id = e.decision_id
  WHERE e.decision_id = p_decision_id;
$$;

-- 1.6 View for audit dashboard
CREATE OR REPLACE VIEW public.v_decision_audit_trail AS
SELECT 
  d.id as decision_id,
  d.title,
  d.status,
  d.severity,
  d.category,
  d.created_at as decision_created_at,
  e.snapshot_computed_at,
  e.compute_function_name,
  e.compute_function_version,
  e.confidence_level,
  e.data_quality_score,
  e.period_start,
  e.period_end,
  e.input_row_counts,
  CASE 
    WHEN e.id IS NULL THEN 'NO_EVIDENCE'
    WHEN e.confidence_level = 'HIGH' THEN 'AUDIT_READY'
    WHEN e.confidence_level = 'MEDIUM' THEN 'PARTIAL_EVIDENCE'
    ELSE 'ESTIMATED'
  END as audit_status,
  d.tenant_id
FROM public.cdp_decision_cards d
LEFT JOIN public.decision_evidence_packs e ON e.decision_id = d.id;