-- Data Reset Script - Clean operational/governance data
BEGIN;

-- 1) Stop ML writes (safety)
UPDATE public.tenant_ml_settings
SET ml_enabled = false
WHERE tenant_id IS NOT NULL;

-- 2) Truncate operational / governance data
DO $$
BEGIN
  -- Ledger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='settlement_allocations') THEN
    EXECUTE 'TRUNCATE TABLE public.settlement_allocations CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reconciliation_links') THEN
    EXECUTE 'TRUNCATE TABLE public.reconciliation_links CASCADE';
  END IF;

  -- Suggestions / Exceptions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reconciliation_suggestions') THEN
    EXECUTE 'TRUNCATE TABLE public.reconciliation_suggestions CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='exceptions_queue') THEN
    EXECUTE 'TRUNCATE TABLE public.exceptions_queue CASCADE';
  END IF;

  -- Decision snapshots
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='decision_snapshots') THEN
    EXECUTE 'TRUNCATE TABLE public.decision_snapshots CASCADE';
  END IF;

  -- Approvals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='approval_decisions') THEN
    EXECUTE 'TRUNCATE TABLE public.approval_decisions CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='approval_requests') THEN
    EXECUTE 'TRUNCATE TABLE public.approval_requests CASCADE';
  END IF;

  -- Risk / Board / Investor outputs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='risk_breach_events') THEN
    EXECUTE 'TRUNCATE TABLE public.risk_breach_events CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='board_scenarios') THEN
    EXECUTE 'TRUNCATE TABLE public.board_scenarios CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='risk_stress_tests') THEN
    EXECUTE 'TRUNCATE TABLE public.risk_stress_tests CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='investor_risk_disclosures') THEN
    EXECUTE 'TRUNCATE TABLE public.investor_risk_disclosures CASCADE';
  END IF;

  -- ML logs / predictions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ml_prediction_logs') THEN
    EXECUTE 'TRUNCATE TABLE public.ml_prediction_logs CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reconciliation_ml_predictions') THEN
    EXECUTE 'TRUNCATE TABLE public.reconciliation_ml_predictions CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ml_performance_snapshots') THEN
    EXECUTE 'TRUNCATE TABLE public.ml_performance_snapshots CASCADE';
  END IF;

  -- Audit events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_events') THEN
    EXECUTE 'TRUNCATE TABLE public.audit_events CASCADE';
  END IF;

  -- 3) Evidence layer (orders/invoices/bank/customers/products)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='external_orders') THEN
    EXECUTE 'TRUNCATE TABLE public.external_orders CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    EXECUTE 'TRUNCATE TABLE public.invoices CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bank_transactions') THEN
    EXECUTE 'TRUNCATE TABLE public.bank_transactions CASCADE';
  END IF;

  -- Reference data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customers') THEN
    EXECUTE 'TRUNCATE TABLE public.customers CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    EXECUTE 'TRUNCATE TABLE public.products CASCADE';
  END IF;

  -- Seed run tracking
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='evidence_seed_runs') THEN
    EXECUTE 'TRUNCATE TABLE public.evidence_seed_runs CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='evidence_seasonality_profile') THEN
    EXECUTE 'TRUNCATE TABLE public.evidence_seasonality_profile CASCADE';
  END IF;
END $$;

COMMIT;