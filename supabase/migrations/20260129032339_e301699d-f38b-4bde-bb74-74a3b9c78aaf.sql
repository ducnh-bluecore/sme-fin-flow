-- Function to estimate actual impact based on time-based delta
-- Logic: Compare metrics from decision date to now based on decision type
CREATE OR REPLACE FUNCTION compute_estimated_actual_impact(
  p_tenant_id UUID,
  p_decision_type TEXT,
  p_decision_date TIMESTAMPTZ,
  p_predicted_impact NUMERIC
) RETURNS TABLE (
  estimated_impact NUMERIC,
  confidence_level TEXT,
  data_source TEXT,
  calculation_method TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_impact NUMERIC := 0;
  v_confidence TEXT := 'ESTIMATED';
  v_source TEXT := 'time_based_delta';
  v_method TEXT := 'period_comparison';
BEGIN
  v_start_date := p_decision_date::DATE;
  v_end_date := CURRENT_DATE;
  
  -- If decision is less than 7 days old, not enough data
  IF v_end_date - v_start_date < 7 THEN
    RETURN QUERY SELECT 
      p_predicted_impact,
      'LOW'::TEXT,
      'insufficient_data'::TEXT,
      'fallback_to_predicted'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate based on decision type
  CASE UPPER(p_decision_type)
    -- MDP: Marketing decisions - measure revenue delta from orders
    WHEN 'MDP', 'MARKETING' THEN
      SELECT COALESCE(
        SUM(CASE 
          WHEN order_at >= v_start_date THEN net_revenue 
          ELSE 0 
        END) - 
        SUM(CASE 
          WHEN order_at < v_start_date AND order_at >= v_start_date - (v_end_date - v_start_date) THEN net_revenue 
          ELSE 0 
        END),
        0
      ) INTO v_impact
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at >= v_start_date - (v_end_date - v_start_date);
      
      v_confidence := 'OBSERVED';
      v_source := 'cdp_orders_revenue';
      v_method := 'revenue_delta_before_after';
    
    -- CDP: Customer decisions - measure customer value delta
    WHEN 'CDP', 'CUSTOMER' THEN
      SELECT COALESCE(
        SUM(CASE 
          WHEN order_at >= v_start_date THEN net_revenue 
          ELSE 0 
        END) - 
        SUM(CASE 
          WHEN order_at < v_start_date AND order_at >= v_start_date - (v_end_date - v_start_date) THEN net_revenue 
          ELSE 0 
        END),
        0
      ) INTO v_impact
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at >= v_start_date - (v_end_date - v_start_date);
      
      v_confidence := 'OBSERVED';
      v_source := 'cdp_orders_customer_value';
      v_method := 'customer_value_delta';
    
    -- FDP: Finance decisions - measure margin/profit delta
    WHEN 'FDP', 'FINANCE' THEN
      SELECT COALESCE(
        SUM(CASE 
          WHEN order_at >= v_start_date THEN gross_profit 
          ELSE 0 
        END) - 
        SUM(CASE 
          WHEN order_at < v_start_date AND order_at >= v_start_date - (v_end_date - v_start_date) THEN gross_profit 
          ELSE 0 
        END),
        0
      ) INTO v_impact
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at >= v_start_date - (v_end_date - v_start_date);
      
      v_confidence := 'OBSERVED';
      v_source := 'cdp_orders_profit';
      v_method := 'profit_delta_before_after';
    
    -- Default: Use predicted as fallback
    ELSE
      v_impact := p_predicted_impact;
      v_confidence := 'LOW';
      v_source := 'fallback';
      v_method := 'predicted_fallback';
  END CASE;
  
  -- If calculated impact is 0 or negative but predicted was positive, use predicted with LOW confidence
  IF v_impact <= 0 AND p_predicted_impact > 0 THEN
    v_impact := p_predicted_impact;
    v_confidence := 'LOW';
    v_source := 'fallback_no_delta';
    v_method := 'predicted_fallback';
  END IF;
  
  RETURN QUERY SELECT 
    v_impact,
    v_confidence,
    v_source,
    v_method;
END;
$$;