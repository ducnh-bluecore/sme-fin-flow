-- Drop duplicate function first
DROP FUNCTION IF EXISTS public.recalculate_product_metrics(uuid, text);
DROP FUNCTION IF EXISTS public.recalculate_product_metrics(uuid, text, integer);

-- ============================================================================
-- PHASE C: Fix SSOT Violations in SQL Functions
-- cdp_order_items columns: qty, line_revenue, line_cogs, line_margin
-- cdp_orders columns: order_at, gross_revenue, net_revenue, cogs
-- ============================================================================

-- 1. cdp_compute_data_quality_daily
CREATE OR REPLACE FUNCTION public.cdp_compute_data_quality_daily(p_tenant_id uuid, p_as_of_date date DEFAULT CURRENT_DATE)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_orders_total bigint; v_orders_missing_customer bigint; v_items_total bigint;
  v_unmapped_category bigint; v_unmapped_sku bigint; v_latest_order_date date; v_data_lag int;
  v_score numeric(5,2); v_flags jsonb := '{}'::jsonb;
  w_missing_customer numeric := 25; w_unmapped_category numeric := 30; w_unmapped_sku numeric := 10;
  w_data_lag numeric := 20; w_dup numeric := 15;
  v_dup_orders bigint := 0; v_dup_items bigint := 0;
  v_missing_customer_rate numeric; v_unmapped_category_rate numeric; v_unmapped_sku_rate numeric; v_d0 date;
begin
  v_d0 := (p_as_of_date - interval '60 days')::date;
  select count(*)::bigint, count(*) filter (where customer_id is null)::bigint, max(order_at)::date
  into v_orders_total, v_orders_missing_customer, v_latest_order_date
  from cdp_orders o where o.tenant_id = p_tenant_id
    and o.status in ('confirmed','delivered','shipped','completed','paid') and o.order_at::date >= v_d0;
  select count(*)::bigint, count(*) filter (where category = 'UNMAPPED')::bigint,
    count(*) filter (where sku is null or sku = '')::bigint
  into v_items_total, v_unmapped_category, v_unmapped_sku
  from cdp_order_items i where i.tenant_id = p_tenant_id
    and EXISTS (SELECT 1 FROM cdp_orders o WHERE o.id = i.order_id AND o.order_at >= v_d0);
  with g as (select order_id, sku, qty, line_revenue, count(*) as c from cdp_order_items
    where tenant_id = p_tenant_id group by order_id, sku, qty, line_revenue having count(*) > 1)
  select coalesce(sum(c - 1),0)::bigint into v_dup_items from g;
  if v_latest_order_date is null then v_data_lag := null; else v_data_lag := (p_as_of_date - v_latest_order_date); end if;
  v_missing_customer_rate := case when v_orders_total > 0 then v_orders_missing_customer::numeric / v_orders_total else 0 end;
  v_unmapped_category_rate := case when v_items_total > 0 then v_unmapped_category::numeric / v_items_total else 0 end;
  v_unmapped_sku_rate := case when v_items_total > 0 then v_unmapped_sku::numeric / v_items_total else 0 end;
  if v_missing_customer_rate >= 0.01 then v_flags := v_flags || jsonb_build_object('missing_customer_rate', round(v_missing_customer_rate::numeric, 4)); end if;
  if v_unmapped_category_rate >= 0.02 then v_flags := v_flags || jsonb_build_object('unmapped_category_rate', round(v_unmapped_category_rate::numeric, 4)); end if;
  if v_unmapped_sku_rate >= 0.01 then v_flags := v_flags || jsonb_build_object('unmapped_sku_rate', round(v_unmapped_sku_rate::numeric, 4)); end if;
  if v_data_lag is not null and v_data_lag >= 2 then v_flags := v_flags || jsonb_build_object('data_lag_days', v_data_lag); end if;
  if v_dup_items >= 50 then v_flags := v_flags || jsonb_build_object('duplicate_items', v_dup_items); end if;
  v_score := 100 - (w_missing_customer * least(1, v_missing_customer_rate / 0.02))
    - (w_unmapped_category * least(1, v_unmapped_category_rate / 0.05))
    - (w_unmapped_sku * least(1, v_unmapped_sku_rate / 0.03))
    - (w_data_lag * least(1, coalesce(v_data_lag,0)::numeric / 7))
    - (w_dup * least(1, v_dup_items::numeric / 500));
  v_score := greatest(0, least(100, v_score));
  insert into cdp_data_quality_daily (tenant_id, as_of_date, orders_total, orders_missing_customer, order_items_total,
   order_items_unmapped_category, order_items_unmapped_sku, duplicate_orders, duplicate_items,
   latest_order_date, data_lag_days, quality_score, flags)
  values (p_tenant_id, p_as_of_date, coalesce(v_orders_total,0), coalesce(v_orders_missing_customer,0), coalesce(v_items_total,0),
   coalesce(v_unmapped_category,0), coalesce(v_unmapped_sku,0), coalesce(v_dup_orders,0), coalesce(v_dup_items,0),
   v_latest_order_date, v_data_lag, v_score, v_flags)
  on conflict (tenant_id, as_of_date) do update
  set orders_total = excluded.orders_total, orders_missing_customer = excluded.orders_missing_customer,
      order_items_total = excluded.order_items_total, order_items_unmapped_category = excluded.order_items_unmapped_category,
      order_items_unmapped_sku = excluded.order_items_unmapped_sku, duplicate_orders = excluded.duplicate_orders,
      duplicate_items = excluded.duplicate_items, latest_order_date = excluded.latest_order_date,
      data_lag_days = excluded.data_lag_days, quality_score = excluded.quality_score, flags = excluded.flags, created_at = now();
