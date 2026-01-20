
-- ============================================================
-- BOARD DASHBOARD & RISK VIEWS - Final corrected version
-- ============================================================

-- 1) Board Summary Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_board_summary AS
SELECT
  rl.tenant_id,
  date_trunc('month', rl.created_at)::date AS period_month,
  SUM(rl.settlement_amount) AS cash_settled,
  COUNT(DISTINCT rl.target_id) FILTER (WHERE rl.target_type = 'invoice') AS invoices_settled,
  COUNT(DISTINCT rl.bank_transaction_id) AS bank_txns_used,
  COUNT(DISTINCT eq.id) FILTER (WHERE eq.status = 'OPEN') AS open_exceptions,
  SUM(eq.impact_amount) FILTER (WHERE eq.status = 'OPEN') AS open_exceptions_value,
  COUNT(DISTINCT ae.id) FILTER (WHERE ae.action = 'AUTO_RECONCILE') AS auto_actions,
  COUNT(DISTINCT ae.id) FILTER (WHERE ae.action LIKE '%MANUAL%') AS manual_actions
FROM public.reconciliation_links rl
LEFT JOIN public.exceptions_queue eq ON eq.tenant_id = rl.tenant_id
LEFT JOIN public.audit_events ae ON ae.tenant_id = rl.tenant_id
WHERE rl.is_voided = false
GROUP BY rl.tenant_id, date_trunc('month', rl.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_board_summary
ON public.mv_board_summary (tenant_id, period_month);

-- 2) Risk Stress Results table
CREATE TABLE IF NOT EXISTS public.risk_stress_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.board_scenarios(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  period_month date NOT NULL,
  stressed_open_exceptions numeric(18,2),
  stressed_cash_settled numeric(18,2),
  stress_parameters jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_stress_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant stress results"
  ON public.risk_stress_results FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert stress results for their tenant"
  ON public.risk_stress_results FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 3) Evaluate risk appetite - using correct columns: risk_appetite_id, threshold, action_taken
INSERT INTO public.risk_breach_events (
  tenant_id, risk_appetite_id, rule_id, metric_code, metric_value, threshold, severity, action_taken
)
SELECT
  b.tenant_id,
  ra.id,
  r.id,
  r.metric_code,
  CASE
    WHEN r.metric_code = 'open_exceptions' THEN b.open_exceptions
    WHEN r.metric_code = 'cash_settled' THEN b.cash_settled
    ELSE 0
  END AS metric_value,
  r.threshold,
  r.severity,
  COALESCE(r.action_on_breach, 'ALERT')
FROM public.mv_board_summary b
JOIN public.risk_appetites ra ON ra.tenant_id = b.tenant_id AND ra.status = 'active'
JOIN public.risk_appetite_rules r ON r.risk_appetite_id = ra.id AND r.is_enabled = true
WHERE
  (r.operator = '>' AND (
    (r.metric_code = 'open_exceptions' AND b.open_exceptions > r.threshold)
    OR (r.metric_code = 'cash_settled' AND b.cash_settled > r.threshold)))
  OR
  (r.operator = '<' AND (
    (r.metric_code = 'open_exceptions' AND b.open_exceptions < r.threshold)
    OR (r.metric_code = 'cash_settled' AND b.cash_settled < r.threshold)));

-- 4) Apply stress scenarios
INSERT INTO public.risk_stress_results (
  scenario_id, tenant_id, period_month,
  stressed_open_exceptions, stressed_cash_settled, stress_parameters
)
SELECT
  s.id,
  s.tenant_id,
  b.period_month,
  b.open_exceptions * (1 + COALESCE((s.assumptions->>'shock_open_exceptions_pct')::numeric, 0)/100.0),
  b.cash_settled * (1 + COALESCE((s.assumptions->>'shock_cash_settled_pct')::numeric, 0)/100.0),
  s.assumptions
FROM public.board_scenarios s
JOIN public.mv_board_summary b ON b.tenant_id = s.tenant_id
WHERE s.is_archived = false;

-- 5) Investor Risk Disclosures
INSERT INTO public.investor_risk_disclosures (
  tenant_id, disclosure_period_start, disclosure_period_end, summary, key_risks, status
)
SELECT
  tenant_id,
  period_month,
  (period_month + interval '1 month - 1 day')::date,
  format('Period summary: %s exceptions, %s cash settled', open_exceptions, cash_settled),
  jsonb_build_object(
    'open_exceptions', open_exceptions,
    'cash_settled', cash_settled,
    'risk_level',
      CASE
        WHEN open_exceptions > 50 THEN 'HIGH'
        WHEN open_exceptions > 20 THEN 'MEDIUM'
        ELSE 'LOW'
      END
  ),
  'draft'
FROM public.mv_board_summary
ON CONFLICT DO NOTHING;
