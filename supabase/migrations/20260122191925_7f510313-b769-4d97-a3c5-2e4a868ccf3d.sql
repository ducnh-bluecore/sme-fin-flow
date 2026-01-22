-- =============================================
-- CLUSTERING + DATA QUALITY EVIDENCE FOR CDP
-- Product & Demand Intelligence Pipeline
-- =============================================

-- 1) DATA QUALITY DAILY TABLE
-- =============================================
create table if not exists cdp_data_quality_daily (
  tenant_id uuid not null references tenants(id) on delete cascade,
  as_of_date date not null,

  -- completeness
  orders_total bigint not null default 0,
  orders_missing_customer bigint not null default 0,
  order_items_total bigint not null default 0,

  -- mapping coverage
  order_items_unmapped_category bigint not null default 0,
  order_items_unmapped_sku bigint not null default 0,

  -- duplication / integrity (proxy)
  duplicate_orders bigint not null default 0,
  duplicate_items bigint not null default 0,

  -- freshness
  latest_order_date date null,
  data_lag_days int null,

  -- score
  quality_score numeric(5,2) not null default 0,
  flags jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  primary key (tenant_id, as_of_date)
);

-- Enable RLS
alter table cdp_data_quality_daily enable row level security;

drop policy if exists "Tenant isolation for cdp_data_quality_daily" on cdp_data_quality_daily;
create policy "Tenant isolation for cdp_data_quality_daily"
on cdp_data_quality_daily for all
using (tenant_id in (
  select tenant_id from tenant_users where user_id = auth.uid()
));

