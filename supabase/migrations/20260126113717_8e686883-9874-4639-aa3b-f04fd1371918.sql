
-- Fix cdp_evaluate_segments function - correct jsonb parsing
CREATE OR REPLACE FUNCTION public.cdp_evaluate_segments(
  p_tenant_id uuid, 
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(segment_id uuid, segment_name text, customer_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_segment RECORD;
  v_inserted INTEGER;
  v_rule JSONB;
  v_sql TEXT;
  v_where_clauses TEXT[];
  v_field TEXT;
  v_value TEXT;
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
    v_inserted := 0;
    
    -- Check if this is a research_view segment with dynamic rules
    IF v_segment.definition_json->>'source' = 'research_view' 
       AND jsonb_array_length(COALESCE(v_segment.definition_json->'rules', '[]'::jsonb)) > 0 THEN
      
      -- Build dynamic WHERE clauses from rules
      v_where_clauses := ARRAY[]::TEXT[];
      
      FOR v_rule IN 
        SELECT jsonb_array_elements(v_segment.definition_json->'rules')
      LOOP
        v_field := v_rule->>'field';
        v_value := v_rule->>'value';
        
        -- Map field names to actual column conditions
        CASE v_field
          WHEN 'orderCount' THEN
            CASE v_value
              WHEN '1' THEN v_where_clauses := array_append(v_where_clauses, 'order_count_365 = 1');
              WHEN '2-5' THEN v_where_clauses := array_append(v_where_clauses, 'order_count_365 BETWEEN 2 AND 5');
              WHEN '6-10' THEN v_where_clauses := array_append(v_where_clauses, 'order_count_365 BETWEEN 6 AND 10');
              WHEN '>10' THEN v_where_clauses := array_append(v_where_clauses, 'order_count_365 > 10');
              ELSE NULL;
            END CASE;
          WHEN 'totalSpend' THEN
            CASE v_value
              WHEN '<1tr' THEN v_where_clauses := array_append(v_where_clauses, 'net_revenue_365 < 1000000');
              WHEN '1-5tr' THEN v_where_clauses := array_append(v_where_clauses, 'net_revenue_365 BETWEEN 1000000 AND 5000000');
              WHEN '5-20tr' THEN v_where_clauses := array_append(v_where_clauses, 'net_revenue_365 BETWEEN 5000000 AND 20000000');
              WHEN '>20tr' THEN v_where_clauses := array_append(v_where_clauses, 'net_revenue_365 > 20000000');
              ELSE NULL;
            END CASE;
          WHEN 'aov' THEN
            CASE v_value
              WHEN '<200k' THEN v_where_clauses := array_append(v_where_clauses, 'aov_365 < 200000');
              WHEN '200k-500k' THEN v_where_clauses := array_append(v_where_clauses, 'aov_365 BETWEEN 200000 AND 500000');
              WHEN '500k-1tr' THEN v_where_clauses := array_append(v_where_clauses, 'aov_365 BETWEEN 500000 AND 1000000');
              WHEN '>1tr' THEN v_where_clauses := array_append(v_where_clauses, 'aov_365 > 1000000');
              ELSE NULL;
            END CASE;
          WHEN 'lastPurchase' THEN
            CASE v_value
              WHEN '≤30' THEN v_where_clauses := array_append(v_where_clauses, 'recency_days <= 30');
              WHEN '31-60' THEN v_where_clauses := array_append(v_where_clauses, 'recency_days BETWEEN 31 AND 60');
              WHEN '61-90' THEN v_where_clauses := array_append(v_where_clauses, 'recency_days BETWEEN 61 AND 90');
              WHEN '>90' THEN v_where_clauses := array_append(v_where_clauses, 'recency_days > 90');
              ELSE NULL;
            END CASE;
          ELSE NULL;
        END CASE;
      END LOOP;
      
      -- Build and execute dynamic query if we have conditions
      IF array_length(v_where_clauses, 1) > 0 THEN
        v_sql := format(
          'INSERT INTO cdp_segment_membership_daily (tenant_id, as_of_date, segment_id, segment_version, customer_id, is_member)
           SELECT $1, $2, $3, $4, eq.customer_id, true
           FROM cdp_customer_equity_computed eq
           WHERE eq.tenant_id = $1 
             AND eq.as_of_date = $2
             AND %s
           ON CONFLICT DO NOTHING',
          array_to_string(v_where_clauses, ' AND ')
        );
        
        EXECUTE v_sql USING p_tenant_id, p_as_of_date, v_segment.id, v_segment.version;
        GET DIAGNOSTICS v_inserted = ROW_COUNT;
      END IF;
      
    -- Legacy hardcoded segments
    ELSIF v_segment.name = 'VIP Customers' THEN
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
    END IF;

    segment_id := v_segment.id;
    segment_name := v_segment.name;
    customer_count := v_inserted;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;
