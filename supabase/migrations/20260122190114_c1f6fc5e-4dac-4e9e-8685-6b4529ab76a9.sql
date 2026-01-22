
-- =========================================
-- CDP PRODUCT & DEMAND INSIGHT PIPELINE
-- Extends existing cdp_insight_registry with PD01-PD25
-- =========================================

-- 1) SEED FUNCTION: Insert Product & Demand registry entries
create or replace function cdp_seed_product_demand_registry(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert PD01-PD25 into existing cdp_insight_registry
  -- Using insight_code as primary key (global, not per-tenant in current schema)
  insert into cdp_insight_registry (insight_code, name, category, population_type, default_population_ref, window_days, baseline_days, threshold_json, cooldown_days, is_enabled)
  values
  -- Demand share shift
  ('PD01', 'Tỷ trọng chi tiêu tăng mạnh theo nhóm sản phẩm', 'MIX', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"share_delta_abs":0.05,"min_sales_cur":30000000}'::jsonb, 14, true),
  ('PD02', 'Tỷ trọng chi tiêu giảm mạnh theo nhóm sản phẩm', 'MIX', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"share_delta_abs":0.05,"min_sales_cur":30000000}'::jsonb, 14, true),
  ('PD03', 'Doanh thu nhóm sản phẩm tăng mạnh (volume)', 'VALUE', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"sales_change_abs":0.20,"min_sales_base":20000000}'::jsonb, 14, true),
  ('PD04', 'Doanh thu nhóm sản phẩm giảm mạnh (volume)', 'VALUE', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"sales_change_abs":0.20,"min_sales_base":20000000}'::jsonb, 14, true),
  -- Concentration / dependency
  ('PD05', 'Rủi ro tập trung nhu cầu: Top nhóm sản phẩm chiếm tỷ trọng quá lớn', 'RISK', 'ALL', '{"type":"tenant"}'::jsonb, 60, 60, '{"topk":3,"topk_share_min":0.60}'::jsonb, 21, true),
  ('PD06', 'Suy giảm long-tail: phần còn lại co cụm nhanh', 'MIX', 'ALL', '{"type":"tenant"}'::jsonb, 60, 60, '{"others_share_drop":0.07}'::jsonb, 21, true),
  -- Substitution
  ('PD07', 'Khách đang chuyển nhóm sản phẩm (Substitution) theo cặp', 'MIX', 'ALL', '{"type":"category_pair"}'::jsonb, 60, 60, '{"min_customers_shift":50}'::jsonb, 14, true),
  ('PD08', 'Substitution mạnh trong nhóm khách giá trị cao', 'MIX', 'SEGMENT', '{"type":"category_pair","segment":"high_value"}'::jsonb, 60, 60, '{"min_customers_shift":30,"share_delta_abs":0.05}'::jsonb, 14, true),
  -- Basket structure
  ('PD09', 'Giỏ hàng kém đa dạng hơn: số nhóm sản phẩm/đơn giảm', 'MIX', 'ALL', '{"type":"basket"}'::jsonb, 60, 60, '{"avg_cat_delta":-0.20}'::jsonb, 14, true),
  ('PD10', 'Cross-category giảm: đơn hàng ít mua nhiều nhóm cùng lúc', 'MIX', 'ALL', '{"type":"basket"}'::jsonb, 60, 60, '{"cross_rate_delta":-0.05}'::jsonb, 14, true),
  ('PD11', 'AOV giảm cùng với co cụm giỏ hàng', 'VALUE', 'ALL', '{"type":"basket"}'::jsonb, 60, 60, '{"aov_change_abs":0.10,"avg_cat_delta":-0.10}'::jsonb, 21, true),
  -- Volatility
  ('PD12', 'Nhu cầu biến động mạnh: share theo ngày thiếu ổn định', 'RISK', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"share_stddev_min":0.035}'::jsonb, 21, true),
  -- Customer counts
  ('PD13', 'Số khách mua nhóm sản phẩm giảm mạnh', 'VALUE', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"cust_change_abs":0.20,"min_customers_base":200}'::jsonb, 14, true),
  ('PD14', 'Số khách mua nhóm sản phẩm tăng mạnh', 'VALUE', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"cust_change_abs":0.20,"min_customers_base":200}'::jsonb, 14, true),
  -- Segment-category
  ('PD15', 'Tỷ trọng chi tiêu thay đổi theo từng segment', 'MIX', 'SEGMENT', '{"type":"segment_category"}'::jsonb, 60, 60, '{"share_delta_abs":0.05,"min_sales_cur":15000000}'::jsonb, 14, true),
  -- Role change
  ('PD16', 'Nhóm sản phẩm mới nổi lên thành nhóm dẫn dắt', 'MIX', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"topk":3}'::jsonb, 21, true),
  ('PD17', 'Nhóm sản phẩm dẫn dắt cũ tụt vai trò', 'RISK', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"topk_base":3,"topk_cur":5}'::jsonb, 21, true),
  -- Extended (disabled by default)
  ('PD18', 'Demand shift trong kênh bán', 'MIX', 'ALL', '{"type":"channel_category"}'::jsonb, 60, 60, '{"share_delta_abs":0.05}'::jsonb, 14, false),
  ('PD19', 'Dịch chuyển nhu cầu theo nhóm giá/price band', 'MIX', 'ALL', '{"type":"price_band"}'::jsonb, 60, 60, '{"share_delta_abs":0.05}'::jsonb, 21, false),
  ('PD20', 'Tăng phụ thuộc khuyến mãi theo nhóm sản phẩm', 'RISK', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"disc_rate_delta":0.05}'::jsonb, 21, false),
  ('PD21', 'Nhóm sản phẩm có xu hướng tăng hoàn trả', 'RISK', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"return_rate_delta":0.03}'::jsonb, 14, false),
  ('PD22', 'Giảm mua lặp lại theo nhóm sản phẩm', 'TIMING', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"repeat_rate_delta":-0.05}'::jsonb, 21, false),
  ('PD23', 'Nhóm sản phẩm kết thúc hành trình mua tăng', 'RISK', 'ALL', '{"type":"category"}'::jsonb, 60, 60, '{"share_delta_abs":0.05}'::jsonb, 21, false),
  ('PD24', 'Dịch chuyển nhu cầu theo mùa', 'MIX', 'ALL', '{"type":"seasonal"}'::jsonb, 60, 60, '{"share_delta_abs":0.05}'::jsonb, 60, false),
  ('PD25', 'Tổng demand co lại ở nhiều nhóm sản phẩm cùng lúc', 'RISK', 'ALL', '{"type":"multi_category"}'::jsonb, 60, 60, '{"min_categories_down":4,"sales_change_abs":0.15}'::jsonb, 14, true)
  on conflict (insight_code) do update
  set name = excluded.name,
      category = excluded.category,
      threshold_json = excluded.threshold_json,
      cooldown_days = excluded.cooldown_days,
      is_enabled = excluded.is_enabled;
end;
$$;

-- 2) PRODUCT DEMAND DETECTION FUNCTION
create or replace function cdp_run_product_demand_insights(
  p_tenant_id uuid,
  p_as_of_date date default current_date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share_delta_abs numeric := 0.05;
  v_min_sales_cur numeric := 30000000;
  v_sales_change_abs numeric := 0.20;
  v_min_sales_base numeric := 20000000;
  v_topk int := 3;
  v_topk_share_min numeric := 0.60;
  v_min_customers_shift int := 50;
  v_avg_cat_delta numeric := -0.20;
  v_cross_rate_delta numeric := -0.05;
  v_aov_change_abs numeric := 0.10;
  v_share_stddev_min numeric := 0.035;
  v_cust_change_abs numeric := 0.20;
  v_min_customers_base int := 200;
  v_run_id uuid;
  v_inserted_count int := 0;
begin
  -- Create a run record
  insert into cdp_insight_runs (tenant_id, as_of_date, window_days, baseline_days, status)
  values (p_tenant_id, p_as_of_date, 60, 60, 'RUNNING')
  returning id into v_run_id;

  -- A) DEMAND SHARE SHIFT: PD01/PD02
  insert into cdp_insight_events
  (tenant_id, insight_code, run_id, as_of_date, population_type, population_ref, metric_snapshot, impact_snapshot, headline, n_customers, cooldown_until)
  select
    s.tenant_id,
    case when s.share_delta > 0 then 'PD01' else 'PD02' end,
    v_run_id,
    p_as_of_date,
    'ALL',
    jsonb_build_object('category', s.category),
    jsonb_build_object(
      'sales_cur', s.sales_cur, 'sales_base', s.sales_base,
      'share_cur', s.share_cur, 'share_base', s.share_base,
      'share_delta', s.share_delta, 'sales_change_ratio', s.sales_change_ratio
    ),
    jsonb_build_object('severity', case when s.share_delta < 0 then 'HIGH' else 'MEDIUM' end),
    case when s.share_delta > 0 
      then 'Tỷ trọng chi tiêu tăng ở nhóm ' || s.category
      else 'Tỷ trọng chi tiêu giảm ở nhóm ' || s.category
    end,
    coalesce(s.customers_cur, 0)::int,
    (p_as_of_date + interval '14 days')::date
  from mv_cdp_category_share_60d_vs_prev60d s
  where s.tenant_id = p_tenant_id
    and abs(s.share_delta) >= v_share_delta_abs
    and coalesce(s.sales_cur, 0) >= v_min_sales_cur
    and not exists (
      select 1 from cdp_insight_events e
      where e.tenant_id = p_tenant_id
        and e.insight_code in ('PD01', 'PD02')
        and e.population_ref->>'category' = s.category
        and e.cooldown_until >= p_as_of_date
    );
  
  get diagnostics v_inserted_count = row_count;

  -- B) VOLUME SHIFT: PD03/PD04
  insert into cdp_insight_events
  (tenant_id, insight_code, run_id, as_of_date, population_type, population_ref, metric_snapshot, impact_snapshot, headline, n_customers, cooldown_until)
  select
    s.tenant_id,
    case when s.sales_change_ratio >= v_sales_change_abs then 'PD03' else 'PD04' end,
    v_run_id,
    p_as_of_date,
    'ALL',
    jsonb_build_object('category', s.category),
    jsonb_build_object('sales_cur', s.sales_cur, 'sales_base', s.sales_base, 'sales_change_ratio', s.sales_change_ratio),
    jsonb_build_object('severity', case when s.sales_change_ratio <= -v_sales_change_abs then 'HIGH' else 'MEDIUM' end),
    case when s.sales_change_ratio >= v_sales_change_abs 
      then 'Doanh thu nhóm ' || s.category || ' tăng mạnh so với baseline'
      else 'Doanh thu nhóm ' || s.category || ' giảm mạnh so với baseline'
    end,
    coalesce(s.customers_cur, 0)::int,
    (p_as_of_date + interval '14 days')::date
  from mv_cdp_category_share_60d_vs_prev60d s
  where s.tenant_id = p_tenant_id
    and s.sales_base >= v_min_sales_base
    and s.sales_change_ratio is not null
    and abs(s.sales_change_ratio) >= v_sales_change_abs
    and not exists (
      select 1 from cdp_insight_events e
      where e.tenant_id = p_tenant_id
        and e.insight_code in ('PD03', 'PD04')
        and e.population_ref->>'category' = s.category
        and e.cooldown_until >= p_as_of_date
    );

  -- C) CONCENTRATION RISK: PD05
  insert into cdp_insight_events
  (tenant_id, insight_code, run_id, as_of_date, population_type, population_ref, metric_snapshot, impact_snapshot, headline, n_customers, cooldown_until)
  with ranked as (
    select tenant_id, category, share_cur,
           dense_rank() over (partition by tenant_id order by share_cur desc) as rnk
    from mv_cdp_category_share_60d_vs_prev60d
    where tenant_id = p_tenant_id
  ),
  topk as (
    select tenant_id,
           sum(share_cur) as topk_share,
           jsonb_agg(jsonb_build_object('category', category, 'share', share_cur) order by share_cur desc) as topk_list
    from ranked where rnk <= v_topk
    group by tenant_id
  )
  select t.tenant_id, 'PD05', v_run_id, p_as_of_date, 'ALL',
    jsonb_build_object('type', 'tenant'),
    jsonb_build_object('topk', v_topk, 'topk_share', t.topk_share, 'topk_list', t.topk_list),
    jsonb_build_object('severity', 'HIGH'),
    'Rủi ro tập trung nhu cầu: Top ' || v_topk || ' nhóm sản phẩm chiếm tỷ trọng lớn',
    0,
    (p_as_of_date + interval '21 days')::date
  from topk t
  where t.topk_share >= v_topk_share_min
    and not exists (
      select 1 from cdp_insight_events e
      where e.tenant_id = p_tenant_id and e.insight_code = 'PD05'
        and e.cooldown_until >= p_as_of_date
    );

  -- D) SUBSTITUTION: PD07
  insert into cdp_insight_events
  (tenant_id, insight_code, run_id, as_of_date, population_type, population_ref, metric_snapshot, impact_snapshot, headline, n_customers, cooldown_until)
  select
    m.tenant_id, 'PD07', v_run_id, p_as_of_date, 'ALL',
    jsonb_build_object('from', m.base_category, 'to', m.cur_category),
    jsonb_build_object('customers_shifted', m.customers_shifted),
    jsonb_build_object('severity', 'MEDIUM'),
    'Khách đang chuyển nhóm sản phẩm: ' || m.base_category || ' → ' || m.cur_category,
    m.customers_shifted::int,
    (p_as_of_date + interval '14 days')::date
  from mv_cdp_category_substitution_matrix_60d m
  where m.tenant_id = p_tenant_id
    and m.customers_shifted >= v_min_customers_shift
    and not exists (
      select 1 from cdp_insight_events e
      where e.tenant_id = p_tenant_id and e.insight_code = 'PD07'
        and e.population_ref->>'from' = m.base_category
        and e.population_ref->>'to' = m.cur_category
        and e.cooldown_until >= p_as_of_date
    );

  -- E) BASKET STRUCTURE: PD09/PD10/PD11
  insert into cdp_insight_events
  (tenant_id, insight_code, run_id, as_of_date, population_type, population_ref, metric_snapshot, impact_snapshot, headline, n_customers, cooldown_until)
  select b.tenant_id, 'PD09', v_run_id, p_as_of_date, 'ALL',
    jsonb_build_object('type', 'basket'),
    jsonb_build_object('avg_cat_cur', b.avg_cat_cur, 'avg_cat_base', b.avg_cat_base, 'avg_cat_delta', b.avg_cat_delta),
    jsonb_build_object('severity', 'MEDIUM'),
    'Giỏ hàng kém đa dạng hơn: số nhóm sản phẩm/đơn giảm',
    0,
    (p_as_of_date + interval '14 days')::date
  from mv_cdp_basket_structure_60d_vs_prev60d b
  where b.tenant_id = p_tenant_id and b.avg_cat_delta <= v_avg_cat_delta
    and not exists (
      select 1 from cdp_insight_events e
      where e.tenant_id = p_tenant_id and e.insight_code = 'PD09'
        and e.cooldown_until >= p_as_of_date
    );

  insert into cdp_insight_events
  (tenant_id, insight_code, run_id, as_of_date, population_type, population_ref, metric_snapshot, impact_snapshot, headline, n_customers, cooldown_until)
  select b.tenant_id, 'PD10', v_run_id, p_as_of_date, 'ALL',
    jsonb_build_object('type', 'basket'),
    jsonb_build_object('cross_rate_cur', b.cross_rate_cur, 'cross_rate_base', b.cross_rate_base, 'cross_rate_delta', b.cross_rate_delta),
    jsonb_build_object('severity', 'MEDIUM'),
    'Cross-category giảm: đơn hàng ít mua nhiều nhóm cùng lúc',
    0,
    (p_as_of_date + interval '14 days')::date
  from mv_cdp_basket_structure_60d_vs_prev60d b
  where b.tenant_id = p_tenant_id and b.cross_rate_delta <= v_cross_rate_delta
    and not exists (
      select 1 from cdp_insight_events e
      where e.tenant_id = p_tenant_id and e.insight_code = 'PD10'
        and e.cooldown_until >= p_as_of_date
    );

  insert into cdp_insight_events
  (tenant_id, insight_code, run_id, as_of_date, population_type, population_ref, metric_snapshot, impact_snapshot, headline, n_customers, cooldown_until)
  select b.tenant_id, 'PD11', v_run_id, p_as_of_date, 'ALL',
    jsonb_build_object('type', 'basket'),
    jsonb_build_object('aov_cur', b.aov_cur, 'aov_base', b.aov_base, 'aov_change_ratio', b.aov_change_ratio, 'avg_cat_delta', b.avg_cat_delta),
    jsonb_build_object('severity', 'HIGH'),
    'AOV giảm đồng thời với co cụm giỏ hàng',
    0,
    (p_as_of_date + interval '21 days')::date
  from mv_cdp_basket_structure_60d_vs_prev60d b
  where b.tenant_id = p_tenant_id
    and b.aov_change_ratio is not null
    and abs(b.aov_change_ratio) >= v_aov_change_abs
    and b.avg_cat_delta <= -0.10
    and not exists (
      select 1 from cdp_insight_events e
      where e.tenant_id = p_tenant_id and e.insight_code = 'PD11'
        and e.cooldown_until >= p_as_of_date
    );

  -- F) MULTI-CATEGORY DOWN: PD25
  insert into cdp_insight_events
  (tenant_id, insight_code, run_id, as_of_date, population_type, population_ref, metric_snapshot, impact_snapshot, headline, n_customers, cooldown_until)
  with downs as (
    select tenant_id,
           count(*) filter (where sales_change_ratio <= -0.15) as categories_down,
           jsonb_agg(jsonb_build_object('category', category, 'sales_change_ratio', sales_change_ratio)
                    order by sales_change_ratio asc) filter (where sales_change_ratio <= -0.15) as down_list
    from mv_cdp_category_share_60d_vs_prev60d
    where tenant_id = p_tenant_id and sales_change_ratio is not null
    group by tenant_id
  )
  select d.tenant_id, 'PD25', v_run_id, p_as_of_date, 'ALL',
    jsonb_build_object('type', 'multi_category'),
    jsonb_build_object('categories_down', d.categories_down, 'down_list', coalesce(d.down_list, '[]'::jsonb)),
    jsonb_build_object('severity', 'HIGH'),
    'Nhu cầu co lại trên nhiều nhóm sản phẩm cùng lúc',
    0,
    (p_as_of_date + interval '14 days')::date
  from downs d
  where d.categories_down >= 4
    and not exists (
      select 1 from cdp_insight_events e
      where e.tenant_id = p_tenant_id and e.insight_code = 'PD25'
        and e.cooldown_until >= p_as_of_date
    );

  -- Update run status
  update cdp_insight_runs
  set status = 'SUCCESS',
      stats = jsonb_build_object('events_created', v_inserted_count)
  where id = v_run_id;

  -- Return count
  select count(*) into v_inserted_count
  from cdp_insight_events
  where run_id = v_run_id;

  return v_inserted_count;
end;
$$;

-- 3) Seed the Product & Demand insights into registry
select cdp_seed_product_demand_registry(null);
