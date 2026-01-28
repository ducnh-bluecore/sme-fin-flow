-- =============================================
-- PHASE 5: CASH FORECAST MIGRATION TO RPC
-- =============================================

-- =============================================
-- Task 5.1: Main Forecast Generation RPC
-- =============================================

-- Type for forecast output row
DROP TYPE IF EXISTS public.forecast_row CASCADE;
CREATE TYPE public.forecast_row AS (
  forecast_date DATE,
  display_date TEXT,
  balance NUMERIC,
  inflow NUMERIC,
  outflow NUMERIC,
  net_flow NUMERIC,
  upper_bound NUMERIC,
  lower_bound NUMERIC,
  is_actual BOOLEAN
);

-- Main RPC: Generate Cash Forecast
CREATE OR REPLACE FUNCTION public.generate_cash_forecast(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 90,
  p_method TEXT DEFAULT 'rule-based' -- 'rule-based' or 'simple'
)
RETURNS SETOF public.forecast_row
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_balance NUMERIC := 0;
  v_ar_total NUMERIC := 0;
  v_ar_due_30 NUMERIC := 0;
  v_ar_due_60 NUMERIC := 0;
  v_ar_due_90 NUMERIC := 0;
  v_ar_overdue NUMERIC := 0;
  v_ap_due_30 NUMERIC := 0;
  v_ap_due_60 NUMERIC := 0;
  v_ap_due_90 NUMERIC := 0;
  v_recurring_monthly NUMERIC := 0;
  v_pending_settlements NUMERIC := 0;
  v_avg_daily_inflow NUMERIC := 0;
  v_avg_daily_outflow NUMERIC := 0;
  v_historical_days INTEGER := 1;
  v_has_invoice_data BOOLEAN := false;
  v_has_bill_data BOOLEAN := false;
  v_has_historical_data BOOLEAN := false;
  
  v_balance NUMERIC;
  v_remaining_ar NUMERIC;
  v_daily_recurring NUMERIC;
  v_inflow NUMERIC;
  v_outflow NUMERIC;
  v_upper_bound NUMERIC;
  v_lower_bound NUMERIC;
  v_uncertainty NUMERIC;
  v_collection_prob NUMERIC;
  v_simple_daily_rate NUMERIC := 0.15 / 7; -- 15%/week
  
  v_today DATE := CURRENT_DATE;
  v_date DATE;
  v_days_from_due INTEGER;
  r public.forecast_row;
