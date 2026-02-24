
CREATE OR REPLACE FUNCTION public.discover_schema(search_term text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
SET search_path = public
AS $$
DECLARE
  result jsonb;
  safe_term text;
BEGIN
  -- Sanitize input
  safe_term := lower(regexp_replace(search_term, '[^a-z0-9_]', '', 'gi'));
  
  IF length(safe_term) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;
  
  EXECUTE format(
    'SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = ''public'' 
        AND table_name ILIKE ''%%'' || %L || ''%%''
      ORDER BY table_name, ordinal_position 
      LIMIT 500
    ) t',
    safe_term
  ) INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
