-- ============================================================
-- 1) Build Exceptions from Evidence (using existing schema)
-- ============================================================

-- 1A) Unmatched bank credits (credits not used in ledger)
INSERT INTO public.exceptions_queue (tenant_id, exception_type, severity, ref_type, ref_id, currency, impact_amount, status, title, description)
SELECT
  bt.tenant_id,
  'ORPHAN_BANK_TXN',
  CASE 
    WHEN abs(bt.amount) > 50000000 THEN 'critical'
    WHEN abs(bt.amount) > 10000000 THEN 'high'
    ELSE 'medium'
  END,
  'bank_transaction',
  bt.id,
  'VND',
  abs(bt.amount),
  'open',
  'Unmatched bank credit: ' || COALESCE(bt.reference, bt.id::text),
  'Bank transaction of ' || abs(bt.amount)::text || ' VND has no matching invoice'
FROM public.bank_transactions bt
LEFT JOIN public.reconciliation_links rl
  ON rl.tenant_id = bt.tenant_id
 AND rl.bank_transaction_id = bt.id
 AND rl.is_voided = false
WHERE bt.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND bt.transaction_type = 'credit'
  AND rl.id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.exceptions_queue e
    WHERE e.tenant_id=bt.tenant_id AND e.ref_type='bank_transaction' AND e.ref_id=bt.id AND e.status='open'
  );

-- 1B) Unpaid invoices (invoices not linked at all)
INSERT INTO public.exceptions_queue (tenant_id, exception_type, severity, ref_type, ref_id, currency, impact_amount, status, title, description)
SELECT
  inv.tenant_id,
  'AR_OVERDUE',
  CASE 
    WHEN inv.total_amount > 50000000 THEN 'critical'
    WHEN inv.total_amount > 10000000 THEN 'high'
    ELSE 'medium'
  END,
  'invoice',
  inv.id,
  COALESCE(inv.currency_code, 'VND'),
  inv.total_amount,
  'open',
  'Unpaid invoice: ' || COALESCE(inv.invoice_number, inv.id::text),
  'Invoice of ' || inv.total_amount::text || ' has no matching bank transaction'
FROM public.invoices inv
LEFT JOIN public.reconciliation_links rl
  ON rl.tenant_id = inv.tenant_id
 AND rl.target_type = 'invoice'
 AND rl.target_id = inv.id
 AND rl.is_voided = false
WHERE inv.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND rl.id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.exceptions_queue e
    WHERE e.tenant_id=inv.tenant_id AND e.ref_type='invoice' AND e.ref_id=inv.id AND e.status='open'
  );

-- ============================================================
-- 2) Generate Suggestions (scored heuristics)
--    Using existing schema without status column
-- ============================================================

WITH candidates AS (
  SELECT
    bt.tenant_id,
    bt.id AS bank_transaction_id,
    inv.id AS invoice_id,
    bt.transaction_date,
    inv.issue_date,
    inv.due_date,
    abs(bt.amount)::numeric(18,2) AS bank_amt,
    inv.total_amount::numeric(18,2) AS inv_amt,
    bt.description,
    inv.invoice_number,
    CASE WHEN bt.description ILIKE '%' || inv.invoice_number || '%' THEN 1 ELSE 0 END AS f_inv_in_desc,
    CASE WHEN abs(abs(bt.amount) - inv.total_amount) <= (inv.total_amount * 0.01) THEN 1 ELSE 0 END AS f_amt_close,
    CASE WHEN abs(abs(bt.amount) - inv.total_amount) <= 1 THEN 1 ELSE 0 END AS f_amt_exact,
    CASE WHEN bt.transaction_date::date BETWEEN (inv.issue_date::date - 2) AND (COALESCE(inv.due_date, inv.issue_date + interval '30 days')::date + 14) THEN 1 ELSE 0 END AS f_date_ok
  FROM public.bank_transactions bt
  JOIN public.invoices inv
    ON inv.tenant_id = bt.tenant_id
  WHERE bt.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
    AND bt.transaction_type='credit'
)
, scored AS (
  SELECT
    tenant_id,
    bank_transaction_id,
    invoice_id,
    bank_amt,
    inv_amt,
    (f_inv_in_desc*60 + f_amt_exact*25 + f_amt_close*15 + f_date_ok*10)::numeric(5,2) AS confidence,
    jsonb_build_object(
      'amountMatch', CASE WHEN f_amt_exact=1 THEN 'exact' WHEN f_amt_close=1 THEN 'close' ELSE 'no' END,
      'amountMatchScore', f_amt_exact*25 + f_amt_close*15,
      'descriptionMatch', CASE WHEN f_inv_in_desc=1 THEN 'invoice_number_found' ELSE 'no' END,
      'descriptionMatchScore', f_inv_in_desc*60,
      'dateProximityScore', f_date_ok*10,
      'bank_amount', bank_amt,
      'invoice_outstanding', inv_amt
    ) AS rationale
  FROM candidates
)
INSERT INTO public.reconciliation_suggestions (tenant_id, exception_id, bank_transaction_id, invoice_id, suggestion_type, confidence, suggested_amount, rationale)
SELECT
  e.tenant_id,
  e.id AS exception_id,
  s.bank_transaction_id,
  s.invoice_id,
  'BANK_TO_INVOICE' AS suggestion_type,
  LEAST(s.confidence, 99.99) AS confidence,
  LEAST(s.bank_amt, s.inv_amt) AS suggested_amount,
  s.rationale
FROM public.exceptions_queue e
JOIN scored s
  ON s.tenant_id = e.tenant_id
 AND s.bank_transaction_id = e.ref_id
WHERE e.status='open'
  AND e.exception_type='ORPHAN_BANK_TXN'
  AND e.ref_type='bank_transaction'
  AND s.confidence >= 50
  AND NOT EXISTS (
    SELECT 1 FROM public.reconciliation_suggestions rs
    WHERE rs.tenant_id=e.tenant_id
      AND rs.exception_id=e.id
      AND rs.bank_transaction_id=s.bank_transaction_id
      AND rs.invoice_id=s.invoice_id
  )
LIMIT 1000;