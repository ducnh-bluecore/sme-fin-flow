
-- Fix function to include segment_version
CREATE OR REPLACE FUNCTION cdp_evaluate_segments(
  p_tenant_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS TABLE(segment_id UUID, segment_name TEXT, customer_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_segment RECORD;
  v_inserted INTEGER;
BEGIN
  -- Clear existing membership for this date
  DELETE FROM cdp_segment_membership_daily 
  WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;

  -- Process each active segment
  FOR v_segment IN 
    SELECT s.id, s.name, s.definition_json, s.version
    FROM cdp_segments s
    WHERE s.tenant_id = p_tenant_id AND s.status = 'ACTIVE'
  LOOP
    -- Insert based on segment rules
    IF v_segment.name = 'VIP Customers' THEN
      -- LTV > 2M using equity_12m column
      INSERT INTO cdp_segment_membership_daily (tenant_id, as_of_date, segment_id, segment_version, customer_id, is_member)
      SELECT p_tenant_id, p_as_of_date, v_segment.id, v_segment.version, eq.customer_id, true
      FROM cdp_customer_equity_computed eq
      WHERE eq.tenant_id = p_tenant_id 
        AND eq.as_of_date = p_as_of_date
        AND eq.equity_12m > 2000000
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      
    ELSIF v_segment.name = 'Discount Hunters' THEN
      INSERT INTO cdp_segment_membership_daily (tenant_id, as_of_date, segment_id, segment_version, customer_id, is_member)
      SELECT p_tenant_id, p_as_of_date, v_segment.id, v_segment.version, r.customer_id, true
      FROM cdp_customer_metrics_rolling r
      WHERE r.tenant_id = p_tenant_id 
        AND r.as_of_date = p_as_of_date
        AND r.window_days = 90
        AND r.discount_share > 0.3
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      
    ELSIF v_segment.name = 'Churning Risk' THEN
      INSERT INTO cdp_segment_membership_daily (tenant_id, as_of_date, segment_id, segment_version, customer_id, is_member)
      SELECT p_tenant_id, p_as_of_date, v_segment.id, v_segment.version, r.customer_id, true
      FROM cdp_customer_metrics_rolling r
      WHERE r.tenant_id = p_tenant_id 
        AND r.as_of_date = p_as_of_date
        AND r.window_days = 90
        AND r.last_order_at IS NOT NULL
        AND (p_as_of_date - r.last_order_at::date) > 60
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      
    ELSIF v_segment.name = 'Shopee Loyalists' THEN
      v_inserted := 0;
      
    ELSIF v_segment.name = 'Multi-Channel Buyers' THEN
      v_inserted := 0;
      
    ELSE
      v_inserted := 0;
    END IF;

    segment_id := v_segment.id;
    segment_name := v_segment.name;
    customer_count := v_inserted;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;