-- 2) FUNCTION: Compute Data Quality Daily
-- =============================================
create or replace function cdp_compute_data_quality_daily(
  p_tenant_id uuid,
  p_as_of_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orders_total bigint;
  v_orders_missing_customer bigint;
  v_items_total bigint;
  v_unmapped_category bigint;
  v_unmapped_sku bigint;
  v_latest_order_date date;
  v_data_lag int;

  v_score numeric(5,2);
  v_flags jsonb := '{}'::jsonb;

  -- weights
  w_missing_customer numeric := 25;
  w_unmapped_category numeric := 30;
  w_unmapped_sku numeric := 10;
  w_data_lag numeric := 20;
  w_dup numeric := 15;

  v_dup_orders bigint := 0;
  v_dup_items bigint := 0;

  v_missing_customer_rate numeric;
  v_unmapped_category_rate numeric;
  v_unmapped_sku_rate numeric;
  v_d0 date;
begin
  v_d0 := (p_as_of_date - interval '60 days')::date;

  -- Orders stats
  select
    count(*)::bigint,
    count(*) filter (where customer_id is null)::bigint,
    max(order_date)::date
  into v_orders_total, v_orders_missing_customer, v_latest_order_date
  from external_orders o
  where o.tenant_id = p_tenant_id
    and o.status in ('confirmed','delivered','shipped','completed','paid')
    and o.order_date::date >= v_d0;

  -- Items stats from MV
  select
    count(*)::bigint,
    count(*) filter (where category = 'UNMAPPED')::bigint,
    count(*) filter (where sku is null or sku = '')::bigint
  into v_items_total, v_unmapped_category, v_unmapped_sku
  from mv_cdp_order_items_enriched i
  where i.tenant_id = p_tenant_id
    and i.order_date >= v_d0;

  -- Duplicate items proxy
  with g as (
    select order_id, sku, quantity, item_amount, count(*) as c
    from mv_cdp_order_items_enriched
    where tenant_id = p_tenant_id and order_date >= v_d0
    group by order_id, sku, quantity, item_amount
    having count(*) > 1
  )
  select coalesce(sum(c - 1),0)::bigint into v_dup_items from g;

  -- Data lag
  if v_latest_order_date is null then
    v_data_lag := null;
  else
    v_data_lag := (p_as_of_date - v_latest_order_date);
  end if;

  -- Rates
  v_missing_customer_rate := case when v_orders_total > 0 then v_orders_missing_customer::numeric / v_orders_total else 0 end;
  v_unmapped_category_rate := case when v_items_total > 0 then v_unmapped_category::numeric / v_items_total else 0 end;
  v_unmapped_sku_rate := case when v_items_total > 0 then v_unmapped_sku::numeric / v_items_total else 0 end;

  -- Flags
  if v_missing_customer_rate >= 0.01 then
    v_flags := v_flags || jsonb_build_object('missing_customer_rate', round(v_missing_customer_rate::numeric, 4));
  end if;
  if v_unmapped_category_rate >= 0.02 then
    v_flags := v_flags || jsonb_build_object('unmapped_category_rate', round(v_unmapped_category_rate::numeric, 4));
  end if;
  if v_unmapped_sku_rate >= 0.01 then
    v_flags := v_flags || jsonb_build_object('unmapped_sku_rate', round(v_unmapped_sku_rate::numeric, 4));
  end if;
  if v_data_lag is not null and v_data_lag >= 2 then
    v_flags := v_flags || jsonb_build_object('data_lag_days', v_data_lag);
  end if;
  if v_dup_items >= 50 then
    v_flags := v_flags || jsonb_build_object('duplicate_items', v_dup_items);
  end if;

  -- Score 0..100
  v_score := 100
    - (w_missing_customer * least(1, v_missing_customer_rate / 0.02))
    - (w_unmapped_category * least(1, v_unmapped_category_rate / 0.05))
    - (w_unmapped_sku * least(1, v_unmapped_sku_rate / 0.03))
    - (w_data_lag * least(1, coalesce(v_data_lag,0)::numeric / 7))
    - (w_dup * least(1, v_dup_items::numeric / 500));

  v_score := greatest(0, least(100, v_score));

  insert into cdp_data_quality_daily
  (tenant_id, as_of_date, orders_total, orders_missing_customer, order_items_total,
   order_items_unmapped_category, order_items_unmapped_sku,
   duplicate_orders, duplicate_items,
   latest_order_date, data_lag_days, quality_score, flags)
  values
  (p_tenant_id, p_as_of_date, coalesce(v_orders_total,0), coalesce(v_orders_missing_customer,0), coalesce(v_items_total,0),
   coalesce(v_unmapped_category,0), coalesce(v_unmapped_sku,0),
   coalesce(v_dup_orders,0), coalesce(v_dup_items,0),
   v_latest_order_date, v_data_lag, v_score, v_flags)
  on conflict (tenant_id, as_of_date) do update
  set orders_total = excluded.orders_total,
      orders_missing_customer = excluded.orders_missing_customer,
      order_items_total = excluded.order_items_total,
      order_items_unmapped_category = excluded.order_items_unmapped_category,
      order_items_unmapped_sku = excluded.order_items_unmapped_sku,
      duplicate_orders = excluded.duplicate_orders,
      duplicate_items = excluded.duplicate_items,
      latest_order_date = excluded.latest_order_date,
      data_lag_days = excluded.data_lag_days,
      quality_score = excluded.quality_score,
      flags = excluded.flags,
      created_at = now();
end;
$$;

-- 3) FUNCTION: Attach Data Quality to Insight Evidence
-- =============================================
create or replace function cdp_attach_data_quality_to_insights(
  p_tenant_id uuid,
  p_as_of_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update cdp_insight_events e
  set evidence = coalesce(e.evidence,'{}'::jsonb) ||
    jsonb_build_object(
      'data_quality',
      (select jsonb_build_object(
         'quality_score', q.quality_score,
         'flags', q.flags,
         'latest_order_date', q.latest_order_date,
         'data_lag_days', q.data_lag_days
       )
       from cdp_data_quality_daily q
       where q.tenant_id = e.tenant_id and q.as_of_date = p_as_of_date)
    ),
    updated_at = now()
  where e.tenant_id = p_tenant_id
    and e.as_of_date = p_as_of_date
    and e.insight_code like 'PD%';
end;
$$;

-- 4) INSIGHT CLUSTERS TABLE
-- =============================================
create table if not exists cdp_insight_clusters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  as_of_date date not null,

  cluster_type text not null,
  cluster_key text not null,
  title text not null,
  narrative text not null,

  severity text not null default 'MEDIUM',
  confidence numeric(5,4) not null default 0.6500,

  metrics jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  unique (tenant_id, as_of_date, cluster_key)
);

create index if not exists idx_cdp_insight_clusters_tenant_date
on cdp_insight_clusters(tenant_id, as_of_date);

-- Enable RLS
alter table cdp_insight_clusters enable row level security;

drop policy if exists "Tenant isolation for cdp_insight_clusters" on cdp_insight_clusters;
create policy "Tenant isolation for cdp_insight_clusters"
on cdp_insight_clusters for all
using (tenant_id in (
  select tenant_id from tenant_users where user_id = auth.uid()
));

