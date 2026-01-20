-- =============================================
-- BLUECORE SSOT FOUNDATION: RECONCILIATION LEDGER
-- =============================================

-- 1. RECONCILIATION_LINKS (CORE LEDGER - MOAT)
CREATE TABLE IF NOT EXISTS public.reconciliation_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Bank transaction (NULL = manual payment)
  bank_transaction_id UUID REFERENCES public.bank_transactions(id),
  
  -- Settlement details
  settlement_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'VND',
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Target (invoice, bill, etc.)
  target_type TEXT NOT NULL DEFAULT 'invoice',
  target_id UUID NOT NULL,
  
  -- Match metadata
  match_type TEXT NOT NULL CHECK (match_type IN ('manual', 'exact', 'probabilistic', 'aggregate')),
  confidence NUMERIC NOT NULL DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  match_evidence JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Void support (append-only pattern)
  is_voided BOOLEAN NOT NULL DEFAULT false,
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  
  -- SSOT constraint: manual = no bank, else must have bank
  CONSTRAINT valid_match_authority CHECK (
    (match_type = 'manual' AND bank_transaction_id IS NULL)
    OR
    (match_type <> 'manual' AND bank_transaction_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reconciliation_links_tenant ON public.reconciliation_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_links_target ON public.reconciliation_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_links_bank_txn ON public.reconciliation_links(bank_transaction_id) WHERE bank_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reconciliation_links_active ON public.reconciliation_links(tenant_id, is_voided) WHERE is_voided = false;

-- RLS (using tenant_users table)
ALTER TABLE public.reconciliation_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant reconciliation links"
  ON public.reconciliation_links FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can insert reconciliation links for their tenant"
  ON public.reconciliation_links FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can update reconciliation links for their tenant"
  ON public.reconciliation_links FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));


-- 2. SETTLEMENT_ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.settlement_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  reconciliation_link_id UUID NOT NULL REFERENCES public.reconciliation_links(id),
  
  allocated_amount NUMERIC NOT NULL,
  allocation_type TEXT DEFAULT 'principal',
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_allocations_link ON public.settlement_allocations(reconciliation_link_id);
CREATE INDEX IF NOT EXISTS idx_settlement_allocations_tenant ON public.settlement_allocations(tenant_id);

ALTER TABLE public.settlement_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant allocations"
  ON public.settlement_allocations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can insert allocations for their tenant"
  ON public.settlement_allocations FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));


-- 3. VIEWS: INVOICE SETTLED STATUS

CREATE OR REPLACE VIEW public.v_invoice_settled_paid AS
SELECT 
  i.id AS invoice_id,
  i.tenant_id,
  i.invoice_number,
  i.total_amount,
  COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) AS settled_paid_amount,
  i.total_amount - COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) AS remaining_amount
FROM public.invoices i
LEFT JOIN public.reconciliation_links rl 
  ON rl.target_type = 'invoice' 
  AND rl.target_id = i.id
GROUP BY i.id, i.tenant_id, i.invoice_number, i.total_amount;

CREATE OR REPLACE VIEW public.v_invoice_settled_status AS
SELECT 
  vp.invoice_id,
  vp.tenant_id,
  vp.invoice_number,
  vp.total_amount,
  vp.settled_paid_amount,
  vp.remaining_amount,
  CASE 
    WHEN vp.settled_paid_amount >= vp.total_amount THEN 'paid'
    WHEN vp.settled_paid_amount > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS settled_status,
  'settled' AS truth_level
FROM public.v_invoice_settled_paid vp;


-- 4. VIEW: BANK TRANSACTION MATCH STATE

CREATE OR REPLACE VIEW public.v_bank_txn_match_state AS
SELECT 
  bt.id AS bank_transaction_id,
  bt.tenant_id,
  bt.amount AS bank_amount,
  bt.transaction_date,
  bt.description,
  bt.reference,
  COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) AS matched_amount,
  bt.amount - COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) AS unmatched_amount,
  CASE 
    WHEN COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) = 0 THEN 'unmatched'
    WHEN COALESCE(SUM(rl.settlement_amount) FILTER (WHERE rl.is_voided = false), 0) < bt.amount THEN 'partially_matched'
    ELSE 'matched'
  END AS match_state,
  COUNT(rl.id) FILTER (WHERE rl.is_voided = false) AS link_count
FROM public.bank_transactions bt
LEFT JOIN public.reconciliation_links rl ON rl.bank_transaction_id = bt.id
GROUP BY bt.id, bt.tenant_id, bt.amount, bt.transaction_date, bt.description, bt.reference;


-- 5. COMMENTS
COMMENT ON TABLE public.reconciliation_links IS 'SSOT Ledger: Append-only reconciliation decisions. Evidence → Truth mapping. Never update, only void.';
COMMENT ON TABLE public.settlement_allocations IS 'SSOT: Partial payment allocations linked to reconciliation entries.';
COMMENT ON VIEW public.v_invoice_settled_paid IS 'SSOT Read Path: Invoice paid amount derived from ledger';
COMMENT ON VIEW public.v_invoice_settled_status IS 'SSOT Read Path: Invoice status derived from ledger';
COMMENT ON VIEW public.v_bank_txn_match_state IS 'SSOT Read Path: Bank transaction match state derived from ledger';