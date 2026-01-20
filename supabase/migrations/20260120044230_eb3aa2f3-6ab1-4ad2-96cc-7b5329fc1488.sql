-- Exception Board Schema (SSOT-native workflow layer)
-- Strictly read-only on SSOT truth, append/update only in exceptions_queue

-- Table: exceptions_queue
create table if not exists public.exceptions_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  exception_type text not null check (exception_type in (
    'ORPHAN_BANK_TXN',
    'AR_OVERDUE',
    'PARTIAL_MATCH_STUCK'
  )),

  severity text not null default 'medium'
    check (severity in ('low','medium','high','critical')),

  ref_type text not null
    check (ref_type in ('bank_transaction','invoice','reconciliation_link')),
  ref_id uuid not null,

  currency text not null default 'VND',
  impact_amount numeric(18,2) not null default 0,

  status text not null default 'open'
    check (status in ('open','triaged','snoozed','resolved')),

  detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  title text not null,
  description text not null,

  evidence jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,

  assigned_to uuid null,
  triage_notes text null,
  snoozed_until timestamptz null,

  resolved_at timestamptz null,
  resolved_by uuid null,

  created_at timestamptz not null default now()
);

-- Performance indexes
create index if not exists idx_exceptions_open
  on public.exceptions_queue(tenant_id, status, severity, detected_at desc);

create index if not exists idx_exceptions_ref
  on public.exceptions_queue(tenant_id, ref_type, ref_id);

create index if not exists idx_exceptions_type
  on public.exceptions_queue(tenant_id, exception_type, status);

create index if not exists idx_exceptions_evidence_gin
  on public.exceptions_queue using gin (evidence);

-- Enable RLS
alter table public.exceptions_queue enable row level security;

-- RLS Policies (tenant-based, same pattern as existing tables)
create policy "Tenant members can view exceptions"
  on public.exceptions_queue for select
  using (
    tenant_id in (
      select tu.tenant_id from public.tenant_users tu
      where tu.user_id = auth.uid()
    )
  );

create policy "Tenant members can update exceptions"
  on public.exceptions_queue for update
  using (
    tenant_id in (
      select tu.tenant_id from public.tenant_users tu
      where tu.user_id = auth.uid()
    )
  );

create policy "Tenant members can insert exceptions"
  on public.exceptions_queue for insert
  with check (
    tenant_id in (
      select tu.tenant_id from public.tenant_users tu
      where tu.user_id = auth.uid()
    )
  );

-- Add comment for documentation
comment on table public.exceptions_queue is 'Exception Board workflow queue - read-only on SSOT, workflow layer only';