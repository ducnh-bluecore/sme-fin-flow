-- B1. Tenant ML Settings (Opt-in switch)
CREATE TABLE IF NOT EXISTS public.tenant_ml_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  ml_enabled boolean NOT NULL DEFAULT false,
  ml_model_version text NOT NULL DEFAULT 'v2.0',
  min_confidence_threshold numeric(5,2) NOT NULL DEFAULT 90,
  enabled_at timestamptz NULL,
  enabled_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_ml_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant ML settings"
  ON public.tenant_ml_settings FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant ML settings"
  ON public.tenant_ml_settings FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their tenant ML settings"
  ON public.tenant_ml_settings FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- B2. ML Features Store (snapshot-based)
CREATE TABLE IF NOT EXISTS public.reconciliation_ml_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL,
  exception_type text NOT NULL,
  suggestion_type text NOT NULL,
  features jsonb NOT NULL,
  label text NULL CHECK (label IN ('CORRECT', 'INCORRECT')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_features_tenant
  ON public.reconciliation_ml_features(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_features_suggestion
  ON public.reconciliation_ml_features(suggestion_id);

-- Enable RLS
ALTER TABLE public.reconciliation_ml_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ML Features
CREATE POLICY "Users can view their tenant ML features"
  ON public.reconciliation_ml_features FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert ML features"
  ON public.reconciliation_ml_features FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- B3. ML Predictions Table (append-only)
CREATE TABLE IF NOT EXISTS public.reconciliation_ml_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL,
  model_version text NOT NULL,
  predicted_confidence numeric(5,2) NOT NULL,
  explanation jsonb NOT NULL,
  features_hash text NULL,
  final_confidence numeric(5,2) NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_tenant
  ON public.reconciliation_ml_predictions(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_suggestion
  ON public.reconciliation_ml_predictions(suggestion_id);

-- Enable RLS
ALTER TABLE public.reconciliation_ml_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ML Predictions
CREATE POLICY "Users can view their tenant ML predictions"
  ON public.reconciliation_ml_predictions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert ML predictions"
  ON public.reconciliation_ml_predictions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Create updated_at trigger for tenant_ml_settings
CREATE TRIGGER update_tenant_ml_settings_updated_at
  BEFORE UPDATE ON public.tenant_ml_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();