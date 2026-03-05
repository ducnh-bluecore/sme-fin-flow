-- Resolve RPC ambiguity for Product Detail dialog (PGRST203)
-- Keep only the canonical text/text signature used by web RPC calls.

DROP FUNCTION IF EXISTS public.fn_lifecycle_product_detail(uuid, uuid);
DROP FUNCTION IF EXISTS public.fn_lifecycle_product_detail(uuid, text);