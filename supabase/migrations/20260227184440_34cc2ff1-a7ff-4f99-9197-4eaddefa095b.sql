
-- ============================================
-- BATCH 3: Financial Analysis + CDP Tier + Cash Flow Summary RPCs
-- Move ALL .reduce() aggregations to database
-- ============================================

-- 1. Financial Analysis Summary RPC
-- Replaces ~20 .reduce() calls in useFinancialAnalysisData.ts
CREATE OR REPLACE FUNCTION public.get_financial_analysis_summary(
  p_tenant_id uuid,
  p_year integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_start date;
  v_year_end date;
  v_last_year_start date;
  v_last_year_end date;
  v_result jsonb;
  v_totals record;
  v_last_year_totals record;
  v_expense_categories jsonb;
  v_last_year_expense_categories jsonb;
  v_quarterly jsonb;
  v_monthly jsonb;
  v_profit_trend jsonb;
  v_overdue record;
  v_customer_count integer;
BEGIN
  v_year_start := make_date(p_year, 1, 1);
  v_year_end := make_date(p_year, 12, 31);
  v_last_year_start := make_date(p_year - 1, 1, 1);
  v_last_year_end := make_date(p_year - 1, 12, 31);

  -- Current year totals from v_financial_monthly_summary
  SELECT
    COALESCE(SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)), 0) AS total_revenue,
    COALESCE(SUM(total_expense), 0) AS total_expense,
    COALESCE(SUM(cogs), 0) AS cogs,
    COALESCE(SUM(salary_expense), 0) AS salary_expense,
    COALESCE(SUM(rent_expense), 0) AS rent_expense,
    COALESCE(SUM(marketing_expense), 0) AS marketing_expense,
    COALESCE(SUM(depreciation), 0) AS depreciation,
    COALESCE(SUM(interest_expense), 0) AS interest_expense
  INTO v_totals
  FROM v_financial_monthly_summary
  WHERE tenant_id = p_tenant_id
    AND period_month >= v_year_start::text
    AND period_month <= v_year_end::text;

  -- Last year totals
  SELECT
    COALESCE(SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)), 0) AS total_revenue,
    COALESCE(SUM(total_expense), 0) AS total_expense,
    COALESCE(SUM(cogs), 0) AS cogs,
    COALESCE(SUM(salary_expense), 0) AS salary_expense,
    COALESCE(SUM(rent_expense), 0) AS rent_expense,
    COALESCE(SUM(marketing_expense), 0) AS marketing_expense,
    COALESCE(SUM(depreciation), 0) AS depreciation,
    COALESCE(SUM(interest_expense), 0) AS interest_expense
  INTO v_last_year_totals
  FROM v_financial_monthly_summary
  WHERE tenant_id = p_tenant_id
    AND period_month >= v_last_year_start::text
    AND period_month <= v_last_year_end::text;

  -- Monthly revenue/expense data
  SELECT COALESCE(jsonb_agg(row_to_jsonb(t) ORDER BY t.period_month), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT 
      period_month,
      COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0) AS revenue,
      COALESCE(total_expense, 0) AS expense
    FROM v_financial_monthly_summary
    WHERE tenant_id = p_tenant_id
      AND period_month >= v_year_start::text
      AND period_month <= v_year_end::text
  ) t;

  -- Quarterly profit trend
  SELECT COALESCE(jsonb_agg(row_to_jsonb(q) ORDER BY q.quarter), '[]'::jsonb)
  INTO v_profit_trend
  FROM (
    SELECT 
      EXTRACT(QUARTER FROM period_month::date)::int AS quarter,
      CASE WHEN SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) > 0
        THEN (SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) - SUM(COALESCE(cogs, 0))) 
             / SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) * 100
        ELSE 0 END AS gross_margin,
      CASE WHEN SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) > 0
        THEN (SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) - SUM(COALESCE(total_expense, 0))) 
             / SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) * 100
        ELSE 0 END AS net_margin,
      CASE WHEN SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) > 0
        THEN (SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) - SUM(COALESCE(total_expense, 0)) + SUM(COALESCE(interest_expense, 0))) 
             / SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) * 100
        ELSE 0 END AS operating_margin,
      CASE WHEN SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) > 0
        THEN (SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) - SUM(COALESCE(total_expense, 0)) + SUM(COALESCE(depreciation, 0)) + SUM(COALESCE(interest_expense, 0))) 
             / SUM(COALESCE(invoice_revenue, 0) + COALESCE(other_revenue, 0)) * 100
        ELSE 0 END AS ebitda_margin
    FROM v_financial_monthly_summary
    WHERE tenant_id = p_tenant_id
      AND period_month >= v_year_start::text
      AND period_month <= v_year_end::text
    GROUP BY EXTRACT(QUARTER FROM period_month::date)
  ) q;

  -- Overdue AR
  SELECT
    COUNT(*)::int AS overdue_count,
    COALESCE(SUM(outstanding), 0) AS overdue_amount,
    COALESCE(SUM(outstanding), 0) AS total_ar
  INTO v_overdue
  FROM v_pending_ar
  WHERE tenant_id = p_tenant_id
    AND aging_bucket NOT IN ('current', 'no_due_date');

  -- Total AR
  DECLARE v_total_ar numeric;
  BEGIN
    SELECT COALESCE(SUM(outstanding), 0) INTO v_total_ar
    FROM v_pending_ar WHERE tenant_id = p_tenant_id;
    v_overdue.total_ar := v_total_ar;
  END;

  -- Customer count
  SELECT COUNT(*)::int INTO v_customer_count
  FROM customers
  WHERE tenant_id = p_tenant_id AND status = 'active';

  -- Payments total
  DECLARE v_payments_total numeric;
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_payments_total
    FROM payments
    WHERE tenant_id = p_tenant_id
      AND payment_date >= v_year_start::text
      AND payment_date <= v_year_end::text;
  END;

  -- Build result
  v_result := jsonb_build_object(
    'totals', jsonb_build_object(
      'totalRevenue', v_totals.total_revenue,
      'totalExpense', v_totals.total_expense,
      'totalProfit', v_totals.total_revenue - v_totals.total_expense,
      'cogs', v_totals.cogs,
      'grossProfit', v_totals.total_revenue - v_totals.cogs,
      'depreciation', v_totals.depreciation,
      'interest', v_totals.interest_expense,
      'salaryExpense', v_totals.salary_expense,
      'rentExpense', v_totals.rent_expense,
      'marketingExpense', v_totals.marketing_expense,
      'ebitda', (v_totals.total_revenue - v_totals.total_expense) + v_totals.depreciation + v_totals.interest_expense,
      'grossMargin', CASE WHEN v_totals.total_revenue > 0 THEN ((v_totals.total_revenue - v_totals.cogs) / v_totals.total_revenue * 100) ELSE 0 END,
      'netMargin', CASE WHEN v_totals.total_revenue > 0 THEN ((v_totals.total_revenue - v_totals.total_expense) / v_totals.total_revenue * 100) ELSE 0 END,
      'ebitdaMargin', CASE WHEN v_totals.total_revenue > 0 THEN (((v_totals.total_revenue - v_totals.total_expense) + v_totals.depreciation + v_totals.interest_expense) / v_totals.total_revenue * 100) ELSE 0 END,
      'salaryRatio', CASE WHEN v_totals.total_expense > 0 THEN (v_totals.salary_expense / v_totals.total_expense * 100) ELSE 0 END,
      'icr', CASE WHEN v_totals.interest_expense > 0 AND (v_totals.total_revenue - v_totals.total_expense) > 0 THEN ((v_totals.total_revenue - v_totals.total_expense) / v_totals.interest_expense) ELSE 0 END,
      'paymentsTotal', v_payments_total
    ),
    'lastYear', jsonb_build_object(
      'totalRevenue', v_last_year_totals.total_revenue,
      'totalExpense', v_last_year_totals.total_expense,
      'totalProfit', v_last_year_totals.total_revenue - v_last_year_totals.total_expense,
      'cogs', v_last_year_totals.cogs,
      'grossMargin', CASE WHEN v_last_year_totals.total_revenue > 0 THEN ((v_last_year_totals.total_revenue - v_last_year_totals.cogs) / v_last_year_totals.total_revenue * 100) ELSE 0 END,
      'netMargin', CASE WHEN v_last_year_totals.total_revenue > 0 THEN ((v_last_year_totals.total_revenue - v_last_year_totals.total_expense) / v_last_year_totals.total_revenue * 100) ELSE 0 END,
      'salaryExpense', v_last_year_totals.salary_expense,
      'salaryRatio', CASE WHEN v_last_year_totals.total_expense > 0 THEN (v_last_year_totals.salary_expense / v_last_year_totals.total_expense * 100) ELSE 0 END
    ),
    'monthlyData', v_monthly,
    'profitTrend', v_profit_trend,
    'overdue', jsonb_build_object(
      'count', v_overdue.overdue_count,
      'amount', v_overdue.overdue_amount,
      'totalAR', v_overdue.total_ar
    ),
    'customerCount', v_customer_count
  );

  RETURN v_result;
