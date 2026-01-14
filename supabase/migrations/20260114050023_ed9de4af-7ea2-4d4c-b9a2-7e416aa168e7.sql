-- Persisted state for auto-generated decision cards
CREATE TABLE IF NOT EXISTS public.auto_decision_card_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  auto_card_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN','IN_PROGRESS','DECIDED','DISMISSED','SNOOZED')),
  decided_by UUID NULL,
  decided_at TIMESTAMPTZ NULL,
  dismiss_reason TEXT NULL,
  comment TEXT NULL,
  snoozed_until TIMESTAMPTZ NULL,
  card_snapshot JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, auto_card_id)
);

ALTER TABLE public.auto_decision_card_states ENABLE ROW LEVEL SECURITY;

-- Membership table is tenant_users (tenant_id, user_id)
DROP POLICY IF EXISTS "Auto card states: read own tenant" ON public.auto_decision_card_states;
DROP POLICY IF EXISTS "Auto card states: insert own tenant" ON public.auto_decision_card_states;
DROP POLICY IF EXISTS "Auto card states: update own tenant" ON public.auto_decision_card_states;

CREATE POLICY "Auto card states: read own tenant"
ON public.auto_decision_card_states
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.tenant_id = auto_decision_card_states.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
  )
);

CREATE POLICY "Auto card states: insert own tenant"
ON public.auto_decision_card_states
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.tenant_id = auto_decision_card_states.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
  )
);

CREATE POLICY "Auto card states: update own tenant"
ON public.auto_decision_card_states
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.tenant_id = auto_decision_card_states.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
  )
);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_auto_decision_card_states_updated_at ON public.auto_decision_card_states;
CREATE TRIGGER set_auto_decision_card_states_updated_at
BEFORE UPDATE ON public.auto_decision_card_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_auto_decision_card_states_tenant_status
ON public.auto_decision_card_states (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_auto_decision_card_states_auto_id
ON public.auto_decision_card_states (auto_card_id);
