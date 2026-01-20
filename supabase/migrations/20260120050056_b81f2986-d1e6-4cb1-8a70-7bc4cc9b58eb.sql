-- Table: reconciliation_suggestion_outcomes
create table if not exists public.reconciliation_suggestion_outcomes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),

  suggestion_id uuid not null,
  exception_id uuid not null,
  
  outcome text not null
    check (outcome in (
      'CONFIRMED_MANUAL',
      'AUTO_CONFIRMED',
      'REJECTED',
      'IGNORED',
      'TIMED_OUT'
    )),

  confidence_at_time numeric(5,2) not null,
  final_result text not null
    check (final_result in ('CORRECT','INCORRECT','UNKNOWN')),

  rationale_snapshot jsonb not null default '{}'::jsonb,

  decided_by uuid null,
  decided_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

create index if not exists idx_suggestion_outcomes_tenant
  on public.reconciliation_suggestion_outcomes(tenant_id, created_at desc);

create index if not exists idx_suggestion_outcomes_type
  on public.reconciliation_suggestion_outcomes(tenant_id, outcome, final_result);

-- Table: confidence_calibration_stats
create table if not exists public.confidence_calibration_stats (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),

  suggestion_type text not null,
  confidence_band text not null,
  signal_signature text not null,

  total_suggestions int not null default 0,
  confirmed_correct int not null default 0,
  rejected int not null default 0,
  timed_out int not null default 0,

  empirical_success_rate numeric(5,2) not null default 0,

  last_computed_at timestamptz not null default now(),
  
  constraint unique_calibration_bucket unique (tenant_id, suggestion_type, confidence_band, signal_signature)
);

create index if not exists idx_calibration_stats_tenant
  on public.confidence_calibration_stats(tenant_id, suggestion_type);

-- RLS for reconciliation_suggestion_outcomes
alter table public.reconciliation_suggestion_outcomes enable row level security;

create policy "Tenant members can view outcomes"
  on public.reconciliation_suggestion_outcomes
  for select
  using (
    tenant_id in (
      select tu.tenant_id from public.tenant_users tu
      where tu.user_id = auth.uid()
    )
  );

create policy "Service role can insert outcomes"
  on public.reconciliation_suggestion_outcomes
  for insert
  with check (true);

-- RLS for confidence_calibration_stats
alter table public.confidence_calibration_stats enable row level security;

create policy "Tenant members can view calibration stats"
  on public.confidence_calibration_stats
  for select
  using (
    tenant_id in (
      select tu.tenant_id from public.tenant_users tu
      where tu.user_id = auth.uid()
    )
  );

create policy "Service role can manage calibration stats"
  on public.confidence_calibration_stats
  for all
  using (true)
  with check (true);