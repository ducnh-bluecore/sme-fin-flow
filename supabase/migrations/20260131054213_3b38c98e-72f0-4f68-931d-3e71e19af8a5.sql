-- Fix RPC get_forecast_historical_stats to fallback to cdp_orders when bank_transactions is empty
CREATE OR REPLACE FUNCTION public.get_forecast_historical_stats(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE(
  total_credit NUMERIC,
  total_debit NUMERIC,
  unique_days INTEGER,
  avg_daily_inflow NUMERIC,
  avg_daily_outflow NUMERIC
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_bank_total_credit NUMERIC := 0;
  v_bank_total_debit NUMERIC := 0;
  v_bank_days INTEGER := 0;
  v_order_total NUMERIC := 0;
  v_order_days INTEGER := 0;
BEGIN
  -- Try bank_transactions first
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(COUNT(DISTINCT transaction_date)::INTEGER, 0)
  INTO v_bank_total_credit, v_bank_total_debit, v_bank_days
  FROM bank_transactions
  WHERE tenant_id = p_tenant_id
    AND transaction_date >= CURRENT_DATE - p_days;
    
  -- Fallback: If no bank data, use cdp_orders for inflow estimate
  IF v_bank_total_credit = 0 THEN
    SELECT 
      COALESCE(SUM(net_revenue), 0),
      GREATEST(COALESCE(COUNT(DISTINCT DATE(order_at))::INTEGER, 1), 1)
    INTO v_order_total, v_order_days
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND order_at >= CURRENT_DATE - p_days;
      
    v_bank_total_credit := v_order_total;
    v_bank_days := v_order_days;
  END IF;
  
  -- Ensure we have at least 1 day to avoid division by zero
  v_bank_days := GREATEST(v_bank_days, 1);
  
  RETURN QUERY SELECT
    v_bank_total_credit,
    v_bank_total_debit,
    v_bank_days,
    v_bank_total_credit / v_bank_days,
    v_bank_total_debit / v_bank_days;
END;
$$;