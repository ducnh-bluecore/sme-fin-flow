-- ============================================
-- CDP DECISION CARDS
-- ============================================

-- 16. cdp_decision_cards
CREATE TABLE public.cdp_decision_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('INSIGHT_EVENT', 'MANUAL')),
  source_ref jsonb NOT NULL DEFAULT '{}',
  title text NOT NULL,
  summary text NOT NULL,
  category text NOT NULL CHECK (category IN ('VALUE', 'TIMING', 'MIX', 'RISK', 'QUALITY')),
  population_ref jsonb NOT NULL DEFAULT '{}',
  window_days integer NOT NULL DEFAULT 60,
  baseline_days integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_REVIEW', 'DECIDED', 'MONITORING', 'CLOSED')),
  severity text NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  priority text NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2')),
  owner_role text NOT NULL DEFAULT 'Growth' CHECK (owner_role IN ('CEO', 'CFO', 'Growth', 'Ops')),
  review_by date NULL,
  decision_due date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdp_decision_cards_status ON public.cdp_decision_cards(tenant_id, status);
CREATE INDEX idx_cdp_decision_cards_owner ON public.cdp_decision_cards(tenant_id, owner_role, status);
CREATE INDEX idx_cdp_decision_cards_priority ON public.cdp_decision_cards(tenant_id, priority, status);

ALTER TABLE public.cdp_decision_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_decision_cards in their tenant"
ON public.cdp_decision_cards FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 17. cdp_decision_card_snapshots (immutable evidence pack)
CREATE TABLE public.cdp_decision_card_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  decision_card_id uuid NOT NULL REFERENCES cdp_decision_cards(id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  evidence_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdp_card_snapshots_card ON public.cdp_decision_card_snapshots(tenant_id, decision_card_id);

ALTER TABLE public.cdp_decision_card_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cdp_decision_card_snapshots in their tenant"
ON public.cdp_decision_card_snapshots FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 18. cdp_decisions (decision records)
CREATE TABLE public.cdp_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  decision_card_id uuid NOT NULL REFERENCES cdp_decision_cards(id) ON DELETE CASCADE,
  decision_status text NOT NULL CHECK (decision_status IN ('APPROVE', 'HOLD', 'REJECT')),
  decision_statement text NOT NULL,
  assumptions_json jsonb NULL,
  expected_impact_json jsonb NULL,
  decided_by_role text NOT NULL CHECK (decided_by_role IN ('CEO', 'CFO', 'Growth', 'Ops')),
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdp_decisions_card ON public.cdp_decisions(tenant_id, decision_card_id);

ALTER TABLE public.cdp_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_decisions in their tenant"
ON public.cdp_decisions FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 19. cdp_decision_reviews (monitoring outcomes)
CREATE TABLE public.cdp_decision_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  decision_card_id uuid NOT NULL REFERENCES cdp_decision_cards(id) ON DELETE CASCADE,
  review_at date NOT NULL,
  observed_outcome_json jsonb NOT NULL DEFAULT '{}',
  notes text NULL
);

CREATE INDEX idx_cdp_decision_reviews_card ON public.cdp_decision_reviews(tenant_id, decision_card_id);

ALTER TABLE public.cdp_decision_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_decision_reviews in their tenant"
ON public.cdp_decision_reviews FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 20. cdp_card_activity_log (audit trail)
CREATE TABLE public.cdp_card_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  decision_card_id uuid NOT NULL REFERENCES cdp_decision_cards(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('CEO', 'CFO', 'Growth', 'Ops', 'System')),
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE_STATUS', 'ADD_NOTE', 'DECIDE', 'CLOSE', 'SNOOZE', 'ASSIGN')),
  payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdp_card_activity_card ON public.cdp_card_activity_log(tenant_id, decision_card_id);
CREATE INDEX idx_cdp_card_activity_time ON public.cdp_card_activity_log(tenant_id, created_at);

ALTER TABLE public.cdp_card_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cdp_card_activity_log in their tenant"
ON public.cdp_card_activity_log FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));