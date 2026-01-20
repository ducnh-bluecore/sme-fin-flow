-- ============================================================
-- BLUECORE FDP - STEP A (P0) DB HARDENING PACK
-- Integrity & Safety Lock
-- ============================================================

-- ------------------------------------------------------------
-- 0) Helper: safe column add to tenant_ml_settings
-- ------------------------------------------------------------
DO $$
BEGIN
  -- tenant_ml_settings.ml_enabled (boolean) as canonical kill-switch flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tenant_ml_settings' AND column_name='ml_enabled'
  ) THEN
    ALTER TABLE public.tenant_ml_settings
    ADD COLUMN ml_enabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tenant_ml_settings' AND column_name='ml_model_version'
  ) THEN
    ALTER TABLE public.tenant_ml_settings
    ADD COLUMN ml_model_version text NOT NULL DEFAULT 'v2.0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tenant_ml_settings' AND column_name='min_confidence_threshold'
  ) THEN
    ALTER TABLE public.tenant_ml_settings
    ADD COLUMN min_confidence_threshold numeric(5,2) NOT NULL DEFAULT 90;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1) P0-Critical: ML numeric range validation (0..100)
-- ------------------------------------------------------------

-- reconciliation_ml_predictions: predicted_confidence in [0,100]
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='reconciliation_ml_predictions'
  ) THEN

    -- Add predicted_confidence range constraint
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_ml_predicted_confidence_0_100'
    ) THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_predicted_confidence_0_100
      CHECK (predicted_confidence BETWEEN 0 AND 100);
    END IF;

    -- If final_confidence exists, constrain it too
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reconciliation_ml_predictions' AND column_name='final_confidence'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_ml_final_confidence_0_100'
    ) THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_final_confidence_0_100
      CHECK (final_confidence BETWEEN 0 AND 100);
    END IF;

    -- Optional: enforce explanation jsonb is object
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reconciliation_ml_predictions' AND column_name='explanation'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_ml_explanation_is_object'
    ) THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_explanation_is_object
      CHECK (jsonb_typeof(explanation) = 'object');
    END IF;

  END IF;
END $$;

-- ml_prediction_logs: predicted_confidence/final_confidence ranges
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ml_prediction_logs'
  ) THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_ml_logs_predicted_confidence_0_100'
    ) THEN
      ALTER TABLE public.ml_prediction_logs
      ADD CONSTRAINT chk_ml_logs_predicted_confidence_0_100
      CHECK (predicted_confidence BETWEEN 0 AND 100);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_prediction_logs' AND column_name='final_confidence'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_ml_logs_final_confidence_0_100'
    ) THEN
      ALTER TABLE public.ml_prediction_logs
      ADD CONSTRAINT chk_ml_logs_final_confidence_0_100
      CHECK (final_confidence BETWEEN 0 AND 100);
    END IF;

  END IF;
END $$;

-- ml_performance_snapshots ranges (accuracy, rates)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ml_performance_snapshots'
  ) THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_ml_perf_accuracy_0_100'
    ) THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_accuracy_0_100
      CHECK (accuracy BETWEEN 0 AND 100);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_performance_snapshots' AND column_name='false_auto_rate'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_ml_perf_false_auto_rate_0_100'
    ) THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_false_auto_rate_0_100
      CHECK (false_auto_rate BETWEEN 0 AND 100);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_performance_snapshots' AND column_name='guardrail_block_rate'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_ml_perf_guardrail_block_rate_0_100'
    ) THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_guardrail_block_rate_0_100
      CHECK (guardrail_block_rate BETWEEN 0 AND 100);
    END IF;

  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) P0-Critical: Resolve ML duplication (Option A)
-- predictions = current state; logs = audit trail
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='reconciliation_ml_predictions'
  ) THEN

    -- Add is_latest if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reconciliation_ml_predictions' AND column_name='is_latest'
    ) THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD COLUMN is_latest boolean NOT NULL DEFAULT true;
    END IF;

  END IF;
END $$;

-- Create unique partial index for latest predictions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='reconciliation_ml_predictions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname='public' AND indexname='ux_ml_predictions_latest'
    ) THEN
      CREATE UNIQUE INDEX ux_ml_predictions_latest
      ON public.reconciliation_ml_predictions (tenant_id, suggestion_id, model_version)
      WHERE is_latest = true;
    END IF;
  END IF;
END $$;

-- Function: sync predictions to logs with kill-switch enforcement
CREATE OR REPLACE FUNCTION public.sync_ml_predictions_to_logs()
RETURNS trigger AS $$
DECLARE
  v_enabled boolean;