end;
$function$;

-- 2. compute_central_metric_facts
CREATE OR REPLACE FUNCTION public.compute_central_metric_facts(p_tenant_id uuid, p_period_start date DEFAULT '2024-07-01'::date, p_period_end date DEFAULT CURRENT_DATE)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_inserted INTEGER := 0;
BEGIN
  DELETE FROM central_metric_facts WHERE tenant_id = p_tenant_id;
  DELETE FROM central_metric_facts_summary WHERE tenant_id = p_tenant_id;
  INSERT INTO central_metric_facts (tenant_id, grain_type, grain_id, grain_name, revenue, cost, profit, margin_percent, quantity, order_count, period_start, period_end)
  SELECT p_tenant_id, 'sku', COALESCE(coi.sku, 'UNKNOWN'), COALESCE(coi.product_name, coi.sku),
    SUM(COALESCE(coi.line_revenue, 0)), SUM(COALESCE(coi.line_cogs, coi.line_revenue * 0.6)),
    SUM(COALESCE(coi.line_margin, coi.line_revenue * 0.4)),
    CASE WHEN SUM(coi.line_revenue) > 0 THEN SUM(COALESCE(coi.line_margin, 0)) / SUM(coi.line_revenue) * 100 ELSE 0 END,
    SUM(COALESCE(coi.qty, 1))::INT, COUNT(DISTINCT co.id)::INT, p_period_start, p_period_end
  FROM cdp_order_items coi JOIN cdp_orders co ON coi.order_id = co.id
  WHERE co.tenant_id = p_tenant_id AND co.order_at BETWEEN p_period_start AND p_period_end AND co.status NOT IN ('cancelled', 'returned')
  GROUP BY coi.sku, coi.product_name;
  INSERT INTO central_metric_facts (tenant_id, grain_type, grain_id, grain_name, revenue, cost, profit, margin_percent, quantity, order_count, period_start, period_end)
  SELECT p_tenant_id, 'channel', COALESCE(co.channel, 'direct'), INITCAP(COALESCE(co.channel, 'Direct')),
    SUM(COALESCE(co.net_revenue, co.gross_revenue * 0.9)), SUM(COALESCE(co.cogs, co.gross_revenue * 0.6)),
    SUM(COALESCE(co.gross_margin, co.gross_revenue * 0.3)),
    CASE WHEN SUM(co.gross_revenue) > 0 THEN SUM(COALESCE(co.gross_margin, 0)) / SUM(co.gross_revenue) * 100 ELSE 0 END,
    SUM(COALESCE(co.total_quantity, 1))::INT, COUNT(*)::INT, p_period_start, p_period_end
  FROM cdp_orders co WHERE co.tenant_id = p_tenant_id AND co.order_at BETWEEN p_period_start AND p_period_end AND co.status NOT IN ('cancelled', 'returned')
  GROUP BY co.channel;
  INSERT INTO central_metric_facts (tenant_id, grain_type, grain_id, grain_name, revenue, cost, profit, margin_percent, quantity, order_count, period_start, period_end)
  SELECT p_tenant_id, 'category', COALESCE(coi.category, 'uncategorized'), INITCAP(COALESCE(coi.category, 'Uncategorized')),
    SUM(COALESCE(coi.line_revenue, 0)), SUM(COALESCE(coi.line_cogs, coi.line_revenue * 0.6)),
    SUM(COALESCE(coi.line_margin, coi.line_revenue * 0.4)),
    CASE WHEN SUM(coi.line_revenue) > 0 THEN SUM(COALESCE(coi.line_margin, 0)) / SUM(coi.line_revenue) * 100 ELSE 0 END,
    SUM(COALESCE(coi.qty, 1))::INT, COUNT(DISTINCT co.id)::INT, p_period_start, p_period_end
  FROM cdp_order_items coi JOIN cdp_orders co ON coi.order_id = co.id
  WHERE co.tenant_id = p_tenant_id AND co.order_at BETWEEN p_period_start AND p_period_end AND co.status NOT IN ('cancelled', 'returned')
  GROUP BY coi.category;
  INSERT INTO central_metric_facts (tenant_id, grain_type, grain_id, grain_name, revenue, cost, profit, margin_percent, quantity, order_count, period_start, period_end)
  SELECT p_tenant_id, 'store', COALESCE(co.shop_id, 'UNKNOWN'), 'Store ' || COALESCE(co.shop_id, 'Unknown'),
    SUM(COALESCE(co.net_revenue, co.gross_revenue * 0.9)), SUM(COALESCE(co.cogs, co.gross_revenue * 0.6)),
    SUM(COALESCE(co.gross_margin, co.gross_revenue * 0.3)),
    CASE WHEN SUM(co.gross_revenue) > 0 THEN SUM(COALESCE(co.gross_margin, 0)) / SUM(co.gross_revenue) * 100 ELSE 0 END,
    SUM(COALESCE(co.total_quantity, 1))::INT, COUNT(*)::INT, p_period_start, p_period_end
  FROM cdp_orders co WHERE co.tenant_id = p_tenant_id AND co.order_at BETWEEN p_period_start AND p_period_end AND co.status NOT IN ('cancelled', 'returned')
  GROUP BY co.shop_id;
  INSERT INTO central_metric_facts (tenant_id, grain_type, grain_id, grain_name, revenue, cost, profit, margin_percent, quantity, order_count, period_start, period_end)
  SELECT p_tenant_id, 'customer', COALESCE(co.customer_id::text, 'UNKNOWN'), 'Customer ' || COALESCE(co.customer_id::text, 'Unknown'),
    SUM(COALESCE(co.net_revenue, co.gross_revenue * 0.9)), SUM(COALESCE(co.cogs, co.gross_revenue * 0.6)),
    SUM(COALESCE(co.gross_margin, co.gross_revenue * 0.3)),
    CASE WHEN SUM(co.gross_revenue) > 0 THEN SUM(COALESCE(co.gross_margin, 0)) / SUM(co.gross_revenue) * 100 ELSE 0 END,
    SUM(COALESCE(co.total_quantity, 1))::INT, COUNT(*)::INT, p_period_start, p_period_end
  FROM cdp_orders co WHERE co.tenant_id = p_tenant_id AND co.order_at BETWEEN p_period_start AND p_period_end AND co.status NOT IN ('cancelled', 'returned')
  GROUP BY co.customer_id;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  INSERT INTO central_metric_facts_summary (tenant_id, total_revenue, total_cost, total_profit, avg_margin_percent, period_start, period_end)
  SELECT p_tenant_id, SUM(revenue), SUM(cost), SUM(profit), AVG(margin_percent), p_period_start, p_period_end
  FROM central_metric_facts WHERE tenant_id = p_tenant_id;
  RETURN v_inserted;