-- 5) CLUSTER MEMBERS TABLE
-- =============================================
create table if not exists cdp_insight_cluster_members (
  tenant_id uuid not null references tenants(id) on delete cascade,
  cluster_id uuid not null references cdp_insight_clusters(id) on delete cascade,
  insight_event_id uuid not null references cdp_insight_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, cluster_id, insight_event_id)
);

create index if not exists idx_cdp_cluster_members_event
on cdp_insight_cluster_members(tenant_id, insight_event_id);

-- Enable RLS
alter table cdp_insight_cluster_members enable row level security;

drop policy if exists "Tenant isolation for cdp_insight_cluster_members" on cdp_insight_cluster_members;
create policy "Tenant isolation for cdp_insight_cluster_members"
on cdp_insight_cluster_members for all
using (tenant_id in (
  select tenant_id from tenant_users where user_id = auth.uid()
));

-- 6) DECISION CLUSTER MAP TABLE
-- =============================================
create table if not exists cdp_decision_cluster_map (
  tenant_id uuid not null references tenants(id) on delete cascade,
  cluster_key text not null,
  decision_id uuid not null references cdp_decision_cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, cluster_key)
);

-- Enable RLS
alter table cdp_decision_cluster_map enable row level security;

drop policy if exists "Tenant isolation for cdp_decision_cluster_map" on cdp_decision_cluster_map;
create policy "Tenant isolation for cdp_decision_cluster_map"
on cdp_decision_cluster_map for all
using (tenant_id in (
  select tenant_id from tenant_users where user_id = auth.uid()
));

