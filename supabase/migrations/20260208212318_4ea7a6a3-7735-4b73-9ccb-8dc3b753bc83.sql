CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_text text, params jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql text;
  v_match text;
  v_table text;
  v_result jsonb;
BEGIN
  IF query_text IS NULL OR btrim(query_text) = '' THEN
    RAISE EXCEPTION 'query_text is required';
  END IF;

  v_sql := query_text;

  -- Must be SELECT-only
  IF upper(btrim(v_sql)) NOT LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Block obvious write/DDL keywords and statement chaining
  IF v_sql ~* '\m(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge)\M' THEN
    RAISE EXCEPTION 'Forbidden keyword detected';
  END IF;
  IF v_sql ~ ';' THEN
    RAISE EXCEPTION 'Semicolons are not allowed';
  END IF;

  -- Allow-list tables and views (L2 Master + L3 KPI + L4 Alert/CDP + CDP Views)
  FOR v_match IN
    SELECT (regexp_matches(v_sql, '(?i)\m(from|join)\s+([a-z_0-9]+)\M', 'g'))[2]
  LOOP
    v_table := lower(v_match);
    IF v_table NOT IN (
      -- L2 Master
      'cdp_orders',
      'cdp_customers',
      'cdp_order_items',
      'products',
      -- L3 KPI
      'kpi_facts_daily',
      -- L4 Alert & CDP Equity
      'alert_instances',
      'cdp_customer_equity_computed',
      -- CDP Aggregated Views
      'v_cdp_ltv_by_cohort',
      'v_cdp_ltv_by_source',
      'v_cdp_ltv_summary',
      'v_cdp_equity_distribution',
      'v_cdp_equity_overview',
      'v_cdp_equity_drivers',
      'v_cdp_population_catalog'
    ) THEN
      RAISE EXCEPTION 'Table/view % is not allowed', v_table;
    END IF;
  END LOOP;

  EXECUTE format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', v_sql)
  INTO v_result;

  RETURN v_result;
END;
$$;