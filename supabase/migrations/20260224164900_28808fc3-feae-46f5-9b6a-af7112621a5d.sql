CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_text text, params jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
SET search_path = public
AS $$
DECLARE
  v_match text;
  v_table text;
  v_result jsonb;
  v_final_sql text;
BEGIN
  IF query_text IS NULL OR btrim(query_text) = '' THEN
    RAISE EXCEPTION 'query_text is required';
  END IF;

  IF upper(btrim(query_text)) NOT LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  IF query_text ~* '\m(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge)\M' THEN
    RAISE EXCEPTION 'Forbidden keyword detected';
  END IF;
  IF query_text ~ ';' THEN
    RAISE EXCEPTION 'Semicolons are not allowed';
  END IF;

  FOR v_match IN
    SELECT (regexp_matches(query_text, '(?i)\m(from|join)\s+([a-z_0-9]+)\M', 'g'))[2]
  LOOP
    v_table := lower(v_match);
    -- Allow fixed L2/L3/L4 tables + ALL views starting with v_ + ALL inv_* tables + store_daily_metrics
    IF v_table NOT IN (
      'cdp_orders','cdp_customers','cdp_order_items','products',
      'kpi_facts_daily','alert_instances','cdp_customer_equity_computed',
      'expenses','invoices','bank_transactions','ad_spend_daily',
      'store_daily_metrics','stores'
    )
    AND v_table NOT LIKE 'v\_%'
    AND v_table NOT LIKE 'inv\_%'
    THEN
      RAISE EXCEPTION 'Table/view % is not allowed', v_table;
    END IF;
  END LOOP;

  -- Auto-cast text literal comparisons on tenant_id to uuid
  v_final_sql := regexp_replace(
    query_text,
    'tenant_id\s*=\s*''([0-9a-f\-]+)''',
    'tenant_id = ''\1''::uuid',
    'gi'
  );

  EXECUTE format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', v_final_sql)
  INTO v_result;

  RETURN v_result;
END;
$$;