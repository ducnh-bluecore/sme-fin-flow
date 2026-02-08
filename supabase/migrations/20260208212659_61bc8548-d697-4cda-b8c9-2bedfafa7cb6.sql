-- Drop the old overload with (jsonb, text) signature
DROP FUNCTION IF EXISTS public.execute_readonly_query(jsonb, text);