END;
$$;

-- 2. CDP Tier Summary RPC
-- Replaces .reduce() in useCDPTierData.ts
CREATE OR REPLACE FUNCTION public.get_cdp_tier_summary(
  p_tenant_id uuid,
  p_tier_label text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_count integer;
  v_total_revenue numeric;
  v_estimated_equity numeric;
  v_customer_ids uuid[];
BEGIN
  -- Get unique customers and sum revenue
  SELECT 
    array_agg(DISTINCT customer_id),
    COUNT(DISTINCT customer_id)::int,
    COALESCE(SUM(metric_value), 0)
  INTO v_customer_ids, v_customer_count, v_total_revenue
  FROM cdp_value_tier_membership_daily
  WHERE tenant_id = p_tenant_id
    AND tier_label = p_tier_label
    AND is_member = true
    AND metric_name = 'net_revenue_365';

  -- Get equity sum
  IF v_customer_ids IS NOT NULL AND array_length(v_customer_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(equity_12m), 0)
    INTO v_estimated_equity
    FROM cdp_customer_equity_computed
    WHERE tenant_id = p_tenant_id
      AND customer_id = ANY(v_customer_ids);
  ELSE
    v_estimated_equity := 0;
  END IF;

  RETURN jsonb_build_object(
    'tierLabel', p_tier_label,
    'customerCount', COALESCE(v_customer_count, 0),
    'totalRevenue', COALESCE(v_total_revenue, 0),
    'estimatedEquity', COALESCE(v_estimated_equity, 0),
    'avgRevenuePerCustomer', CASE WHEN COALESCE(v_customer_count, 0) > 0 THEN v_total_revenue / v_customer_count ELSE 0 END
  );
END;
$$;

-- 3. CDP RFM Summary RPC
CREATE OR REPLACE FUNCTION public.get_cdp_rfm_summary(
  p_tenant_id uuid,
  p_rfm_segment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_count integer;
  v_total_revenue numeric;
  v_estimated_equity numeric;
  v_customer_ids uuid[];
BEGIN
  -- Get customers with this RFM segment
  SELECT array_agg(id), COUNT(*)::int
  INTO v_customer_ids, v_customer_count
  FROM cdp_customers
  WHERE tenant_id = p_tenant_id
    AND rfm_segment ILIKE p_rfm_segment;

  IF v_customer_ids IS NULL OR array_length(v_customer_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'tierLabel', p_rfm_segment,
      'customerCount', 0,
      'totalRevenue', 0,
      'estimatedEquity', 0,
      'avgRevenuePerCustomer', 0
    );
  END IF;

  -- Get revenue from audience summary
  SELECT COALESCE(SUM(total_net_revenue), 0)
  INTO v_total_revenue
  FROM v_audience_customer_summary
  WHERE tenant_id = p_tenant_id
    AND customer_id = ANY(v_customer_ids);

  -- Get equity
  SELECT COALESCE(SUM(equity_12m), 0)
  INTO v_estimated_equity
  FROM cdp_customer_equity_computed
  WHERE tenant_id = p_tenant_id
    AND customer_id = ANY(v_customer_ids);

  RETURN jsonb_build_object(
    'tierLabel', p_rfm_segment,
    'customerCount', v_customer_count,
    'totalRevenue', v_total_revenue,
    'estimatedEquity', v_estimated_equity,
    'avgRevenuePerCustomer', CASE WHEN v_customer_count > 0 THEN v_total_revenue / v_customer_count ELSE 0 END
  );
END;
$$;

-- 4. Cash Flow Summary RPC
-- Replaces .reduce() in useCashFlowDirect.ts
CREATE OR REPLACE FUNCTION public.get_cash_flow_summary(
  p_tenant_id uuid,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totalInflows', COALESCE(SUM(
      cash_from_customers + cash_from_interest_received + cash_from_other_operating +
      cash_from_asset_sales + cash_from_loans + cash_from_equity
    ), 0),
    'totalOutflows', COALESCE(SUM(
      cash_to_suppliers + cash_to_employees + cash_for_rent + 
      cash_for_utilities + cash_for_taxes + cash_for_interest_paid + 
      cash_for_other_operating + cash_for_asset_purchases + 
      cash_for_investments + cash_for_loan_repayments + cash_for_dividends
    ), 0),
    'netChange', COALESCE(SUM(
      (cash_from_customers + cash_from_interest_received + cash_from_other_operating +
       cash_from_asset_sales + cash_from_loans + cash_from_equity) -
      (cash_to_suppliers + cash_to_employees + cash_for_rent + 
       cash_for_utilities + cash_for_taxes + cash_for_interest_paid + 
       cash_for_other_operating + cash_for_asset_purchases + 
       cash_for_investments + cash_for_loan_repayments + cash_for_dividends)
    ), 0),
    'operatingCashFlow', COALESCE(SUM(net_cash_operating), 0),
    'investingCashFlow', COALESCE(SUM(net_cash_investing), 0),
    'financingCashFlow', COALESCE(SUM(net_cash_financing), 0)
  )
  INTO v_result
  FROM cash_flow_direct
  WHERE tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR period_start >= p_start_date::date)
    AND (p_end_date IS NULL OR period_end <= p_end_date::date);

  RETURN v_result;
