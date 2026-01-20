-- B1. Prediction Log (append-only)
CREATE TABLE IF NOT EXISTS public.ml_prediction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL,
  exception_id uuid NOT NULL,
  model_version text NOT NULL,
  predicted_confidence numeric(5,2) NOT NULL,
  final_confidence numeric(5,2) NOT NULL,
  features_hash text NOT NULL,
  explanation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_logs_time
  ON public.ml_prediction_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_logs_suggestion
  ON public.ml_prediction_logs(suggestion_id);

-- Enable RLS
ALTER TABLE public.ml_prediction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant ML logs"
  ON public.ml_prediction_logs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert ML logs"
  ON public.ml_prediction_logs FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- B2. ML Performance Snapshot (time-windowed)
CREATE TABLE IF NOT EXISTS public.ml_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_version text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_predictions int NOT NULL,
  confirmed_correct int NOT NULL,
  confirmed_incorrect int NOT NULL,
  unknown_outcomes int NOT NULL,
  accuracy numeric(5,2) NOT NULL,
  calibration_error numeric(5,2) NOT NULL,
  false_auto_rate numeric(5,2) NOT NULL,
  guardrail_block_rate numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_snapshots_time
  ON public.ml_performance_snapshots(tenant_id, period_end DESC);

-- Enable RLS
ALTER TABLE public.ml_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant ML snapshots"
  ON public.ml_performance_snapshots FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert ML snapshots"
  ON public.ml_performance_snapshots FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- B3. Drift Signals Table
CREATE TABLE IF NOT EXISTS public.ml_drift_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_version text NOT NULL,
  drift_type text NOT NULL CHECK (drift_type IN (
    'FEATURE_DISTRIBUTION',
    'CONFIDENCE_CALIBRATION',
    'OUTCOME_SHIFT',
    'AUTOMATION_RISK'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metric text NOT NULL,
  baseline_value numeric,
  current_value numeric,
  delta numeric,
  detected_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL,
  acknowledged_at timestamptz NULL,
  acknowledged_by uuid NULL,
  auto_action_taken text NULL
);

CREATE INDEX IF NOT EXISTS idx_ml_drift_time
  ON public.ml_drift_signals(tenant_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_drift_severity
  ON public.ml_drift_signals(tenant_id, severity);

-- Enable RLS
ALTER TABLE public.ml_drift_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant drift signals"
  ON public.ml_drift_signals FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert drift signals"
  ON public.ml_drift_signals FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update drift signals"
  ON public.ml_drift_signals FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Add ml_status column to tenant_ml_settings if not exists
ALTER TABLE public.tenant_ml_settings 
  ADD COLUMN IF NOT EXISTS ml_status text NOT NULL DEFAULT 'ACTIVE' 
  CHECK (ml_status IN ('ACTIVE', 'LIMITED', 'DISABLED'));

ALTER TABLE public.tenant_ml_settings
  ADD COLUMN IF NOT EXISTS last_fallback_reason text NULL;

ALTER TABLE public.tenant_ml_settings
  ADD COLUMN IF NOT EXISTS last_fallback_at timestamptz NULL;