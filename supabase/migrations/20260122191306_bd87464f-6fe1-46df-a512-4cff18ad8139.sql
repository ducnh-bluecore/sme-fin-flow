-- =============================================
-- AUTO-LINK INSIGHT → DECISION + EVIDENCE PACK
-- Extends existing CDP schema with required columns
-- =============================================

-- 1) Add missing columns to cdp_insight_events for Product & Demand insights
-- =============================================
do $$
begin
  -- Add subject_type column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'subject_type'
  ) then
    alter table cdp_insight_events add column subject_type text default 'category';
  end if;
  
  -- Add subject_key column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'subject_key'
  ) then
    alter table cdp_insight_events add column subject_key text default '-';
  end if;
  
  -- Add severity column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'severity'
  ) then
    alter table cdp_insight_events add column severity text default 'MEDIUM';
  end if;
  
  -- Add confidence column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'confidence'
  ) then
    alter table cdp_insight_events add column confidence numeric(5,4) default 0.5000;
  end if;
  
  -- Add title column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'title'
  ) then
    alter table cdp_insight_events add column title text;
  end if;
  
  -- Add narrative column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'narrative'
  ) then
    alter table cdp_insight_events add column narrative text;
  end if;
  
  -- Add metrics column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'metrics'
  ) then
    alter table cdp_insight_events add column metrics jsonb default '{}'::jsonb;
  end if;
  
  -- Add evidence column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'evidence'
  ) then
    alter table cdp_insight_events add column evidence jsonb default '{}'::jsonb;
  end if;
  
  -- Add status column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'status'
  ) then
    alter table cdp_insight_events add column status text default 'OPEN';
  end if;
  
  -- Add updated_at column if not exists
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_insight_events' and column_name = 'updated_at'
  ) then
    alter table cdp_insight_events add column updated_at timestamptz default now();
  end if;
end $$;

-- 2) Add problem_statement column to cdp_decision_cards if not exists
-- =============================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'cdp_decision_cards' and column_name = 'problem_statement'
  ) then
    alter table cdp_decision_cards add column problem_statement text;
  end if;
end $$;

-- 3) LINK TABLE: DECISION ↔ INSIGHT EVENTS
-- =============================================
create table if not exists cdp_decision_insight_links (
  tenant_id uuid not null references tenants(id) on delete cascade,
  decision_id uuid not null references cdp_decision_cards(id) on delete cascade,
  insight_event_id uuid not null references cdp_insight_events(id) on delete cascade,

  link_type text not null default 'EVIDENCE', -- EVIDENCE/PRIMARY
  created_at timestamptz not null default now(),

  primary key (tenant_id, decision_id, insight_event_id)
);

create index if not exists idx_cdp_decision_links_event
on cdp_decision_insight_links(tenant_id, insight_event_id);

create index if not exists idx_cdp_decision_links_decision
on cdp_decision_insight_links(tenant_id, decision_id);

-- Enable RLS
alter table cdp_decision_insight_links enable row level security;

drop policy if exists "Tenant isolation for cdp_decision_insight_links" on cdp_decision_insight_links;
create policy "Tenant isolation for cdp_decision_insight_links"
on cdp_decision_insight_links for all
using (tenant_id in (
  select tenant_id from tenant_users where user_id = auth.uid()
));

-- 4) ISSUE MAP TABLE (prevents duplicate decision cards)
-- =============================================
create table if not exists cdp_decision_issue_map (
  tenant_id uuid not null references tenants(id) on delete cascade,
  issue_key text not null,
  decision_id uuid not null references cdp_decision_cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, issue_key)
);

-- Enable RLS
alter table cdp_decision_issue_map enable row level security;

drop policy if exists "Tenant isolation for cdp_decision_issue_map" on cdp_decision_issue_map;
create policy "Tenant isolation for cdp_decision_issue_map"
on cdp_decision_issue_map for all
using (tenant_id in (
  select tenant_id from tenant_users where user_id = auth.uid()
));

-- 5) Create indexes for insight events new columns
-- =============================================
create index if not exists idx_cdp_insight_events_subject
on cdp_insight_events(tenant_id, subject_type, subject_key);

create index if not exists idx_cdp_insight_events_status
on cdp_insight_events(tenant_id, status, as_of_date);

-- 6) Create unique constraint for insight cooldown
-- =============================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_cdp_insight_event'
  ) then
    -- Try to add constraint, ignore if duplicates exist
    begin
      alter table cdp_insight_events
        add constraint uq_cdp_insight_event 
        unique (tenant_id, insight_code, as_of_date, subject_type, subject_key);
    exception when others then
      raise notice 'Could not add unique constraint, possibly duplicate data exists';
    end;
  end if;
end $$;

-- 7) EVIDENCE PACK: Sample Customers View
-- =============================================
create or replace view v_cdp_evidence_sample_customers_by_category as
with params as (
  select (current_date - interval '60 days')::date as cur_start
),
x as (
  select
    tenant_id,
    category,
    customer_id,
    sum(item_amount) as spend
  from mv_cdp_order_items_enriched, params
  where order_date >= params.cur_start
  group by tenant_id, category, customer_id
)
select
  tenant_id,
  category,
  customer_id,
  spend,
  dense_rank() over (partition by tenant_id, category order by spend desc) as rnk
