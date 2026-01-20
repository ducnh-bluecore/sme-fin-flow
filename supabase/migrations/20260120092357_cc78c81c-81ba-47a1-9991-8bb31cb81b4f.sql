
-- ============================================================
-- ML V2 TRAINING, CALIBRATION & DRIFT - Final corrected
-- ============================================================

-- 1) ML Training Samples table
CREATE TABLE IF NOT EXISTS public.ml_training_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  suggestion_id uuid REFERENCES public.reconciliation_suggestions(id),
  exception_type text NOT NULL,
  features jsonb NOT NULL,
  label boolean NOT NULL,
  outcome_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ml_training_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant training samples"
  ON public.ml_training_samples FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 2) Build training samples from ledger (using issue_date from invoices)
INSERT INTO public.ml_training_samples (
  tenant_id, suggestion_id, exception_type, features, label, outcome_source
)
SELECT
  rs.tenant_id,
  rs.id,
  COALESCE(eq.exception_type, 'RECONCILIATION'),
  jsonb_build_object(
    'amount_ratio', CASE WHEN inv.total_amount > 0 THEN rl.settlement_amount / inv.total_amount ELSE 1 END,
    'days_delay', EXTRACT(DAY FROM (bt.transaction_date::timestamp - inv.issue_date::timestamp)),
    'confidence', rs.confidence,
    'suggestion_type', rs.suggestion_type
  ),
  (COALESCE(sa.allocation_type, 'MANUAL') = 'AUTO') AS label,
  'ledger_outcome'
FROM public.reconciliation_links rl
JOIN public.reconciliation_suggestions rs ON rs.bank_transaction_id = rl.bank_transaction_id 
  AND rs.invoice_id = rl.target_id 
  AND rl.target_type = 'invoice'
LEFT JOIN public.exceptions_queue eq ON eq.id = rs.exception_id
JOIN public.invoices inv ON inv.id = rl.target_id
JOIN public.bank_transactions bt ON bt.id = rl.bank_transaction_id
LEFT JOIN public.settlement_allocations sa ON sa.reconciliation_link_id = rl.id
WHERE rl.is_voided = false
ON CONFLICT DO NOTHING;

-- 3) ML Drift Events table
CREATE TABLE IF NOT EXISTS public.ml_drift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  model_version text NOT NULL,
  drift_metric text NOT NULL,
  drift_value numeric(8,4) NOT NULL,
  threshold numeric(8,4) NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text
);

ALTER TABLE public.ml_drift_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant drift events"
  ON public.ml_drift_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant drift events"
  ON public.ml_drift_events FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 4) Auto-detect drift from calibration error
INSERT INTO public.ml_drift_events (
  tenant_id, model_version, drift_metric, drift_value, threshold, status, severity
)
SELECT
  tenant_id,
  model_version,
  'calibration_error',
  calibration_error,
  0.10,
  'OPEN',
  CASE 
    WHEN calibration_error > 0.15 THEN 'critical'
    WHEN calibration_error > 0.10 THEN 'warning'
    ELSE 'info'
  END
FROM public.ml_performance_snapshots
WHERE calibration_error > 0.10
  AND created_at > now() - interval '7 days';

-- 5) Detect high false_auto_rate
INSERT INTO public.ml_drift_events (
  tenant_id, model_version, drift_metric, drift_value, threshold, status, severity
)
SELECT
  tenant_id,
  model_version,
  'false_auto_rate',
  false_auto_rate,
  0.01,
  'OPEN',
  'critical'
FROM public.ml_performance_snapshots
WHERE false_auto_rate > 0.01
  AND created_at > now() - interval '7 days';

-- 6) Auto Kill-switch on critical drift
UPDATE public.tenant_ml_settings
SET 
  ml_enabled = false,
  ml_status = 'disabled_drift',
  last_fallback_reason = 'Auto-disabled due to critical drift detected',
  last_fallback_at = now()
WHERE tenant_id IN (
  SELECT tenant_id FROM public.ml_drift_events 
  WHERE status = 'OPEN' AND severity = 'critical'
);

-- 7) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_drift_events_tenant_status 
ON public.ml_drift_events (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_ml_training_samples_tenant 
ON public.ml_training_samples (tenant_id, created_at);
