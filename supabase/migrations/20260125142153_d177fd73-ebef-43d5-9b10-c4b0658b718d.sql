-- PostgREST RPC resolves named args in a way that can require argument order.
-- Add a wrapper with (params, query_text) order to match the call pattern.

CREATE OR REPLACE FUNCTION public.execute_readonly_query(
  params jsonb,
  query_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.execute_readonly_query(query_text, COALESCE(params, '[]'::jsonb));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.execute_readonly_query(jsonb, text) TO anon, authenticated;