END;
$function$;

-- 3. detect_cross_domain_variance
CREATE OR REPLACE FUNCTION public.detect_cross_domain_variance(p_tenant_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_alerts_created INTEGER := 0; v_fdp_revenue NUMERIC; v_cdp_revenue NUMERIC; v_variance_percent NUMERIC;
BEGIN
  SELECT COALESCE(SUM(gross_revenue), 0) INTO v_fdp_revenue FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= CURRENT_DATE - INTERVAL '30 days';
  SELECT COALESCE(SUM(projected_revenue), 0) INTO v_cdp_revenue FROM cross_module_revenue_forecast WHERE tenant_id = p_tenant_id AND year = EXTRACT(YEAR FROM CURRENT_DATE) AND month = EXTRACT(MONTH FROM CURRENT_DATE);
  IF v_cdp_revenue > 0 THEN
    v_variance_percent := ABS((v_fdp_revenue - v_cdp_revenue) / v_cdp_revenue * 100);
    IF v_variance_percent > 20 THEN
      INSERT INTO cross_domain_variance_alerts (tenant_id, alert_type, source_module, target_module, metric_code, expected_value, actual_value, variance_percent, variance_amount, severity, evidence_snapshot)
      VALUES (p_tenant_id, 'REVENUE_VARIANCE', 'CDP', 'FDP', 'NET_REVENUE', v_cdp_revenue, v_fdp_revenue, v_variance_percent, v_fdp_revenue - v_cdp_revenue,
        CASE WHEN v_variance_percent > 30 THEN 'critical' ELSE 'warning' END,
        jsonb_build_object('period', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 'cdp_forecast', v_cdp_revenue, 'fdp_actual', v_fdp_revenue, 'detected_at', now()));
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END IF;
  RETURN v_alerts_created;
END;
$function$;

-- 4. get_sku_master_unit_cost
CREATE OR REPLACE FUNCTION public.get_sku_master_unit_cost(p_tenant_id uuid, p_sku text)
 RETURNS numeric LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT NULLIF(p.cost_price, 0) FROM public.products p WHERE p.tenant_id = p_tenant_id AND p.sku = p_sku LIMIT 1),
    (SELECT CASE WHEN SUM(COALESCE(coi.qty,0)) > 0 THEN SUM(COALESCE(coi.line_cogs,0)) / NULLIF(SUM(COALESCE(coi.qty,0)), 0) ELSE NULL END
      FROM public.cdp_order_items coi WHERE coi.tenant_id = p_tenant_id AND coi.sku = p_sku AND COALESCE(coi.line_cogs,0) > 0));
$function$;

