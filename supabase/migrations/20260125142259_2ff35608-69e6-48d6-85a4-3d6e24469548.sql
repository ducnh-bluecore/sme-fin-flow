-- Resolve PostgREST ambiguity by keeping only one overload
DROP FUNCTION IF EXISTS public.execute_readonly_query(text, jsonb);

-- Ensure canonical signature exists
CREATE OR REPLACE FUNCTION public.execute_readonly_query(
  params jsonb,
  query_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Allow-list views
  FOR v_match IN
    SELECT (regexp_matches(v_sql, '(?i)\mfrom\s+([a-z_0-9]+)\M', 'g'))[1]
  LOOP
    v_table := lower(v_match);
    IF v_table NOT IN (
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
$function$;

GRANT EXECUTE ON FUNCTION public.execute_readonly_query(jsonb, text) TO anon, authenticated;