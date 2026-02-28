-- Drop the old 5-param overload that conflicts with the new 6-param version
DROP FUNCTION IF EXISTS public.fn_size_health_details(uuid, text, integer, integer, text);
