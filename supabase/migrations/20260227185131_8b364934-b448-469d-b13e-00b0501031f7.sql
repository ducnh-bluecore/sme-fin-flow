
-- ============================================
-- BATCH 4: CDP Segments, OpEx Breakdown, Decision Outcome Stats
-- ============================================

-- 1. CDP Segment Summaries with percent_of_total computed server-side
CREATE OR REPLACE FUNCTION public.get_cdp_segment_summaries_computed(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(row_data)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'segment', s.segment,
      'customer_count', s.customer_count,
      'percent_of_total', CASE WHEN totals.total_customers > 0 
        THEN round((s.customer_count::numeric / totals.total_customers) * 100, 2)
        ELSE 0 END,
      'segment_revenue', s.segment_revenue,
      'avg_revenue_per_customer', s.avg_revenue_per_customer,
      'avg_margin_per_customer', CASE WHEN s.customer_count > 0 
        THEN round(s.segment_margin::numeric / s.customer_count, 2)
        ELSE 0 END,
      'avg_orders_per_customer', s.avg_orders_per_customer
    ) AS row_data
    FROM v_cdp_segment_summaries s
    CROSS JOIN (
      SELECT COALESCE(SUM(customer_count), 0) AS total_customers
      FROM v_cdp_segment_summaries
      WHERE tenant_id = p_tenant_id
    ) totals
    WHERE s.tenant_id = p_tenant_id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 2. OpEx Breakdown - categorize expenses server-side
CREATE OR REPLACE FUNCTION public.get_opex_breakdown(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salary numeric := 0;
  v_rent numeric := 0;
  v_utilities numeric := 0;
  v_other numeric := 0;
  v_total numeric := 0;
  v_has_baseline boolean := false;
  v_has_actual boolean := false;
  v_start_of_month date;
BEGIN
  v_start_of_month := date_trunc('month', CURRENT_DATE)::date;

  -- Try baselines first
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'salary' THEN monthly_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'rent' THEN monthly_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'utilities' THEN monthly_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category NOT IN ('salary','rent','utilities') THEN monthly_amount ELSE 0 END), 0)
  INTO v_salary, v_rent, v_utilities, v_other
  FROM expense_baselines
  WHERE tenant_id = p_tenant_id AND is_active = true;

  v_total := v_salary + v_rent + v_utilities + v_other;
  
  IF v_total > 0 THEN
    v_has_baseline := true;
  ELSE
    -- Fallback to actual expenses
    SELECT
      COALESCE(SUM(CASE 
        WHEN lower(description) LIKE '%lương%' OR lower(description) LIKE '%salary%' OR lower(description) LIKE '%nhân viên%' 
        THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE 
        WHEN lower(description) LIKE '%thuê%' OR lower(description) LIKE '%rent%' OR lower(description) LIKE '%mặt bằng%' 
        THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE 
        WHEN lower(description) LIKE '%điện%' OR lower(description) LIKE '%nước%' OR lower(description) LIKE '%internet%' OR lower(description) LIKE '%utility%' 
        THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE 
        WHEN lower(description) NOT LIKE '%lương%' AND lower(description) NOT LIKE '%salary%' AND lower(description) NOT LIKE '%nhân viên%'
          AND lower(description) NOT LIKE '%thuê%' AND lower(description) NOT LIKE '%rent%' AND lower(description) NOT LIKE '%mặt bằng%'
          AND lower(description) NOT LIKE '%điện%' AND lower(description) NOT LIKE '%nước%' AND lower(description) NOT LIKE '%internet%' AND lower(description) NOT LIKE '%utility%'
        THEN amount ELSE 0 END), 0)
    INTO v_salary, v_rent, v_utilities, v_other
    FROM expenses
    WHERE tenant_id = p_tenant_id AND expense_date >= v_start_of_month;

    v_total := v_salary + v_rent + v_utilities + v_other;
    IF v_total > 0 THEN
      v_has_actual := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'salary', v_salary,
    'rent', v_rent,
    'utilities', v_utilities,
    'other', v_other,
    'total', v_total,
    'has_baseline', v_has_baseline,
    'has_actual', v_has_actual,
    'categories', jsonb_build_array(
      jsonb_build_object('category', 'salary', 'label', 'Lương nhân viên', 'amount', v_salary, 
        'percent_of_total', CASE WHEN v_total > 0 THEN round((v_salary / v_total) * 100, 2) ELSE 0 END,
        'source', CASE WHEN v_has_baseline THEN 'baseline' ELSE 'actual' END),
      jsonb_build_object('category', 'rent', 'label', 'Thuê mặt bằng', 'amount', v_rent, 
        'percent_of_total', CASE WHEN v_total > 0 THEN round((v_rent / v_total) * 100, 2) ELSE 0 END,
        'source', CASE WHEN v_has_baseline THEN 'baseline' ELSE 'actual' END),
      jsonb_build_object('category', 'utilities', 'label', 'Điện nước & Internet', 'amount', v_utilities, 
        'percent_of_total', CASE WHEN v_total > 0 THEN round((v_utilities / v_total) * 100, 2) ELSE 0 END,
        'source', CASE WHEN v_has_baseline THEN 'baseline' ELSE 'actual' END),
      jsonb_build_object('category', 'other', 'label', 'Chi phí khác', 'amount', v_other, 
        'percent_of_total', CASE WHEN v_total > 0 THEN round((v_other / v_total) * 100, 2) ELSE 0 END,
        'source', CASE WHEN v_has_baseline THEN 'baseline' ELSE 'actual' END)
    )
  );
END;
$$;

-- 3. Decision Outcome Stats - aggregate in DB
CREATE OR REPLACE FUNCTION public.get_decision_outcome_stats(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_outcomes', COUNT(*),
    'positive_count', COUNT(*) FILTER (WHERE outcome_status = 'positive'),
    'neutral_count', COUNT(*) FILTER (WHERE outcome_status = 'neutral'),
    'negative_count', COUNT(*) FILTER (WHERE outcome_status = 'negative'),
    'too_early_count', COUNT(*) FILTER (WHERE outcome_status = 'too_early'),
    'would_repeat_count', COUNT(*) FILTER (WHERE would_repeat = true),
    'total_actual_impact', COALESCE(SUM(actual_impact_amount), 0),
    'avg_variance_percent', CASE WHEN COUNT(*) > 0 
      THEN round(COALESCE(AVG(impact_variance), 0)::numeric, 2)
      ELSE 0 END,
    'success_rate', CASE WHEN COUNT(*) > 0 
      THEN round((COUNT(*) FILTER (WHERE outcome_status = 'positive')::numeric / COUNT(*)) * 100, 2)
      ELSE 0 END
  )
  INTO v_result
  FROM decision_outcomes
  WHERE tenant_id = p_tenant_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;