from x;

-- 8) FUNCTION: Build Evidence Pack for Product & Demand insights
-- =============================================
create or replace function cdp_build_evidence_pack_product_demand(
  p_tenant_id uuid,
  p_as_of_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A) CATEGORY events: attach top sample customers + snapshot metrics
  update cdp_insight_events e
  set evidence =
    coalesce(e.evidence,'{}'::jsonb) ||
    jsonb_build_object(
      'evidence_pack_version','v1',
      'sample_customers',
        (
          select coalesce(jsonb_agg(jsonb_build_object(
                   'customer_id', sc.customer_id,
                   'spend_60d', sc.spend
                 ) order by sc.spend desc), '[]'::jsonb)
          from v_cdp_evidence_sample_customers_by_category sc
          where sc.tenant_id = e.tenant_id
            and sc.category = e.subject_key
            and sc.rnk <= 5
        ),
      'drivers',
        jsonb_build_object(
          'window','60d_vs_prev60d'
        )
    ),
    updated_at = now()
  where e.tenant_id = p_tenant_id
    and e.as_of_date = p_as_of_date
    and e.subject_type = 'category'
    and (e.evidence->>'evidence_pack_version') is distinct from 'v1';

  -- B) CATEGORY_PAIR events: evidence = pair + shifted + sample customers by "to_category"
  update cdp_insight_events e
  set evidence =
    coalesce(e.evidence,'{}'::jsonb) ||
    jsonb_build_object(
      'evidence_pack_version','v1',
      'pair',
        jsonb_build_object(
          'from', split_part(e.subject_key,' -> ',1),
          'to', split_part(e.subject_key,' -> ',2)
        ),
      'sample_customers_to_category',
        (
          select coalesce(jsonb_agg(jsonb_build_object(
                   'customer_id', sc.customer_id,
                   'spend_60d', sc.spend
                 ) order by sc.spend desc), '[]'::jsonb)
          from v_cdp_evidence_sample_customers_by_category sc
          where sc.tenant_id = e.tenant_id
            and sc.category = split_part(e.subject_key,' -> ',2)
            and sc.rnk <= 5
        )
    ),
    updated_at = now()
  where e.tenant_id = p_tenant_id
    and e.as_of_date = p_as_of_date
    and e.subject_type = 'category_pair'
    and (e.evidence->>'evidence_pack_version') is distinct from 'v1';

  -- C) TENANT events (ALL / BASKET / OTHERS): evidence = top categories
  update cdp_insight_events e
  set evidence =
    coalesce(e.evidence,'{}'::jsonb) ||
    jsonb_build_object(
      'evidence_pack_version','v1',
      'top_categories_cur',
        (
          select coalesce(jsonb_agg(jsonb_build_object(
            'category',s.category,
            'share_cur',s.share_cur,
            'sales_cur',s.sales_cur
          ) order by s.share_cur desc), '[]'::jsonb)
          from (
            select category, share_cur, sales_cur
            from mv_cdp_category_share_60d_vs_prev60d
            where tenant_id = e.tenant_id
            order by share_cur desc nulls last
            limit 5
          ) s
        )
    ),
    updated_at = now()
  where e.tenant_id = p_tenant_id
    and e.as_of_date = p_as_of_date
    and e.subject_type = 'tenant'
    and (e.evidence->>'evidence_pack_version') is distinct from 'v1';

end;
$$;

