
-- ============================================================
-- 7.2 Seed scenarios (lowercase status values)
-- ============================================================
INSERT INTO public.board_simulations (tenant_id, name, description, simulation_type, assumptions, status, truth_level, created_by)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Stress: Exceptions +30%',
  'Assume open exceptions increase by 30% across periods',
  'stress_test',
  jsonb_build_object('open_exceptions_multiplier', 1.30),
  'draft',
  'SIMULATED',
  '283eb81f-18b3-4628-a81d-341a8f8cff9f'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.board_simulations
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid 
    AND name = 'Stress: Exceptions +30%'
);

INSERT INTO public.board_simulations (tenant_id, name, description, simulation_type, assumptions, status, truth_level, created_by)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Stress: Cash Settled -20%',
  'Assume cash settled drops by 20%',
  'stress_test',
  jsonb_build_object('cash_settled_multiplier', 0.80),
  'draft',
  'SIMULATED',
  '283eb81f-18b3-4628-a81d-341a8f8cff9f'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.board_simulations
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid 
    AND name = 'Stress: Cash Settled -20%'
);

INSERT INTO public.board_simulations (tenant_id, name, description, simulation_type, assumptions, status, truth_level, created_by)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  'What-If: ML Disabled',
  'Simulate impact if ML is disabled due to drift',
  'what_if',
  jsonb_build_object('ml_enabled', false, 'auto_actions_reduction', 0.50),
  'draft',
  'SIMULATED',
  '283eb81f-18b3-4628-a81d-341a8f8cff9f'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.board_simulations
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid 
    AND name = 'What-If: ML Disabled'
);

INSERT INTO public.board_simulations (tenant_id, name, description, simulation_type, assumptions, status, truth_level, created_by)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Scenario: AR Overdue Spike',
  'Model impact of 50% increase in AR overdue ratio',
  'scenario',
  jsonb_build_object('ar_overdue_multiplier', 1.50, 'cash_flow_impact', -0.25),
  'completed',
  'SIMULATED',
  '283eb81f-18b3-4628-a81d-341a8f8cff9f'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.board_simulations
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid 
    AND name = 'Scenario: AR Overdue Spike'
);

-- ============================================================
-- 7.3 Generate results from mv_board_summary
-- ============================================================
INSERT INTO public.board_simulation_results (
  simulation_id, tenant_id, period_month, 
  simulated_metrics, baseline_metrics, delta_metrics, truth_level
)
SELECT
  s.id,
  s.tenant_id,
  b.period_start,
  jsonb_build_object(
    'open_exceptions',
      CASE
        WHEN s.assumptions ? 'open_exceptions_multiplier'
          THEN round(b.open_exceptions * (s.assumptions->>'open_exceptions_multiplier')::numeric, 2)
        ELSE b.open_exceptions
      END,
    'cash_settled',
      CASE
        WHEN s.assumptions ? 'cash_settled_multiplier'
          THEN round(b.cash_settled * (s.assumptions->>'cash_settled_multiplier')::numeric, 2)
        ELSE b.cash_settled
      END,
    'auto_actions',
      CASE
        WHEN s.assumptions ? 'auto_actions_reduction'
          THEN round(b.auto_actions * (s.assumptions->>'auto_actions_reduction')::numeric, 2)
        ELSE b.auto_actions
      END
  ),
  jsonb_build_object(
    'open_exceptions', b.open_exceptions,
    'cash_settled', b.cash_settled,
    'auto_actions', b.auto_actions
  ),
  jsonb_build_object(
    'open_exceptions_delta',
      CASE
        WHEN s.assumptions ? 'open_exceptions_multiplier'
          THEN round(b.open_exceptions * ((s.assumptions->>'open_exceptions_multiplier')::numeric - 1), 2)
        ELSE 0
      END,
    'cash_settled_delta',
      CASE
        WHEN s.assumptions ? 'cash_settled_multiplier'
          THEN round(b.cash_settled * ((s.assumptions->>'cash_settled_multiplier')::numeric - 1), 2)
        ELSE 0
      END
  ),
  'simulated'
FROM public.board_simulations s
JOIN public.mv_board_summary b ON b.tenant_id = s.tenant_id
WHERE s.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7.4 Meeting snapshot (today's executive summary)
-- ============================================================
INSERT INTO public.board_meeting_snapshots (
  tenant_id, meeting_date, meeting_title, snapshot, status, created_by
)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  current_date,
  'Monthly Board Review - January 2026',
  jsonb_build_object(
    'board_summary', (SELECT jsonb_agg(to_jsonb(b)) FROM public.mv_board_summary b WHERE b.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid),
    'risk_breaches', (SELECT jsonb_agg(to_jsonb(r)) FROM public.risk_breach_events r WHERE r.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid),
    'simulations', (SELECT jsonb_agg(to_jsonb(sr)) FROM public.board_simulation_results sr WHERE sr.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid),
    'ml_status', (SELECT to_jsonb(ms) FROM public.tenant_ml_settings ms WHERE ms.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid),
    'soc_controls', (SELECT jsonb_agg(to_jsonb(sc)) FROM public.soc_controls sc WHERE sc.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid)
  ),
  'draft',
  '283eb81f-18b3-4628-a81d-341a8f8cff9f'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.board_meeting_snapshots
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid 
    AND meeting_date = current_date
);
