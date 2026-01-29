
-- Drop existing function first
DROP FUNCTION IF EXISTS compute_estimated_actual_impact(UUID, TEXT, TIMESTAMPTZ, NUMERIC);

-- Create improved function with detailed output
CREATE OR REPLACE FUNCTION compute_estimated_actual_impact(
  p_tenant_id UUID,
  p_decision_type TEXT,
  p_decision_date TIMESTAMPTZ,
  p_predicted_impact NUMERIC
)
RETURNS TABLE (
  estimated_impact NUMERIC,
  confidence_level TEXT,
  data_source TEXT,
  calculation_method TEXT,
  -- NEW: Detailed breakdown for transparency
  metric_name TEXT,
  before_value NUMERIC,
  after_value NUMERIC,
  period_days INTEGER,
  low_confidence_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_period_days INTEGER;
  v_impact NUMERIC := 0;
  v_confidence TEXT := 'ESTIMATED';
  v_source TEXT := 'time_based_delta';
  v_method TEXT := 'period_comparison';
  v_metric TEXT := 'unknown';
  v_before NUMERIC := 0;
  v_after NUMERIC := 0;
  v_low_reason TEXT := NULL;
BEGIN
  v_start_date := p_decision_date::DATE;
  v_end_date := CURRENT_DATE;
  v_period_days := v_end_date - v_start_date;
  
  -- If decision is less than 7 days old, not enough data
  IF v_period_days < 7 THEN
    RETURN QUERY SELECT 
      p_predicted_impact,
      'LOW'::TEXT,
      'insufficient_data'::TEXT,
      'fallback_to_predicted'::TEXT,
      'N/A'::TEXT,
      0::NUMERIC,
      0::NUMERIC,
      v_period_days,
      'Quyết định mới ' || v_period_days || ' ngày - cần ít nhất 7 ngày để đo lường'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate based on decision type
  CASE UPPER(p_decision_type)
    -- MDP: Marketing decisions - measure revenue delta from orders
    WHEN 'MDP', 'MARKETING' THEN
      v_metric := 'Net Revenue (Doanh thu ròng)';
      
      -- Calculate BEFORE period
      SELECT COALESCE(SUM(net_revenue), 0) INTO v_before
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at < v_start_date 
        AND order_at >= v_start_date - v_period_days * INTERVAL '1 day';
      
      -- Calculate AFTER period  
      SELECT COALESCE(SUM(net_revenue), 0) INTO v_after
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at >= v_start_date
        AND order_at <= v_end_date;
      
      v_impact := v_after - v_before;
      v_confidence := 'OBSERVED';
      v_source := 'cdp_orders_revenue';
      v_method := 'Doanh thu SAU quyết định - Doanh thu TRƯỚC quyết định';
    
    -- CDP: Customer decisions - measure customer value delta
    WHEN 'CDP', 'CUSTOMER' THEN
      v_metric := 'Customer Value (Giá trị khách hàng)';
      
      SELECT COALESCE(SUM(net_revenue), 0) INTO v_before
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at < v_start_date 
        AND order_at >= v_start_date - v_period_days * INTERVAL '1 day';
      
      SELECT COALESCE(SUM(net_revenue), 0) INTO v_after
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at >= v_start_date
        AND order_at <= v_end_date;
      
      v_impact := v_after - v_before;
      v_confidence := 'OBSERVED';
      v_source := 'cdp_orders_customer_value';
      v_method := 'Giá trị KH SAU - Giá trị KH TRƯỚC';
    
    -- FDP: Finance decisions - measure margin/profit delta
    WHEN 'FDP', 'FINANCE' THEN
      v_metric := 'Gross Profit (Lợi nhuận gộp)';
      
      SELECT COALESCE(SUM(gross_profit), 0) INTO v_before
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at < v_start_date 
        AND order_at >= v_start_date - v_period_days * INTERVAL '1 day';
      
      SELECT COALESCE(SUM(gross_profit), 0) INTO v_after
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at >= v_start_date
        AND order_at <= v_end_date;
      
      v_impact := v_after - v_before;
      v_confidence := 'OBSERVED';
      v_source := 'cdp_orders_profit';
      v_method := 'Lợi nhuận SAU quyết định - Lợi nhuận TRƯỚC';
    
    -- Default: Use predicted as fallback
    ELSE
      v_metric := 'N/A';
      v_impact := p_predicted_impact;
      v_confidence := 'LOW';
      v_source := 'fallback';
      v_method := 'Không xác định được loại quyết định';
      v_low_reason := 'Loại quyết định "' || p_decision_type || '" chưa được cấu hình để đo lường tự động';
  END CASE;
  
  -- If calculated impact is 0 or negative but predicted was positive, use predicted with LOW confidence
  IF v_impact <= 0 AND p_predicted_impact > 0 AND v_low_reason IS NULL THEN
    v_low_reason := 'Không có chênh lệch dương - có thể do: (1) chưa đủ data, (2) impact cần thời gian dài hơn, hoặc (3) quyết định chưa có hiệu quả rõ ràng';
    v_impact := p_predicted_impact;
    v_confidence := 'LOW';
    v_source := 'fallback_no_positive_delta';
    v_method := 'Sử dụng dự đoán ban đầu do chưa có delta dương';
  END IF;
  
  -- If both before and after are 0, add reason
  IF v_before = 0 AND v_after = 0 AND v_low_reason IS NULL THEN
    v_low_reason := 'Không có dữ liệu trong cả 2 giai đoạn trước và sau quyết định';
    v_confidence := 'LOW';
  END IF;
  
  RETURN QUERY SELECT 
    v_impact,
    v_confidence,
    v_source,
    v_method,
    v_metric,
    v_before,
    v_after,
    v_period_days,
    v_low_reason;
END;
$$;
