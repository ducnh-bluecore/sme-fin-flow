-- Add missing columns to dashboard_kpi_cache for full central metrics
ALTER TABLE public.dashboard_kpi_cache
ADD COLUMN IF NOT EXISTS dpo integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS dio integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_profit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS operating_margin numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ebitda_margin numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_profit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_profit_margin numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ap numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS inventory numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS working_capital numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_flow numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS depreciation numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_expense numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_expense numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_sales numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_cogs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_purchases numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_in_period integer DEFAULT 90;

-- Create function to refresh central financial metrics cache
CREATE OR REPLACE FUNCTION public.refresh_central_metrics_cache(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days_in_period integer;
  v_invoice_revenue numeric := 0;
  v_order_revenue numeric := 0;
  v_order_cogs numeric := 0;
  v_order_fees numeric := 0;
  v_contract_revenue numeric := 0;
  v_total_revenue numeric := 0;
  v_net_revenue numeric := 0;
  v_cogs numeric := 0;
  v_total_opex numeric := 0;
  v_depreciation numeric := 0;
  v_interest_expense numeric := 0;
  v_tax_expense numeric := 0;
  v_gross_profit numeric := 0;
  v_gross_margin numeric := 0;
  v_operating_income numeric := 0;
  v_operating_margin numeric := 0;
  v_ebitda numeric := 0;
  v_ebitda_margin numeric := 0;
  v_net_profit numeric := 0;
  v_net_profit_margin numeric := 0;
  v_total_ar numeric := 0;
  v_overdue_ar numeric := 0;
  v_total_ap numeric := 0;
  v_inventory numeric := 0;
  v_working_capital numeric := 0;
  v_cash_on_hand numeric := 0;
  v_cash_flow numeric := 0;
  v_daily_sales numeric := 0;
  v_daily_cogs numeric := 0;
  v_daily_purchases numeric := 0;
  v_dso integer := 0;
  v_dpo integer := 0;
  v_dio integer := 0;
  v_ccc integer := 0;
  v_total_purchases numeric := 0;
  v_bill_amount numeric := 0;
BEGIN
  -- Calculate days in period
  v_days_in_period := GREATEST(p_end_date - p_start_date, 1);
  
  -- Invoice revenue (period-based)
  SELECT COALESCE(SUM(COALESCE(subtotal, total_amount, 0) - COALESCE(discount_amount, 0)), 0)
  INTO v_invoice_revenue
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND issue_date >= p_start_date
    AND issue_date <= p_end_date
    AND status != 'cancelled';
  
  -- Order revenue and COGS (period-based)
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(cost_of_goods), 0),
    COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0) + COALESCE(shipping_fee, 0)), 0)
  INTO v_order_revenue, v_order_cogs, v_order_fees
  FROM external_orders
  WHERE tenant_id = p_tenant_id
    AND order_date >= p_start_date
    AND order_date <= p_end_date
    AND status = 'delivered';
  
  -- Contract/recurring revenue
  SELECT COALESCE(SUM(amount), 0)
  INTO v_contract_revenue
  FROM revenues
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND start_date <= p_end_date
    AND (end_date IS NULL OR end_date >= p_start_date);
  
  -- Total and net revenue
  v_total_revenue := v_invoice_revenue + v_order_revenue + v_contract_revenue;
  v_net_revenue := v_total_revenue * 0.98; -- 2% returns estimate
  
  -- Expenses by category
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'cogs' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('salary', 'rent', 'utilities', 'marketing', 'logistics', 'other') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'depreciation' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'interest' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'tax' THEN amount ELSE 0 END), 0)
  INTO v_cogs, v_total_opex, v_depreciation, v_interest_expense, v_tax_expense
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= p_start_date
    AND expense_date <= p_end_date;
  
  -- Add order COGS
  v_cogs := v_cogs + v_order_cogs;
  
  -- Use fallback ratios if no expense data
  IF v_cogs = 0 AND v_order_cogs = 0 THEN
    v_cogs := v_net_revenue * 0.65;
  END IF;
  IF v_total_opex = 0 THEN
    v_total_opex := v_net_revenue * 0.20;
  END IF;
  
  -- Profitability calculations
  v_gross_profit := v_net_revenue - v_cogs;
  v_gross_margin := CASE WHEN v_net_revenue > 0 THEN (v_gross_profit / v_net_revenue) * 100 ELSE 0 END;
  
  v_operating_income := v_gross_profit - v_total_opex;
  v_operating_margin := CASE WHEN v_net_revenue > 0 THEN (v_operating_income / v_net_revenue) * 100 ELSE 0 END;
  
  v_ebitda := v_operating_income + v_depreciation;
  v_ebitda_margin := CASE WHEN v_net_revenue > 0 THEN (v_ebitda / v_net_revenue) * 100 ELSE 0 END;
  
  IF v_tax_expense = 0 AND v_operating_income > v_interest_expense THEN
    v_tax_expense := (v_operating_income - v_interest_expense) * 0.20;
  END IF;
  v_net_profit := v_operating_income - v_interest_expense - v_tax_expense;
  v_net_profit_margin := CASE WHEN v_net_revenue > 0 THEN (v_net_profit / v_net_revenue) * 100 ELSE 0 END;
  
  -- AR (unpaid invoices - current balance, not period-based)
  SELECT 
    COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('paid', 'cancelled');
  
  -- AP (unpaid bills - current balance)
  SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
  INTO v_total_ap
  FROM bills
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('paid', 'cancelled');
  
  -- Bill amount for DPO
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_bill_amount
  FROM bills
  WHERE tenant_id = p_tenant_id
    AND bill_date >= p_start_date
    AND bill_date <= p_end_date;
  
  -- Cash
  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_cash_on_hand
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id
    AND status = 'active';
  
  -- Cash flow
  SELECT COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0)
  INTO v_cash_flow
  FROM bank_transactions
  WHERE tenant_id = p_tenant_id
    AND transaction_date >= p_start_date
    AND transaction_date <= p_end_date;
  
  -- Daily calculations
  v_daily_sales := v_net_revenue / v_days_in_period;
  v_daily_cogs := v_cogs / v_days_in_period;
  v_inventory := v_daily_cogs * 30; -- 30-day estimate
  v_total_purchases := v_bill_amount + v_order_cogs;
  v_daily_purchases := v_total_purchases / v_days_in_period;
  v_working_capital := v_total_ar + v_inventory - v_total_ap;
  
  -- Cycle metrics
  v_dso := CASE WHEN v_daily_sales > 0 THEN ROUND(v_total_ar / v_daily_sales)::integer ELSE 45 END;
  v_dio := CASE WHEN v_daily_cogs > 0 THEN ROUND(v_inventory / v_daily_cogs)::integer ELSE 30 END;
  v_dpo := CASE WHEN v_daily_purchases > 0 THEN ROUND(v_total_ap / v_daily_purchases)::integer ELSE 30 END;
  v_ccc := v_dso + v_dio - v_dpo;
  
  -- Upsert cache
  INSERT INTO dashboard_kpi_cache (
    tenant_id, date_range_start, date_range_end, calculated_at,
    cash_today, cash_7d, total_ar, overdue_ar, dso, dpo, dio, ccc,
    gross_margin, ebitda, ebitda_margin, operating_margin,
    net_profit, net_profit_margin,
    total_revenue, net_revenue, total_cogs, total_opex, gross_profit,
    invoice_revenue, order_revenue, contract_revenue,
    depreciation, interest_expense, tax_expense,
    total_ap, inventory, working_capital, cash_flow,
    daily_sales, daily_cogs, daily_purchases, days_in_period
  )
  VALUES (
    p_tenant_id, p_start_date, p_end_date, NOW(),
    v_cash_on_hand, v_cash_on_hand, v_total_ar, v_overdue_ar, v_dso, v_dpo, v_dio, v_ccc,
    v_gross_margin, v_ebitda, v_ebitda_margin, v_operating_margin,
    v_net_profit, v_net_profit_margin,
    v_total_revenue, v_net_revenue, v_cogs, v_total_opex, v_gross_profit,
    v_invoice_revenue, v_order_revenue, v_contract_revenue,
    v_depreciation, v_interest_expense, v_tax_expense,
    v_total_ap, v_inventory, v_working_capital, v_cash_flow,
    v_daily_sales, v_daily_cogs, v_daily_purchases, v_days_in_period
  )
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    date_range_start = EXCLUDED.date_range_start,
    date_range_end = EXCLUDED.date_range_end,
    calculated_at = EXCLUDED.calculated_at,
    cash_today = EXCLUDED.cash_today,
    cash_7d = EXCLUDED.cash_7d,
    total_ar = EXCLUDED.total_ar,
    overdue_ar = EXCLUDED.overdue_ar,
    dso = EXCLUDED.dso,
    dpo = EXCLUDED.dpo,
    dio = EXCLUDED.dio,
    ccc = EXCLUDED.ccc,
    gross_margin = EXCLUDED.gross_margin,
    ebitda = EXCLUDED.ebitda,
    ebitda_margin = EXCLUDED.ebitda_margin,
    operating_margin = EXCLUDED.operating_margin,
    net_profit = EXCLUDED.net_profit,
    net_profit_margin = EXCLUDED.net_profit_margin,
    total_revenue = EXCLUDED.total_revenue,
    net_revenue = EXCLUDED.net_revenue,
    total_cogs = EXCLUDED.total_cogs,
    total_opex = EXCLUDED.total_opex,
    gross_profit = EXCLUDED.gross_profit,
    invoice_revenue = EXCLUDED.invoice_revenue,
    order_revenue = EXCLUDED.order_revenue,
    contract_revenue = EXCLUDED.contract_revenue,
    depreciation = EXCLUDED.depreciation,
    interest_expense = EXCLUDED.interest_expense,
    tax_expense = EXCLUDED.tax_expense,
    total_ap = EXCLUDED.total_ap,
    inventory = EXCLUDED.inventory,
    working_capital = EXCLUDED.working_capital,
    cash_flow = EXCLUDED.cash_flow,
    daily_sales = EXCLUDED.daily_sales,
    daily_cogs = EXCLUDED.daily_cogs,
    daily_purchases = EXCLUDED.daily_purchases,
    days_in_period = EXCLUDED.days_in_period,
    updated_at = NOW();
END;
$$;