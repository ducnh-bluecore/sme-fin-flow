
CREATE OR REPLACE FUNCTION public.set_statement_timeout(timeout_ms integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('SET LOCAL statement_timeout = %s', timeout_ms);
END;
$$;
