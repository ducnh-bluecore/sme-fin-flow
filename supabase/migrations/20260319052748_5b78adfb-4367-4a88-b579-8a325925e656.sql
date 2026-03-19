
CREATE OR REPLACE FUNCTION public.forecast_revenue_cohort_based(
  p_tenant_id UUID,
  p_horizon_months INT DEFAULT 3,
  p_ads_spend NUMERIC DEFAULT 0,
  p_roas_override NUMERIC DEFAULT NULL,
  p_growth_adj NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
  v_month_data JSONB;
  v_cohort_row RECORD;
  v_forecast_month DATE;
  v_age INT;
  v_retention NUMERIC;
  v_cohort_revenue NUMERIC;
  v_returning_total NUMERIC;
  v_returning_breakdown JSONB;
  v_new_customers_avg NUMERIC;
  v_aov_first_order NUMERIC;
  v_new_revenue NUMERIC;
  v_ads_revenue NUMERIC;
  v_roas NUMERIC;
  v_total_base NUMERIC;
  v_i INT;
  v_growth_factor NUMERIC;
  v_current_month DATE;
BEGIN
  v_current_month := date_trunc('month', CURRENT_DATE)::date;

  SELECT 
    COALESCE(AVG(monthly_new), 0),
    COALESCE(AVG(first_aov), 0)
  INTO v_new_customers_avg, v_aov_first_order
  FROM (
    SELECT 
      date_trunc('month', o.order_at) AS m,
      COUNT(DISTINCT CASE WHEN o.order_at::date = c.first_order_at::date THEN o.customer_id END) AS monthly_new,
      AVG(CASE WHEN o.order_at::date = c.first_order_at::date THEN o.net_revenue END) AS first_aov
    FROM cdp_orders o
    JOIN cdp_customers c ON c.id = o.customer_id AND c.tenant_id = o.tenant_id
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at >= (v_current_month - INTERVAL '3 months')
      AND o.order_at < v_current_month
    GROUP BY date_trunc('month', o.order_at)
  ) sub;

  v_roas := COALESCE(p_roas_override, (
    SELECT marketing_roas FROM central_metrics_snapshots 
    WHERE tenant_id = p_tenant_id 
    ORDER BY snapshot_at DESC LIMIT 1
  ), 3.0);

  FOR v_i IN 0..(p_horizon_months - 1) LOOP
    v_forecast_month := (v_current_month + (v_i || ' months')::interval)::date;
    v_returning_total := 0;
    v_returning_breakdown := '[]'::jsonb;
    v_growth_factor := POWER(1 + COALESCE(p_growth_adj, 0), v_i);

    FOR v_cohort_row IN 
      SELECT cohort_month::date AS cm, 
             COALESCE(cohort_size, 0) AS cohort_size,
             COALESCE(retention_rate_3m, 0) AS r3,
             COALESCE(retention_rate_6m, 0) AS r6,
             COALESCE(retention_rate_12m, 0) AS r12,
             COALESCE(avg_revenue, 0) AS avg_rev,
             COALESCE(avg_orders, 0) AS avg_ord
      FROM v_cdp_ltv_by_cohort
      WHERE tenant_id = p_tenant_id
        AND cohort_month IS NOT NULL
    LOOP
      v_age := EXTRACT(YEAR FROM age(v_forecast_month, v_cohort_row.cm)) * 12 
               + EXTRACT(MONTH FROM age(v_forecast_month, v_cohort_row.cm));
      
      IF v_age <= 0 THEN CONTINUE; END IF;

      IF v_age <= 3 THEN
        v_retention := v_cohort_row.r3 * (1.0 - (v_age - 1)::numeric / 6.0);
      ELSIF v_age <= 6 THEN
        v_retention := v_cohort_row.r3 + (v_cohort_row.r6 - v_cohort_row.r3) * ((v_age - 3)::numeric / 3.0);
      ELSIF v_age <= 12 THEN
        v_retention := v_cohort_row.r6 + (v_cohort_row.r12 - v_cohort_row.r6) * ((v_age - 6)::numeric / 6.0);
      ELSE
        v_retention := v_cohort_row.r12 * POWER(0.85, (v_age - 12)::numeric / 12.0);
      END IF;

      v_retention := GREATEST(0, LEAST(1, v_retention / 100.0));
      
      v_cohort_revenue := v_cohort_row.cohort_size * v_retention 
                          * COALESCE(NULLIF(v_cohort_row.avg_rev, 0), v_aov_first_order) / GREATEST(v_cohort_row.avg_ord, 1);
      
      v_returning_total := v_returning_total + v_cohort_revenue;
      
      IF v_cohort_revenue > 0 THEN
        v_returning_breakdown := v_returning_breakdown || jsonb_build_object(
          'cohort_month', to_char(v_cohort_row.cm, 'YYYY-MM'),
          'cohort_size', v_cohort_row.cohort_size,
          'retention_pct', ROUND(v_retention * 100, 1),
          'returning_customers', ROUND(v_cohort_row.cohort_size * v_retention),
          'revenue', ROUND(v_cohort_revenue)
        );
      END IF;
    END LOOP;

    v_new_revenue := v_new_customers_avg * v_aov_first_order;
    v_ads_revenue := p_ads_spend * v_roas;
    v_total_base := (v_returning_total + v_new_revenue + v_ads_revenue) * v_growth_factor;

    v_month_data := jsonb_build_object(
      'month', to_char(v_forecast_month, 'YYYY-MM'),
      'returning_revenue', ROUND(v_returning_total * v_growth_factor),
      'returning_breakdown', v_returning_breakdown,
      'new_revenue', ROUND(v_new_revenue * v_growth_factor),
      'new_customers', ROUND(v_new_customers_avg),
      'ads_revenue', ROUND(v_ads_revenue * v_growth_factor),
      'ads_spend', p_ads_spend,
      'roas', ROUND(v_roas, 2),
      'total_conservative', ROUND(v_total_base * 0.85),
      'total_base', ROUND(v_total_base),
      'total_optimistic', ROUND(v_total_base * 1.15),
      'growth_factor', ROUND(v_growth_factor, 4)
    );

    v_result := v_result || v_month_data;
  END LOOP;

  RETURN v_result;
END;
$$;
