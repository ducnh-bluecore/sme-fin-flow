-- Drop both overloads and recreate cleanly
DROP FUNCTION IF EXISTS public.execute_readonly_query(text, jsonb);

CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_text text, params jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match text;
  v_table text;
  v_result jsonb;
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
    IF v_table NOT IN (
      'cdp_orders','cdp_customers','cdp_order_items','products',
      'kpi_facts_daily',
      'alert_instances','cdp_customer_equity_computed',
      'v_cdp_ltv_by_cohort','v_cdp_ltv_by_source','v_cdp_ltv_summary',
      'v_cdp_equity_distribution','v_cdp_equity_overview','v_cdp_equity_drivers',
      'v_cdp_population_catalog'
    ) THEN
      RAISE EXCEPTION 'Table/view % is not allowed', v_table;
    END IF;
  END LOOP;

  EXECUTE format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', query_text)
  INTO v_result;

  RETURN v_result;
END;
$$;