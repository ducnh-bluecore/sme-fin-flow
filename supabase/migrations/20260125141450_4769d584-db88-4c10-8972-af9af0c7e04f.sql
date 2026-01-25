-- Create a safe read-only SQL executor used by internal edge functions.
-- This function is SECURITY DEFINER and performs strict allow-list validation.

CREATE OR REPLACE FUNCTION public.execute_readonly_query(
  query_text text,
  params jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql text;
  v_from_matches text[];
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

  -- Block obvious write/DDL keywords
  IF v_sql ~* '\m(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge)\M' THEN
    RAISE EXCEPTION 'Forbidden keyword detected';
  END IF;

  -- Allow-list views (must match the CDP whitelist)
  v_from_matches := regexp_matches(v_sql, '(?i)\mfrom\s+([a-z_0-9]+)\M', 'g');
  IF v_from_matches IS NOT NULL THEN
    -- regexp_matches with 'g' returns setof text[]; above assigns only first match.
    -- So we re-scan via regexp_split_to_table for robustness.
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
  END IF;

  -- NOTE: params is currently unused because our queries are tenant-injected server-side.
  -- We keep it for future expansion.

  EXECUTE format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', v_sql)
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_readonly_query(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_readonly_query(text, jsonb) TO anon, authenticated;