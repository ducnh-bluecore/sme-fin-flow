-- Drop the 3-argument overload to resolve PGRST203 ambiguity
DROP FUNCTION IF EXISTS public.get_sku_profitability_by_date_range(uuid, date, date);