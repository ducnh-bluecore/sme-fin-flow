
-- Fix SSOT violation: Update refresh_dashboard_kpi_cache to use cdp_orders instead of external_orders
CREATE OR REPLACE FUNCTION public.refresh_dashboard_kpi_cache(p_tenant_id uuid, p_date_range integer DEFAULT 90)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date date := CURRENT_DATE - p_date_range;
  v_end_date date := CURRENT_DATE;
  v_cash_today numeric := 0;
  v_cash_7d numeric := 0;
  v_total_ar numeric := 0;
  v_overdue_ar numeric := 0;
  v_dso integer := 0;
  v_net_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_total_opex numeric := 0;
  v_gross_margin numeric := 0;
  v_invoice_count integer := 0;
  v_overdue_count integer := 0;
  v_transaction_count integer := 0;
  v_matched_count integer := 0;
  v_dso_sum numeric := 0;
  v_ar_invoice_count integer := 0;
BEGIN
  -- Cash today from bank accounts
  SELECT COALESCE(SUM(current_balance), 0) INTO v_cash_today
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';

  -- Cash 7d from forecasts
  SELECT COALESCE(closing_balance, v_cash_today) INTO v_cash_7d
  FROM cash_forecasts
  WHERE tenant_id = p_tenant_id
    AND forecast_date >= CURRENT_DATE
  ORDER BY forecast_date ASC
  LIMIT 1;

  -- AR metrics from invoices
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'cancelled') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COUNT(CASE WHEN status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE THEN 1 END)
  INTO v_invoice_count, v_total_ar, v_overdue_ar, v_overdue_count
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND issue_date >= v_start_date
    AND issue_date <= v_end_date;

  -- Calculate DSO
  SELECT 
    COUNT(*),
    COALESCE(SUM(CURRENT_DATE - issue_date), 0)
  INTO v_ar_invoice_count, v_dso_sum
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('paid', 'cancelled')
    AND total_amount - COALESCE(paid_amount, 0) > 0;
  
  IF v_ar_invoice_count > 0 THEN
    v_dso := ROUND(v_dso_sum / v_ar_invoice_count);
  END IF;

  -- Match rate from transactions
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN match_status = 'matched' THEN 1 END)
  INTO v_transaction_count, v_matched_count
  FROM bank_transactions
  WHERE tenant_id = p_tenant_id
    AND transaction_date >= v_start_date
    AND transaction_date <= v_end_date;

  -- ========================================
  -- SSOT FIX: Query from cdp_orders instead of external_orders
  -- cdp_orders is the Single Source of Truth for order data
  -- ========================================
  SELECT 
    COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(cogs), 0),
    COALESCE(SUM(gross_margin), 0)
  INTO v_net_revenue, v_total_cogs, v_gross_margin
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at >= v_start_date
    AND order_at <= v_end_date;

  -- Expenses (OPEX)
  SELECT 
    COALESCE(SUM(CASE WHEN category NOT IN ('cogs', 'interest', 'tax') THEN amount ELSE 0 END), 0)
  INTO v_total_opex
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= v_start_date
    AND expense_date <= v_end_date;

  -- Upsert cache
  INSERT INTO dashboard_kpi_cache (
    tenant_id, cash_today, cash_7d, total_ar, overdue_ar,
    dso, ccc, gross_margin, ebitda, auto_match_rate,
    net_revenue, total_cogs, total_opex,
    invoice_count, overdue_invoice_count, transaction_count, matched_transaction_count,
    date_range_start, date_range_end, calculated_at, updated_at
  ) VALUES (
    p_tenant_id, v_cash_today, COALESCE(v_cash_7d, v_cash_today), v_total_ar, v_overdue_ar,
    v_dso, 0, v_gross_margin, v_net_revenue - v_total_cogs - v_total_opex, 
    CASE WHEN v_transaction_count > 0 THEN ROUND((v_matched_count::numeric / v_transaction_count) * 100, 2) ELSE 0 END,
    v_net_revenue, v_total_cogs, v_total_opex,
    v_invoice_count, v_overdue_count, v_transaction_count, v_matched_count,
    v_start_date, v_end_date, NOW(), NOW()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    cash_today = EXCLUDED.cash_today,
    cash_7d = EXCLUDED.cash_7d,
    total_ar = EXCLUDED.total_ar,
    overdue_ar = EXCLUDED.overdue_ar,
    dso = EXCLUDED.dso,
    gross_margin = EXCLUDED.gross_margin,
    ebitda = EXCLUDED.ebitda,
    auto_match_rate = EXCLUDED.auto_match_rate,
    net_revenue = EXCLUDED.net_revenue,
    total_cogs = EXCLUDED.total_cogs,
    total_opex = EXCLUDED.total_opex,
    invoice_count = EXCLUDED.invoice_count,
    overdue_invoice_count = EXCLUDED.overdue_invoice_count,
    transaction_count = EXCLUDED.transaction_count,
    matched_transaction_count = EXCLUDED.matched_transaction_count,
    date_range_start = EXCLUDED.date_range_start,
    date_range_end = EXCLUDED.date_range_end,
    calculated_at = EXCLUDED.calculated_at,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Add comment for SSOT documentation
COMMENT ON FUNCTION public.refresh_dashboard_kpi_cache IS 'SSOT: Uses cdp_orders as single source of truth for order data. DO NOT query external_orders directly.';