-- 9) FUNCTION: Auto-link Insights to Decision Cards
-- =============================================
create or replace function cdp_auto_link_insights_to_decisions(
  p_tenant_id uuid,
  p_as_of_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_issue_key text;
  v_decision_id uuid;
  v_owner_role text;
  v_priority text;
  v_due date;
  v_persistence int;
begin
  for r in
    select *
    from cdp_insight_events
    where tenant_id = p_tenant_id
      and as_of_date = p_as_of_date
      and status = 'OPEN'
      and insight_code like 'PD%'
  loop
    -- Rule: only auto-link if HIGH or macro codes or insight is persistent
    select count(*)
      into v_persistence
    from cdp_insight_events e2
    where e2.tenant_id = r.tenant_id
      and e2.insight_code = r.insight_code
      and e2.subject_type = r.subject_type
      and e2.subject_key = r.subject_key
      and e2.as_of_date >= (p_as_of_date - interval '14 days')::date;

    if not (r.severity = 'HIGH' or r.insight_code in ('PD05','PD11','PD25') or v_persistence >= 3) then
      continue;
    end if;

    -- Issue key (unique identifier for decision grouping)
    v_issue_key := r.insight_code || '|' || r.subject_type || '|' || r.subject_key;

    -- Owner role heuristic
    if r.insight_code in ('PD11','PD25','PD05') then
      v_owner_role := 'CEO';
      v_priority := 'P0';
      v_due := (p_as_of_date + interval '7 days')::date;
    else
      v_owner_role := 'COO';
      v_priority := case when r.severity='HIGH' then 'P0' else 'P1' end;
      v_due := (p_as_of_date + interval '10 days')::date;
    end if;

    -- Check if decision already exists for this issue_key
    select decision_id into v_decision_id
    from cdp_decision_issue_map
    where tenant_id = r.tenant_id and issue_key = v_issue_key;

    -- If not exists → create decision card + map entry
    if v_decision_id is null then
      insert into cdp_decision_cards
      (tenant_id, source_type, source_ref, title, summary, problem_statement, category, 
       severity, priority, owner_role, decision_due, status)
      values
      (
        r.tenant_id,
        'insight_event',
        jsonb_build_object('insight_code', r.insight_code, 'event_id', r.id),
        r.title,
        r.narrative,
        'Cần xem xét thay đổi nhu cầu liên quan tới: '||r.subject_key||
        '. Insight cho thấy biến động có ý nghĩa và có thể ảnh hưởng tới doanh thu / cấu trúc giỏ hàng trong kỳ tới.',
        'PRODUCT_DEMAND',
        r.severity,
        v_priority,
        v_owner_role,
        v_due,
        'OPEN'
      )
      returning id into v_decision_id;

      insert into cdp_decision_issue_map(tenant_id, issue_key, decision_id)
      values (r.tenant_id, v_issue_key, v_decision_id)
      on conflict do nothing;
    end if;

    -- Link insight event → decision
    insert into cdp_decision_insight_links
    (tenant_id, decision_id, insight_event_id, link_type)
    values
    (r.tenant_id, v_decision_id, r.id, 'EVIDENCE')
    on conflict do nothing;

  end loop;
end;
$$;

-- 10) VIEW: Decision Queue with linked insights count
-- =============================================
create or replace view v_cdp_decision_queue as
select
  d.id,
  d.tenant_id,
  d.source_type,
  d.source_ref,
  d.title,
  d.summary,
  d.problem_statement,
  d.category,
  d.population_ref,
  d.window_days,
  d.baseline_days,
  d.status,
  d.severity,
  d.priority,
  d.owner_role,
  d.review_by,
  d.decision_due,
  d.created_at,
  d.updated_at,
  coalesce(
    (select count(*) from cdp_decision_insight_links il where il.decision_id = d.id),
    0
  )::int as linked_insights,
  coalesce(
    (select max(e.as_of_date) 
     from cdp_decision_insight_links il 
     join cdp_insight_events e on e.id = il.insight_event_id 
     where il.decision_id = d.id),
    d.created_at::date
  ) as latest_insight_date
from cdp_decision_cards d;

-- 11) VIEW: Decision Detail with evidence insights
-- =============================================
create or replace view v_cdp_decision_evidence as
select
  l.tenant_id,
  l.decision_id,
  l.link_type,
  e.id as insight_event_id,
  e.insight_code,
  e.as_of_date,
  e.subject_type,
  e.subject_key,
  e.severity,
  e.confidence,
  e.title,
  e.narrative,
  e.metrics,
  e.evidence
from cdp_decision_insight_links l
join cdp_insight_events e on e.id = l.insight_event_id;

-- 12) ORCHESTRATION FUNCTION: Run full pipeline
-- =============================================
create or replace function cdp_run_product_demand_pipeline(
  p_tenant_id uuid,
  p_as_of_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insights_before int;
  v_insights_after int;
  v_decisions_before int;
  v_decisions_after int;
  v_links_created int;
begin
  -- Count before
  select count(*) into v_insights_before
  from cdp_insight_events
  where tenant_id = p_tenant_id and as_of_date = p_as_of_date;
  
  select count(*) into v_decisions_before
  from cdp_decision_cards
  where tenant_id = p_tenant_id and status = 'OPEN';

  -- Step 1: Refresh materialized views
  perform cdp_refresh_demand_insights();

  -- Step 2: Run insight detection
  perform cdp_run_product_demand_insights(p_tenant_id, p_as_of_date);

  -- Step 3: Build evidence packs
  perform cdp_build_evidence_pack_product_demand(p_tenant_id, p_as_of_date);

  -- Step 4: Auto-link to decision cards
  perform cdp_auto_link_insights_to_decisions(p_tenant_id, p_as_of_date);

  -- Count after
  select count(*) into v_insights_after
  from cdp_insight_events
  where tenant_id = p_tenant_id and as_of_date = p_as_of_date;
  
  select count(*) into v_decisions_after
  from cdp_decision_cards
  where tenant_id = p_tenant_id and status = 'OPEN';

  select count(*) into v_links_created
  from cdp_decision_insight_links
  where tenant_id = p_tenant_id
    and created_at::date = current_date;

  return jsonb_build_object(
    'tenant_id', p_tenant_id,
    'as_of_date', p_as_of_date,
    'insights_detected', v_insights_after - v_insights_before,
    'decisions_created', v_decisions_after - v_decisions_before,
    'links_created', v_links_created,
    'total_open_decisions', v_decisions_after
  );
end;
$$;