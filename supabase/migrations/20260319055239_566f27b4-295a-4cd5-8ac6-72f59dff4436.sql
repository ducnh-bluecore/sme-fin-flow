
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
  -- Trailing 3-month actuals
  v_ret_m1 numeric; v_ret_m2 numeric; v_ret_m3 numeric;
  v_new_m1 numeric; v_new_m2 numeric; v_new_m3 numeric;
  v_anon_m1 numeric; v_anon_m2 numeric; v_anon_m3 numeric;
  v_newcust_m1 int; v_newcust_m2 int; v_newcust_m3 int;
  -- Computed
  v_returning_base numeric;
  v_new_base numeric;
  v_anon_base numeric;
  v_newcust_base numeric;
  -- Monthly decay rate from cohort
  v_monthly_decay numeric;
  -- Loop
  v_month date;
  v_growth_factor numeric;
  v_returning_revenue numeric;
  v_new_revenue numeric;
  v_ads_revenue numeric;
  v_anon_revenue numeric;
  v_total_base numeric;
  i int;
  -- Cohort breakdown
  v_cohort_json jsonb;
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

  -- === TRAILING 3-MONTH ACTUALS (using improved identity) ===
  -- Identity = customer_id > full_phone(>=10) > name::channel
  WITH first_ident AS (
    SELECT 
      COALESCE(customer_id::text, CASE WHEN LENGTH(customer_phone)>=10 THEN customer_phone END, customer_name||'::'||channel) as ik,
      MIN(order_at) as first_at
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
      AND COALESCE(customer_id::text, CASE WHEN LENGTH(customer_phone)>=10 THEN customer_phone END, customer_name||'::'||channel) IS NOT NULL
    GROUP BY 1
  ),
  monthly AS (
    SELECT 
      date_trunc('month', o.order_at)::date as m,
      SUM(CASE WHEN COALESCE(o.customer_id::text, CASE WHEN LENGTH(o.customer_phone)>=10 THEN o.customer_phone END, o.customer_name||'::'||o.channel) IS NULL 
        THEN o.net_revenue ELSE 0 END) as anon_rev,
      SUM(CASE WHEN f.ik IS NOT NULL AND date_trunc('month',f.first_at) = date_trunc('month',o.order_at) 
        THEN o.net_revenue ELSE 0 END) as new_rev,
      COUNT(DISTINCT CASE WHEN f.ik IS NOT NULL AND date_trunc('month',f.first_at) = date_trunc('month',o.order_at) 
        THEN f.ik END) as new_cust,
      SUM(CASE WHEN f.ik IS NOT NULL AND date_trunc('month',f.first_at) < date_trunc('month',o.order_at) 
        THEN o.net_revenue ELSE 0 END) as ret_rev
    FROM cdp_orders o
    LEFT JOIN first_ident f ON COALESCE(o.customer_id::text, CASE WHEN LENGTH(o.customer_phone)>=10 THEN o.customer_phone END, o.customer_name||'::'||o.channel) = f.ik
    WHERE o.tenant_id = p_tenant_id AND o.status NOT IN ('cancelled','returned')
      AND o.order_at >= (v_latest_order_month - interval '2 months') AND o.order_at < (v_latest_order_month + interval '1 month')
    GROUP BY 1
  )
  SELECT 
    -- Most recent month (m1), middle (m2), oldest (m3)
    MAX(CASE WHEN m = v_latest_order_month THEN ret_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '1 month')::date THEN ret_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '2 months')::date THEN ret_rev END),
    MAX(CASE WHEN m = v_latest_order_month THEN new_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '1 month')::date THEN new_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '2 months')::date THEN new_rev END),
    MAX(CASE WHEN m = v_latest_order_month THEN anon_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '1 month')::date THEN anon_rev END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '2 months')::date THEN anon_rev END),
    MAX(CASE WHEN m = v_latest_order_month THEN new_cust END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '1 month')::date THEN new_cust END),
    MAX(CASE WHEN m = (v_latest_order_month - interval '2 months')::date THEN new_cust END)
  INTO v_ret_m1, v_ret_m2, v_ret_m3, v_new_m1, v_new_m2, v_new_m3,
       v_anon_m1, v_anon_m2, v_anon_m3, v_newcust_m1, v_newcust_m2, v_newcust_m3
  FROM monthly;

  -- Weighted average (40% latest, 35% middle, 25% oldest)
  v_returning_base := COALESCE(v_ret_m1,0)*0.4 + COALESCE(v_ret_m2,0)*0.35 + COALESCE(v_ret_m3,0)*0.25;
  v_new_base := COALESCE(v_new_m1,0)*0.4 + COALESCE(v_new_m2,0)*0.35 + COALESCE(v_new_m3,0)*0.25;
  v_anon_base := COALESCE(v_anon_m1,0)*0.4 + COALESCE(v_anon_m2,0)*0.35 + COALESCE(v_anon_m3,0)*0.25;
  v_newcust_base := ROUND(COALESCE(v_newcust_m1,0)*0.4 + COALESCE(v_newcust_m2,0)*0.35 + COALESCE(v_newcust_m3,0)*0.25);

  -- === MONTHLY DECAY RATE from cohort data ===
  -- Average month-over-month retention decay for returning revenue
  WITH monthly_ret AS (
    SELECT date_trunc('month', order_at)::date as m, SUM(net_revenue) as rev
    FROM cdp_orders WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
      AND order_at >= (v_latest_order_month - interval '5 months') AND order_at < (v_latest_order_month + interval '1 month')
    GROUP BY 1 ORDER BY 1
  ),
  mom AS (
    SELECT m, rev, LAG(rev) OVER (ORDER BY m) as prev_rev
    FROM monthly_ret
  )
  SELECT COALESCE(AVG(CASE WHEN prev_rev > 0 THEN rev/prev_rev END), 1.0)
  INTO v_monthly_decay FROM mom WHERE prev_rev IS NOT NULL;
  
  -- Cap decay between 0.8 and 1.1 to avoid extreme extrapolation
  v_monthly_decay := GREATEST(0.8, LEAST(1.1, v_monthly_decay));

  -- === COHORT BREAKDOWN (for detail, computed once) ===
  -- Build cohort info from improved identity for the latest available data
  
  -- === GENERATE FORECAST ===
  FOR i IN 0..(p_horizon_months - 1) LOOP
    v_month := v_current_month + (i || ' months')::interval;
    v_growth_factor := POWER(1 + p_growth_adj / 100.0, i);
    
    -- Month 0: use weighted avg; subsequent months: apply decay
    IF i = 0 THEN
      v_returning_revenue := v_returning_base * v_growth_factor;
      v_new_revenue := v_new_base * v_growth_factor;
      v_anon_revenue := v_anon_base * v_growth_factor;
    ELSE
      v_returning_revenue := v_returning_base * POWER(v_monthly_decay, i) * v_growth_factor;
      v_new_revenue := v_new_base * v_growth_factor;
      v_anon_revenue := v_anon_base * v_growth_factor;
    END IF;
    
    v_ads_revenue := p_ads_spend * v_roas;
    v_total_base := v_returning_revenue + v_new_revenue + v_anon_revenue + v_ads_revenue;
    
    -- Build cohort breakdown for this month (top contributing cohorts)
    v_cohort_json := '[]'::jsonb;
    FOR cohort_rec IN
      WITH io AS (
        SELECT COALESCE(customer_id::text, CASE WHEN LENGTH(customer_phone)>=10 THEN customer_phone END, customer_name||'::'||channel) as ik,
          date_trunc('month', order_at)::date as om, SUM(net_revenue) as rev
        FROM cdp_orders
        WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','returned')
          AND COALESCE(customer_id::text, CASE WHEN LENGTH(customer_phone)>=10 THEN customer_phone END, customer_name||'::'||channel) IS NOT NULL
          AND order_at >= (v_latest_order_month - interval '14 months') AND order_at < (v_latest_order_month + interval '1 month')
        GROUP BY 1, 2
      ),
      fm AS (SELECT ik, MIN(om) as cm FROM io GROUP BY 1),
      cs AS (SELECT cm, COUNT(DISTINCT ik) as sz FROM fm GROUP BY 1),
      -- Get latest month's actual returning by cohort
      latest_cohort_rev AS (
        SELECT fm.cm as cohort_month, cs.sz as cohort_size,
          COUNT(DISTINCT io.ik) as active_cust,
          SUM(io.rev) as cohort_rev
        FROM io JOIN fm ON io.ik = fm.ik
        JOIN cs ON fm.cm = cs.cm
        WHERE io.om = v_latest_order_month AND fm.cm < v_latest_order_month
        GROUP BY fm.cm, cs.sz
      )
      SELECT cohort_month, cohort_size, active_cust, cohort_rev,
        ROUND(active_cust::numeric / NULLIF(cohort_size,0) * 100, 1) as retention_pct
      FROM latest_cohort_rev
      WHERE cohort_rev > 0
      ORDER BY cohort_rev DESC
      LIMIT 15
    LOOP
      v_cohort_json := v_cohort_json || jsonb_build_object(
        'cohort_month', to_char(cohort_rec.cohort_month, 'YYYY-MM'),
        'cohort_size', cohort_rec.cohort_size,
        'retention_pct', cohort_rec.retention_pct,
        'returning_customers', cohort_rec.active_cust,
        'revenue', ROUND(cohort_rec.cohort_rev * POWER(v_monthly_decay, i) * v_growth_factor)
      );
    END LOOP;
    
    v_result := v_result || jsonb_build_object(
      'month', to_char(v_month, 'YYYY-MM'),
      'returning_revenue', ROUND(v_returning_revenue + v_anon_revenue),
      'returning_breakdown', v_cohort_json,
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
  END LOOP;
  
  RETURN v_result;
END;
$$;