END;
$$;

-- 5. Reconciliation Stats RPC
-- Replaces .reduce()/.filter() in useEcommerceReconciliation.ts
CREATE OR REPLACE FUNCTION public.get_reconciliation_stats(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ecommerce jsonb;
  v_shipping jsonb;
  v_settlement jsonb;
BEGIN
  -- Ecommerce stats
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(wallet_amount), 0),
    'variance', COALESCE(SUM(
      COALESCE(wallet_amount, 0) - COALESCE(cod_collected, 0) - COALESCE(bank_transfer_amount, 0)
    ), 0),
    'pendingCount', COUNT(*) FILTER (WHERE reconcile_status = 'pending' AND NOT COALESCE(is_processed, false)),
    'reconciledCount', COUNT(*) FILTER (WHERE reconcile_status = 'reconciled'),
    'orderCount', COUNT(*)
  )
  INTO v_ecommerce
  FROM ecommerce_orders
  WHERE tenant_id = p_tenant_id;

  -- Shipping stats
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(
      COALESCE(cod_amount, 0) - COALESCE(shipping_fee, 0) - COALESCE(insurance_fee, 0) - COALESCE(other_fee, 0)
    ), 0),
    'pendingCount', COUNT(*) FILTER (WHERE reconcile_status = 'pending' AND NOT COALESCE(is_processed, false)),
    'reconciledCount', COUNT(*) FILTER (WHERE reconcile_status = 'reconciled'),
    'orderCount', COUNT(*)
  )
  INTO v_shipping
  FROM shipping_orders
  WHERE tenant_id = p_tenant_id;

  -- Settlement stats
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(net_amount), 0),
    'pendingCount', COUNT(*) FILTER (WHERE NOT COALESCE(is_reconciled, false)),
    'reconciledCount', COUNT(*) FILTER (WHERE COALESCE(is_reconciled, false)),
    'count', COUNT(*)
  )
  INTO v_settlement
  FROM channel_settlements
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'ecommerce', v_ecommerce,
    'shipping', v_shipping,
    'settlement', v_settlement
  );
END;
$$;
