
CREATE OR REPLACE FUNCTION public.forecast_revenue_cohort_based(
  p_tenant_id uuid,
  p_horizon_months int DEFAULT 3,
  p_ads_spend numeric DEFAULT 0,
  p_roas_override numeric DEFAULT NULL,
  p_growth_adj numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_current_month date;
  v_latest_order_month date;
  v_roas numeric;
  v_anon_avg_revenue numeric;
  v_new_customers_avg numeric;
  v_aov_new numeric;
  cohort_rec record;
  v_month date;
  v_cohort_json jsonb;
  v_returning_revenue numeric;
  v_new_revenue numeric;
  v_ads_revenue numeric;
  v_total_base numeric;
  v_growth_factor numeric;
  i int;
  v_age int;
  v_ret numeric;
  v_rev_per numeric;
  v_cohort_rev numeric;
  v_ret_customers numeric;
  v_closest_age int;
  v_closest_ret numeric;
  v_closest_rev numeric;
BEGIN
  SELECT date_trunc('month', MAX(order_at))::date INTO v_latest_order_month
  FROM cdp_orders 
  WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned');
  
  IF v_latest_order_month IS NULL THEN RETURN '[]'::jsonb; END IF;
  v_current_month := (v_latest_order_month + interval '1 month')::date;
  
  -- ROAS
  IF p_roas_override IS NOT NULL THEN
    v_roas := p_roas_override;
  ELSE
    SELECT COALESCE(
      CASE WHEN SUM(expense) > 0 
        THEN SUM(COALESCE(direct_order_amount,0) + COALESCE(broad_order_amount,0)) / NULLIF(SUM(expense),0)
      END, 3.0
    ) INTO v_roas
    FROM ad_spend_daily 
    WHERE tenant_id = p_tenant_id
      AND spend_date >= (v_latest_order_month - interval '3 months')::date;
  END IF;
  
  -- Anonymous revenue (3mo avg)
  SELECT COALESCE(AVG(mr), 0) INTO v_anon_avg_revenue
  FROM (
    SELECT SUM(net_revenue) as mr
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
      AND customer_phone IS NULL AND customer_name IS NULL AND customer_id IS NULL
      AND order_at >= (v_latest_order_month - interval '2 months')
      AND order_at < (v_latest_order_month + interval '1 month')
    GROUP BY date_trunc('month', order_at)
  ) s;
  
  -- New customers (3mo avg)
  WITH ident_first AS (
    SELECT COALESCE(customer_phone, customer_name) as ik, MIN(order_at) as first_at
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
      AND COALESCE(customer_phone, customer_name) IS NOT NULL
    GROUP BY 1
  ),
  monthly_new AS (
    SELECT date_trunc('month', f.first_at)::date as m,
      COUNT(DISTINCT f.ik) as nc,
      SUM(o.net_revenue) as nr
    FROM ident_first f
    JOIN cdp_orders o ON o.tenant_id = p_tenant_id 
      AND COALESCE(o.customer_phone, o.customer_name) = f.ik
      AND date_trunc('month', o.order_at) = date_trunc('month', f.first_at)
      AND o.status NOT IN ('cancelled','returned')
    WHERE f.first_at >= (v_latest_order_month - interval '2 months')
      AND f.first_at < (v_latest_order_month + interval '1 month')
    GROUP BY 1
  )
  SELECT COALESCE(AVG(nc), 0), COALESCE(AVG(CASE WHEN nc > 0 THEN nr / nc END), 0)
  INTO v_new_customers_avg, v_aov_new FROM monthly_new;

  -- Forecast loop
  FOR i IN 0..(p_horizon_months - 1) LOOP
    v_month := v_current_month + (i || ' months')::interval;
    v_growth_factor := POWER(1 + p_growth_adj / 100.0, i);
    v_returning_revenue := 0;
    v_cohort_json := '[]'::jsonb;
    
    -- For each cohort, calculate returning revenue
    FOR cohort_rec IN
      WITH io AS (
        SELECT COALESCE(customer_phone, customer_name) as ik,
          date_trunc('month', order_at)::date as om, SUM(net_revenue) as rev
        FROM cdp_orders
        WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
          AND COALESCE(customer_phone, customer_name) IS NOT NULL
          AND order_at >= (v_latest_order_month - interval '14 months')
        GROUP BY 1, 2
      ),
      fm AS (SELECT ik, MIN(om) as cm FROM io GROUP BY 1),
      cs AS (SELECT cm as cohort_month, COUNT(DISTINCT ik) as cohort_size FROM fm GROUP BY 1),
      ca AS (
        SELECT fm.cm as cohort_month, io.om as order_month,
          COUNT(DISTINCT io.ik) as ac, SUM(io.rev) as tr
        FROM io JOIN fm ON io.ik = fm.ik WHERE io.om > fm.cm GROUP BY 1, 2
      ),
      retention AS (
        SELECT ca.cohort_month, cs.cohort_size,
          (EXTRACT(YEAR FROM age(ca.order_month, ca.cohort_month))*12 + EXTRACT(MONTH FROM age(ca.order_month, ca.cohort_month)))::int as age_m,
          ca.ac::numeric / NULLIF(cs.cohort_size,0) as rr,
          ca.tr::numeric / NULLIF(ca.ac,0) as arpc
        FROM ca JOIN cs ON ca.cohort_month = cs.cohort_month
      ),
      avg_ret AS (
        SELECT age_m, AVG(rr) as ar, AVG(arpc) as arev FROM retention WHERE age_m BETWEEN 1 AND 15 GROUP BY age_m
      ),
      distinct_cohorts AS (
        SELECT DISTINCT cohort_month, cohort_size FROM retention WHERE cohort_month < v_month
      ),
      forecast_per_cohort AS (
        SELECT 
          dc.cohort_month,
          dc.cohort_size,
          (EXTRACT(YEAR FROM age(v_month, dc.cohort_month))*12 + EXTRACT(MONTH FROM age(v_month, dc.cohort_month)))::int as target_age,
          -- Try exact cohort retention
          r_exact.rr as exact_ret,
          r_exact.arpc as exact_rev,
          -- Try avg retention
          ar.ar as avg_ret_val,
          ar.arev as avg_rev_val,
          -- Closest for extrapolation
          (SELECT age_m FROM avg_ret ORDER BY age_m DESC LIMIT 1) as max_age,
          (SELECT ar FROM avg_ret ORDER BY age_m DESC LIMIT 1) as max_ar,
          (SELECT arev FROM avg_ret ORDER BY age_m DESC LIMIT 1) as max_arev
        FROM distinct_cohorts dc
        LEFT JOIN retention r_exact ON r_exact.cohort_month = dc.cohort_month 
          AND r_exact.age_m = (EXTRACT(YEAR FROM age(v_month, dc.cohort_month))*12 + EXTRACT(MONTH FROM age(v_month, dc.cohort_month)))::int
        LEFT JOIN avg_ret ar ON ar.age_m = (EXTRACT(YEAR FROM age(v_month, dc.cohort_month))*12 + EXTRACT(MONTH FROM age(v_month, dc.cohort_month)))::int
      )
      SELECT 
        cohort_month, cohort_size, target_age,
        COALESCE(exact_ret, avg_ret_val, 
          CASE WHEN max_ar IS NOT NULL AND max_age IS NOT NULL 
            THEN max_ar * POWER(0.95, GREATEST(target_age - max_age, 0)) END, 0) as final_ret,
        COALESCE(exact_rev, avg_rev_val, max_arev, 0) as final_rev
      FROM forecast_per_cohort
    LOOP
      v_ret_customers := ROUND(cohort_rec.cohort_size * cohort_rec.final_ret);
      v_cohort_rev := v_ret_customers * cohort_rec.final_rev;
      
      IF v_ret_customers > 0 THEN
        v_returning_revenue := v_returning_revenue + v_cohort_rev;
        v_cohort_json := v_cohort_json || jsonb_build_object(
          'cohort_month', to_char(cohort_rec.cohort_month, 'YYYY-MM'),
          'cohort_size', cohort_rec.cohort_size,
          'retention_pct', ROUND(cohort_rec.final_ret * 100, 1),
          'returning_customers', v_ret_customers,
          'revenue', ROUND(v_cohort_rev)
        );
      END IF;
    END LOOP;
    
    -- Anonymous
    v_returning_revenue := v_returning_revenue + (v_anon_avg_revenue * v_growth_factor);
    v_new_revenue := v_new_customers_avg * v_aov_new * v_growth_factor;
    v_ads_revenue := p_ads_spend * v_roas;
    v_total_base := v_returning_revenue + v_new_revenue + v_ads_revenue;
    
    v_result := v_result || jsonb_build_object(
      'month', to_char(v_month, 'YYYY-MM'),
      'returning_revenue', ROUND(v_returning_revenue),
      'returning_breakdown', v_cohort_json,
      'new_revenue', ROUND(v_new_revenue),
      'new_customers', ROUND(v_new_customers_avg * v_growth_factor),
      'ads_revenue', ROUND(v_ads_revenue),
      'ads_spend', p_ads_spend,
      'roas', ROUND(v_roas, 2),
      'total_conservative', ROUND(v_total_base * 0.85),
      'total_base', ROUND(v_total_base),
      'total_optimistic', ROUND(v_total_base * 1.15),
      'growth_factor', ROUND(v_growth_factor, 3)
    );
  END LOOP;
  
  RETURN v_result;
END;
$$;