-- 7) FUNCTION: Build Product Demand Clusters
-- =============================================
create or replace function cdp_build_product_demand_clusters(
  p_tenant_id uuid,
  p_as_of_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cluster_id uuid;
begin
  -- 1) CONCENTRATION cluster (PD05/PD06)
  insert into cdp_insight_clusters
  (tenant_id, as_of_date, cluster_type, cluster_key, title, narrative, severity, confidence, metrics, evidence)
  select
    p_tenant_id, p_as_of_date,
    'CONCENTRATION',
    'CONCENTRATION|ALL',
    'Rủi ro tập trung nhu cầu',
    'Nhu cầu đang tập trung vào một số ít nhóm sản phẩm hoặc long-tail co cụm. Điều này làm tăng rủi ro phụ thuộc và biến động doanh thu.',
    'HIGH',
    0.8000,
    jsonb_build_object('signals', jsonb_agg(distinct e.insight_code)),
    jsonb_build_object('events', jsonb_agg(e.id))
  from cdp_insight_events e
  where e.tenant_id = p_tenant_id and e.as_of_date = p_as_of_date
    and e.insight_code in ('PD05','PD06')
  having count(*) > 0
  on conflict (tenant_id, as_of_date, cluster_key) do nothing;

  select id into v_cluster_id
  from cdp_insight_clusters
  where tenant_id = p_tenant_id and as_of_date = p_as_of_date and cluster_key = 'CONCENTRATION|ALL';

  if v_cluster_id is not null then
    insert into cdp_insight_cluster_members(tenant_id, cluster_id, insight_event_id)
    select p_tenant_id, v_cluster_id, e.id
    from cdp_insight_events e
    where e.tenant_id = p_tenant_id and e.as_of_date = p_as_of_date
      and e.insight_code in ('PD05','PD06')
    on conflict do nothing;
  end if;

  -- 2) BASKET cluster (PD09/PD10/PD11)
  insert into cdp_insight_clusters
  (tenant_id, as_of_date, cluster_type, cluster_key, title, narrative, severity, confidence, metrics, evidence)
  select
    p_tenant_id, p_as_of_date,
    'BASKET_COLLAPSE',
    'BASKET|BASKET',
    'Giỏ hàng đang co cụm',
    'Các chỉ báo cho thấy giỏ hàng kém đa dạng hơn hoặc cross-category giảm. Đây là tín hiệu dịch chuyển nhu cầu và có thể ảnh hưởng AOV.',
    case when bool_or(e.insight_code='PD11') then 'HIGH' else 'MEDIUM' end,
    0.7500,
    jsonb_build_object('signals', jsonb_agg(distinct e.insight_code)),
    jsonb_build_object('events', jsonb_agg(e.id))
  from cdp_insight_events e
  where e.tenant_id = p_tenant_id and e.as_of_date = p_as_of_date
    and e.insight_code in ('PD09','PD10','PD11')
  having count(*) > 0
  on conflict (tenant_id, as_of_date, cluster_key) do nothing;

  select id into v_cluster_id
  from cdp_insight_clusters
  where tenant_id = p_tenant_id and as_of_date = p_as_of_date and cluster_key = 'BASKET|BASKET';

  if v_cluster_id is not null then
    insert into cdp_insight_cluster_members(tenant_id, cluster_id, insight_event_id)
    select p_tenant_id, v_cluster_id, e.id
    from cdp_insight_events e
    where e.tenant_id = p_tenant_id and e.as_of_date = p_as_of_date
      and e.insight_code in ('PD09','PD10','PD11')
    on conflict do nothing;
  end if;

  -- 3) MACRO WEAKENING (PD25)
  insert into cdp_insight_clusters
  (tenant_id, as_of_date, cluster_type, cluster_key, title, narrative, severity, confidence, metrics, evidence)
  select
    p_tenant_id, p_as_of_date,
    'MACRO_WEAKENING',
    'MACRO_WEAKENING|ALL',
    'Nhu cầu co lại trên nhiều nhóm sản phẩm',
    'Nhiều nhóm sản phẩm giảm đồng thời so với baseline. Đây là tín hiệu suy yếu nhu cầu ở cấp danh mục.',
    'HIGH',
    0.7000,
    jsonb_build_object('signals', jsonb_agg(distinct e.insight_code)),
    jsonb_build_object('events', jsonb_agg(e.id))
  from cdp_insight_events e
  where e.tenant_id = p_tenant_id and e.as_of_date = p_as_of_date
    and e.insight_code = 'PD25'
  having count(*) > 0
  on conflict (tenant_id, as_of_date, cluster_key) do nothing;

  select id into v_cluster_id
  from cdp_insight_clusters
  where tenant_id = p_tenant_id and as_of_date = p_as_of_date and cluster_key = 'MACRO_WEAKENING|ALL';

  if v_cluster_id is not null then
    insert into cdp_insight_cluster_members(tenant_id, cluster_id, insight_event_id)
    select p_tenant_id, v_cluster_id, e.id
    from cdp_insight_events e
    where e.tenant_id = p_tenant_id and e.as_of_date = p_as_of_date
      and e.insight_code = 'PD25'
    on conflict do nothing;
  end if;

  -- 4) DEMAND SHIFT clusters (group by direction + top3 categories)
  with ev as (
    select
      e.*,
      (e.metrics->>'share_delta')::numeric as share_delta
    from cdp_insight_events e
    where e.tenant_id = p_tenant_id and e.as_of_date = p_as_of_date
      and e.subject_type = 'category'
      and e.insight_code in ('PD01','PD02','PD03','PD04','PD12','PD13','PD14','PD16','PD17')
  ),
  ranked as (
    select
      *,
      case when coalesce(share_delta,0) < 0 then 'DOWN' else 'UP' end as dir,
      abs(coalesce(share_delta,0)) as abs_delta
    from ev
  ),
  topcats as (
    select
      dir,
      string_agg(subject_key, ',' order by abs_delta desc) as cats_concat
    from (
      select dir, subject_key, abs_delta,
             row_number() over (partition by dir order by abs_delta desc) as rn
      from ranked
    ) x
    where rn <= 3
    group by dir
  )
  insert into cdp_insight_clusters
  (tenant_id, as_of_date, cluster_type, cluster_key, title, narrative, severity, confidence, metrics, evidence)
  select
    p_tenant_id,
    p_as_of_date,
    'DEMAND_SHIFT',
    ('DEMAND_SHIFT|'||t.dir||'|'||coalesce(t.cats_concat,'-')),
    case when t.dir='DOWN' then
      'Dịch chuyển nhu cầu: một số nhóm sản phẩm suy yếu'
    else
      'Dịch chuyển nhu cầu: một số nhóm sản phẩm tăng vai trò'
    end,
    'Có dấu hiệu dịch chuyển nhu cầu theo nhóm sản phẩm so với baseline. Cần xem xét tác động đến cấu trúc giỏ hàng và doanh thu kỳ tới.',
    case when t.dir='DOWN' then 'HIGH' else 'MEDIUM' end,
    0.7000,
    jsonb_build_object('direction', t.dir, 'top_categories', string_to_array(coalesce(t.cats_concat,''),',')),
    jsonb_build_object('note','cluster_by_top3_abs_share_delta')
  from topcats t
  on conflict (tenant_id, as_of_date, cluster_key) do nothing;

  -- Add members to demand shift clusters
  insert into cdp_insight_cluster_members(tenant_id, cluster_id, insight_event_id)
  select
    p_tenant_id,
    c.id as cluster_id,
    e.id as insight_event_id
  from cdp_insight_clusters c
  join (
    select
      e.id,
      case when ((e.metrics->>'share_delta')::numeric) < 0 then 'DOWN' else 'UP' end as dir
    from cdp_insight_events e
    where e.tenant_id = p_tenant_id and e.as_of_date = p_as_of_date
      and e.subject_type = 'category'
      and e.insight_code in ('PD01','PD02','PD03','PD04','PD12','PD13','PD14','PD16','PD17')
  ) e on true
  where c.tenant_id = p_tenant_id and c.as_of_date = p_as_of_date
    and c.cluster_type = 'DEMAND_SHIFT'
    and c.cluster_key like ('DEMAND_SHIFT|'||e.dir||'%')
  on conflict do nothing;

  -- 5) SUBSTITUTION clusters (group by TO-category)
  with pairs as (
    select
      id,
      split_part(subject_key,' -> ',2) as to_cat
    from cdp_insight_events
    where tenant_id = p_tenant_id and as_of_date = p_as_of_date
      and insight_code = 'PD07'
      and subject_type = 'category_pair'
  )
  insert into cdp_insight_clusters
  (tenant_id, as_of_date, cluster_type, cluster_key, title, narrative, severity, confidence, metrics, evidence)
  select
    p_tenant_id,
    p_as_of_date,
    'SUBSTITUTION',
    'SUBSTITUTION|TO|'||p.to_cat,
    'Xu hướng thay thế: khách chuyển sang '||p.to_cat,
    'Nhiều cặp thay thế cho thấy khách đang dịch chuyển sang một nhóm sản phẩm đích. Cần xem xét nguyên nhân: nhu cầu, mix, pricing hoặc assortment.',
    'MEDIUM',
    0.6500,
    jsonb_build_object('to_category', p.to_cat),
    jsonb_build_object('note','cluster_by_to_category')
  from (select distinct to_cat from pairs) p
  on conflict (tenant_id, as_of_date, cluster_key) do nothing;

  insert into cdp_insight_cluster_members(tenant_id, cluster_id, insight_event_id)
  select
    p_tenant_id,
    c.id,
    e.id
  from cdp_insight_clusters c
  join (
    select id, split_part(subject_key,' -> ',2) as to_cat
    from cdp_insight_events
    where tenant_id = p_tenant_id and as_of_date = p_as_of_date
      and insight_code = 'PD07' and subject_type='category_pair'
  ) e
    on c.cluster_key = ('SUBSTITUTION|TO|'||e.to_cat)
  where c.tenant_id = p_tenant_id and c.as_of_date = p_as_of_date and c.cluster_type='SUBSTITUTION'
  on conflict do nothing;

