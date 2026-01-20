-- ============================================================
-- BLUECORE FDP - CRITICAL CONSTRAINTS & TRIGGERS (P0 Priority)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) ML CONFIDENCE RANGE VALIDATION (0-100%)
-- ------------------------------------------------------------

-- reconciliation_ml_predictions constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='reconciliation_ml_predictions'
  ) THEN
    -- predicted_confidence [0,100]
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_predicted_confidence_0_100'
    ) THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_predicted_confidence_0_100
      CHECK (predicted_confidence BETWEEN 0 AND 100);
    END IF;

    -- final_confidence [0,100]
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reconciliation_ml_predictions' AND column_name='final_confidence'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_final_confidence_0_100'
    ) THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_final_confidence_0_100
      CHECK (final_confidence BETWEEN 0 AND 100);
    END IF;

    -- calibration_error [0,100] if exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reconciliation_ml_predictions' AND column_name='calibration_error'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_calibration_error_0_100'
    ) THEN
      ALTER TABLE public.reconciliation_ml_predictions
      ADD CONSTRAINT chk_ml_calibration_error_0_100
      CHECK (calibration_error BETWEEN 0 AND 100);
    END IF;
  END IF;
END $$;

-- ml_prediction_logs constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ml_prediction_logs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_logs_predicted_confidence_0_100'
    ) THEN
      ALTER TABLE public.ml_prediction_logs
      ADD CONSTRAINT chk_ml_logs_predicted_confidence_0_100
      CHECK (predicted_confidence BETWEEN 0 AND 100);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_prediction_logs' AND column_name='final_confidence'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_logs_final_confidence_0_100'
    ) THEN
      ALTER TABLE public.ml_prediction_logs
      ADD CONSTRAINT chk_ml_logs_final_confidence_0_100
      CHECK (final_confidence BETWEEN 0 AND 100);
    END IF;
  END IF;
END $$;

-- ml_performance_snapshots constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ml_performance_snapshots'
  ) THEN
    -- accuracy [0,100]
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_perf_accuracy_0_100'
    ) THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_accuracy_0_100
      CHECK (accuracy BETWEEN 0 AND 100);
    END IF;

    -- false_auto_rate [0,100]
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_performance_snapshots' AND column_name='false_auto_rate'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_perf_false_auto_rate_0_100'
    ) THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_false_auto_rate_0_100
      CHECK (false_auto_rate BETWEEN 0 AND 100);
    END IF;

    -- guardrail_block_rate [0,100]
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_performance_snapshots' AND column_name='guardrail_block_rate'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_perf_guardrail_block_rate_0_100'
    ) THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_guardrail_block_rate_0_100
      CHECK (guardrail_block_rate BETWEEN 0 AND 100);
    END IF;

    -- calibration_error [0,100]
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ml_performance_snapshots' AND column_name='calibration_error'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_ml_perf_calibration_error_0_100'
    ) THEN
      ALTER TABLE public.ml_performance_snapshots
      ADD CONSTRAINT chk_ml_perf_calibration_error_0_100
      CHECK (calibration_error BETWEEN 0 AND 100);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) ML KILL-SWITCH ENFORCEMENT (checks ml_status or ml_enabled)
-- ------------------------------------------------------------

-- Create/replace enforce_ml_status function
CREATE OR REPLACE FUNCTION public.enforce_ml_status()
RETURNS trigger AS $$
DECLARE
  v_enabled boolean;
  v_status text;
BEGIN
  -- Check ml_enabled first (boolean flag)
  SELECT ml_enabled INTO v_enabled
  FROM public.tenant_ml_settings
  WHERE tenant_id = NEW.tenant_id;

  -- Also check ml_status if column exists
  BEGIN
    EXECUTE format('SELECT ml_status FROM public.tenant_ml_settings WHERE tenant_id = $1')
    INTO v_status USING NEW.tenant_id;
  EXCEPTION WHEN undefined_column THEN
    v_status := NULL;
  END;

  -- Block if ml_enabled is false OR ml_status is DISABLED
  IF v_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ML is disabled for this tenant (kill-switch active)';
  END IF;

  IF v_status = 'DISABLED' THEN
    RAISE EXCEPTION 'ML is disabled for this tenant (ml_status = DISABLED)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger on ml_prediction_logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ml_prediction_logs'
  ) THEN
    -- Drop old trigger if exists
    DROP TRIGGER IF EXISTS trg_enforce_ml_status ON public.ml_prediction_logs;
    DROP TRIGGER IF EXISTS trg_enforce_ml_enabled_on_logs ON public.ml_prediction_logs;

    CREATE TRIGGER trg_enforce_ml_status
    BEFORE INSERT ON public.ml_prediction_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_ml_status();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) SELF-APPROVAL PREVENTION
-- ------------------------------------------------------------

-- Unique constraint: one vote per approver per request
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

-- Trigger function to prevent self-approval
-- (CHECK constraint cannot reference other tables)
CREATE OR REPLACE FUNCTION public.prevent_self_approval()
RETURNS trigger AS $$
DECLARE
  v_requested_by text;
BEGIN
  SELECT requested_by::text INTO v_requested_by
  FROM public.approval_requests
  WHERE id = NEW.approval_request_id;

  IF v_requested_by IS NOT NULL AND NEW.decided_by::text = v_requested_by THEN
    RAISE EXCEPTION 'Self-approval is not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger on approval_decisions
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

COMMIT;