BEGIN
  -- =============================================
  -- STEP 1: Gather all inputs from database
  -- =============================================
  
  -- Bank balance
  SELECT COALESCE(SUM(current_balance), 0) INTO v_bank_balance
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';
  
  -- AR calculations
  WITH ar_data AS (
    SELECT 
      (total_amount - COALESCE(paid_amount, 0)) AS balance,
      due_date,
      CASE WHEN status = 'overdue' OR due_date < v_today THEN true ELSE false END AS is_overdue
    FROM invoices
    WHERE tenant_id = p_tenant_id
      AND status IN ('sent', 'issued', 'overdue', 'partial')
  )
  SELECT 
    COALESCE(SUM(balance), 0),
    COALESCE(SUM(CASE WHEN NOT is_overdue AND due_date <= v_today + INTERVAL '30 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN NOT is_overdue AND due_date <= v_today + INTERVAL '60 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN NOT is_overdue AND due_date <= v_today + INTERVAL '90 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN is_overdue THEN balance END), 0),
    COUNT(*) > 0
  INTO v_ar_total, v_ar_due_30, v_ar_due_60, v_ar_due_90, v_ar_overdue, v_has_invoice_data
  FROM ar_data;
  
  -- AP calculations
  WITH ap_data AS (
    SELECT 
      (total_amount - COALESCE(paid_amount, 0)) AS balance,
      due_date
    FROM bills
    WHERE tenant_id = p_tenant_id
      AND status IN ('approved', 'pending', 'partial')
  )
  SELECT 
    COALESCE(SUM(CASE WHEN due_date <= v_today + INTERVAL '30 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN due_date <= v_today + INTERVAL '60 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN due_date <= v_today + INTERVAL '90 days' THEN balance END), 0),
    COUNT(*) > 0
  INTO v_ap_due_30, v_ap_due_60, v_ap_due_90, v_has_bill_data
  FROM ap_data;
  
  -- Recurring expenses (monthly, deduplicated by description)
  WITH ranked_expenses AS (
    SELECT 
      description,
      amount,
      recurring_period,
      ROW_NUMBER() OVER (PARTITION BY COALESCE(description, id::text) ORDER BY expense_date DESC NULLS LAST) AS rn
    FROM expenses
    WHERE tenant_id = p_tenant_id AND is_recurring = true
  )
  SELECT COALESCE(SUM(
    CASE 
      WHEN recurring_period = 'weekly' THEN amount * 4
      WHEN recurring_period = 'yearly' THEN amount / 12
      ELSE amount
    END
  ), 0) INTO v_recurring_monthly
  FROM ranked_expenses WHERE rn = 1;
  
  -- Pending settlements (T+14 eCommerce)
  SELECT COALESCE(SUM(net_revenue), 0) INTO v_pending_settlements
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at >= v_today - INTERVAL '14 days';
  
  -- Historical stats (last 90 days)
  SELECT 
    COALESCE(total_credit, 0) / GREATEST(unique_days, 1),
    COALESCE(total_debit, 0) / GREATEST(unique_days, 1),
    COALESCE(unique_days, 1),
    unique_days >= 7
  INTO v_avg_daily_inflow, v_avg_daily_outflow, v_historical_days, v_has_historical_data
  FROM get_forecast_historical_stats(p_tenant_id, 90);
  
  -- =============================================
  -- STEP 2: Generate daily forecast
  -- =============================================
  
  v_balance := v_bank_balance;
  v_remaining_ar := v_ar_total;
  v_daily_recurring := v_recurring_monthly / 30;
  
  FOR i IN 0..(p_days - 1) LOOP
    v_date := v_today + i;
    v_inflow := 0;
    v_outflow := 0;
    
    -- =============================================
    -- INFLOWS
    -- =============================================
    
    IF p_method = 'simple' THEN
      -- Simple method: Fixed 15% AR/week (~2.14%/day)
      v_inflow := v_remaining_ar * v_simple_daily_rate;
      v_remaining_ar := v_remaining_ar - v_inflow;
      
      -- eCommerce settlements (day 7-21)
      IF i >= 7 AND i <= 21 THEN
        v_inflow := v_inflow + (v_pending_settlements / 14);
      END IF;
    ELSE
      -- Rule-based: AR collections with probability curve
      
      -- Collection probability function
      IF i <= 0 THEN v_collection_prob := 0.85;
      ELSIF i <= 30 THEN v_collection_prob := 0.70;
      ELSIF i <= 60 THEN v_collection_prob := 0.50;
      ELSIF i <= 90 THEN v_collection_prob := 0.30;
      ELSE v_collection_prob := 0.10;
      END IF;
      
      -- AR due within different periods
      IF i < 30 THEN
        v_inflow := (v_ar_due_30 / 30) * v_collection_prob;
      ELSIF i < 60 THEN
        -- Get probability for days 30-60
        v_days_from_due := i - 30;
        IF v_days_from_due <= 0 THEN v_collection_prob := 0.85;
        ELSIF v_days_from_due <= 30 THEN v_collection_prob := 0.70;
        ELSE v_collection_prob := 0.50;
        END IF;
        v_inflow := ((v_ar_due_60 - v_ar_due_30) / 30) * v_collection_prob;
      ELSE
        -- Get probability for days 60-90
        v_days_from_due := i - 60;
        IF v_days_from_due <= 0 THEN v_collection_prob := 0.85;
        ELSIF v_days_from_due <= 30 THEN v_collection_prob := 0.70;
        ELSE v_collection_prob := 0.50;
        END IF;
        v_inflow := ((v_ar_due_90 - v_ar_due_60) / 30) * v_collection_prob;
      END IF;
      
      -- Overdue AR (3% daily with decreasing probability)
      v_days_from_due := i + 30;
      IF v_days_from_due <= 30 THEN v_collection_prob := 0.70;
      ELSIF v_days_from_due <= 60 THEN v_collection_prob := 0.50;
      ELSIF v_days_from_due <= 90 THEN v_collection_prob := 0.30;
      ELSE v_collection_prob := 0.10;
      END IF;
      v_inflow := v_inflow + (v_ar_overdue * 0.03) * v_collection_prob;
      
      -- eCommerce settlements (T+7 to T+21)
      IF i >= 7 AND i <= 21 THEN
        v_inflow := v_inflow + (v_pending_settlements / 14);
      END IF;
    END IF;
    
    -- Fallback to historical if no invoice data
    IF NOT v_has_invoice_data AND v_has_historical_data THEN
      v_inflow := v_avg_daily_inflow;
    END IF;
    
    -- =============================================
    -- OUTFLOWS
    -- =============================================
    
    -- AP payments spread by due dates
    IF i < 30 THEN
      v_outflow := v_ap_due_30 / 30;
    ELSIF i < 60 THEN
      v_outflow := (v_ap_due_60 - v_ap_due_30) / 30;
    ELSE
      v_outflow := (v_ap_due_90 - v_ap_due_60) / 30;
    END IF;
    
    -- Recurring expenses
    v_outflow := v_outflow + v_daily_recurring;
    
    -- Fallback to historical if no bill data
    IF NOT v_has_bill_data AND v_has_historical_data THEN
      v_outflow := v_avg_daily_outflow;
    END IF;
    
    -- =============================================
    -- UPDATE BALANCE & BOUNDS
    -- =============================================
    
    v_balance := v_balance + v_inflow - v_outflow;
    
    IF p_method = 'simple' THEN
      v_upper_bound := v_balance;
      v_lower_bound := v_balance;
    ELSE
      -- Uncertainty widens over time (1.2%/day, max 60%)
      v_uncertainty := LEAST(0.6, i * 0.012);
      v_upper_bound := v_balance * (1 + v_uncertainty);
      v_lower_bound := v_balance * (1 - v_uncertainty);
      
      -- Normalize if inverted (negative balance)
      IF v_upper_bound < v_lower_bound THEN
        DECLARE tmp NUMERIC;
        BEGIN
          tmp := v_upper_bound;
          v_upper_bound := v_lower_bound;
          v_lower_bound := tmp;
        END;
      END IF;
    END IF;
    
    -- Build result row
    r.forecast_date := v_date;
    r.display_date := EXTRACT(DAY FROM v_date)::TEXT || '/' || EXTRACT(MONTH FROM v_date)::TEXT;
    r.balance := ROUND(v_balance, 2);
    r.inflow := ROUND(v_inflow, 2);
    r.outflow := ROUND(v_outflow, 2);
    r.net_flow := ROUND(v_inflow - v_outflow, 2);
    r.upper_bound := ROUND(v_upper_bound, 2);
    r.lower_bound := ROUND(v_lower_bound, 2);
    r.is_actual := (i = 0);
    
    RETURN NEXT r;
  END LOOP;
  
  RETURN;
END;
$$;

-- =============================================
-- Helper RPC: Get Forecast Inputs Summary
-- =============================================

CREATE OR REPLACE FUNCTION public.get_forecast_inputs_summary(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_today DATE := CURRENT_DATE;
  v_bank_balance NUMERIC;
  v_bank_count INTEGER;
  v_ar_total NUMERIC;
  v_ar_due_30 NUMERIC;
  v_ar_due_60 NUMERIC;
  v_ar_due_90 NUMERIC;
  v_ar_overdue NUMERIC;
  v_invoice_count INTEGER;
  v_ap_total NUMERIC;
  v_ap_due_30 NUMERIC;
  v_ap_due_60 NUMERIC;
  v_ap_due_90 NUMERIC;
  v_bill_count INTEGER;
  v_recurring_monthly NUMERIC;
  v_expense_count INTEGER;
  v_pending_settlements NUMERIC;
  v_order_count INTEGER;
  v_avg_daily_inflow NUMERIC;
  v_avg_daily_outflow NUMERIC;
  v_historical_days INTEGER;
  v_data_quality INTEGER;
  v_missing_data TEXT[];
BEGIN
  -- Bank accounts
  SELECT COALESCE(SUM(current_balance), 0), COUNT(*)
  INTO v_bank_balance, v_bank_count
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';
  
  -- AR
  WITH ar_data AS (
    SELECT 
      (total_amount - COALESCE(paid_amount, 0)) AS balance,
      due_date,
      CASE WHEN status = 'overdue' OR due_date < v_today THEN true ELSE false END AS is_overdue
    FROM invoices
    WHERE tenant_id = p_tenant_id
      AND status IN ('sent', 'issued', 'overdue', 'partial')
  )
  SELECT 
    COALESCE(SUM(balance), 0),
    COALESCE(SUM(CASE WHEN NOT is_overdue AND due_date <= v_today + INTERVAL '30 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN NOT is_overdue AND due_date <= v_today + INTERVAL '60 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN NOT is_overdue AND due_date <= v_today + INTERVAL '90 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN is_overdue THEN balance END), 0),
    COUNT(*)
  INTO v_ar_total, v_ar_due_30, v_ar_due_60, v_ar_due_90, v_ar_overdue, v_invoice_count
  FROM ar_data;
  
  -- AP
  WITH ap_data AS (
    SELECT 
      (total_amount - COALESCE(paid_amount, 0)) AS balance,
      due_date
    FROM bills
    WHERE tenant_id = p_tenant_id
      AND status IN ('approved', 'pending', 'partial')
  )
  SELECT 
    COALESCE(SUM(balance), 0),
    COALESCE(SUM(CASE WHEN due_date <= v_today + INTERVAL '30 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN due_date <= v_today + INTERVAL '60 days' THEN balance END), 0),
    COALESCE(SUM(CASE WHEN due_date <= v_today + INTERVAL '90 days' THEN balance END), 0),
    COUNT(*)
  INTO v_ap_total, v_ap_due_30, v_ap_due_60, v_ap_due_90, v_bill_count
  FROM ap_data;
  
  -- Recurring expenses
  WITH ranked_expenses AS (
    SELECT 
      description, amount, recurring_period,
      ROW_NUMBER() OVER (PARTITION BY COALESCE(description, id::text) ORDER BY expense_date DESC NULLS LAST) AS rn
    FROM expenses
    WHERE tenant_id = p_tenant_id AND is_recurring = true
  )
  SELECT 
    COALESCE(SUM(CASE WHEN recurring_period = 'weekly' THEN amount * 4 WHEN recurring_period = 'yearly' THEN amount / 12 ELSE amount END), 0),
    COUNT(*)
  INTO v_recurring_monthly, v_expense_count
  FROM ranked_expenses WHERE rn = 1;
  
  -- Pending settlements
  SELECT COALESCE(SUM(net_revenue), 0), COUNT(*)
  INTO v_pending_settlements, v_order_count
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id AND order_at >= v_today - INTERVAL '14 days';
  
  -- Historical stats
  SELECT 
    COALESCE(total_credit, 0) / GREATEST(unique_days, 1),
    COALESCE(total_debit, 0) / GREATEST(unique_days, 1),
    COALESCE(unique_days, 1)
  INTO v_avg_daily_inflow, v_avg_daily_outflow, v_historical_days
  FROM get_forecast_historical_stats(p_tenant_id, 90);
  
  -- Data quality score
  v_data_quality := 0;
  v_missing_data := ARRAY[]::TEXT[];
  
  IF v_bank_count > 0 THEN v_data_quality := v_data_quality + 25;
  ELSE v_missing_data := array_append(v_missing_data, 'Số dư ngân hàng');
  END IF;
  
  IF v_invoice_count > 0 THEN v_data_quality := v_data_quality + 20;
  ELSE v_missing_data := array_append(v_missing_data, 'Hóa đơn bán hàng');
  END IF;
  
  IF v_bill_count > 0 THEN v_data_quality := v_data_quality + 20;
  ELSE v_missing_data := array_append(v_missing_data, 'Hóa đơn mua hàng');
  END IF;
  
  IF v_historical_days >= 7 THEN v_data_quality := v_data_quality + 25;
  ELSE v_missing_data := array_append(v_missing_data, 'Lịch sử giao dịch (≥7 ngày)');
  END IF;
  
  IF v_expense_count > 0 THEN v_data_quality := v_data_quality + 5; END IF;
  IF v_order_count > 0 THEN v_data_quality := v_data_quality + 5; END IF;
  
  v_result := jsonb_build_object(
    'bankBalance', v_bank_balance,
    'bankAccountCount', v_bank_count,
    'arTotal', v_ar_total,
    'arDueWithin30', v_ar_due_30,
    'arDueWithin60', v_ar_due_60,
    'arDueWithin90', v_ar_due_90,
    'arOverdue', v_ar_overdue,
    'invoiceCount', v_invoice_count,
    'apTotal', v_ap_total,
    'apDueWithin30', v_ap_due_30,
    'apDueWithin60', v_ap_due_60,
    'apDueWithin90', v_ap_due_90,
    'billCount', v_bill_count,
    'recurringExpensesMonthly', v_recurring_monthly,
    'expenseCount', v_expense_count,
    'pendingSettlements', v_pending_settlements,
    'orderCount', v_order_count,
    'avgDailyInflow', v_avg_daily_inflow,
    'avgDailyOutflow', v_avg_daily_outflow,
    'historicalDays', v_historical_days,
    'dataStatus', jsonb_build_object(
      'hasBankData', v_bank_count > 0,
      'hasInvoiceData', v_invoice_count > 0,
      'hasBillData', v_bill_count > 0,
      'hasExpenseData', v_expense_count > 0,
      'hasOrderData', v_order_count > 0,
      'hasHistoricalData', v_historical_days >= 7,
      'historicalDaysAvailable', v_historical_days,
      'missingData', v_missing_data,
      'dataQualityScore', v_data_quality
    )
  );
  
  RETURN v_result;
END;
$$;