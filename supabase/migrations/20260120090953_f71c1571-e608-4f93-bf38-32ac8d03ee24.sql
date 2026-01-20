/* ============================================================
   BLUECORE FDP — STEP A DB HARDENING (P0)
   Constraints + Triggers (production-safe)
   ============================================================ */

BEGIN;

-- ------------------------------------------------------------
-- A0) Canonical ML kill-switch flags
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenant_ml_settings') THEN
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

    -- Range constrain threshold if not already
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_tenant_ml_min_conf_0_100') THEN
      ALTER TABLE public.tenant_ml_settings
      ADD CONSTRAINT chk_tenant_ml_min_conf_0_100
      CHECK (min_confidence_threshold BETWEEN 0 AND 100);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- A1) ML numeric range validation (0..100)
-- ------------------------------------------------------------
-- reconciliation_ml_predictions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reconciliation_ml_predictions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_predicted_confidence_0_100') THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_predicted_confidence_0_100
      CHECK (predicted_confidence BETWEEN 0 AND 100);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reconciliation_ml_predictions' AND column_name='final_confidence'
    ) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_final_confidence_0_100') THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_final_confidence_0_100
      CHECK (final_confidence BETWEEN 0 AND 100);
    END IF;

    -- optional: enforce explanation jsonb is object (if column exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reconciliation_ml_predictions' AND column_name='explanation'
    ) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_explanation_is_object') THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_explanation_is_object
      CHECK (jsonb_typeof(explanation) = 'object');
    END IF;
  END IF;
END $$;

-- ml_prediction_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ml_prediction_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_logs_predicted_confidence_0_100') THEN
      ALTER TABLE public.ml_prediction_logs
      ADD CONSTRAINT chk_ml_logs_predicted_confidence_0_100
      CHECK (predicted_confidence BETWEEN 0 AND 100);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_prediction_logs' AND column_name='final_confidence'
    ) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_logs_final_confidence_0_100') THEN
      ALTER TABLE public.ml_prediction_logs
      ADD CONSTRAINT chk_ml_logs_final_confidence_0_100
      CHECK (final_confidence BETWEEN 0 AND 100);
    END IF;
  END IF;
END $$;

-- ml_performance_snapshots (% metrics should be 0..100)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ml_performance_snapshots') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_perf_accuracy_0_100') THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_accuracy_0_100
      CHECK (accuracy BETWEEN 0 AND 100);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_performance_snapshots' AND column_name='false_auto_rate'
    ) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_perf_false_auto_rate_0_100') THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_false_auto_rate_0_100
      CHECK (false_auto_rate BETWEEN 0 AND 100);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_performance_snapshots' AND column_name='guardrail_block_rate'
    ) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_perf_guardrail_block_rate_0_100') THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_guardrail_block_rate_0_100
      CHECK (guardrail_block_rate BETWEEN 0 AND 100);
    END IF;

    -- calibration_error is typically ratio 0..1 (if present)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_performance_snapshots' AND column_name='calibration_error'
    ) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ml_perf_calibration_error_0_1') THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_calibration_error_0_1
      CHECK (calibration_error BETWEEN 0 AND 1);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- A2) Resolve ML duplication — Option A
-- predictions = current state; logs = append-only audit trail
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reconciliation_ml_predictions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reconciliation_ml_predictions' AND column_name='is_latest'
    ) THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD COLUMN is_latest boolean NOT NULL DEFAULT true;
    END IF;

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

-- ------------------------------------------------------------
-- A3) Kill-switch enforcement triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_ml_enabled()
RETURNS trigger AS $$
DECLARE
  v_enabled boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='tenant_ml_settings'
  ) THEN
    RAISE EXCEPTION 'tenant_ml_settings not found; ML writes denied';
  END IF;

  SELECT ml_enabled INTO v_enabled
  FROM public.tenant_ml_settings
  WHERE tenant_id = NEW.tenant_id;

  IF v_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ML is disabled for this tenant (kill-switch active)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to ml_prediction_logs (BEFORE INSERT)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ml_prediction_logs') THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_enforce_ml_enabled_logs') THEN
      DROP TRIGGER trg_enforce_ml_enabled_logs ON public.ml_prediction_logs;
    END IF;
    CREATE TRIGGER trg_enforce_ml_enabled_logs
    BEFORE INSERT ON public.ml_prediction_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_ml_enabled();
  END IF;
END $$;

-- Apply to reconciliation_ml_predictions (BEFORE INSERT/UPDATE)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reconciliation_ml_predictions') THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_enforce_ml_enabled_predictions') THEN
      DROP TRIGGER trg_enforce_ml_enabled_predictions ON public.reconciliation_ml_predictions;
    END IF;
    CREATE TRIGGER trg_enforce_ml_enabled_predictions
    BEFORE INSERT OR UPDATE ON public.reconciliation_ml_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_ml_enabled();
  END IF;
END $$;

-- ------------------------------------------------------------
-- A4) Sync predictions → logs (append-only)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_prediction_to_log()
RETURNS trigger AS $$
BEGIN
  -- Demote other latest rows for same key
  IF NEW.is_latest = true THEN
    UPDATE public.reconciliation_ml_predictions
    SET is_latest = false
    WHERE tenant_id = NEW.tenant_id
      AND suggestion_id = NEW.suggestion_id
      AND model_version = NEW.model_version
      AND id <> NEW.id
      AND is_latest = true;
  END IF;

  -- Write to logs (if present)
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
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reconciliation_ml_predictions') THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_prediction_to_log') THEN
      DROP TRIGGER trg_sync_prediction_to_log ON public.reconciliation_ml_predictions;
    END IF;
    CREATE TRIGGER trg_sync_prediction_to_log
    AFTER INSERT OR UPDATE ON public.reconciliation_ml_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_prediction_to_log();
  END IF;
END $$;

-- ------------------------------------------------------------
-- A5) Approvals hardening
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='approval_decisions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname='public' AND indexname='ux_approval_one_vote'
    ) THEN
      CREATE UNIQUE INDEX ux_approval_one_vote
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
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='approval_decisions') THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_prevent_self_approval') THEN
      DROP TRIGGER trg_prevent_self_approval ON public.approval_decisions;
    END IF;
    CREATE TRIGGER trg_prevent_self_approval
    BEFORE INSERT ON public.approval_decisions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_approval();
  END IF;
END $$;

-- ------------------------------------------------------------
-- A6) Audit actor validation
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_events') THEN
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

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_audit_valid_actor') THEN
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

COMMIT;