end;
$$;

-- 8) FUNCTION: Auto-create Decisions from Clusters
-- =============================================
create or replace function cdp_auto_decisions_from_clusters(
  p_tenant_id uuid,
  p_as_of_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_decision_id uuid;
  v_owner_role text;
  v_priority text;
  v_due date;
begin
  for c in
    select *
    from cdp_insight_clusters
    where tenant_id = p_tenant_id and as_of_date = p_as_of_date
  loop
    -- Owner/priority heuristics
    if c.cluster_type in ('MACRO_WEAKENING','CONCENTRATION') then
      v_owner_role := 'CEO';
      v_priority := 'P0';
      v_due := (p_as_of_date + interval '7 days')::date;
    elsif c.cluster_type in ('BASKET_COLLAPSE','SUBSTITUTION') then
      v_owner_role := 'COO';
      v_priority := case when c.severity='HIGH' then 'P0' else 'P1' end;
      v_due := (p_as_of_date + interval '10 days')::date;
    else
      v_owner_role := 'CEO';
      v_priority := 'P1';
      v_due := (p_as_of_date + interval '10 days')::date;
    end if;

    -- Dedupe by cluster_key
    select decision_id into v_decision_id
    from cdp_decision_cluster_map
    where tenant_id = c.tenant_id and cluster_key = c.cluster_key;

    if v_decision_id is null then
      insert into cdp_decision_cards
      (tenant_id, source_type, source_ref, title, summary, problem_statement, category,
       severity, priority, owner_role, decision_due, status)
      values
      (
        c.tenant_id,
        'insight_cluster',
        jsonb_build_object('cluster_type', c.cluster_type, 'cluster_id', c.id),
        c.title,
        c.narrative,
        'Cần xem xét vấn đề theo cụm insight: '||c.cluster_type||
        '. Cụm này đại diện cho thay đổi có ý nghĩa trong nhu cầu mua hàng và có thể ảnh hưởng tới doanh thu, mix sản phẩm và cấu trúc giỏ hàng.',
        'PRODUCT_DEMAND',
        c.severity,
        v_priority,
        v_owner_role,
        v_due,
        'OPEN'
      )
      returning id into v_decision_id;

      insert into cdp_decision_cluster_map(tenant_id, cluster_key, decision_id)
      values (c.tenant_id, c.cluster_key, v_decision_id)
      on conflict do nothing;
    end if;

    -- Link all member events as evidence
    insert into cdp_decision_insight_links(tenant_id, decision_id, insight_event_id, link_type)
    select
      m.tenant_id, v_decision_id, m.insight_event_id, 'EVIDENCE'
    from cdp_insight_cluster_members m
    where m.tenant_id = c.tenant_id and m.cluster_id = c.id
    on conflict do nothing;

  end loop;
end;
$$;

-- 9) VIEW: Cluster summary with member counts
-- =============================================
create or replace view v_cdp_insight_clusters_summary as
select
  c.id,
  c.tenant_id,
  c.as_of_date,
  c.cluster_type,
  c.cluster_key,
  c.title,
  c.narrative,
  c.severity,
  c.confidence,
  c.metrics,
  c.evidence,
  c.created_at,
  coalesce(
    (select count(*) from cdp_insight_cluster_members m where m.cluster_id = c.id),
    0
  )::int as member_count,
  (select d.decision_id from cdp_decision_cluster_map d 
   where d.tenant_id = c.tenant_id and d.cluster_key = c.cluster_key) as linked_decision_id