-- 5. mdp_get_costs_for_roas
CREATE OR REPLACE FUNCTION public.mdp_get_costs_for_roas(p_tenant_id uuid, p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer, p_month integer DEFAULT (EXTRACT(month FROM CURRENT_DATE))::integer)
 RETURNS TABLE(cogs_percent numeric, fee_percent numeric, confidence_level text, data_source text, is_cross_module boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM fdp_locked_costs WHERE tenant_id = p_tenant_id AND year = p_year AND month = p_month) THEN
    RETURN QUERY SELECT flc.avg_cogs_percent, flc.avg_fee_percent, 'LOCKED'::TEXT, 'fdp_locked_costs'::TEXT, TRUE
    FROM fdp_locked_costs flc WHERE flc.tenant_id = p_tenant_id AND flc.year = p_year AND flc.month = p_month; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM cdp_order_items coi JOIN cdp_orders co ON coi.order_id = co.id
    WHERE co.tenant_id = p_tenant_id AND coi.line_cogs IS NOT NULL AND EXTRACT(YEAR FROM co.order_at) = p_year AND EXTRACT(MONTH FROM co.order_at) = p_month LIMIT 1) THEN
    RETURN QUERY SELECT COALESCE((SUM(coi.line_cogs) / NULLIF(SUM(co.gross_revenue), 0) * 100), 55)::NUMERIC, 8::NUMERIC, 'OBSERVED'::TEXT, 'cdp_order_items'::TEXT, FALSE
    FROM cdp_orders co JOIN cdp_order_items coi ON coi.order_id = co.id
    WHERE co.tenant_id = p_tenant_id AND EXTRACT(YEAR FROM co.order_at) = p_year AND EXTRACT(MONTH FROM co.order_at) = p_month; RETURN;
  END IF;
  RETURN QUERY SELECT 55::NUMERIC, 12::NUMERIC, 'ESTIMATED'::TEXT, 'industry_benchmark'::TEXT, FALSE;
END;
$function$;

-- 6. recalculate_product_metrics (single version with days_back param)
CREATE OR REPLACE FUNCTION public.recalculate_product_metrics(p_tenant_id uuid, p_sku text DEFAULT NULL::text, p_days_back integer DEFAULT 30)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_count INTEGER := 0; v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT coi.tenant_id, coi.sku, COALESCE(p.name, MAX(coi.product_name), coi.sku) as product_name, p.id as product_id,
      COALESCE(p.selling_price, AVG(coi.unit_price)) as unit_price, COALESCE(p.cost_price, AVG(coi.unit_cogs)) as unit_cost,
      COUNT(DISTINCT coi.order_id) as order_count, SUM(coi.qty) as total_qty, SUM(coi.line_revenue) as total_revenue,
      SUM(coi.line_cogs) as total_cost, SUM(coi.line_margin) as total_profit, MAX(coi.order_id) as last_order
    FROM cdp_order_items coi LEFT JOIN cdp_orders co ON co.id = coi.order_id
    LEFT JOIN products p ON p.tenant_id = coi.tenant_id AND p.sku = coi.sku
    WHERE coi.tenant_id = p_tenant_id AND co.order_at >= NOW() - (p_days_back || ' days')::interval
      AND co.status NOT IN ('cancelled', 'returned') AND (p_sku IS NULL OR coi.sku = p_sku) AND coi.sku IS NOT NULL
    GROUP BY coi.tenant_id, coi.sku, p.id, p.name, p.selling_price, p.cost_price
  LOOP
    DECLARE
      v_gross_margin NUMERIC; v_gross_margin_pct NUMERIC; v_profit_per_unit NUMERIC;
      v_avg_daily_qty NUMERIC; v_is_profitable BOOLEAN; v_profit_status TEXT;
    BEGIN
      v_gross_margin := v_record.unit_price - v_record.unit_cost;
      v_gross_margin_pct := CASE WHEN v_record.unit_price > 0 THEN ((v_record.unit_price - v_record.unit_cost) / v_record.unit_price) * 100 ELSE 0 END;
      v_profit_per_unit := CASE WHEN v_record.total_qty > 0 THEN v_record.total_profit / v_record.total_qty ELSE v_gross_margin END;
      v_avg_daily_qty := v_record.total_qty / p_days_back::numeric;
      v_is_profitable := v_gross_margin_pct >= 10;
      v_profit_status := CASE WHEN v_gross_margin_pct < 0 THEN 'critical' WHEN v_gross_margin_pct < 10 THEN 'marginal' ELSE 'profitable' END;
      INSERT INTO product_metrics (tenant_id, sku, product_name, product_id, unit_price, unit_cost, gross_margin, gross_margin_percent,
        total_orders_30d, total_quantity_30d, total_revenue_30d, total_cost_30d, gross_profit_30d, profit_per_unit,
        avg_daily_quantity, is_profitable, profit_status, last_order_date, last_calculated_at)
      VALUES (v_record.tenant_id, v_record.sku, v_record.product_name, v_record.product_id, v_record.unit_price, v_record.unit_cost,
        v_gross_margin, v_gross_margin_pct, v_record.order_count, v_record.total_qty, v_record.total_revenue, v_record.total_cost,
        v_record.total_profit, v_profit_per_unit, v_avg_daily_qty, v_is_profitable, v_profit_status, NOW(), NOW())
      ON CONFLICT (tenant_id, sku) DO UPDATE SET
        product_name = EXCLUDED.product_name, product_id = EXCLUDED.product_id, unit_price = EXCLUDED.unit_price, unit_cost = EXCLUDED.unit_cost,
        gross_margin = EXCLUDED.gross_margin, gross_margin_percent = EXCLUDED.gross_margin_percent, total_orders_30d = EXCLUDED.total_orders_30d,
        total_quantity_30d = EXCLUDED.total_quantity_30d, total_revenue_30d = EXCLUDED.total_revenue_30d, total_cost_30d = EXCLUDED.total_cost_30d,
        gross_profit_30d = EXCLUDED.gross_profit_30d, profit_per_unit = EXCLUDED.profit_per_unit, avg_daily_quantity = EXCLUDED.avg_daily_quantity,
        is_profitable = EXCLUDED.is_profitable, profit_status = EXCLUDED.profit_status, last_order_date = EXCLUDED.last_order_date,
        last_calculated_at = EXCLUDED.last_calculated_at, updated_at = NOW();
      v_count := v_count + 1;
    END;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- 7. refresh_central_metrics_cache
