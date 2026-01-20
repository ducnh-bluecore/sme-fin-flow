
-- ============================================================
-- BOARD SIMULATION & MEETING MODE
-- ============================================================

-- 1) Board Simulations table
CREATE TABLE IF NOT EXISTS public.board_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  simulation_type text NOT NULL DEFAULT 'stress_test' CHECK (simulation_type IN ('stress_test','scenario','what_if')),
  assumptions jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','completed','archived')),
  truth_level text NOT NULL DEFAULT 'simulated',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.board_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant simulations"
  ON public.board_simulations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create simulations for their tenant"
  ON public.board_simulations FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant simulations"
  ON public.board_simulations FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 2) Simulation Results table (derived, isolated from SSOT)
CREATE TABLE IF NOT EXISTS public.board_simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES public.board_simulations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  period_month date NOT NULL,
  simulated_metrics jsonb NOT NULL,
  baseline_metrics jsonb,
  delta_metrics jsonb,
  risk_breaches jsonb,
  truth_level text NOT NULL DEFAULT 'simulated',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.board_simulation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant simulation results"
  ON public.board_simulation_results FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert simulation results for their tenant"
  ON public.board_simulation_results FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 3) Board Meeting Snapshots (read-only historical record)
CREATE TABLE IF NOT EXISTS public.board_meeting_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  meeting_date date NOT NULL,
  meeting_title text,
  snapshot jsonb NOT NULL,
  attendees jsonb,
  decisions jsonb,
  action_items jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized','archived')),
  finalized_by uuid,
  finalized_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, meeting_date)
);

ALTER TABLE public.board_meeting_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant meeting snapshots"
  ON public.board_meeting_snapshots FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create meeting snapshots for their tenant"
  ON public.board_meeting_snapshots FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update draft meeting snapshots"
  ON public.board_meeting_snapshots FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()) AND status = 'draft');

-- 4) Example simulation from board summary
INSERT INTO public.board_simulations (
  tenant_id, name, description, simulation_type, assumptions, status
)
SELECT DISTINCT
  tenant_id,
  'Stress: Exception Spike +30%',
  'Simulates open exceptions increasing by 30% to test risk appetite thresholds',
  'stress_test',
  jsonb_build_object(
    'open_exceptions_multiplier', 1.3,
    'cash_settled_multiplier', 1.0
  ),
  'completed'
FROM public.mv_board_summary
ON CONFLICT DO NOTHING;

-- 5) Populate simulation results
INSERT INTO public.board_simulation_results (
  simulation_id, tenant_id, period_month, simulated_metrics, baseline_metrics, delta_metrics
)
SELECT
  s.id,
  s.tenant_id,
  b.period_month,
  jsonb_build_object(
    'open_exceptions', b.open_exceptions * COALESCE((s.assumptions->>'open_exceptions_multiplier')::numeric, 1),
    'cash_settled', b.cash_settled * COALESCE((s.assumptions->>'cash_settled_multiplier')::numeric, 1),
    'open_exceptions_value', b.open_exceptions_value * COALESCE((s.assumptions->>'open_exceptions_multiplier')::numeric, 1)
  ),
  jsonb_build_object(
    'open_exceptions', b.open_exceptions,
    'cash_settled', b.cash_settled,
    'open_exceptions_value', b.open_exceptions_value
  ),
  jsonb_build_object(
    'open_exceptions_delta', b.open_exceptions * (COALESCE((s.assumptions->>'open_exceptions_multiplier')::numeric, 1) - 1),
    'open_exceptions_delta_pct', (COALESCE((s.assumptions->>'open_exceptions_multiplier')::numeric, 1) - 1) * 100
  )
FROM public.board_simulations s
JOIN public.mv_board_summary b ON b.tenant_id = s.tenant_id;

-- 6) Create initial board meeting snapshot
INSERT INTO public.board_meeting_snapshots (
  tenant_id, meeting_date, meeting_title, snapshot, status
)
SELECT
  tenant_id,
  current_date,
  format('Board Meeting - %s', to_char(current_date, 'Month YYYY')),
  jsonb_build_object(
    'financial_summary', jsonb_agg(DISTINCT jsonb_build_object(
      'period', period_month,
      'cash_settled', cash_settled,
      'open_exceptions', open_exceptions,
      'auto_actions', auto_actions,
      'manual_actions', manual_actions
    )),
    'generated_at', now()
  ),
  'draft'
FROM public.mv_board_summary
GROUP BY tenant_id
ON CONFLICT (tenant_id, meeting_date) DO NOTHING;

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_board_simulations_tenant ON public.board_simulations (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_board_simulation_results_sim ON public.board_simulation_results (simulation_id);
CREATE INDEX IF NOT EXISTS idx_board_meeting_snapshots_tenant ON public.board_meeting_snapshots (tenant_id, meeting_date);
