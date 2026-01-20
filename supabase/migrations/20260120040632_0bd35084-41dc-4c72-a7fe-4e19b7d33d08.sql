-- ================================================
-- DECISION SNAPSHOTS: Append-only truth ledger
-- Part of SSOT v1 for CFO metrics (Real Cash)
-- ================================================

-- Table: decision_snapshots (append-only ledger)
CREATE TABLE IF NOT EXISTS public.decision_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,

  metric_code text NOT NULL,                 -- 'cash_today', 'cash_flow_today', 'cash_next_7d'
  metric_version int NOT NULL DEFAULT 1,     -- bump when formula semantics change

  entity_type text NOT NULL DEFAULT 'tenant' CHECK (entity_type IN ('tenant','account','invoice','customer','store','channel')),
  entity_id uuid NULL,

  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,  -- e.g. { "currency":"VND" }

  value numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'VND',

  truth_level text NOT NULL CHECK (truth_level IN ('settled','provisional')),
  authority text NOT NULL CHECK (authority IN ('BANK','MANUAL','RULE','ACCOUNTING','GATEWAY','CARRIER')),

  confidence numeric(5,2) NOT NULL DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),

  as_of timestamptz NOT NULL DEFAULT now(),
  derived_from jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculation_hash text NULL,

  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  supersedes_id uuid NULL REFERENCES public.decision_snapshots(id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_decision_latest
  ON public.decision_snapshots(tenant_id, metric_code, entity_type, entity_id, as_of DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_metric_time
  ON public.decision_snapshots(tenant_id, metric_code, as_of DESC);

CREATE INDEX IF NOT EXISTS idx_decision_dimensions_gin
  ON public.decision_snapshots USING gin (dimensions);

CREATE INDEX IF NOT EXISTS idx_decision_derived_from_gin
  ON public.decision_snapshots USING gin (derived_from);

-- View: v_decision_latest (get latest snapshot per metric + dimension)
CREATE OR REPLACE VIEW public.v_decision_latest AS
SELECT DISTINCT ON (
  tenant_id,
  metric_code,
  entity_type,
  COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
  dimensions
)
  *
FROM public.decision_snapshots
ORDER BY
  tenant_id,
  metric_code,
  entity_type,
  COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
  dimensions,
  as_of DESC,
  created_at DESC;

-- ================================================
-- RLS POLICIES (append-only: SELECT + INSERT only)
-- ================================================
ALTER TABLE public.decision_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: Members of tenant can read
CREATE POLICY "Users can view their tenant decision snapshots"
  ON public.decision_snapshots FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- INSERT: Members can insert (append-only)
CREATE POLICY "Users can insert decision snapshots for their tenant"
  ON public.decision_snapshots FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- NO UPDATE policy for regular users (append-only)
-- NO DELETE policy for regular users (append-only)

-- Grant access to view
GRANT SELECT ON public.v_decision_latest TO authenticated;
GRANT SELECT ON public.v_decision_latest TO anon;