CREATE OR REPLACE FUNCTION public.refresh_central_metrics_cache(p_tenant_id uuid, p_start_date date, p_end_date date)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_days_in_period integer; v_invoice_revenue numeric := 0; v_order_revenue numeric := 0; v_order_cogs numeric := 0;
  v_order_fees numeric := 0; v_contract_revenue numeric := 0; v_total_revenue numeric := 0; v_net_revenue numeric := 0;
  v_cogs numeric := 0; v_total_opex numeric := 0; v_depreciation numeric := 0; v_interest_expense numeric := 0;
  v_tax_expense numeric := 0; v_gross_profit numeric := 0; v_gross_margin numeric := 0; v_operating_income numeric := 0;
  v_operating_margin numeric := 0; v_ebitda numeric := 0; v_ebitda_margin numeric := 0; v_net_profit numeric := 0;
  v_net_profit_margin numeric := 0; v_total_ar numeric := 0; v_overdue_ar numeric := 0; v_total_ap numeric := 0;
  v_inventory numeric := 0; v_working_capital numeric := 0; v_cash_on_hand numeric := 0; v_cash_flow numeric := 0;
  v_daily_sales numeric := 0; v_daily_cogs numeric := 0; v_daily_purchases numeric := 0;
  v_dso integer := 0; v_dpo integer := 0; v_dio integer := 0; v_ccc integer := 0; v_bill_amount numeric := 0;
