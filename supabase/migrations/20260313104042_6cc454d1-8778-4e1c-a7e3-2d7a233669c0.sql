CREATE OR REPLACE FUNCTION public.execute_sql_admin(sql_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
BEGIN
  EXECUTE sql_text;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_sql_admin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_sql_admin(text) FROM anon;
REVOKE ALL ON FUNCTION public.execute_sql_admin(text) FROM authenticated;