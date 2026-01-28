-- =====================================================
-- Tích hợp Chi phí Tạm tính vào P&L Report
-- =====================================================

-- 1. Thêm cột mới vào pl_report_cache
ALTER TABLE pl_report_cache 
ADD COLUMN IF NOT EXISTS opex_data_source jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS total_opex_estimated numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_opex_actual numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS opex_logistics numeric DEFAULT 0;

-- 2. Tạo View v_expense_variance_alerts
CREATE OR REPLACE VIEW v_expense_variance_alerts AS
SELECT 
  eb.tenant_id,
  eb.category,
  eb.name,
  eb.monthly_amount AS estimated,
  COALESCE(act.actual_amount, 0) AS actual,
  COALESCE(act.actual_amount, 0) - eb.monthly_amount AS variance,
  CASE 
    WHEN eb.monthly_amount > 0 THEN 
      ROUND(((COALESCE(act.actual_amount, 0) - eb.monthly_amount) / eb.monthly_amount) * 100, 1)
    ELSE 0
  END AS variance_percent,
  CASE 
    WHEN COALESCE(act.actual_amount, 0) > eb.monthly_amount * 1.1 THEN 'underestimate'
    WHEN COALESCE(act.actual_amount, 0) < eb.monthly_amount * 0.8 THEN 'overestimate'
    ELSE 'on_track'
  END AS alert_status,
  date_trunc('month', CURRENT_DATE) AS alert_month
FROM expense_baselines eb
LEFT JOIN (
  SELECT tenant_id, category, SUM(amount) as actual_amount
  FROM expenses
  WHERE expense_date >= date_trunc('month', CURRENT_DATE)
    AND expense_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY tenant_id, category
) act ON eb.tenant_id = act.tenant_id AND eb.category = act.category::text
WHERE eb.effective_from <= CURRENT_DATE
  AND (eb.effective_to IS NULL OR eb.effective_to >= CURRENT_DATE);

-- 3. DROP existing function first to change parameter defaults
DROP FUNCTION IF EXISTS refresh_pl_cache(uuid, integer, integer);