BEGIN
  v_days_in_period := GREATEST(p_end_date - p_start_date, 1);
  SELECT COALESCE(SUM(COALESCE(subtotal, total_amount, 0) - COALESCE(discount_amount, 0)), 0) INTO v_invoice_revenue
  FROM invoices WHERE tenant_id = p_tenant_id AND issue_date >= p_start_date AND issue_date <= p_end_date AND status != 'cancelled';
  SELECT COALESCE(SUM(gross_revenue), 0), COALESCE(SUM(cogs), 0),
    COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0) + COALESCE(shipping_fee, 0)), 0)
  INTO v_order_revenue, v_order_cogs, v_order_fees
  FROM cdp_orders WHERE tenant_id = p_tenant_id AND order_at >= p_start_date AND order_at <= p_end_date AND status = 'delivered';
  SELECT COALESCE(SUM(amount), 0) INTO v_contract_revenue FROM revenues WHERE tenant_id = p_tenant_id AND is_active = true AND start_date <= p_end_date AND (end_date IS NULL OR end_date >= p_start_date);
  v_total_revenue := v_invoice_revenue + v_order_revenue + v_contract_revenue;
  v_net_revenue := v_total_revenue * 0.98;
  SELECT COALESCE(SUM(CASE WHEN category = 'cogs' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('salary', 'rent', 'utilities', 'marketing', 'logistics', 'other') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'depreciation' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'interest' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'tax' THEN amount ELSE 0 END), 0)
  INTO v_cogs, v_total_opex, v_depreciation, v_interest_expense, v_tax_expense
  FROM expenses WHERE tenant_id = p_tenant_id AND expense_date >= p_start_date AND expense_date <= p_end_date;
  v_cogs := v_cogs + v_order_cogs;
  IF v_cogs = 0 AND v_order_cogs = 0 THEN v_cogs := v_net_revenue * 0.65; END IF;
  IF v_total_opex = 0 THEN v_total_opex := v_net_revenue * 0.20; END IF;
  v_gross_profit := v_net_revenue - v_cogs;
  v_gross_margin := CASE WHEN v_net_revenue > 0 THEN (v_gross_profit / v_net_revenue) * 100 ELSE 0 END;
  v_operating_income := v_gross_profit - v_total_opex;
  v_operating_margin := CASE WHEN v_net_revenue > 0 THEN (v_operating_income / v_net_revenue) * 100 ELSE 0 END;
  v_ebitda := v_operating_income + v_depreciation;
  v_ebitda_margin := CASE WHEN v_net_revenue > 0 THEN (v_ebitda / v_net_revenue) * 100 ELSE 0 END;
  IF v_tax_expense = 0 AND v_operating_income > v_interest_expense THEN v_tax_expense := (v_operating_income - v_interest_expense) * 0.20; END IF;
  v_net_profit := v_operating_income - v_interest_expense - v_tax_expense;
  v_net_profit_margin := CASE WHEN v_net_revenue > 0 THEN (v_net_profit / v_net_revenue) * 100 ELSE 0 END;
  SELECT COALESCE(SUM(remaining_amount), 0), COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN remaining_amount ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar FROM invoices WHERE tenant_id = p_tenant_id AND status IN ('sent', 'overdue', 'partially_paid');
  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_total_ap FROM bills WHERE tenant_id = p_tenant_id AND status IN ('pending', 'approved', 'overdue', 'partially_paid');
  SELECT COALESCE(SUM(quantity * COALESCE(unit_cost, 0)), 0) INTO v_inventory FROM inventory WHERE tenant_id = p_tenant_id;
  SELECT COALESCE(SUM(current_balance), 0) INTO v_cash_on_hand FROM bank_accounts WHERE tenant_id = p_tenant_id;
  v_working_capital := v_total_ar + v_inventory - v_total_ap;
  v_daily_sales := v_net_revenue / v_days_in_period;
  v_daily_cogs := v_cogs / v_days_in_period;
  SELECT COALESCE(SUM(total_amount), 0) INTO v_bill_amount FROM bills WHERE tenant_id = p_tenant_id AND bill_date >= p_start_date AND bill_date <= p_end_date;
  v_daily_purchases := v_bill_amount / v_days_in_period;
  v_dso := CASE WHEN v_daily_sales > 0 THEN ROUND(v_total_ar / v_daily_sales)::INTEGER ELSE 0 END;
  v_dpo := CASE WHEN v_daily_purchases > 0 THEN ROUND(v_total_ap / v_daily_purchases)::INTEGER ELSE 0 END;
  v_dio := CASE WHEN v_daily_cogs > 0 THEN ROUND(v_inventory / v_daily_cogs)::INTEGER ELSE 0 END;
  v_ccc := v_dso + v_dio - v_dpo;
  v_cash_flow := v_net_profit + v_depreciation;
  INSERT INTO central_metrics_cache (tenant_id, total_revenue, net_revenue, cogs, gross_profit, gross_margin, total_opex,
    operating_income, operating_margin, ebitda, ebitda_margin, depreciation, interest_expense, tax_expense, net_profit,
    net_profit_margin, total_ar, overdue_ar, total_ap, inventory_value, working_capital, cash_on_hand, cash_flow,
    dso, dpo, dio, ccc, period_start, period_end, calculated_at)
  VALUES (p_tenant_id, v_total_revenue, v_net_revenue, v_cogs, v_gross_profit, v_gross_margin, v_total_opex,
    v_operating_income, v_operating_margin, v_ebitda, v_ebitda_margin, v_depreciation, v_interest_expense, v_tax_expense,
    v_net_profit, v_net_profit_margin, v_total_ar, v_overdue_ar, v_total_ap, v_inventory, v_working_capital, v_cash_on_hand,
    v_cash_flow, v_dso, v_dpo, v_dio, v_ccc, p_start_date, p_end_date, NOW())
  ON CONFLICT (tenant_id) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue, net_revenue = EXCLUDED.net_revenue, cogs = EXCLUDED.cogs,
    gross_profit = EXCLUDED.gross_profit, gross_margin = EXCLUDED.gross_margin, total_opex = EXCLUDED.total_opex,
    operating_income = EXCLUDED.operating_income, operating_margin = EXCLUDED.operating_margin, ebitda = EXCLUDED.ebitda,
    ebitda_margin = EXCLUDED.ebitda_margin, depreciation = EXCLUDED.depreciation, interest_expense = EXCLUDED.interest_expense,
    tax_expense = EXCLUDED.tax_expense, net_profit = EXCLUDED.net_profit, net_profit_margin = EXCLUDED.net_profit_margin,
    total_ar = EXCLUDED.total_ar, overdue_ar = EXCLUDED.overdue_ar, total_ap = EXCLUDED.total_ap, inventory_value = EXCLUDED.inventory_value,
    working_capital = EXCLUDED.working_capital, cash_on_hand = EXCLUDED.cash_on_hand, cash_flow = EXCLUDED.cash_flow,
    dso = EXCLUDED.dso, dpo = EXCLUDED.dpo, dio = EXCLUDED.dio, ccc = EXCLUDED.ccc, period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end, calculated_at = NOW();
END;
$function$;

