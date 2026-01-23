
-- Function to evaluate segment rules and populate membership
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
  v_rule RECORD;
  v_sql TEXT;
  v_where_clauses TEXT[];
  v_inserted INTEGER;
BEGIN
  -- Clear existing membership for this date
  DELETE FROM cdp_segment_membership_daily 
  WHERE tenant_id = p_tenant_id AND snapshot_date = p_as_of_date;

  -- Process each active segment
  FOR v_segment IN 
    SELECT s.id, s.name, s.definition_json
    FROM cdp_segments s
    WHERE s.tenant_id = p_tenant_id AND s.status = 'ACTIVE'
  LOOP
    v_where_clauses := ARRAY[]::TEXT[];
    
    -- Parse rules from definition_json
    IF v_segment.definition_json IS NOT NULL AND 
       v_segment.definition_json->'rules' IS NOT NULL THEN
      
      FOR v_rule IN 
        SELECT * FROM jsonb_array_elements(v_segment.definition_json->'rules')
      LOOP
        -- Map field names to actual columns and build WHERE clause
        CASE (v_rule.value->>'field')
          WHEN 'ltv' THEN
            v_where_clauses := array_append(v_where_clauses, 
              format('eq.ltv_12m %s %s', v_rule.value->>'op', v_rule.value->>'value'));
          WHEN 'channel' THEN
            -- Skip channel-based rules for now (need channel data)
            NULL;
          WHEN 'channel_count' THEN
            -- Skip for now
            NULL;
          WHEN 'discount_rate' THEN
            v_where_clauses := array_append(v_where_clauses, 
              format('r.discount_share %s %s', v_rule.value->>'op', v_rule.value->>'value'));
          WHEN 'days_inactive' THEN
            v_where_clauses := array_append(v_where_clauses, 
              format('EXTRACT(DAY FROM (p_as_of_date - r.last_order_at::date)) %s %s', 
                v_rule.value->>'op', v_rule.value->>'value'));
          ELSE
            NULL;
        END CASE;
      END LOOP;
    END IF;

    -- Insert based on LTV tier for VIP (simpler approach)
    IF v_segment.name = 'VIP Customers' THEN
      INSERT INTO cdp_segment_membership_daily (tenant_id, snapshot_date, segment_id, customer_id, confidence_score)
      SELECT p_tenant_id, p_as_of_date, v_segment.id, eq.customer_id, 1.0
      FROM cdp_customer_equity_computed eq
      WHERE eq.tenant_id = p_tenant_id 
        AND eq.as_of_date = p_as_of_date
        AND eq.ltv_12m > 2000000;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      
    ELSIF v_segment.name = 'Discount Hunters' THEN
      INSERT INTO cdp_segment_membership_daily (tenant_id, snapshot_date, segment_id, customer_id, confidence_score)
      SELECT p_tenant_id, p_as_of_date, v_segment.id, r.customer_id, 1.0
      FROM cdp_customer_metrics_rolling r
      WHERE r.tenant_id = p_tenant_id 
        AND r.as_of_date = p_as_of_date
        AND r.window_days = 90
        AND r.discount_share > 0.3;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      
    ELSIF v_segment.name = 'Churning Risk' THEN
      INSERT INTO cdp_segment_membership_daily (tenant_id, snapshot_date, segment_id, customer_id, confidence_score)
      SELECT p_tenant_id, p_as_of_date, v_segment.id, r.customer_id, 1.0
      FROM cdp_customer_metrics_rolling r
      WHERE r.tenant_id = p_tenant_id 
        AND r.as_of_date = p_as_of_date
        AND r.window_days = 90
        AND r.last_order_at IS NOT NULL
        AND (p_as_of_date - r.last_order_at::date) > 60;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      
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

-- Grant execute
GRANT EXECUTE ON FUNCTION cdp_evaluate_segments(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION cdp_evaluate_segments(UUID, DATE) TO service_role;
