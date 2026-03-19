
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
BEGIN
  -- Find the latest month with order data
  SELECT date_trunc('month', MAX(order_at))::date INTO v_latest_order_month
  FROM cdp_orders 
  WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned');
  
  IF v_latest_order_month IS NULL THEN RETURN '[]'::jsonb; END IF;
  
  v_current_month := (v_latest_order_month + interval '1 month')::date;
  
  -- === 1. ROAS ===
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
  
  -- === 2. Anonymous revenue trend (3-month avg) ===
  SELECT COALESCE(AVG(monthly_anon_rev), 0) INTO v_anon_avg_revenue
  FROM (
    SELECT SUM(net_revenue) as monthly_anon_rev
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('cancelled','returned')
      AND customer_phone IS NULL AND customer_name IS NULL AND customer_id IS NULL
      AND order_at >= (v_latest_order_month - interval '2 months')
      AND order_at < (v_latest_order_month + interval '1 month')
    GROUP BY date_trunc('month', order_at)
  ) sub;
  
  -- === 3. New customers trend (3-month avg) ===
  WITH ident_first AS (
    SELECT 
      COALESCE(customer_phone, customer_name) as ik,
      MIN(order_at) as first_at
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id 
      AND status NOT IN ('cancelled','returned')
      AND COALESCE(customer_phone, customer_name) IS NOT NULL
    GROUP BY 1
  ),
  monthly_new AS (
    SELECT 
      date_trunc('month', f.first_at)::date as m,
      COUNT(DISTINCT f.ik) as new_count,
      SUM(o.net_revenue) as new_rev
    FROM ident_first f
    JOIN cdp_orders o ON o.tenant_id = p_tenant_id 
      AND COALESCE(o.customer_phone, o.customer_name) = f.ik
      AND date_trunc('month', o.order_at) = date_trunc('month', f.first_at)
      AND o.status NOT IN ('cancelled','returned')
    WHERE f.first_at >= (v_latest_order_month - interval '2 months')
      AND f.first_at < (v_latest_order_month + interval '1 month')
    GROUP BY 1
  )
  SELECT COALESCE(AVG(new_count), 0), COALESCE(AVG(CASE WHEN new_count > 0 THEN new_rev / new_count END), 0)
  INTO v_new_customers_avg, v_aov_new
  FROM monthly_new;
  
  -- === 4. Build cohort retention from actual cdp_orders data ===
  CREATE TEMP TABLE _fc_cohort_ret (
    cohort_month date,
    cohort_size int,
    age_months int,
    retention_rate numeric,
    avg_revenue_per_customer numeric
  ) ON COMMIT DROP;
  
  INSERT INTO _fc_cohort_ret
  WITH ident_orders AS (
    SELECT 
      COALESCE(customer_phone, customer_name) as ik,
      date_trunc('month', order_at)::date as order_month,
      SUM(net_revenue) as revenue
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('cancelled','returned')
      AND COALESCE(customer_phone, customer_name) IS NOT NULL
      AND order_at >= (v_latest_order_month - interval '14 months')
    GROUP BY 1, 2
  ),
  first_month AS (
    SELECT ik, MIN(order_month) as cohort_month
    FROM ident_orders GROUP BY 1
  ),
  cohort_sizes AS (
    SELECT cohort_month, COUNT(DISTINCT ik) as cohort_size
    FROM first_month GROUP BY 1
  ),
  cohort_activity AS (
    SELECT 
      fm.cohort_month,
      io.order_month,
      COUNT(DISTINCT io.ik) as active_customers,
      SUM(io.revenue) as total_revenue
    FROM ident_orders io
    JOIN first_month fm ON io.ik = fm.ik
    WHERE io.order_month > fm.cohort_month
    GROUP BY 1, 2
  )
  SELECT 
    ca.cohort_month,
    cs.cohort_size,
    (EXTRACT(YEAR FROM age(ca.order_month, ca.cohort_month)) * 12 + 
     EXTRACT(MONTH FROM age(ca.order_month, ca.cohort_month)))::int as age_months,
    ca.active_customers::numeric / NULLIF(cs.cohort_size, 0) as retention_rate,
    ca.total_revenue::numeric / NULLIF(ca.active_customers, 0) as avg_revenue_per_customer
  FROM cohort_activity ca
  JOIN cohort_sizes cs ON ca.cohort_month = cs.cohort_month;
  
  -- === 5. Average retention curve ===
  CREATE TEMP TABLE _fc_avg_ret (
    age_months int,
    avg_retention numeric,
    avg_rev_per_customer numeric
  ) ON COMMIT DROP;
  
  INSERT INTO _fc_avg_ret
  SELECT 
    age_months,
    AVG(retention_rate),
    AVG(avg_revenue_per_customer)
  FROM _fc_cohort_ret
  WHERE age_months BETWEEN 1 AND 15
  GROUP BY age_months;
  
  -- === 6. Generate forecast ===
  FOR i IN 0..(p_horizon_months - 1) LOOP
    v_month := v_current_month + (i || ' months')::interval;
    v_growth_factor := POWER(1 + p_growth_adj / 100.0, i);
    v_returning_revenue := 0;
    v_cohort_json := '[]'::jsonb;
    
    FOR cohort_rec IN 
      SELECT DISTINCT cr.cohort_month, cr.cohort_size
      FROM _fc_cohort_ret cr
      WHERE cr.cohort_month < v_month
      ORDER BY cr.cohort_month
    LOOP
      DECLARE
        v_age int;
        v_ret numeric;
        v_rev_per numeric;
        v_cohort_rev numeric;
        v_ret_customers numeric;
        v_closest_age int;
        v_closest_ret numeric;
        v_closest_rev numeric;
      BEGIN
        v_age := (EXTRACT(YEAR FROM age(v_month, cohort_rec.cohort_month)) * 12 +
                  EXTRACT(MONTH FROM age(v_month, cohort_rec.cohort_month)))::int;
        
        SELECT retention_rate, avg_revenue_per_customer 
        INTO v_ret, v_rev_per
        FROM _fc_cohort_ret
        WHERE cohort_month = cohort_rec.cohort_month AND age_months = v_age;
        
        IF v_ret IS NULL THEN
          SELECT avg_retention, avg_rev_per_customer
          INTO v_ret, v_rev_per
          FROM _fc_avg_ret WHERE age_months = v_age;
        END IF;
        
        IF v_ret IS NULL THEN
          SELECT age_months, avg_retention, avg_rev_per_customer
          INTO v_closest_age, v_closest_ret, v_closest_rev
          FROM _fc_avg_ret
          ORDER BY age_months DESC LIMIT 1;
          
          IF v_closest_ret IS NOT NULL AND v_closest_age IS NOT NULL THEN
            v_ret := v_closest_ret * POWER(0.95, GREATEST(v_age - v_closest_age, 0));
            v_rev_per := v_closest_rev;
          ELSE
            v_ret := 0;
            v_rev_per := 0;
          END IF;
        END IF;
        
        v_ret_customers := ROUND(cohort_rec.cohort_size * COALESCE(v_ret, 0));
        v_cohort_rev := v_ret_customers * COALESCE(v_rev_per, 0);
        
        IF v_ret_customers > 0 THEN
          v_returning_revenue := v_returning_revenue + v_cohort_rev;
          v_cohort_json := v_cohort_json || jsonb_build_object(
            'cohort_month', to_char(cohort_rec.cohort_month, 'YYYY-MM'),
            'cohort_size', cohort_rec.cohort_size,
            'retention_pct', ROUND(COALESCE(v_ret, 0) * 100, 1),
            'returning_customers', v_ret_customers,
            'revenue', ROUND(v_cohort_rev)
          );
        END IF;
      END;
    END LOOP;
    
    -- Add anonymous revenue trend
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
