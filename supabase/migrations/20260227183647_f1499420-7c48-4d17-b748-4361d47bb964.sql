
-- ============================================
-- BATCH 2: Move all client-side calculations to DB
-- ============================================

-- 1. What-If Summary (replaces heavy client-side groupBy/reduce in useWhatIfRealData)
CREATE OR REPLACE FUNCTION get_whatif_summary(
  p_tenant_id uuid,
  p_start_date text,
  p_end_date text,
  p_hist_start_date text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
  v_totals jsonb;
  v_by_channel jsonb;
  v_by_month jsonb;
  v_by_sku jsonb;
  v_total_revenue numeric;
BEGIN
  -- Totals
  SELECT jsonb_build_object(
    'total_revenue', coalesce(sum(net_revenue), 0),
    'total_cogs', coalesce(sum(cogs), 0),
    'total_net_profit', coalesce(sum(gross_margin), 0),
    'total_orders', count(*),
    'avg_order_value', CASE WHEN count(*) > 0 THEN coalesce(sum(net_revenue), 0) / count(*) ELSE 0 END,
    'overall_margin', CASE WHEN coalesce(sum(net_revenue), 0) > 0 
      THEN (coalesce(sum(gross_margin), 0) / sum(net_revenue)) * 100 ELSE 0 END,
    'avg_cogs_rate', CASE WHEN coalesce(sum(net_revenue), 0) > 0
      THEN (coalesce(sum(cogs), 0) / sum(net_revenue)) * 100 ELSE 0 END
  ), coalesce(sum(net_revenue), 0)
  INTO v_totals, v_total_revenue
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at >= p_start_date::date
    AND order_at <= p_end_date::date;

  -- By Channel
  SELECT coalesce(jsonb_agg(ch ORDER BY ch->>'revenue' DESC), '[]'::jsonb) INTO v_by_channel
  FROM (
    SELECT jsonb_build_object(
      'channel', coalesce(channel, 'other'),
      'revenue', coalesce(sum(net_revenue), 0),
      'cogs', coalesce(sum(cogs), 0),
      'net_profit', coalesce(sum(gross_margin), 0),
      'orders', count(*),
      'avg_order_value', CASE WHEN count(*) > 0 THEN coalesce(sum(net_revenue), 0) / count(*) ELSE 0 END,
      'margin', CASE WHEN coalesce(sum(net_revenue), 0) > 0
        THEN (coalesce(sum(gross_margin), 0) / sum(net_revenue)) * 100 ELSE 0 END
    ) as ch
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND order_at >= p_start_date::date
      AND order_at <= p_end_date::date
    GROUP BY channel
  ) sub;

  -- By Month (including historical)
  SELECT coalesce(jsonb_agg(mn ORDER BY mn->>'month'), '[]'::jsonb) INTO v_by_month
  FROM (
    SELECT jsonb_build_object(
      'month', to_char(order_at, 'YYYY-MM'),
      'revenue', coalesce(sum(net_revenue), 0),
      'cogs', coalesce(sum(cogs), 0),
      'net_profit', coalesce(sum(gross_margin), 0),
      'orders', count(*),
      'avg_order_value', CASE WHEN count(*) > 0 THEN coalesce(sum(net_revenue), 0) / count(*) ELSE 0 END,
      'margin', CASE WHEN coalesce(sum(net_revenue), 0) > 0
        THEN (coalesce(sum(gross_margin), 0) / sum(net_revenue)) * 100 ELSE 0 END
    ) as mn
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND order_at >= p_hist_start_date::date
      AND order_at <= p_end_date::date
    GROUP BY to_char(order_at, 'YYYY-MM')
  ) sub;

  -- By SKU (top 100)
  SELECT coalesce(jsonb_agg(sk), '[]'::jsonb) INTO v_by_sku
  FROM (
    SELECT jsonb_build_object(
      'sku', oi.sku,
      'product_name', coalesce(oi.product_name, ''),
      'category', coalesce(oi.category, ''),
      'quantity', coalesce(sum(oi.quantity), 0),
      'revenue', coalesce(sum(oi.line_total), 0),
      'cogs', coalesce(sum(oi.line_cogs), 0),
      'profit', coalesce(sum(oi.line_margin), 0),
      'margin', CASE WHEN coalesce(sum(oi.line_total), 0) > 0
        THEN (coalesce(sum(oi.line_margin), 0) / sum(oi.line_total)) * 100 ELSE 0 END,
      'avg_price', CASE WHEN coalesce(sum(oi.quantity), 0) > 0
        THEN coalesce(sum(oi.line_total), 0) / sum(oi.quantity) ELSE 0 END,
      'cost_price', CASE WHEN coalesce(sum(oi.quantity), 0) > 0
        THEN coalesce(sum(oi.line_cogs), 0) / sum(oi.quantity) ELSE 0 END,
      'channels', (SELECT coalesce(jsonb_agg(DISTINCT o2.channel), '[]'::jsonb) 
                   FROM cdp_order_items oi2 
                   JOIN cdp_orders o2 ON o2.id = oi2.order_id AND o2.tenant_id = oi2.tenant_id
                   WHERE oi2.tenant_id = p_tenant_id AND oi2.sku = oi.sku
                     AND o2.order_at >= p_start_date::date AND o2.order_at <= p_end_date::date),
      'returned_qty', coalesce(sum(CASE WHEN oi.is_returned THEN oi.return_quantity ELSE 0 END), 0),
      'return_rate', CASE WHEN coalesce(sum(oi.quantity), 0) > 0
        THEN (coalesce(sum(CASE WHEN oi.is_returned THEN oi.return_quantity ELSE 0 END), 0)::numeric / sum(oi.quantity)) * 100 ELSE 0 END,
      'contribution', CASE WHEN v_total_revenue > 0
        THEN (coalesce(sum(oi.line_total), 0) / v_total_revenue) * 100 ELSE 0 END
    ) as sk
    FROM cdp_order_items oi
    JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id
      AND o.order_at >= p_start_date::date
      AND o.order_at <= p_end_date::date
      AND o.status != 'cancelled'
    GROUP BY oi.sku, oi.product_name, oi.category
    ORDER BY sum(oi.line_total) DESC NULLS LAST
    LIMIT 100
  ) sub;

  v_result := jsonb_build_object(
    'totals', v_totals,
    'byChannel', v_by_channel,
    'byMonth', v_by_month,
    'bySKU', v_by_sku
  );

  RETURN v_result;
END;
$$;

-- 2. Supplier Payment Optimization Summary
CREATE OR REPLACE FUNCTION get_supplier_payment_optimization(
  p_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_payables', coalesce(sum(CASE WHEN payment_status = 'pending' THEN original_amount ELSE 0 END), 0),
    'total_due_this_week', coalesce(sum(CASE WHEN payment_status = 'pending' AND due_date <= (current_date + interval '7 days') THEN original_amount ELSE 0 END), 0),
    'total_due_this_month', coalesce(sum(CASE WHEN payment_status = 'pending' AND due_date <= (current_date + interval '30 days') THEN original_amount ELSE 0 END), 0),
    'overdue_count', count(CASE WHEN payment_status = 'pending' AND due_date < current_date THEN 1 END),
    'potential_savings', coalesce(sum(CASE 
      WHEN payment_status = 'pending' 
        AND early_payment_discount_percent > 0 
        AND early_payment_date IS NOT NULL 
        AND early_payment_date > current_date 
      THEN early_payment_discount_amount ELSE 0 END), 0),
    'avg_discount_rate', CASE 
      WHEN count(CASE WHEN payment_status = 'pending' AND early_payment_discount_percent > 0 AND early_payment_date IS NOT NULL AND early_payment_date > current_date THEN 1 END) > 0
      THEN sum(CASE WHEN payment_status = 'pending' AND early_payment_discount_percent > 0 AND early_payment_date IS NOT NULL AND early_payment_date > current_date THEN early_payment_discount_percent ELSE 0 END) 
           / count(CASE WHEN payment_status = 'pending' AND early_payment_discount_percent > 0 AND early_payment_date IS NOT NULL AND early_payment_date > current_date THEN 1 END)
      ELSE 0 END,
    'recommended_early_count', count(CASE 
      WHEN payment_status = 'pending' 
        AND early_payment_discount_percent > 0 
        AND early_payment_date IS NOT NULL 
        AND early_payment_date > current_date
        AND coalesce(net_benefit, early_payment_discount_amount - coalesce(opportunity_cost, 0)) > 0
      THEN 1 END)
  ) INTO v_result
  FROM supplier_payment_schedules
  WHERE tenant_id = p_tenant_id;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

-- 3. Promotion Campaign Summary
CREATE OR REPLACE FUNCTION get_promotion_campaign_summary(
  p_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_campaigns', count(*),
    'active_campaigns', count(CASE WHEN status = 'active' THEN 1 END),
    'total_spend', coalesce(sum(actual_cost), 0),
    'total_budget', coalesce(sum(budget), 0),
    'total_revenue', coalesce(sum(total_revenue), 0),
    'total_discount', coalesce(sum(total_discount_given), 0),
    'net_revenue', coalesce(sum(total_revenue), 0) - coalesce(sum(total_discount_given), 0),
    'total_orders', coalesce(sum(total_orders), 0),
    'total_impressions', coalesce(sum(impressions), 0),
    'total_clicks', coalesce(sum(clicks), 0),
    'avg_roas', CASE WHEN count(*) > 0 AND coalesce(sum(actual_cost), 0) > 0
      THEN coalesce(sum(total_revenue), 0) / sum(actual_cost) ELSE 0 END,
    'avg_ctr', CASE WHEN coalesce(sum(impressions), 0) > 0
      THEN (coalesce(sum(clicks), 0)::numeric / sum(impressions)) * 100 ELSE 0 END,
    'budget_utilization', CASE WHEN coalesce(sum(budget), 0) > 0
      THEN (coalesce(sum(actual_cost), 0) / sum(budget)) * 100 ELSE 0 END,
    'by_channel', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'channel', coalesce(channel, 'Other'),
        'campaigns', count(*),
        'spend', coalesce(sum(actual_cost), 0),
        'revenue', coalesce(sum(total_revenue), 0),
        'orders', coalesce(sum(total_orders), 0),
        'impressions', coalesce(sum(impressions), 0),
        'clicks', coalesce(sum(clicks), 0),
        'roas', CASE WHEN coalesce(sum(actual_cost), 0) > 0 THEN coalesce(sum(total_revenue), 0) / sum(actual_cost) ELSE 0 END,
        'ctr', CASE WHEN coalesce(sum(impressions), 0) > 0 THEN (coalesce(sum(clicks), 0)::numeric / sum(impressions)) * 100 ELSE 0 END
      )), '[]'::jsonb)
      FROM promotion_campaigns pc2
      WHERE pc2.tenant_id = p_tenant_id
      GROUP BY coalesce(pc2.channel, 'Other')
    )
  ) INTO v_result
  FROM promotion_campaigns
  WHERE tenant_id = p_tenant_id;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

