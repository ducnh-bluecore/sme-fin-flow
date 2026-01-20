-- BACKFILL: Convert legacy invoice payments to reconciliation_links
INSERT INTO public.reconciliation_links (
  tenant_id,
  bank_transaction_id,
  settlement_amount,
  currency,
  settlement_date,
  target_type,
  target_id,
  match_type,
  confidence,
  match_evidence,
  created_by,
  created_at,
  is_voided
)
SELECT 
  i.tenant_id,
  NULL,
  i.paid_amount,
  'VND',
  COALESCE(i.updated_at::date, CURRENT_DATE),
  'invoice',
  i.id,
  'manual',
  100,
  jsonb_build_object(
    'source', 'legacy_backfill',
    'original_status', i.status,
    'original_paid_amount', i.paid_amount,
    'backfill_date', now()::text
  ),
  NULL,
  COALESCE(i.updated_at, now()),
  false
FROM public.invoices i
WHERE i.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.reconciliation_links rl 
    WHERE rl.target_type = 'invoice' 
      AND rl.target_id = i.id 
      AND rl.match_evidence->>'source' = 'legacy_backfill'
  );