-- ============================================================
-- PROMPT #5 — ML V2 TRAINING, CALIBRATION & DRIFT
-- ============================================================

-- ------------------------------------------------------------
-- 1) ML Training Dataset (derived from ledger outcomes)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ml_training_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  suggestion_id uuid NOT NULL,
  exception_type text NOT NULL,
  features jsonb NOT NULL,
  label boolean NOT NULL,        -- true = correct reconciliation
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Build training samples from ledger (AUTO vs MANUAL outcomes)
-- Using correct column names: target_id, transaction_date, issue_date
INSERT INTO public.ml_training_samples (
  tenant_id, suggestion_id, exception_type, features, label
)
SELECT
  rl.tenant_id,
  rs.id AS suggestion_id,
  eq.exception_type,
  jsonb_build_object(
    'amount_ratio', CASE WHEN inv.total_amount > 0 THEN rl.settlement_amount / inv.total_amount ELSE 0 END,
    'days_delay', (bt.transaction_date::date - inv.issue_date::date),
    'confidence', rl.confidence,
    'match_type', rl.match_type
  ) AS features,
  (sa.allocation_type = 'AUTO') AS label
FROM public.reconciliation_links rl
JOIN public.reconciliation_suggestions rs 
  ON rs.bank_transaction_id = rl.bank_transaction_id 
  AND rs.invoice_id = rl.target_id
  AND rs.tenant_id = rl.tenant_id
JOIN public.exceptions_queue eq ON eq.id = rs.exception_id
JOIN public.invoices inv ON inv.id = rl.target_id AND rl.target_type = 'invoice'
JOIN public.bank_transactions bt ON bt.id = rl.bank_transaction_id
LEFT JOIN public.settlement_allocations sa ON sa.reconciliation_link_id = rl.id
WHERE rl.is_voided = false
  AND rl.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 2) ML Calibration Snapshots
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ml_calibration_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  model_version text NOT NULL,
  accuracy numeric(5,2) NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  calibration_error numeric(6,4) NOT NULL CHECK (calibration_error BETWEEN 0 AND 1),
  sample_size int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Example snapshot (placeholder for Edge job)
INSERT INTO public.ml_calibration_snapshots (
  tenant_id, model_version, accuracy, calibration_error, sample_size
)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'v2.0',
  93.5,
  0.04,
  100
);

-- ------------------------------------------------------------
-- 3) Drift Detection
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ml_drift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  model_version text NOT NULL,
  drift_metric text NOT NULL,
  drift_value numeric(8,4) NOT NULL,
  threshold numeric(8,4) NOT NULL,
  status text NOT NULL CHECK (status IN ('OPEN','RESOLVED')),
  detected_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-detect drift from calibration error
INSERT INTO public.ml_drift_events (
  tenant_id, model_version, drift_metric, drift_value, threshold, status
)
SELECT
  tenant_id,
  model_version,
  'calibration_error',
  calibration_error,
  0.10,
  'OPEN'
FROM public.ml_calibration_snapshots
WHERE calibration_error > 0.10;

-- ------------------------------------------------------------
-- 4) Auto Kill-switch on Drift (only if tenant_ml_settings exists)
-- ------------------------------------------------------------

UPDATE public.tenant_ml_settings
SET ml_enabled = false
WHERE tenant_id IN (
  SELECT tenant_id FROM public.ml_drift_events WHERE status='OPEN'
);