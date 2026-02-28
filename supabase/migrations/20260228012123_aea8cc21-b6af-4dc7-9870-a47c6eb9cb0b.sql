
-- ============================================
-- Batch 6: Variance, Revenue, Decision, Strategic RPCs
-- ============================================

-- 1. Variance Analysis: aggregate revenue/expense totals per period
CREATE OR REPLACE FUNCTION public.get_variance_period_totals(
  p_tenant_id uuid,
  p_current_start date,
  p_current_end date,
  p_prior_start date,
  p_prior_end date,
  p_py_start date,
  p_py_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual_revenue numeric := 0;
  v_actual_expense numeric := 0;
  v_prior_revenue numeric := 0;
  v_prior_expense numeric := 0;
  v_py_revenue numeric := 0;
  v_py_expense numeric := 0;
BEGIN
  -- Current period revenue from cdp_orders
  SELECT COALESCE(SUM(total_amount), 0) INTO v_actual_revenue
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_date >= p_current_start AND order_date <= p_current_end
    AND status = 'delivered';

  -- Current period expenses
  SELECT COALESCE(SUM(total_amount), 0) INTO v_actual_expense
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= p_current_start AND expense_date <= p_current_end;

  -- Prior period revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO v_prior_revenue
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_date >= p_prior_start AND order_date <= p_prior_end
    AND status = 'delivered';

  -- Prior period expenses
  SELECT COALESCE(SUM(total_amount), 0) INTO v_prior_expense
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= p_prior_start AND expense_date <= p_prior_end;

  -- Prior year revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO v_py_revenue
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_date >= p_py_start AND order_date <= p_py_end
    AND status = 'delivered';

  -- Prior year expenses
  SELECT COALESCE(SUM(total_amount), 0) INTO v_py_expense
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= p_py_start AND expense_date <= p_py_end;

  RETURN jsonb_build_object(
    'actual_revenue', v_actual_revenue,
    'actual_expense', v_actual_expense,
    'prior_revenue', v_prior_revenue,
    'prior_expense', v_prior_expense,
    'py_revenue', v_py_revenue,
    'py_expense', v_py_expense
  );
END;
$$;

-- 2. Revenue page summary: total manual + integrated revenue
CREATE OR REPLACE FUNCTION public.get_revenue_page_summary(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manual_revenue numeric := 0;
  v_manual_count int := 0;
  v_integrated_revenue numeric := 0;
  v_integrated_orders int := 0;
  v_prev_manual_revenue numeric := 0;
  v_top_customers jsonb;
BEGIN
  -- Manual revenues (current month)
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
  INTO v_manual_revenue, v_manual_count
  FROM revenues
  WHERE tenant_id = p_tenant_id;

  -- Integrated revenue from delivered external orders
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO v_integrated_revenue, v_integrated_orders
  FROM external_orders
  WHERE tenant_id = p_tenant_id
    AND status = 'delivered';

  -- Top 5 customers by revenue
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_top_customers
  FROM (
    SELECT 
      COALESCE(customer_name, 'Không xác định') as customer,
      SUM(amount) as total
    FROM revenues
    WHERE tenant_id = p_tenant_id
    GROUP BY COALESCE(customer_name, 'Không xác định')
    ORDER BY SUM(amount) DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'manual_revenue', v_manual_revenue,
    'manual_count', v_manual_count,
    'integrated_revenue', v_integrated_revenue,
    'integrated_orders', v_integrated_orders,
    'grand_total', v_manual_revenue + v_integrated_revenue,
    'top_customers', v_top_customers
  );
END;
$$;

-- 3. Decision center stats
CREATE OR REPLACE FUNCTION public.get_decision_center_stats(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p1 int := 0;
  v_p2 int := 0;
  v_p3 int := 0;
  v_overdue int := 0;
  v_total_impact numeric := 0;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE priority = 'P1'),
    COUNT(*) FILTER (WHERE priority = 'P2'),
    COUNT(*) FILTER (WHERE priority = 'P3'),
    COUNT(*) FILTER (WHERE status = 'OPEN' AND deadline_at < now()),
    COALESCE(SUM(impact_amount) FILTER (WHERE status = 'OPEN'), 0)
  INTO v_p1, v_p2, v_p3, v_overdue, v_total_impact
  FROM decision_cards
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'p1_count', v_p1,
    'p2_count', v_p2,
    'p3_count', v_p3,
    'overdue_count', v_overdue,
    'total_impact', v_total_impact
  );
END;
$$;

-- 4. Strategic initiatives summary
CREATE OR REPLACE FUNCTION public.get_strategic_initiatives_summary(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_budget numeric := 0;
  v_total_spent numeric := 0;
  v_avg_progress numeric := 0;
  v_in_progress int := 0;
  v_total_count int := 0;
BEGIN
  SELECT 
    COALESCE(SUM(budget), 0),
    COALESCE(SUM(spent), 0),
    COALESCE(AVG(progress), 0),
    COUNT(*) FILTER (WHERE status = 'in_progress'),
    COUNT(*)
  INTO v_total_budget, v_total_spent, v_avg_progress, v_in_progress, v_total_count
  FROM strategic_initiatives
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'total_budget', v_total_budget,
    'total_spent', v_total_spent,
    'avg_progress', v_avg_progress,
    'in_progress_count', v_in_progress,
    'total_count', v_total_count
  );
END;
$$;