BEGIN
  -- Enforce kill-switch at DB level
  SELECT ml_enabled INTO v_enabled
  FROM public.tenant_ml_settings
  WHERE tenant_id = NEW.tenant_id;

  IF v_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ML is disabled for this tenant (kill-switch active)';
  END IF;

  -- If NEW is latest, demote other rows for same key
  IF NEW.is_latest = true THEN
    UPDATE public.reconciliation_ml_predictions
    SET is_latest = false
    WHERE tenant_id = NEW.tenant_id
      AND suggestion_id = NEW.suggestion_id
      AND model_version = NEW.model_version
      AND id <> NEW.id
      AND is_latest = true;
  END IF;

  -- Insert audit trail row to ml_prediction_logs (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ml_prediction_logs'
  ) THEN
    INSERT INTO public.ml_prediction_logs (
      tenant_id,
      suggestion_id,
      exception_id,
      model_version,
      predicted_confidence,
      final_confidence,
      features_hash,
      explanation
    )
    VALUES (
      NEW.tenant_id,
      NEW.suggestion_id,
      COALESCE(NEW.exception_id, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.model_version,
      NEW.predicted_confidence,
      COALESCE(NEW.final_confidence, NEW.predicted_confidence),
      COALESCE(NEW.features_hash, md5(COALESCE(NEW.explanation::text,''))),
      COALESCE(NEW.explanation, '{}'::jsonb)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on predictions table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='reconciliation_ml_predictions'
  ) THEN
    DROP TRIGGER IF EXISTS trg_sync_ml_predictions_to_logs ON public.reconciliation_ml_predictions;

    CREATE TRIGGER trg_sync_ml_predictions_to_logs
    AFTER INSERT OR UPDATE ON public.reconciliation_ml_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_ml_predictions_to_logs();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) P0-Critical: Enforce ML kill-switch on ml_prediction_logs too
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_ml_enabled_on_logs()
RETURNS trigger AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT ml_enabled INTO v_enabled
  FROM public.tenant_ml_settings
  WHERE tenant_id = NEW.tenant_id;

  IF v_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ML is disabled for this tenant (kill-switch active)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ml_prediction_logs'
  ) THEN
    DROP TRIGGER IF EXISTS trg_enforce_ml_enabled_on_logs ON public.ml_prediction_logs;

    CREATE TRIGGER trg_enforce_ml_enabled_on_logs
    BEFORE INSERT ON public.ml_prediction_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_ml_enabled_on_logs();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) P0/P1: Approvals hardening
-- - One vote per approver (DB UNIQUE)
-- - No self-approval (trigger)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='approval_decisions'
  ) THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname='public' AND indexname='ux_approval_one_vote_per_approver'
    ) THEN
      CREATE UNIQUE INDEX ux_approval_one_vote_per_approver
      ON public.approval_decisions (approval_request_id, decided_by);
    END IF;

  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_self_approval()
RETURNS trigger AS $$
DECLARE
  v_requested_by uuid;
BEGIN
  SELECT requested_by INTO v_requested_by
  FROM public.approval_requests
  WHERE id = NEW.approval_request_id;

  IF v_requested_by IS NOT NULL AND NEW.decided_by = v_requested_by THEN
    RAISE EXCEPTION 'Self-approval is not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='approval_decisions'
  ) THEN
    DROP TRIGGER IF EXISTS trg_prevent_self_approval ON public.approval_decisions;

    CREATE TRIGGER trg_prevent_self_approval
    BEFORE INSERT ON public.approval_decisions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_approval();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5) P1: Audit actor validation (USER vs SERVICE)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='audit_events'
  ) THEN

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='audit_events' AND column_name='actor_user_id'
    ) THEN
      ALTER TABLE public.audit_events
      ADD COLUMN actor_user_id uuid;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='audit_events' AND column_name='actor_service_id'
    ) THEN
      ALTER TABLE public.audit_events
      ADD COLUMN actor_service_id text;
    END IF;

    -- Add valid_actor check constraint
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_audit_valid_actor'
    ) THEN
      ALTER TABLE public.audit_events
      ADD CONSTRAINT chk_audit_valid_actor
      CHECK (
        (actor_type = 'USER' AND actor_user_id IS NOT NULL AND actor_service_id IS NULL)
        OR
        (actor_type IN ('SYSTEM','ML','GUARDRAIL') AND actor_service_id IS NOT NULL)
      );
    END IF;

  END IF;
END $$;