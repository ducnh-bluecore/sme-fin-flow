-- Table: reconciliation_suggestions (ephemeral, replaceable)
create table if not exists public.reconciliation_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),

  exception_id uuid not null
    references public.exceptions_queue(id) on delete cascade,

  bank_transaction_id uuid null references public.bank_transactions(id),
  invoice_id uuid null references public.invoices(id),

  suggestion_type text not null
    check (suggestion_type in (
      'BANK_TO_INVOICE',
      'BANK_SPLIT_TO_INVOICES',
      'INVOICE_EXPECT_BANK'
    )),

  confidence numeric(5,2) not null default 0,

  suggested_amount numeric(18,2) not null,
  currency text not null default 'VND',

  rationale jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_suggestions_exception
  on public.reconciliation_suggestions(exception_id, confidence desc);

create index if not exists idx_suggestions_tenant
  on public.reconciliation_suggestions(tenant_id);

-- RLS
alter table public.reconciliation_suggestions enable row level security;

create policy "Tenant members can view suggestions"
  on public.reconciliation_suggestions
  for select
  using (
    tenant_id in (
      select tu.tenant_id from public.tenant_users tu
      where tu.user_id = auth.uid()
    )
  );

create policy "Tenant members can delete suggestions"
  on public.reconciliation_suggestions
  for delete
  using (
    tenant_id in (
      select tu.tenant_id from public.tenant_users tu
      where tu.user_id = auth.uid()
    )
  );

create policy "Service role can insert suggestions"
  on public.reconciliation_suggestions
  for insert
  with check (true);