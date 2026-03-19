
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
  v_ret_m1 numeric; v_ret_m2 numeric; v_ret_m3 numeric;
  v_new_m1 numeric; v_new_m2 numeric; v_new_m3 numeric;
  v_anon_m1 numeric; v_anon_m2 numeric; v_anon_m3 numeric;
  v_newcust_m1 int; v_newcust_m2 int; v_newcust_m3 int;
  v_returning_base numeric;
  v_new_base numeric;
  v_anon_base numeric;
  v_newcust_base numeric;
  v_monthly_decay numeric;
  v_month date;
  v_growth_factor numeric;
  v_returning_revenue numeric;
  v_new_revenue numeric;
  v_ads_revenue numeric;
  v_anon_revenue numeric;
  v_total_base numeric;
  v_cohort_json jsonb;
  i int;
  cohort_rec record;
BEGIN
  -- Latest month with data
  SELECT date_trunc('month', MAX(order_at))::date INTO v_latest_order_month
  FROM cdp_orders WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned');
  IF v_latest_order_month IS NULL THEN RETURN '[]'::jsonb; END IF;
  v_current_month := (v_latest_order_month + interval '1 month')::date;

  -- ROAS
  IF p_roas_override IS NOT NULL THEN v_roas := p_roas_override;
  ELSE
    SELECT COALESCE(
      CASE WHEN SUM(expense) > 0 THEN SUM(COALESCE(direct_order_amount,0)+COALESCE(broad_order_amount,0))/NULLIF(SUM(expense),0) END, 3.0
    ) INTO v_roas FROM ad_spend_daily 
    WHERE tenant_id = p_tenant_id AND spend_date >= (v_latest_order_month - interval '3 months')::date;
  END IF;

  -- === PRE-AGGREGATE: Monthly revenue by type (3 months) ===
  -- Use simple aggregation without heavy identity joins
  -- Bucket: anonymous (no name, no phone, no id), identified (has name or phone or id)
  WITH monthly_totals AS (
    SELECT 
      date_trunc('month', order_at)::date as m,
      SUM(net_revenue) as total_rev,
      SUM(CASE WHEN customer_name IS NULL AND (customer_phone IS NULL OR LENGTH(customer_phone) < 10) AND customer_id IS NULL 
        THEN net_revenue ELSE 0 END) as anon_rev,
      SUM(CASE WHEN customer_name IS NOT NULL OR (customer_phone IS NOT NULL AND LENGTH(customer_phone) >= 10) OR customer_id IS NOT NULL
        THEN net_revenue ELSE 0 END) as identified_rev
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
      AND order_at >= (v_latest_order_month - interval '2 months') AND order_at < (v_latest_order_month + interval '1 month')
    GROUP BY 1
  ),
  -- New customer count per month (using simple first-order check)
  new_counts AS (
    SELECT 
      date_trunc('month', order_at)::date as m,
      COUNT(DISTINCT customer_name) as new_names
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id AND o.status NOT IN ('cancelled','returned')
      AND o.customer_name IS NOT NULL
      AND o.order_at >= (v_latest_order_month - interval '2 months') AND o.order_at < (v_latest_order_month + interval '1 month')
      AND NOT EXISTS (
        SELECT 1 FROM cdp_orders o2 
        WHERE o2.tenant_id = p_tenant_id AND o2.status NOT IN ('cancelled','returned')
          AND o2.customer_name = o.customer_name
          AND o2.order_at < date_trunc('month', o.order_at)
        LIMIT 1
      )
    GROUP BY 1
  )
  SELECT
    -- Returning = identified - new_revenue (approx)
    MAX(CASE WHEN mt.m = v_latest_order_month THEN mt.identified_rev END),
    MAX(CASE WHEN mt.m = (v_latest_order_month - interval '1 month')::date THEN mt.identified_rev END),
    MAX(CASE WHEN mt.m = (v_latest_order_month - interval '2 months')::date THEN mt.identified_rev END),
    -- New customer counts
    MAX(CASE WHEN nc.m = v_latest_order_month THEN nc.new_names END),
    MAX(CASE WHEN nc.m = (v_latest_order_month - interval '1 month')::date THEN nc.new_names END),
    MAX(CASE WHEN nc.m = (v_latest_order_month - interval '2 months')::date THEN nc.new_names END),
    -- Anonymous
    MAX(CASE WHEN mt.m = v_latest_order_month THEN mt.anon_rev END),
    MAX(CASE WHEN mt.m = (v_latest_order_month - interval '1 month')::date THEN mt.anon_rev END),
    MAX(CASE WHEN mt.m = (v_latest_order_month - interval '2 months')::date THEN mt.anon_rev END)
  INTO v_ret_m1, v_ret_m2, v_ret_m3,
       v_newcust_m1, v_newcust_m2, v_newcust_m3,
       v_anon_m1, v_anon_m2, v_anon_m3
  FROM monthly_totals mt
  LEFT JOIN new_counts nc ON mt.m = nc.m;

  -- Estimate new revenue from new customer count × AOV
  -- AOV for new = total_identified / total_identified_customers (simplified)
  SELECT COALESCE(AVG(CASE WHEN net_revenue > 0 THEN net_revenue END), 500000)
  INTO v_new_m1
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
    AND customer_name IS NOT NULL
    AND order_at >= v_latest_order_month AND order_at < (v_latest_order_month + interval '1 month')
  LIMIT 1000;

  -- Use identified revenue as returning base (includes new, but simpler + faster)
  v_returning_base := COALESCE(v_ret_m1,0)*0.4 + COALESCE(v_ret_m2,0)*0.35 + COALESCE(v_ret_m3,0)*0.25;
  v_anon_base := COALESCE(v_anon_m1,0)*0.4 + COALESCE(v_anon_m2,0)*0.35 + COALESCE(v_anon_m3,0)*0.25;
  v_newcust_base := ROUND(COALESCE(v_newcust_m1,0)*0.4 + COALESCE(v_newcust_m2,0)*0.35 + COALESCE(v_newcust_m3,0)*0.25);
  v_new_base := v_newcust_base * COALESCE(v_new_m1, 500000);

  -- Subtract new from returning to avoid double-count
  v_returning_base := GREATEST(v_returning_base - v_new_base, 0);

  -- MoM decay from total revenue trend
  WITH monthly_rev AS (
    SELECT date_trunc('month', order_at)::date as m, SUM(net_revenue) as rev
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
      AND order_at >= (v_latest_order_month - interval '5 months') AND order_at < (v_latest_order_month + interval '1 month')
    GROUP BY 1 ORDER BY 1
  ),
  mom AS (SELECT rev, LAG(rev) OVER (ORDER BY m) as prev FROM monthly_rev)
  SELECT COALESCE(AVG(CASE WHEN prev > 0 THEN rev/prev END), 1.0) INTO v_monthly_decay
  FROM mom WHERE prev IS NOT NULL;
  v_monthly_decay := GREATEST(0.85, LEAST(1.1, v_monthly_decay));

  -- === PRE-COMPUTE cohort breakdown once (latest month only, top 15) ===
  v_cohort_json := '[]'::jsonb;
  FOR cohort_rec IN
    WITH recent_customers AS (
      SELECT customer_name as cn, MIN(order_at) as first_at, 
        SUM(CASE WHEN order_at >= v_latest_order_month AND order_at < (v_latest_order_month + interval '1 month') THEN net_revenue ELSE 0 END) as latest_rev,
        COUNT(CASE WHEN order_at >= v_latest_order_month AND order_at < (v_latest_order_month + interval '1 month') THEN 1 END) as latest_orders
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
        AND customer_name IS NOT NULL
        AND order_at >= (v_latest_order_month - interval '12 months')
      GROUP BY customer_name
      HAVING COUNT(CASE WHEN order_at >= v_latest_order_month AND order_at < (v_latest_order_month + interval '1 month') THEN 1 END) > 0
    ),
    cohort_summary AS (
      SELECT 
        to_char(date_trunc('month', first_at), 'YYYY-MM') as cohort_month,
        COUNT(*) as cohort_active,
        SUM(latest_rev) as cohort_rev
      FROM recent_customers
      WHERE date_trunc('month', first_at) < v_latest_order_month
      GROUP BY 1
    )
    SELECT cohort_month, cohort_active, cohort_rev
    FROM cohort_summary WHERE cohort_rev > 0
    ORDER BY cohort_rev DESC LIMIT 12
  LOOP
    v_cohort_json := v_cohort_json || jsonb_build_object(
      'cohort_month', cohort_rec.cohort_month,
      'cohort_size', cohort_rec.cohort_active,
      'retention_pct', 0,
      'returning_customers', cohort_rec.cohort_active,
      'revenue', ROUND(cohort_rec.cohort_rev)
    );
  END LOOP;

  -- === GENERATE FORECAST (lightweight loop) ===
  FOR i IN 0..(p_horizon_months - 1) LOOP
    v_month := v_current_month + (i || ' months')::interval;
    v_growth_factor := POWER(1 + p_growth_adj / 100.0, i);
    
    IF i = 0 THEN
      v_returning_revenue := v_returning_base * v_growth_factor;
    ELSE
      v_returning_revenue := v_returning_base * POWER(v_monthly_decay, i) * v_growth_factor;
    END IF;
    
    v_new_revenue := v_new_base * v_growth_factor;
    v_anon_revenue := v_anon_base * v_growth_factor;
    v_ads_revenue := p_ads_spend * v_roas;
    v_total_base := v_returning_revenue + v_new_revenue + v_anon_revenue + v_ads_revenue;
    
    -- Scale cohort breakdown for future months
    DECLARE
      v_scale numeric;
      v_scaled_cohort jsonb := '[]'::jsonb;
      j int;
    BEGIN
      v_scale := CASE WHEN i = 0 THEN 1 ELSE POWER(v_monthly_decay, i) * v_growth_factor END;
      FOR j IN 0..jsonb_array_length(v_cohort_json)-1 LOOP
        v_scaled_cohort := v_scaled_cohort || jsonb_build_object(
          'cohort_month', v_cohort_json->j->>'cohort_month',
          'cohort_size', (v_cohort_json->j->>'cohort_size')::int,
          'retention_pct', (v_cohort_json->j->>'retention_pct')::numeric,
          'returning_customers', (v_cohort_json->j->>'returning_customers')::int,
          'revenue', ROUND(((v_cohort_json->j->>'revenue')::numeric) * v_scale)
        );
      END LOOP;
      
      v_result := v_result || jsonb_build_object(
        'month', to_char(v_month, 'YYYY-MM'),
        'returning_revenue', ROUND(v_returning_revenue + v_anon_revenue),
        'returning_breakdown', v_scaled_cohort,
        'new_revenue', ROUND(v_new_revenue),
        'new_customers', ROUND(v_newcust_base * v_growth_factor),
        'ads_revenue', ROUND(v_ads_revenue),
        'ads_spend', p_ads_spend,
        'roas', ROUND(v_roas, 2),
        'total_conservative', ROUND(v_total_base * 0.85),
        'total_base', ROUND(v_total_base),
        'total_optimistic', ROUND(v_total_base * 1.15),
        'growth_factor', ROUND(v_growth_factor, 3)
      );
    END;
  END LOOP;
  
  RETURN v_result;
END;
$$;