-- 4. Create updated RPC refresh_pl_cache
CREATE OR REPLACE FUNCTION refresh_pl_cache(
  p_tenant_id uuid,
  p_year integer,
  p_month integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_period_type text;
  
  -- Revenue variables
  v_gross_sales numeric := 0;
  v_sales_returns numeric := 0;
  v_sales_discounts numeric := 0;
  v_net_sales numeric := 0;
  v_invoice_revenue numeric := 0;
  v_contract_revenue numeric := 0;
  v_integrated_revenue numeric := 0;
  
  -- COGS & Profit
  v_cogs numeric := 0;
  v_gross_profit numeric := 0;
  v_gross_margin numeric := 0;
  
  -- ESTIMATED OPEX (từ baselines + estimates)
  v_est_salary numeric := 0;
  v_est_rent numeric := 0;
  v_est_utilities numeric := 0;
  v_est_marketing numeric := 0;
  v_est_logistics numeric := 0;
  v_est_other numeric := 0;
  v_est_depreciation numeric := 0;
  v_est_insurance numeric := 0;
  v_est_supplies numeric := 0;
  v_est_maintenance numeric := 0;
  v_est_professional numeric := 0;
  
  -- ACTUAL OPEX (từ finance_expenses_daily)
  v_actual_salary numeric := 0;
  v_actual_rent numeric := 0;
  v_actual_utilities numeric := 0;
  v_actual_marketing numeric := 0;
  v_actual_logistics numeric := 0;
  v_actual_depreciation numeric := 0;
  v_actual_insurance numeric := 0;
  v_actual_supplies numeric := 0;
  v_actual_maintenance numeric := 0;
  v_actual_professional numeric := 0;
  v_actual_other numeric := 0;
  
  -- MERGED OPEX (final values)
  v_opex_salaries numeric := 0;
  v_opex_rent numeric := 0;
  v_opex_utilities numeric := 0;
  v_opex_marketing numeric := 0;
  v_opex_logistics numeric := 0;
  v_opex_depreciation numeric := 0;
  v_opex_insurance numeric := 0;
  v_opex_supplies numeric := 0;
  v_opex_maintenance numeric := 0;
  v_opex_professional numeric := 0;
  v_opex_other numeric := 0;
  v_total_opex numeric := 0;
  
  -- Data source tracking
  v_source_salary text := 'estimate';
  v_source_rent text := 'estimate';
  v_source_utilities text := 'estimate';
  v_source_marketing text := 'estimate';
  v_source_logistics text := 'estimate';
  v_source_depreciation text := 'estimate';
  v_source_insurance text := 'estimate';
  v_source_supplies text := 'estimate';
  v_source_maintenance text := 'estimate';
  v_source_professional text := 'estimate';
  v_source_other text := 'estimate';
  v_opex_data_source jsonb;
  v_total_opex_estimated numeric := 0;
  v_total_opex_actual numeric := 0;
  
  -- Operating income
  v_operating_income numeric := 0;
  v_operating_margin numeric := 0;
  
  -- Other items
  v_other_income numeric := 0;
  v_interest_expense numeric := 0;
  
  -- Tax & Net income
  v_income_before_tax numeric := 0;
  v_income_tax numeric := 0;
  v_net_income numeric := 0;
  v_net_margin numeric := 0;
  
BEGIN
  -- Calculate date range
  IF p_month IS NOT NULL THEN
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::date;
    v_period_type := 'monthly';
  ELSE
    v_start_date := make_date(p_year, 1, 1);
    v_end_date := make_date(p_year, 12, 31);
    v_period_type := 'yearly';
  END IF;
  
  -- ===========================================
  -- STEP 1: Get Revenue from cdp_orders
  -- ===========================================
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(CASE WHEN channel IN ('shopee', 'lazada', 'tiki', 'tiktok', 'sendo') THEN total_amount ELSE 0 END), 0)
  INTO v_gross_sales, v_integrated_revenue
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_date >= v_start_date
    AND order_date <= v_end_date
    AND status NOT IN ('cancelled', 'returned');
  
  -- Get returns
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_sales_returns
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_date >= v_start_date
    AND order_date <= v_end_date
    AND status = 'returned';
  
  -- Calculate net sales
  v_net_sales := v_gross_sales - v_sales_returns - v_sales_discounts;
  v_invoice_revenue := v_gross_sales - v_integrated_revenue;
  
  -- ===========================================
  -- STEP 2: Get COGS from order_items
  -- ===========================================
  SELECT COALESCE(SUM(oi.cogs_amount), 0)
  INTO v_cogs
  FROM order_items oi
  JOIN cdp_orders o ON oi.order_id = o.id
  WHERE o.tenant_id = p_tenant_id
    AND o.order_date >= v_start_date
    AND o.order_date <= v_end_date
    AND o.status NOT IN ('cancelled', 'returned');
  
  -- Calculate gross profit
  v_gross_profit := v_net_sales - v_cogs;
  v_gross_margin := CASE WHEN v_net_sales > 0 THEN ROUND((v_gross_profit / v_net_sales) * 100, 1) ELSE 0 END;
  
  -- ===========================================
  -- STEP 3: Get ESTIMATED OPEX from baselines + estimates
  -- ===========================================
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'salary' THEN monthly_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'rent' THEN monthly_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'utilities' THEN monthly_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'depreciation' THEN monthly_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'insurance' THEN monthly_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'supplies' THEN monthly_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'maintenance' THEN monthly_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'professional' THEN monthly_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'other' THEN monthly_amount END), 0)
  INTO v_est_salary, v_est_rent, v_est_utilities, v_est_depreciation, v_est_insurance, 
       v_est_supplies, v_est_maintenance, v_est_professional, v_est_other
  FROM expense_baselines
  WHERE tenant_id = p_tenant_id
    AND effective_from <= v_start_date
    AND (effective_to IS NULL OR effective_to >= v_end_date);
  
  -- Variable costs từ expense_estimates
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'marketing' THEN COALESCE(actual_amount, estimated_amount) END), 0),
    COALESCE(SUM(CASE WHEN category = 'logistics' THEN COALESCE(actual_amount, estimated_amount) END), 0)
  INTO v_est_marketing, v_est_logistics
  FROM expense_estimates
  WHERE tenant_id = p_tenant_id
    AND year = p_year
    AND (p_month IS NULL OR month = p_month);
  
  -- Yearly: multiply monthly baselines by number of months
  IF p_month IS NULL THEN
    v_est_salary := v_est_salary * 12;
    v_est_rent := v_est_rent * 12;
    v_est_utilities := v_est_utilities * 12;
    v_est_depreciation := v_est_depreciation * 12;
    v_est_insurance := v_est_insurance * 12;
    v_est_supplies := v_est_supplies * 12;
    v_est_maintenance := v_est_maintenance * 12;
    v_est_professional := v_est_professional * 12;
    v_est_other := v_est_other * 12;
  END IF;
  
  -- ===========================================
  -- STEP 4: Get ACTUAL OPEX from finance_expenses_daily
  -- ===========================================
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'salary' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'rent' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'utilities' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'marketing' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'logistics' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'depreciation' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'insurance' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'supplies' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'maintenance' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'professional' THEN total_amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'other' OR category NOT IN ('salary','rent','utilities','marketing','logistics','depreciation','insurance','supplies','maintenance','professional','cogs') THEN total_amount END), 0)
  INTO v_actual_salary, v_actual_rent, v_actual_utilities, v_actual_marketing, v_actual_logistics,
       v_actual_depreciation, v_actual_insurance, v_actual_supplies, v_actual_maintenance, 
       v_actual_professional, v_actual_other
  FROM finance_expenses_daily
  WHERE tenant_id = p_tenant_id
    AND expense_date >= v_start_date
    AND expense_date <= v_end_date;
  
  -- ===========================================
  -- STEP 5: Merge OPEX with priority rule: Actual > Estimate
  -- ===========================================
  v_opex_salaries := CASE WHEN v_actual_salary > 0 THEN v_actual_salary ELSE v_est_salary END;
  v_source_salary := CASE WHEN v_actual_salary > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_rent := CASE WHEN v_actual_rent > 0 THEN v_actual_rent ELSE v_est_rent END;
  v_source_rent := CASE WHEN v_actual_rent > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_utilities := CASE WHEN v_actual_utilities > 0 THEN v_actual_utilities ELSE v_est_utilities END;
  v_source_utilities := CASE WHEN v_actual_utilities > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_marketing := CASE WHEN v_actual_marketing > 0 THEN v_actual_marketing ELSE v_est_marketing END;
  v_source_marketing := CASE WHEN v_actual_marketing > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_logistics := CASE WHEN v_actual_logistics > 0 THEN v_actual_logistics ELSE v_est_logistics END;
  v_source_logistics := CASE WHEN v_actual_logistics > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_depreciation := CASE WHEN v_actual_depreciation > 0 THEN v_actual_depreciation ELSE v_est_depreciation END;
  v_source_depreciation := CASE WHEN v_actual_depreciation > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_insurance := CASE WHEN v_actual_insurance > 0 THEN v_actual_insurance ELSE v_est_insurance END;
  v_source_insurance := CASE WHEN v_actual_insurance > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_supplies := CASE WHEN v_actual_supplies > 0 THEN v_actual_supplies ELSE v_est_supplies END;
  v_source_supplies := CASE WHEN v_actual_supplies > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_maintenance := CASE WHEN v_actual_maintenance > 0 THEN v_actual_maintenance ELSE v_est_maintenance END;
  v_source_maintenance := CASE WHEN v_actual_maintenance > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_professional := CASE WHEN v_actual_professional > 0 THEN v_actual_professional ELSE v_est_professional END;
  v_source_professional := CASE WHEN v_actual_professional > 0 THEN 'actual' ELSE 'estimate' END;
  
  v_opex_other := CASE WHEN v_actual_other > 0 THEN v_actual_other ELSE v_est_other END;
  v_source_other := CASE WHEN v_actual_other > 0 THEN 'actual' ELSE 'estimate' END;
  
  -- Build data source JSON
  v_opex_data_source := jsonb_build_object(
    'salary', v_source_salary,
    'rent', v_source_rent,
    'utilities', v_source_utilities,
    'marketing', v_source_marketing,
    'logistics', v_source_logistics,
    'depreciation', v_source_depreciation,
    'insurance', v_source_insurance,
    'supplies', v_source_supplies,
    'maintenance', v_source_maintenance,
    'professional', v_source_professional,
    'other', v_source_other
  );
  
  -- Calculate totals
  v_total_opex := v_opex_salaries + v_opex_rent + v_opex_utilities + v_opex_marketing + v_opex_logistics +
                  v_opex_depreciation + v_opex_insurance + v_opex_supplies + v_opex_maintenance + 
                  v_opex_professional + v_opex_other;
  
  v_total_opex_estimated := v_est_salary + v_est_rent + v_est_utilities + v_est_marketing + v_est_logistics +
                            v_est_depreciation + v_est_insurance + v_est_supplies + v_est_maintenance + 
                            v_est_professional + v_est_other;
  
  v_total_opex_actual := v_actual_salary + v_actual_rent + v_actual_utilities + v_actual_marketing + v_actual_logistics +
                         v_actual_depreciation + v_actual_insurance + v_actual_supplies + v_actual_maintenance + 
                         v_actual_professional + v_actual_other;
  
  -- ===========================================
  -- STEP 6: Calculate Operating & Net Income
  -- ===========================================
  v_operating_income := v_gross_profit - v_total_opex;
  v_operating_margin := CASE WHEN v_net_sales > 0 THEN ROUND((v_operating_income / v_net_sales) * 100, 1) ELSE 0 END;
  
  -- Other income & interest (from expenses table)
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'other_income' THEN amount END), 0),
    COALESCE(SUM(CASE WHEN category = 'interest' THEN amount END), 0)
  INTO v_other_income, v_interest_expense
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= v_start_date
    AND expense_date <= v_end_date;
  
  v_income_before_tax := v_operating_income + v_other_income - v_interest_expense;
  v_income_tax := CASE WHEN v_income_before_tax > 0 THEN v_income_before_tax * 0.2 ELSE 0 END;
  v_net_income := v_income_before_tax - v_income_tax;
  v_net_margin := CASE WHEN v_net_sales > 0 THEN ROUND((v_net_income / v_net_sales) * 100, 1) ELSE 0 END;
  
  -- ===========================================
  -- STEP 7: Upsert into cache
  -- ===========================================
  INSERT INTO pl_report_cache (
    tenant_id, period_type, period_year, period_month, period_quarter,
    gross_sales, sales_returns, sales_discounts, net_sales,
    invoice_revenue, contract_revenue, integrated_revenue,
    cogs, gross_profit, gross_margin,
    opex_salaries, opex_rent, opex_utilities, opex_marketing,
    opex_depreciation, opex_insurance, opex_supplies, opex_maintenance,
    opex_professional, opex_other, opex_logistics, total_opex,
    opex_data_source, total_opex_estimated, total_opex_actual,
    operating_income, operating_margin,
    other_income, interest_expense,
    income_before_tax, income_tax, net_income, net_margin,
    calculated_at
  ) VALUES (
    p_tenant_id, v_period_type, p_year, p_month, NULL,
    v_gross_sales, v_sales_returns, v_sales_discounts, v_net_sales,
    v_invoice_revenue, v_contract_revenue, v_integrated_revenue,
    v_cogs, v_gross_profit, v_gross_margin,
    v_opex_salaries, v_opex_rent, v_opex_utilities, v_opex_marketing,
    v_opex_depreciation, v_opex_insurance, v_opex_supplies, v_opex_maintenance,
    v_opex_professional, v_opex_other, v_opex_logistics, v_total_opex,
    v_opex_data_source, v_total_opex_estimated, v_total_opex_actual,
    v_operating_income, v_operating_margin,
    v_other_income, v_interest_expense,
    v_income_before_tax, v_income_tax, v_net_income, v_net_margin,
    NOW()
  )
  ON CONFLICT (tenant_id, period_type, period_year, COALESCE(period_month, 0), COALESCE(period_quarter, 0))
  DO UPDATE SET
    gross_sales = EXCLUDED.gross_sales,
    sales_returns = EXCLUDED.sales_returns,
    sales_discounts = EXCLUDED.sales_discounts,
    net_sales = EXCLUDED.net_sales,
    invoice_revenue = EXCLUDED.invoice_revenue,
    contract_revenue = EXCLUDED.contract_revenue,
    integrated_revenue = EXCLUDED.integrated_revenue,
    cogs = EXCLUDED.cogs,
    gross_profit = EXCLUDED.gross_profit,
    gross_margin = EXCLUDED.gross_margin,
    opex_salaries = EXCLUDED.opex_salaries,
    opex_rent = EXCLUDED.opex_rent,
    opex_utilities = EXCLUDED.opex_utilities,
    opex_marketing = EXCLUDED.opex_marketing,
    opex_depreciation = EXCLUDED.opex_depreciation,
    opex_insurance = EXCLUDED.opex_insurance,
    opex_supplies = EXCLUDED.opex_supplies,
    opex_maintenance = EXCLUDED.opex_maintenance,
    opex_professional = EXCLUDED.opex_professional,
    opex_other = EXCLUDED.opex_other,
    opex_logistics = EXCLUDED.opex_logistics,
    total_opex = EXCLUDED.total_opex,
    opex_data_source = EXCLUDED.opex_data_source,
    total_opex_estimated = EXCLUDED.total_opex_estimated,
    total_opex_actual = EXCLUDED.total_opex_actual,
    operating_income = EXCLUDED.operating_income,
    operating_margin = EXCLUDED.operating_margin,
    other_income = EXCLUDED.other_income,
    interest_expense = EXCLUDED.interest_expense,
    income_before_tax = EXCLUDED.income_before_tax,
    income_tax = EXCLUDED.income_tax,
    net_income = EXCLUDED.net_income,
    net_margin = EXCLUDED.net_margin,
    calculated_at = NOW();
    
END;
$$;