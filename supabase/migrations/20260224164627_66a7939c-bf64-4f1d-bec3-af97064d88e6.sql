-- Drop the single-argument overload that causes ambiguity
DROP FUNCTION IF EXISTS public.execute_readonly_query(text);
