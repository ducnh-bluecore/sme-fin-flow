-- Update refresh_pl_cache RPC to use cdp_orders and finance_expenses_daily
-- This fixes the P&L Report page to show correct revenue breakdown and expense categories

CREATE OR REPLACE FUNCTION public.refresh_pl_cache(p_tenant_id uuid, p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer, p_month integer DEFAULT NULL::integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_gross_sales numeric := 0;
  v_discounts numeric := 0;
  v_returns numeric := 0;
  v_net_sales numeric := 0;
  v_invoice_revenue numeric := 0;
  v_contract_revenue numeric := 0;
  v_integrated_revenue numeric := 0;
  v_cogs numeric := 0;
  v_opex_salaries numeric := 0;
  v_opex_rent numeric := 0;
  v_opex_utilities numeric := 0;
  v_opex_marketing numeric := 0;
  v_opex_depreciation numeric := 0;
  v_opex_logistics numeric := 0;
  v_opex_other numeric := 0;
  v_total_opex numeric := 0;
  v_interest numeric := 0;
  v_tax_rate numeric := 0.20;
  v_period_type text;
  v_period_quarter integer := NULL;
BEGIN
  -- Determine period
  IF p_month IS NOT NULL THEN
    v_period_type := 'monthly';
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::date;
  ELSE
    v_period_type := 'yearly';
    v_start_date := make_date(p_year, 1, 1);
    v_end_date := make_date(p_year, 12, 31);
  END IF;

  -- =====================================================
  -- REVENUE: Use cdp_orders as SSOT for e-commerce revenue
  -- =====================================================
  
  -- Integrated Revenue from e-commerce platforms (cdp_orders)
  SELECT 
    COALESCE(SUM(gross_revenue), 0),
    COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(CASE WHEN gross_revenue > net_revenue THEN gross_revenue - net_revenue ELSE 0 END), 0)
  INTO v_integrated_revenue, v_net_sales, v_discounts
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND channel IN ('Shopee', 'Lazada', 'TikTok Shop', 'TikTok', 'Website', 'Other')
    AND order_at >= v_start_date
    AND order_at <= v_end_date + INTERVAL '1 day';

  -- Invoice revenue (traditional invoices)
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(discount_amount), 0)
  INTO v_invoice_revenue, v_discounts
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND status != 'cancelled'
    AND issue_date >= v_start_date
    AND issue_date <= v_end_date;

  -- Contract revenue from revenues table
  SELECT COALESCE(SUM(amount), 0) INTO v_contract_revenue
  FROM revenues
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND source = 'manual'
    AND start_date >= v_start_date
    AND start_date <= v_end_date;

  -- Combined gross/net sales: prioritize cdp_orders if exists, else fallback to invoices
  IF v_integrated_revenue > 0 THEN
    v_gross_sales := v_integrated_revenue + v_discounts;
    v_net_sales := v_integrated_revenue;
  ELSE
    v_gross_sales := v_invoice_revenue + v_discounts + v_contract_revenue;
    v_net_sales := v_invoice_revenue + v_contract_revenue;
  END IF;

  -- =====================================================
  -- COGS: Get from cdp_orders or expenses table
  -- =====================================================
  
  -- First try cdp_orders (has COGS column)
  SELECT COALESCE(SUM(cogs), 0) INTO v_cogs
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at >= v_start_date
    AND order_at <= v_end_date + INTERVAL '1 day';

  -- If no COGS in orders, get from expenses table
  IF v_cogs = 0 THEN
    SELECT COALESCE(SUM(CASE WHEN category = 'cogs' THEN amount ELSE 0 END), 0)
    INTO v_cogs
    FROM expenses
    WHERE tenant_id = p_tenant_id
      AND expense_date >= v_start_date
      AND expense_date <= v_end_date;
  END IF;

  -- =====================================================
  -- EXPENSES: Use finance_expenses_daily (pre-aggregated)
  -- =====================================================
  
  SELECT 
    COALESCE(SUM(salary_amount), 0),
    COALESCE(SUM(rent_amount), 0),
    COALESCE(SUM(utilities_amount), 0),
    COALESCE(SUM(marketing_amount), 0),
    COALESCE(SUM(depreciation_amount), 0),
    COALESCE(SUM(logistics_amount), 0),
    COALESCE(SUM(other_amount), 0),
    COALESCE(SUM(interest_amount), 0)
  INTO 
    v_opex_salaries, v_opex_rent, v_opex_utilities,
    v_opex_marketing, v_opex_depreciation, v_opex_logistics,
    v_opex_other, v_interest
  FROM finance_expenses_daily
  WHERE tenant_id = p_tenant_id
    AND day >= v_start_date
    AND day <= v_end_date;

  -- If finance_expenses_daily is empty, fallback to expenses table directly
  IF v_opex_salaries = 0 AND v_opex_rent = 0 AND v_opex_marketing = 0 THEN
    SELECT 
      COALESCE(SUM(CASE WHEN category = 'salary' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN category = 'rent' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN category = 'utilities' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN category = 'marketing' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN category = 'depreciation' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN category = 'logistics' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN category NOT IN ('cogs', 'salary', 'rent', 'utilities', 'marketing', 'depreciation', 'logistics', 'interest', 'tax') THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN category = 'interest' THEN amount ELSE 0 END), 0)
    INTO 
      v_opex_salaries, v_opex_rent, v_opex_utilities,
      v_opex_marketing, v_opex_depreciation, v_opex_logistics,
      v_opex_other, v_interest
    FROM expenses
    WHERE tenant_id = p_tenant_id
      AND expense_date >= v_start_date
      AND expense_date <= v_end_date;
  END IF;

  v_total_opex := v_opex_salaries + v_opex_rent + v_opex_utilities + v_opex_marketing + v_opex_depreciation + v_opex_logistics + v_opex_other;

  -- =====================================================
  -- DELETE old cache entry and INSERT new one
  -- (Avoids ON CONFLICT issues with partial unique constraint)
  -- =====================================================
  
  DELETE FROM pl_report_cache 
  WHERE tenant_id = p_tenant_id 
    AND period_type = v_period_type 
    AND period_year = p_year 
    AND ((p_month IS NULL AND period_month IS NULL) OR period_month = p_month)
    AND period_quarter IS NULL;
  
  INSERT INTO pl_report_cache (
    tenant_id, period_type, period_year, period_month, period_quarter,
    gross_sales, sales_returns, sales_discounts, net_sales,
    invoice_revenue, contract_revenue, integrated_revenue,
    cogs, gross_profit, gross_margin,
    opex_salaries, opex_rent, opex_utilities, opex_marketing, opex_depreciation, opex_other, total_opex,
    operating_income, operating_margin,
    interest_expense, income_before_tax, income_tax, net_income, net_margin,
    calculated_at, updated_at
  ) VALUES (
    p_tenant_id, v_period_type, p_year, p_month, v_period_quarter,
    v_gross_sales, v_returns, v_discounts, v_net_sales,
    v_invoice_revenue, v_contract_revenue, v_integrated_revenue,
    v_cogs, v_net_sales - v_cogs,
    CASE WHEN v_net_sales > 0 THEN (v_net_sales - v_cogs) / v_net_sales ELSE 0 END,
    v_opex_salaries, v_opex_rent, v_opex_utilities, v_opex_marketing, v_opex_depreciation, v_opex_other, v_total_opex,
    v_net_sales - v_cogs - v_total_opex,
    CASE WHEN v_net_sales > 0 THEN (v_net_sales - v_cogs - v_total_opex) / v_net_sales ELSE 0 END,
    v_interest,
    v_net_sales - v_cogs - v_total_opex - v_interest,
    GREATEST((v_net_sales - v_cogs - v_total_opex - v_interest) * v_tax_rate, 0),
    (v_net_sales - v_cogs - v_total_opex - v_interest) * (1 - v_tax_rate),
    CASE WHEN v_net_sales > 0 THEN ((v_net_sales - v_cogs - v_total_opex - v_interest) * (1 - v_tax_rate)) / v_net_sales ELSE 0 END,
    now(), now()
  );
END;
$$;

-- =====================================================
-- Trigger cache refresh for all active tenants for current period
-- =====================================================
DO $$
DECLARE
  t_id UUID;
  current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  current_month INT := EXTRACT(MONTH FROM CURRENT_DATE)::INT;
  m INT;
BEGIN
  FOR t_id IN SELECT id FROM tenants WHERE is_active = true LOOP
    -- Refresh current year (yearly aggregate)
    PERFORM refresh_pl_cache(t_id, current_year, NULL);
    
    -- Refresh all months of current year
    FOR m IN 1..current_month LOOP
      PERFORM refresh_pl_cache(t_id, current_year, m);
    END LOOP;
    
    -- Also refresh 2024 and 2025 if we have data
    IF current_year >= 2025 THEN
      PERFORM refresh_pl_cache(t_id, 2024, NULL);
      FOR m IN 1..12 LOOP
        PERFORM refresh_pl_cache(t_id, 2024, m);
      END LOOP;
      
      IF current_year = 2026 THEN
        PERFORM refresh_pl_cache(t_id, 2025, NULL);
        FOR m IN 1..12 LOOP
          PERFORM refresh_pl_cache(t_id, 2025, m);
        END LOOP;
      END IF;
    END IF;
  END LOOP;
END $$;