from cdp_insight_clusters c;

-- 10) VIEW: Data quality latest snapshot
-- =============================================
create or replace view v_cdp_data_quality_latest as
select distinct on (tenant_id)
  tenant_id,
  as_of_date,
  orders_total,
  orders_missing_customer,
  order_items_total,
  order_items_unmapped_category,
  order_items_unmapped_sku,
  duplicate_orders,
  duplicate_items,
  latest_order_date,
  data_lag_days,
  quality_score,
  flags,
  created_at
from cdp_data_quality_daily
order by tenant_id, as_of_date desc;

-- 11) Update orchestration function to include clustering
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
  v_clusters_created int;
  v_quality_score numeric;
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

  -- Step 3: Compute data quality
  perform cdp_compute_data_quality_daily(p_tenant_id, p_as_of_date);

  -- Step 4: Build evidence packs
  perform cdp_build_evidence_pack_product_demand(p_tenant_id, p_as_of_date);

  -- Step 5: Attach data quality to insights
  perform cdp_attach_data_quality_to_insights(p_tenant_id, p_as_of_date);

  -- Step 6: Build clusters
  perform cdp_build_product_demand_clusters(p_tenant_id, p_as_of_date);

  -- Step 7: Auto-create decisions from clusters
  perform cdp_auto_decisions_from_clusters(p_tenant_id, p_as_of_date);

  -- Count after
  select count(*) into v_insights_after
  from cdp_insight_events
  where tenant_id = p_tenant_id and as_of_date = p_as_of_date;
  
  select count(*) into v_decisions_after
  from cdp_decision_cards
  where tenant_id = p_tenant_id and status = 'OPEN';

  select count(*) into v_clusters_created
  from cdp_insight_clusters
  where tenant_id = p_tenant_id and as_of_date = p_as_of_date;

  select quality_score into v_quality_score
  from cdp_data_quality_daily
  where tenant_id = p_tenant_id and as_of_date = p_as_of_date;

  return jsonb_build_object(
    'tenant_id', p_tenant_id,
    'as_of_date', p_as_of_date,
    'insights_detected', v_insights_after - v_insights_before,
    'clusters_created', v_clusters_created,
    'decisions_created', v_decisions_after - v_decisions_before,
    'total_open_decisions', v_decisions_after,
    'data_quality_score', v_quality_score
  );
end;
$$;