-- ============================================================
-- 4.1 Risk Appetite Tables (already created, skip if exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.risk_appetites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_appetite_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_appetite_id uuid NOT NULL REFERENCES public.risk_appetites(id),
  metric_code text NOT NULL,
  operator text NOT NULL CHECK (operator IN ('<','<=','>','>=','=')),
  threshold numeric(18,2) NOT NULL,
  severity text NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  priority int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (risk_appetite_id, metric_code, priority)
);

CREATE TABLE IF NOT EXISTS public.risk_breach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  metric_code text NOT NULL,
  metric_value numeric(18,2) NOT NULL,
  rule_id uuid NOT NULL REFERENCES public.risk_appetite_rules(id),
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period_start, period_end, metric_code, rule_id)
);

-- ============================================================
-- 4.2 Board Cache (Materialized View)
--   Using settlement_amount from reconciliation_links
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_board_summary;

CREATE MATERIALIZED VIEW public.mv_board_summary AS
WITH periods AS (
  SELECT
    '11111111-1111-1111-1111-111111111111'::uuid AS tenant_id,
    date_trunc('month', d)::date AS period_start,
    (date_trunc('month', d) + interval '1 month - 1 day')::date AS period_end
  FROM generate_series(
    date_trunc('month', now()) - interval '18 months',
    date_trunc('month', now()),
    interval '1 month'
  ) d
),
ledger AS (
  SELECT
    tenant_id,
    date_trunc('month', created_at)::date AS period_start,
    SUM(settlement_amount) AS cash_settled,
    COUNT(*) AS allocations_count,
    COUNT(DISTINCT target_id) AS invoices_settled,
    COUNT(DISTINCT bank_transaction_id) AS bank_txns_used
  FROM public.reconciliation_links
  WHERE tenant_id='11111111-1111-1111-1111-111111111111'::uuid
    AND is_voided = false
  GROUP BY tenant_id, date_trunc('month', created_at)::date
),
exceptions AS (
  SELECT
    tenant_id,
    date_trunc('month', created_at)::date AS period_start,
    COUNT(*) FILTER (WHERE status='OPEN') AS open_exceptions,
    COUNT(*) AS total_exceptions
  FROM public.exceptions_queue
  WHERE tenant_id='11111111-1111-1111-1111-111111111111'::uuid
  GROUP BY tenant_id, date_trunc('month', created_at)::date
),
aud AS (
  SELECT
    tenant_id,
    date_trunc('month', created_at)::date AS period_start,
    COUNT(*) FILTER (WHERE action='AUTO_RECONCILE') AS auto_actions
  FROM public.audit_events
  WHERE tenant_id='11111111-1111-1111-1111-111111111111'::uuid
  GROUP BY tenant_id, date_trunc('month', created_at)::date
)
SELECT
  p.tenant_id,
  p.period_start,
  p.period_end,
  COALESCE(l.cash_settled, 0)::numeric(18,2) AS cash_settled,
  COALESCE(l.allocations_count, 0) AS allocations_count,
  COALESCE(l.invoices_settled, 0) AS invoices_settled,
  COALESCE(l.bank_txns_used, 0) AS bank_txns_used,
  COALESCE(e.open_exceptions, 0) AS open_exceptions,
  COALESCE(e.total_exceptions, 0) AS total_exceptions,
  COALESCE(a.auto_actions, 0) AS auto_actions
FROM periods p
LEFT JOIN ledger l ON l.tenant_id=p.tenant_id AND l.period_start=p.period_start
LEFT JOIN exceptions e ON e.tenant_id=p.tenant_id AND e.period_start=p.period_start
LEFT JOIN aud a ON a.tenant_id=p.tenant_id AND a.period_start=p.period_start;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_board_summary
ON public.mv_board_summary (tenant_id, period_start, period_end);

-- ============================================================
-- 4.5 Investor disclosure (sanitized, monthly)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.investor_risk_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  summary jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.risk_appetites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_appetite_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_breach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_risk_disclosures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_appetites
CREATE POLICY "Users can view risk appetites for their tenant"
ON public.risk_appetites FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage risk appetites for their tenant"
ON public.risk_appetites FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for risk_appetite_rules
CREATE POLICY "Users can view risk rules via appetite"
ON public.risk_appetite_rules FOR SELECT
USING (risk_appetite_id IN (
  SELECT id FROM public.risk_appetites 
  WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
));

CREATE POLICY "Users can manage risk rules via appetite"
ON public.risk_appetite_rules FOR ALL
USING (risk_appetite_id IN (
  SELECT id FROM public.risk_appetites 
  WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
));

-- RLS Policies for risk_breach_events
CREATE POLICY "Users can view breach events for their tenant"
ON public.risk_breach_events FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage breach events for their tenant"
ON public.risk_breach_events FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for investor_risk_disclosures
CREATE POLICY "Users can view disclosures for their tenant"
ON public.investor_risk_disclosures FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage disclosures for their tenant"
ON public.investor_risk_disclosures FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));