-- 8. refresh_channel_analytics_cache
CREATE OR REPLACE FUNCTION public.refresh_channel_analytics_cache(p_tenant_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_total_orders integer := 0; v_gross_revenue numeric := 0; v_net_revenue numeric := 0; v_total_fees numeric := 0;
  v_total_cogs numeric := 0; v_gross_profit numeric := 0; v_cancelled integer := 0; v_returned integer := 0;
  v_channel_metrics jsonb := '{}'; v_fee_breakdown jsonb := '{}'; v_status_breakdown jsonb := '{}';
  v_data_start date; v_data_end date;
BEGIN
  SELECT MIN(order_at::date), MAX(order_at::date) INTO v_data_start, v_data_end FROM cdp_orders WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*), COALESCE(SUM(gross_revenue), 0), COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0) + COALESCE(shipping_fee, 0)), 0),
    COALESCE(SUM(cogs), 0), COUNT(CASE WHEN status = 'cancelled' THEN 1 END), COUNT(CASE WHEN status = 'returned' THEN 1 END)
  INTO v_total_orders, v_gross_revenue, v_net_revenue, v_total_fees, v_total_cogs, v_cancelled, v_returned
  FROM cdp_orders WHERE tenant_id = p_tenant_id;
  v_gross_profit := v_net_revenue - v_total_cogs;
  SELECT jsonb_object_agg(channel, jsonb_build_object('orders', channel_orders, 'revenue', channel_revenue, 'fees', channel_fees, 'cogs', channel_cogs,
      'profit', channel_revenue - channel_fees - channel_cogs, 'aov', CASE WHEN channel_orders > 0 THEN channel_revenue / channel_orders ELSE 0 END))
  INTO v_channel_metrics FROM (
    SELECT UPPER(channel) as channel, COUNT(*) as channel_orders, SUM(gross_revenue) as channel_revenue,
      SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0)) as channel_fees, SUM(COALESCE(cogs, 0)) as channel_cogs
    FROM cdp_orders WHERE tenant_id = p_tenant_id GROUP BY UPPER(channel)) channel_agg;
  SELECT jsonb_object_agg(fee_type, total_amount) INTO v_fee_breakdown
  FROM (SELECT fee_type, SUM(amount) as total_amount FROM channel_fees WHERE tenant_id = p_tenant_id GROUP BY fee_type) fee_agg;
  SELECT jsonb_object_agg(status, jsonb_build_object('count', cnt, 'amount', amt)) INTO v_status_breakdown
  FROM (SELECT status::text, COUNT(*) as cnt, SUM(gross_revenue) as amt FROM cdp_orders WHERE tenant_id = p_tenant_id GROUP BY status) status_agg;
  INSERT INTO channel_analytics_cache (tenant_id, total_orders, gross_revenue, net_revenue, total_fees, total_cogs, gross_profit, avg_order_value,
    cancelled_orders, returned_orders, channel_metrics, fee_breakdown, status_breakdown, data_start_date, data_end_date, calculated_at, updated_at)
  VALUES (p_tenant_id, v_total_orders, v_gross_revenue, v_net_revenue, v_total_fees, v_total_cogs, v_gross_profit,
    CASE WHEN v_total_orders > 0 THEN v_gross_revenue / v_total_orders ELSE 0 END, v_cancelled, v_returned,
    COALESCE(v_channel_metrics, '{}'), COALESCE(v_fee_breakdown, '{}'), COALESCE(v_status_breakdown, '{}'), v_data_start, v_data_end, now(), now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    total_orders = EXCLUDED.total_orders, gross_revenue = EXCLUDED.gross_revenue, net_revenue = EXCLUDED.net_revenue,
    total_fees = EXCLUDED.total_fees, total_cogs = EXCLUDED.total_cogs, gross_profit = EXCLUDED.gross_profit,
    avg_order_value = EXCLUDED.avg_order_value, cancelled_orders = EXCLUDED.cancelled_orders, returned_orders = EXCLUDED.returned_orders,
    channel_metrics = EXCLUDED.channel_metrics, fee_breakdown = EXCLUDED.fee_breakdown, status_breakdown = EXCLUDED.status_breakdown,
    data_start_date = EXCLUDED.data_start_date, data_end_date = EXCLUDED.data_end_date, calculated_at = now(), updated_at = now();
END;
$function$;

-- 9. refresh_whatif_metrics_cache
CREATE OR REPLACE FUNCTION public.refresh_whatif_metrics_cache(p_tenant_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_total_revenue numeric := 0; v_total_cogs numeric := 0; v_total_fees numeric := 0; v_total_orders integer := 0;
  v_avg_order_value numeric := 0; v_return_rate numeric := 0; v_monthly_growth numeric := 0;
  v_channel_metrics jsonb := '{}'; v_marketing_cost numeric := 0; v_overhead_cost numeric := 0;
  v_data_start date; v_data_end date; v_order_count integer := 0; v_cancelled_count integer := 0;
BEGIN
  SELECT MIN(order_at::date), MAX(order_at::date), COUNT(*) INTO v_data_start, v_data_end, v_order_count
  FROM cdp_orders WHERE tenant_id = p_tenant_id;
  SELECT COALESCE(SUM(gross_revenue), 0), COALESCE(SUM(cogs), 0),
    COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0) + COALESCE(shipping_fee, 0)), 0), COUNT(*)
  INTO v_total_revenue, v_total_cogs, v_total_fees, v_total_orders FROM cdp_orders WHERE tenant_id = p_tenant_id AND status = 'delivered';
  IF v_total_orders > 0 THEN v_avg_order_value := v_total_revenue / v_total_orders; END IF;
  SELECT COUNT(*) INTO v_cancelled_count FROM cdp_orders WHERE tenant_id = p_tenant_id AND status IN ('cancelled', 'returned');
  IF v_order_count > 0 THEN v_return_rate := (v_cancelled_count::numeric / v_order_count) * 100; END IF;
  SELECT jsonb_object_agg(channel, jsonb_build_object('revenue', channel_revenue, 'orders', channel_orders, 'cogs', channel_cogs, 'fees', channel_fees,
      'aov', CASE WHEN channel_orders > 0 THEN channel_revenue / channel_orders ELSE 0 END,
      'share', CASE WHEN v_total_revenue > 0 THEN (channel_revenue / v_total_revenue) * 100 ELSE 0 END))
  INTO v_channel_metrics FROM (
    SELECT UPPER(channel) as channel, SUM(gross_revenue) as channel_revenue, COUNT(*) as channel_orders,
      SUM(COALESCE(cogs, 0)) as channel_cogs, SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0)) as channel_fees
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND status = 'delivered' GROUP BY UPPER(channel)) channel_agg;
  WITH monthly_revenue AS (
    SELECT DATE_TRUNC('month', order_at) as month, SUM(gross_revenue) as revenue
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND status = 'delivered' AND order_at >= NOW() - INTERVAL '3 months'
    GROUP BY DATE_TRUNC('month', order_at) ORDER BY month DESC LIMIT 2)
  SELECT CASE WHEN COUNT(*) = 2 AND MIN(revenue) > 0 THEN ((MAX(revenue) - MIN(revenue)) / MIN(revenue)) * 100 ELSE 0 END
  INTO v_monthly_growth FROM monthly_revenue;
  SELECT COALESCE(SUM(amount), 0) INTO v_marketing_cost FROM expenses WHERE tenant_id = p_tenant_id AND category = 'marketing';
  SELECT COALESCE(SUM(amount), 0) INTO v_overhead_cost FROM expenses WHERE tenant_id = p_tenant_id AND category IN ('rent', 'utilities', 'salary');
  INSERT INTO whatif_metrics_cache (tenant_id, total_revenue, total_cogs, total_fees, total_orders, avg_order_value, return_rate,
    monthly_growth_rate, channel_metrics, marketing_cost, overhead_cost, data_start_date, data_end_date, order_count, calculated_at, updated_at)
  VALUES (p_tenant_id, v_total_revenue, v_total_cogs, v_total_fees, v_total_orders, v_avg_order_value, v_return_rate, COALESCE(v_monthly_growth, 0),
    COALESCE(v_channel_metrics, '{}'), v_marketing_cost, v_overhead_cost, v_data_start, v_data_end, v_order_count, now(), now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue, total_cogs = EXCLUDED.total_cogs, total_fees = EXCLUDED.total_fees,
    total_orders = EXCLUDED.total_orders, avg_order_value = EXCLUDED.avg_order_value, return_rate = EXCLUDED.return_rate,
    monthly_growth_rate = EXCLUDED.monthly_growth_rate, channel_metrics = EXCLUDED.channel_metrics, marketing_cost = EXCLUDED.marketing_cost,
    overhead_cost = EXCLUDED.overhead_cost, data_start_date = EXCLUDED.data_start_date, data_end_date = EXCLUDED.data_end_date,
    order_count = EXCLUDED.order_count, calculated_at = now(), updated_at = now();
END;
$function$;

-- 10. trigger_queue_view_refresh
CREATE OR REPLACE FUNCTION public.trigger_queue_view_refresh()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'cdp_orders' THEN
    INSERT INTO view_refresh_queue (tenant_id, view_name, triggered_by)
    SELECT COALESCE(NEW.tenant_id, OLD.tenant_id), 'fdp_daily_metrics', 'cdp_orders_' || TG_OP
    WHERE NOT EXISTS (SELECT 1 FROM view_refresh_queue WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id) AND view_name = 'fdp_daily_metrics' AND status = 'pending');
    INSERT INTO view_refresh_queue (tenant_id, view_name, triggered_by)
    SELECT COALESCE(NEW.tenant_id, OLD.tenant_id), 'cdp_customer_metrics', 'cdp_orders_' || TG_OP
    WHERE NOT EXISTS (SELECT 1 FROM view_refresh_queue WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id) AND view_name = 'cdp_customer_metrics' AND status = 'pending');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add SSOT documentation comments
