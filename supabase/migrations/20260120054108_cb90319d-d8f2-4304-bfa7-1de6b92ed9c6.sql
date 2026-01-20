-- Table: reconciliation_kpi_snapshots
create table if not exists public.reconciliation_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  period_start date not null,
  period_end date not null,

  auto_confirmed_count int not null default 0,
  manual_confirmed_count int not null default 0,
  total_suggestions int not null default 0,

  false_auto_count int not null default 0,
  avg_confidence numeric(5,2),

  estimated_minutes_saved numeric(10,2) default 0,
  estimated_cost_saved numeric(18,2) default 0,

  cash_acceleration_amount numeric(18,2) default 0,
  cash_acceleration_days numeric(10,2) default 0,

  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_kpi_snapshots_tenant_period
  on public.reconciliation_kpi_snapshots(tenant_id, period_start desc);

-- Enable RLS
alter table public.reconciliation_kpi_snapshots enable row level security;

-- RLS Policies
create policy "Users can view their tenant KPI snapshots"
  on public.reconciliation_kpi_snapshots for select
  using (tenant_id in (
    select tenant_id from public.tenant_users where user_id = auth.uid()
  ));

create policy "Users can insert KPI snapshots for their tenant"
  on public.reconciliation_kpi_snapshots for insert
  with check (tenant_id in (
    select tenant_id from public.tenant_users where user_id = auth.uid()
  ));