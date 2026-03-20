
CREATE OR REPLACE FUNCTION forecast_revenue_cohort_based(
  p_tenant_id uuid,
  p_horizon_months int DEFAULT 3,
  p_ads_spend numeric DEFAULT 0,
  p_roas_override numeric DEFAULT NULL,
  p_growth_adj numeric DEFAULT 0,
  p_as_of_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE
SET statement_timeout = '25s'
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_current_month date;
  v_latest_order_month date;
  v_as_of_cutoff date;
  v_roas numeric;
  v_ret_m1 numeric; v_ret_m2 numeric; v_ret_m3 numeric;
  v_anon_m1 numeric; v_anon_m2 numeric; v_anon_m3 numeric;
  v_returning_base numeric;
  v_new_base numeric;
  v_anon_base numeric;
  v_newcust_base numeric;
  v_new_m1 numeric;
  v_monthly_decay numeric;
  v_month date;
  v_growth_factor numeric;
  v_returning_revenue numeric;
  v_new_revenue numeric;
  v_ads_revenue numeric;
  v_anon_revenue numeric;
  v_total_base numeric;
  v_cohort_json jsonb;
  v_seasonal_multipliers jsonb;
  v_seasonal_mult numeric;
  v_yoy_growth_factors jsonb;
  v_yoy_factor numeric;
  v_overall_yoy numeric;
  v_ly_monthly_rev jsonb;
  v_historical_avg_ads_spend numeric;
  v_has_ads_data boolean;
  i int;
  cohort_rec record;
  seasonal_rec record;
  yoy_rec record;
  ly_rec record;
BEGIN
  -- Determine cutoff and latest month
  IF p_as_of_date IS NOT NULL THEN
    SELECT date_trunc('month', MAX(order_at))::date INTO v_latest_order_month
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
      AND order_at < p_as_of_date;
    IF v_latest_order_month IS NULL THEN RETURN '[]'::jsonb; END IF;
    v_current_month := (v_latest_order_month + interval '1 month')::date;
    v_as_of_cutoff := p_as_of_date;
  ELSE
    SELECT date_trunc('month', MAX(order_at))::date INTO v_latest_order_month
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned');
    IF v_latest_order_month IS NULL THEN RETURN '[]'::jsonb; END IF;
    v_current_month := (v_latest_order_month + interval '1 month')::date;
    v_as_of_cutoff := (v_latest_order_month + interval '1 month')::date;
  END IF;

  -- Pre-aggregate monthly data in one pass
  DROP TABLE IF EXISTS _fc_monthly;
  CREATE TEMP TABLE _fc_monthly ON COMMIT DROP AS
  SELECT 
    date_trunc('month', order_at)::date as m,
    EXTRACT(MONTH FROM order_at)::int as month_num,
    EXTRACT(YEAR FROM order_at)::int as yr,
    SUM(net_revenue) as total_rev,
    SUM(CASE WHEN customer_name IS NULL AND (customer_phone IS NULL OR LENGTH(customer_phone)<10) AND customer_id IS NULL 
        THEN net_revenue ELSE 0 END) as anon_rev,
    SUM(CASE WHEN customer_name IS NOT NULL OR (customer_phone IS NOT NULL AND LENGTH(customer_phone)>=10) OR customer_id IS NOT NULL 
        THEN net_revenue ELSE 0 END) as identified_rev,
    COUNT(*) as order_count
  FROM cdp_orders 
  WHERE tenant_id = p_tenant_id 
    AND status NOT IN ('cancelled','returned')
    AND order_at >= (v_latest_order_month - interval '24 months') 
    AND order_at < v_as_of_cutoff
  GROUP BY 1, 2, 3;

  -- Ads data check
  SELECT COUNT(*) > 0 INTO v_has_ads_data
  FROM ad_spend_daily WHERE tenant_id = p_tenant_id AND expense > 0 AND spend_date < v_as_of_cutoff;

  IF v_has_ads_data THEN
    SELECT COALESCE(AVG(monthly_spend), 0) INTO v_historical_avg_ads_spend
    FROM (
      SELECT date_trunc('month', spend_date)::date as m, SUM(expense) as monthly_spend
      FROM ad_spend_daily WHERE tenant_id = p_tenant_id AND expense > 0
        AND spend_date >= (v_latest_order_month - interval '5 months')::date
        AND spend_date < v_as_of_cutoff
      GROUP BY 1
    ) sub;
  ELSE
    v_historical_avg_ads_spend := NULL;
  END IF;

  -- Overall YoY
  SELECT COALESCE(
    SUM(CASE WHEN yr = EXTRACT(YEAR FROM v_latest_order_month)::int THEN total_rev END) /
    NULLIF(SUM(CASE WHEN yr = EXTRACT(YEAR FROM v_latest_order_month)::int - 1 THEN total_rev END), 0), 1.0
  ) INTO v_overall_yoy
  FROM _fc_monthly
  WHERE month_num <= EXTRACT(MONTH FROM v_latest_order_month)::int;
  v_overall_yoy := GREATEST(0.7, LEAST(2.0, v_overall_yoy));

  -- LY monthly rev
  v_ly_monthly_rev := '{}'::jsonb;
  FOR ly_rec IN
    SELECT month_num, total_rev as rev
    FROM _fc_monthly
    WHERE yr = EXTRACT(YEAR FROM v_latest_order_month)::int - 1
      AND m >= (v_latest_order_month - interval '24 months')::date
      AND m < (v_latest_order_month - interval '11 months')::date
  LOOP
    v_ly_monthly_rev := v_ly_monthly_rev || jsonb_build_object(ly_rec.month_num::text, ly_rec.rev);
  END LOOP;

  -- YoY growth factors
  v_yoy_growth_factors := '{}'::jsonb;
  FOR yoy_rec IN
    WITH rolling_avg AS (
      SELECT m, month_num, yr, total_rev as rev,
        AVG(total_rev) OVER (PARTITION BY yr ORDER BY m ROWS BETWEEN 2 PRECEDING AND 3 FOLLOWING) as rolling6
      FROM _fc_monthly
    ),
    yoy_pairs AS (
      SELECT a.month_num,
        CASE WHEN b.rev > 0 AND b.rolling6 > 0 THEN 0.5*(a.rev/b.rev) + 0.5*(a.rolling6/b.rolling6)
        WHEN b.rev > 0 THEN a.rev/b.rev ELSE NULL END as blended_yoy
      FROM rolling_avg a JOIN rolling_avg b ON a.month_num = b.month_num AND a.yr = b.yr + 1
    )
    SELECT month_num, AVG(blended_yoy) as avg_yoy FROM yoy_pairs WHERE blended_yoy IS NOT NULL GROUP BY month_num
  LOOP
    v_yoy_growth_factors := v_yoy_growth_factors || jsonb_build_object(yoy_rec.month_num::text, GREATEST(0.7, LEAST(2.0, yoy_rec.avg_yoy)));
  END LOOP;

  -- Seasonal multipliers
  v_seasonal_multipliers := '{}'::jsonb;
  FOR seasonal_rec IN
    WITH with_stats AS (
      SELECT m, month_num, total_rev as rev,
        (LAG(total_rev) OVER (ORDER BY m) + LEAD(total_rev) OVER (ORDER BY m)) / 2.0 as surround_avg,
        STDDEV(total_rev) OVER () as global_stddev, AVG(total_rev) OVER () as global_avg
      FROM _fc_monthly
    ),
    seasonal_index AS (
      SELECT month_num, CASE WHEN surround_avg > 0 THEN rev/surround_avg ELSE 1.0 END as ratio,
        global_stddev, global_avg
      FROM with_stats WHERE surround_avg IS NOT NULL AND surround_avg > 0
    ),
    avg_seasonal AS (
      SELECT month_num, AVG(ratio) as seasonal_idx, COUNT(*) as sample_count,
        MAX(global_stddev / NULLIF(global_avg, 0)) as cv
      FROM seasonal_index GROUP BY month_num
    )
    SELECT month_num,
      CASE WHEN sample_count >= 2 THEN GREATEST(0.7, LEAST(1.2 + COALESCE(cv,0.3)*0.5, seasonal_idx))
        WHEN sample_count = 1 THEN GREATEST(0.8, LEAST(1.3, seasonal_idx)) ELSE 1.0 END as multiplier
    FROM avg_seasonal
  LOOP
    v_seasonal_multipliers := v_seasonal_multipliers || jsonb_build_object(seasonal_rec.month_num::text, seasonal_rec.multiplier);
  END LOOP;

  -- ROAS
  IF p_roas_override IS NOT NULL THEN v_roas := p_roas_override;
  ELSE
    SELECT COALESCE(CASE WHEN SUM(expense) > 0 THEN SUM(COALESCE(direct_order_amount,0)+COALESCE(broad_order_amount,0))/NULLIF(SUM(expense),0) END, 3.0)
    INTO v_roas FROM ad_spend_daily WHERE tenant_id = p_tenant_id 
      AND spend_date >= (v_latest_order_month - interval '3 months')::date
      AND spend_date < v_as_of_cutoff;
  END IF;

  -- Base revenue
  WITH monthly_totals AS (
    SELECT m, anon_rev, identified_rev FROM _fc_monthly
    WHERE m >= (v_latest_order_month - interval '4 months')::date
  ),
  new_counts AS (
    SELECT date_trunc('month', order_at)::date as m, COUNT(DISTINCT customer_name) as new_names
    FROM cdp_orders o WHERE o.tenant_id = p_tenant_id AND o.status NOT IN ('cancelled','returned')
      AND o.customer_name IS NOT NULL
      AND o.order_at >= (v_latest_order_month - interval '4 months') AND o.order_at < v_as_of_cutoff
      AND NOT EXISTS (SELECT 1 FROM cdp_orders o2 WHERE o2.tenant_id = p_tenant_id AND o2.status NOT IN ('cancelled','returned')
        AND o2.customer_name = o.customer_name AND o2.order_at < date_trunc('month', o.order_at) LIMIT 1)
    GROUP BY 1
  ),
  median_calc AS (
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mt.identified_rev) as med_identified,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mt.anon_rev) as med_anon,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY nc.new_names) as med_newcust
    FROM monthly_totals mt LEFT JOIN new_counts nc ON mt.m = nc.m
  )
  SELECT COALESCE(med_identified,0), COALESCE(med_anon,0), COALESCE(med_newcust,0)::int
  INTO v_returning_base, v_anon_base, v_newcust_base FROM median_calc;

  -- Recent months weighted average
  SELECT MAX(CASE WHEN m = v_latest_order_month THEN identified_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '1 month')::date THEN identified_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '2 months')::date THEN identified_rev END),
    MAX(CASE WHEN m = v_latest_order_month THEN anon_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '1 month')::date THEN anon_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '2 months')::date THEN anon_rev END)
  INTO v_ret_m1, v_ret_m2, v_ret_m3, v_anon_m1, v_anon_m2, v_anon_m3
  FROM _fc_monthly
  WHERE m >= (v_latest_order_month - interval '2 months')::date;

  DECLARE v_weighted_ret numeric; v_weighted_anon numeric;
  BEGIN
    v_weighted_ret := COALESCE(v_ret_m1,0)*0.4 + COALESCE(v_ret_m2,0)*0.35 + COALESCE(v_ret_m3,0)*0.25;
    v_weighted_anon := COALESCE(v_anon_m1,0)*0.4 + COALESCE(v_anon_m2,0)*0.35 + COALESCE(v_anon_m3,0)*0.25;
    v_returning_base := v_returning_base * 0.6 + v_weighted_ret * 0.4;
    v_anon_base := v_anon_base * 0.6 + v_weighted_anon * 0.4;
  END;

  -- New customer AOV
  SELECT COALESCE(AVG(CASE WHEN net_revenue > 0 THEN net_revenue END), 500000) INTO v_new_m1
  FROM cdp_orders WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
    AND customer_name IS NOT NULL AND order_at >= v_latest_order_month AND order_at < v_as_of_cutoff LIMIT 1000;
  v_new_base := v_newcust_base * COALESCE(v_new_m1, 500000);
  v_returning_base := GREATEST(v_returning_base - v_new_base, 0);

  -- Monthly decay
  WITH mom AS (
    SELECT total_rev as rev, LAG(total_rev) OVER (ORDER BY m) as prev 
    FROM _fc_monthly 
    WHERE m >= (v_latest_order_month - interval '5 months')::date
  )
  SELECT COALESCE(AVG(CASE WHEN prev > 0 THEN rev/prev END), 1.0) INTO v_monthly_decay FROM mom WHERE prev IS NOT NULL;
  v_monthly_decay := GREATEST(0.85, LEAST(1.1, v_monthly_decay));

  -- Cohort breakdown
  v_cohort_json := '[]'::jsonb;
  FOR cohort_rec IN
    WITH recent_customers AS (
      SELECT customer_name as cn, MIN(order_at) as first_at,
        SUM(CASE WHEN order_at >= v_latest_order_month AND order_at < v_as_of_cutoff THEN net_revenue ELSE 0 END) as latest_rev
      FROM cdp_orders WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
        AND customer_name IS NOT NULL AND order_at >= (v_latest_order_month - interval '12 months')
        AND order_at < v_as_of_cutoff
      GROUP BY customer_name
      HAVING COUNT(CASE WHEN order_at >= v_latest_order_month AND order_at < v_as_of_cutoff THEN 1 END) > 0
    ),
    cohort_summary AS (
      SELECT to_char(date_trunc('month', first_at), 'YYYY-MM') as cohort_month, COUNT(*) as cohort_active, SUM(latest_rev) as cohort_rev
      FROM recent_customers WHERE date_trunc('month', first_at) < v_latest_order_month GROUP BY 1
    )
    SELECT cohort_month, cohort_active, cohort_rev FROM cohort_summary WHERE cohort_rev > 0 ORDER BY cohort_rev DESC LIMIT 12
  LOOP
    v_cohort_json := v_cohort_json || jsonb_build_object('cohort_month', cohort_rec.cohort_month, 'cohort_size', cohort_rec.cohort_active,
      'retention_pct', 0, 'returning_customers', cohort_rec.cohort_active, 'revenue', ROUND(cohort_rec.cohort_rev));
  END LOOP;

  -- Generate forecast months
  FOR i IN 0..(p_horizon_months - 1) LOOP
    v_month := v_current_month + (i || ' months')::interval;
    v_growth_factor := POWER(1 + p_growth_adj / 100.0, i);
    v_seasonal_mult := COALESCE((v_seasonal_multipliers->>EXTRACT(MONTH FROM v_month)::int::text)::numeric, 1.0);
    v_yoy_factor := COALESCE((v_yoy_growth_factors->>EXTRACT(MONTH FROM v_month)::int::text)::numeric, 1.0);

    DECLARE
      v_combined_mult numeric; v_trend_total numeric; v_ly_rev numeric;
      v_ly_forecast numeric; v_final_total numeric; v_blend_ratio numeric;
    BEGIN
      v_combined_mult := GREATEST(0.6, LEAST(1.5, v_seasonal_mult * POWER(v_yoy_factor, 0.5)));
      IF i = 0 THEN v_returning_revenue := v_returning_base * v_growth_factor * v_combined_mult;
      ELSE v_returning_revenue := v_returning_base * POWER(v_monthly_decay, i) * v_growth_factor * v_combined_mult; END IF;
      v_new_revenue := v_new_base * v_growth_factor * v_combined_mult;
      v_anon_revenue := v_anon_base * v_growth_factor * v_combined_mult;
      v_ads_revenue := p_ads_spend * v_roas;
      v_trend_total := v_returning_revenue + v_new_revenue + v_anon_revenue + v_ads_revenue;

      v_ly_rev := COALESCE((v_ly_monthly_rev->>EXTRACT(MONTH FROM v_month)::int::text)::numeric, 0);
      v_ly_forecast := v_ly_rev * v_overall_yoy * v_growth_factor;

      IF v_ly_forecast > 0 AND ABS(v_trend_total - v_ly_forecast) / v_ly_forecast > 0.50 THEN
        v_blend_ratio := 0.30;
      ELSIF v_ly_forecast > 0 THEN
        v_blend_ratio := 0.70;
      ELSE
        v_blend_ratio := 1.0;
      END IF;

      IF v_ly_forecast > 0 THEN
        v_final_total := v_blend_ratio * v_trend_total + (1 - v_blend_ratio) * v_ly_forecast;
      ELSE
        v_final_total := v_trend_total;
      END IF;

      DECLARE v_scale numeric; v_non_ads numeric; v_scaled_cohort jsonb := '[]'::jsonb; j int;
      BEGIN
        v_non_ads := v_final_total - v_ads_revenue;
        v_scale := CASE WHEN (v_returning_revenue + v_new_revenue + v_anon_revenue) > 0
                   THEN v_non_ads / (v_returning_revenue + v_new_revenue + v_anon_revenue) ELSE 1.0 END;
        v_returning_revenue := v_returning_revenue * v_scale;
        v_new_revenue := v_new_revenue * v_scale;
        v_anon_revenue := v_anon_revenue * v_scale;
        v_total_base := v_final_total;

        DECLARE v_cohort_scale numeric;
        BEGIN
          v_cohort_scale := CASE WHEN i = 0 THEN v_combined_mult * v_scale
                            ELSE POWER(v_monthly_decay, i) * v_growth_factor * v_combined_mult * v_scale END;
          FOR j IN 0..jsonb_array_length(v_cohort_json)-1 LOOP
            v_scaled_cohort := v_scaled_cohort || jsonb_build_object(
              'cohort_month', v_cohort_json->j->>'cohort_month', 'cohort_size', (v_cohort_json->j->>'cohort_size')::int,
              'retention_pct', (v_cohort_json->j->>'retention_pct')::numeric,
              'returning_customers', (v_cohort_json->j->>'returning_customers')::int,
              'revenue', ROUND(((v_cohort_json->j->>'revenue')::numeric) * v_cohort_scale));
          END LOOP;
        END;

        v_result := v_result || jsonb_build_object(
          'month', to_char(v_month, 'YYYY-MM'), 'returning_revenue', ROUND(v_returning_revenue + v_anon_revenue),
          'returning_breakdown', v_scaled_cohort, 'new_revenue', ROUND(v_new_revenue),
          'new_customers', ROUND(v_newcust_base * v_growth_factor), 'ads_revenue', ROUND(v_ads_revenue),
          'ads_spend', p_ads_spend, 'roas', ROUND(v_roas, 2),
          'total_conservative', ROUND(v_total_base * 0.85), 'total_base', ROUND(v_total_base),
          'total_optimistic', ROUND(v_total_base * 1.15), 'growth_factor', ROUND(v_growth_factor, 3),
          'seasonal_multiplier', ROUND(v_combined_mult, 3),
          'historical_avg_ads_spend', v_historical_avg_ads_spend,
          'has_ads_data', v_has_ads_data);
      END;
    END;
  END LOOP;

  DROP TABLE IF EXISTS _fc_monthly;
  RETURN v_result;
END;
$$;