-- 4. Forecast Aggregated Inputs
CREATE OR REPLACE FUNCTION get_forecast_aggregated_inputs(
  p_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
  v_bank jsonb;
  v_ar jsonb;
  v_ap jsonb;
  v_expenses jsonb;
BEGIN
  -- Bank balance
  SELECT jsonb_build_object(
    'balance', coalesce(sum(current_balance), 0),
    'count', count(*)
  ) INTO v_bank
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';

  -- AR (Accounts Receivable)
  SELECT jsonb_build_object(
    'total', coalesce(sum(total_amount - coalesce(paid_amount, 0)), 0),
    'overdue', coalesce(sum(CASE WHEN status = 'overdue' OR due_date < current_date THEN total_amount - coalesce(paid_amount, 0) ELSE 0 END), 0),
    'due_within_30', coalesce(sum(CASE WHEN (status != 'overdue' AND due_date >= current_date) AND due_date <= (current_date + 30) THEN total_amount - coalesce(paid_amount, 0) ELSE 0 END), 0),
    'due_within_60', coalesce(sum(CASE WHEN (status != 'overdue' AND due_date >= current_date) AND due_date <= (current_date + 60) THEN total_amount - coalesce(paid_amount, 0) ELSE 0 END), 0),
    'due_within_90', coalesce(sum(CASE WHEN (status != 'overdue' AND due_date >= current_date) AND due_date <= (current_date + 90) THEN total_amount - coalesce(paid_amount, 0) ELSE 0 END), 0),
    'count', count(*)
  ) INTO v_ar
  FROM invoices
  WHERE tenant_id = p_tenant_id AND status IN ('sent', 'issued', 'overdue', 'partial');

  -- AP (Accounts Payable)
  SELECT jsonb_build_object(
    'total', coalesce(sum(total_amount - coalesce(paid_amount, 0)), 0),
    'due_within_30', coalesce(sum(CASE WHEN due_date <= (current_date + 30) THEN total_amount - coalesce(paid_amount, 0) ELSE 0 END), 0),
    'due_within_60', coalesce(sum(CASE WHEN due_date <= (current_date + 60) THEN total_amount - coalesce(paid_amount, 0) ELSE 0 END), 0),
    'due_within_90', coalesce(sum(CASE WHEN due_date <= (current_date + 90) THEN total_amount - coalesce(paid_amount, 0) ELSE 0 END), 0),
    'count', count(*)
  ) INTO v_ap
  FROM bills
  WHERE tenant_id = p_tenant_id AND status IN ('approved', 'pending', 'partial');

  -- Recurring expenses (monthly normalized)
  WITH deduped_expenses AS (
    SELECT DISTINCT ON (coalesce(description, 'expense_' || id)) 
      amount, recurring_period
    FROM expenses
    WHERE tenant_id = p_tenant_id AND is_recurring = true
    ORDER BY coalesce(description, 'expense_' || id), expense_date DESC
  )
  SELECT jsonb_build_object(
    'monthly', coalesce(sum(
      CASE 
        WHEN recurring_period = 'weekly' THEN amount * 4
        WHEN recurring_period = 'yearly' THEN amount / 12
        ELSE amount
      END
    ), 0),
    'count', count(*)
  ) INTO v_expenses
  FROM deduped_expenses;

  v_result := jsonb_build_object(
    'bank', v_bank,
    'ar', v_ar,
    'ap', v_ap,
    'expenses', v_expenses
  );

  RETURN v_result;
END;
$$;

-- 5. Unified Channel Computed Metrics
CREATE OR REPLACE FUNCTION get_unified_channel_computed(
  p_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
  v_total_revenue numeric;
  v_total_spend numeric;
BEGIN
  SELECT coalesce(sum(gross_revenue), 0), coalesce(sum(total_fees), 0)
  INTO v_total_revenue, v_total_spend
  FROM v_channel_pl_summary
  WHERE tenant_id = p_tenant_id;

  SELECT jsonb_build_object(
    'total_revenue', v_total_revenue,
    'total_spend', v_total_spend,
    'channels', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'channel', channel,
        'revenue', coalesce(gross_revenue, 0),
        'spend', coalesce(total_fees, 0),
        'orders', coalesce(order_count, 0),
        'gross_profit', coalesce(gross_profit, 0),
        'roas', CASE WHEN coalesce(total_fees, 0) > 0 THEN gross_revenue / total_fees ELSE 0 END,
        'cpa', CASE WHEN coalesce(order_count, 0) > 0 THEN total_fees / order_count ELSE 0 END,
        'cm_percent', CASE WHEN coalesce(gross_revenue, 0) > 0 THEN (coalesce(gross_profit, 0) / gross_revenue) * 100 ELSE 0 END,
        'spend_share', CASE WHEN v_total_spend > 0 THEN (coalesce(total_fees, 0) / v_total_spend) * 100 ELSE 0 END,
        'revenue_share', CASE WHEN v_total_revenue > 0 THEN (coalesce(gross_revenue, 0) / v_total_revenue) * 100 ELSE 0 END
      ))
      FROM v_channel_pl_summary
      WHERE tenant_id = p_tenant_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6. SKU Profitability View Summary (aggregation only)
CREATE OR REPLACE FUNCTION get_sku_profitability_view_summary(
  p_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_skus', count(*),
    'profitable_skus', count(CASE WHEN margin_percent >= 10 THEN 1 END),
    'marginal_skus', count(CASE WHEN margin_percent >= 0 AND margin_percent < 10 THEN 1 END),
    'loss_skus', count(CASE WHEN margin_percent < 0 THEN 1 END),
    'total_profit', coalesce(sum(gross_profit), 0),
    'avg_margin', CASE WHEN count(*) > 0 THEN coalesce(sum(margin_percent), 0) / count(*) ELSE 0 END
  ) INTO v_result
  FROM fdp_sku_summary
  WHERE tenant_id = p_tenant_id;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;