COMMENT ON FUNCTION public.cdp_compute_data_quality_daily IS 'SSOT v1.4: Uses cdp_orders';
COMMENT ON FUNCTION public.compute_central_metric_facts IS 'SSOT v1.4: Uses cdp_orders/cdp_order_items';
COMMENT ON FUNCTION public.detect_cross_domain_variance IS 'SSOT v1.4: Uses cdp_orders';
COMMENT ON FUNCTION public.get_sku_master_unit_cost IS 'SSOT v1.4: Uses cdp_order_items';
COMMENT ON FUNCTION public.mdp_get_costs_for_roas IS 'SSOT v1.4: Uses cdp_orders/cdp_order_items';
COMMENT ON FUNCTION public.recalculate_product_metrics IS 'SSOT v1.4: Uses cdp_orders/cdp_order_items';
COMMENT ON FUNCTION public.refresh_central_metrics_cache IS 'SSOT v1.4: Uses cdp_orders';
COMMENT ON FUNCTION public.refresh_channel_analytics_cache IS 'SSOT v1.4: Uses cdp_orders';
COMMENT ON FUNCTION public.refresh_whatif_metrics_cache IS 'SSOT v1.4: Uses cdp_orders';
COMMENT ON FUNCTION public.trigger_queue_view_refresh IS 'SSOT v1.4: Triggers on cdp_orders';