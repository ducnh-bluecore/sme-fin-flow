-- PART A: FIX SSOT VIEWS FOR ACCOUNTING CORRECTNESS

-- A1. Rewrite v_invoice_settled_paid
-- Fix: Invoice paid amount must be SUM of allocations, not link settlement_amount
-- Handles partial payments, split payments across multiple invoices correctly

DROP VIEW IF EXISTS public.v_invoice_settled_paid CASCADE;

CREATE OR REPLACE VIEW public.v_invoice_settled_paid AS
SELECT
  i.tenant_id,
  i.id AS invoice_id,
  COALESCE(
    SUM(a.allocated_amount) FILTER (WHERE rl.is_voided = false),
    0
  ) AS paid_amount_settled
FROM public.invoices i
LEFT JOIN public.reconciliation_links rl
  ON rl.target_type = 'invoice' AND rl.target_id = i.id
LEFT JOIN public.settlement_allocations a
  ON a.reconciliation_link_id = rl.id
GROUP BY i.tenant_id, i.id;

-- A2. Recreate v_invoice_settled_status using the fixed v_invoice_settled_paid
DROP VIEW IF EXISTS public.v_invoice_settled_status CASCADE;

CREATE OR REPLACE VIEW public.v_invoice_settled_status AS
SELECT
  i.tenant_id,
  i.id AS invoice_id,
  i.invoice_number,
  i.total_amount,
  COALESCE(sp.paid_amount_settled, 0) AS settled_paid_amount,
  GREATEST(i.total_amount - COALESCE(sp.paid_amount_settled, 0), 0) AS remaining_amount,
  CASE
    WHEN COALESCE(sp.paid_amount_settled, 0) >= i.total_amount THEN 'paid'::text
    WHEN COALESCE(sp.paid_amount_settled, 0) > 0 THEN 'partially_paid'::text
    ELSE 'unpaid'::text
  END AS settled_status,
  'settled'::text AS truth_level
FROM public.invoices i
LEFT JOIN public.v_invoice_settled_paid sp ON sp.invoice_id = i.id;

-- A3. Rewrite v_bank_txn_match_state  
-- Fix: Normalize transaction amount (abs), use allocation sum as matched truth
-- Handles negative amounts (debits/refunds) correctly

DROP VIEW IF EXISTS public.v_bank_txn_match_state CASCADE;

CREATE OR REPLACE VIEW public.v_bank_txn_match_state AS
SELECT
  bt.tenant_id,
  bt.id AS bank_transaction_id,
  bt.amount AS bank_amount,
  ABS(bt.amount) AS txn_abs_amount,
  bt.transaction_date,
  bt.description,
  bt.reference,
  
  COALESCE(
    SUM(a.allocated_amount) FILTER (WHERE rl.is_voided = false),
    0
  ) AS matched_amount,
  
  ABS(bt.amount) - COALESCE(
    SUM(a.allocated_amount) FILTER (WHERE rl.is_voided = false),
    0
  ) AS unmatched_amount,
  
  CASE
    WHEN COALESCE(SUM(a.allocated_amount) FILTER (WHERE rl.is_voided = false), 0) = 0
      THEN 'unmatched'::text
    WHEN COALESCE(SUM(a.allocated_amount) FILTER (WHERE rl.is_voided = false), 0) < ABS(bt.amount)
      THEN 'partially_matched'::text
    ELSE 'matched'::text
  END AS match_state,
  
  COUNT(DISTINCT rl.id) FILTER (WHERE rl.is_voided = false) AS link_count

FROM public.bank_transactions bt
LEFT JOIN public.reconciliation_links rl
  ON rl.bank_transaction_id = bt.id
LEFT JOIN public.settlement_allocations a
  ON a.reconciliation_link_id = rl.id
GROUP BY bt.tenant_id, bt.id, bt.amount, bt.transaction_date, bt.description, bt.reference;

-- Add comments for documentation
COMMENT ON VIEW public.v_invoice_settled_paid IS 'SSOT view for invoice payment amounts - derived from settlement_allocations only';
COMMENT ON VIEW public.v_invoice_settled_status IS 'SSOT view for invoice settlement status - derived from v_invoice_settled_paid';
COMMENT ON VIEW public.v_bank_txn_match_state IS 'SSOT view for bank transaction match state - uses abs(amount) and settlement_allocations';