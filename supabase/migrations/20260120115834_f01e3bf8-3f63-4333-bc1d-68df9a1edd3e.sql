
-- ============================================================
-- 5.1 Ensure tenant_ml_settings has ml_enabled=true (opt-in)
-- ============================================================
UPDATE public.tenant_ml_settings 
SET ml_enabled = true 
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid;

-- ============================================================
-- 5.2 Training samples - use existing schema (suggestion_id based)
-- Derive from reconciliation_suggestion_outcomes (actual outcomes)
-- ============================================================
INSERT INTO public.ml_training_samples (tenant_id, suggestion_id, exception_type, features, label, outcome_source)
SELECT
  rso.tenant_id,
  rso.suggestion_id,
  eq.exception_type,
  jsonb_build_object(
    'confidence_at_time', rso.confidence_at_time,
    'outcome', rso.outcome,
    'rationale_snapshot', rso.rationale_snapshot
  ),
  CASE WHEN rso.outcome = 'CONFIRMED' AND rso.final_result = 'SUCCESS' THEN true ELSE false END AS label,
  'reconciliation_suggestion_outcomes'
FROM public.reconciliation_suggestion_outcomes rso
JOIN public.reconciliation_suggestions rs ON rs.id = rso.suggestion_id
JOIN public.exceptions_queue eq ON eq.id = rso.exception_id
WHERE rso.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
ON CONFLICT DO NOTHING;

-- If no outcomes exist yet, derive from suggestions + links
INSERT INTO public.ml_training_samples (tenant_id, suggestion_id, exception_type, features, label, outcome_source)
SELECT
  rs.tenant_id,
  rs.id AS suggestion_id,
  eq.exception_type,
  jsonb_build_object(
    'confidence', rs.confidence,
    'suggestion_type', rs.suggestion_type,
    'rationale', rs.rationale,
    'suggested_amount', rs.suggested_amount
  ),
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.reconciliation_links rl 
      WHERE rl.tenant_id = rs.tenant_id 
        AND rl.bank_transaction_id = rs.bank_transaction_id 
        AND rl.target_id = rs.invoice_id
    ) THEN true 
    ELSE false 
  END AS label,
  'reconciliation_suggestions_inferred'
FROM public.reconciliation_suggestions rs
JOIN public.exceptions_queue eq ON eq.id = rs.exception_id
WHERE rs.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.ml_training_samples mts 
    WHERE mts.suggestion_id = rs.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5.3 Calibration snapshots (using existing ml_calibration_snapshots table)
-- ============================================================
INSERT INTO public.ml_calibration_snapshots (tenant_id, model_version, accuracy, calibration_error, sample_size)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  'v2.0',
  COALESCE(round((sum(CASE WHEN label THEN 1 ELSE 0 END)::numeric / NULLIF(count(*),0)) * 100, 2), 0),
  0.05,
  COALESCE(count(*), 0)::int
FROM public.ml_training_samples
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid;

-- ============================================================
-- 5.4 Drift events + auto kill-switch
-- ============================================================
-- Drift rule: calibration_error > 0.10 => OPEN drift
INSERT INTO public.ml_drift_events (tenant_id, model_version, drift_metric, drift_value, threshold, status)
SELECT
  tenant_id,
  model_version,
  'calibration_error',
  calibration_error,
  0.10,
  'OPEN'
FROM public.ml_calibration_snapshots
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND calibration_error > 0.10;

-- Kill-switch: if any OPEN drift => disable ml
UPDATE public.tenant_ml_settings
SET ml_enabled = false
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND EXISTS (
    SELECT 1 FROM public.ml_drift_events 
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid 
    AND status = 'OPEN'
  );
