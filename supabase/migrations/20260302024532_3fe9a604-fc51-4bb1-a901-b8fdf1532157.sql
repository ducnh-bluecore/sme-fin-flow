
-- Create a function that triggers async size split via pg_net
-- This calls the backfill edge function without blocking
CREATE OR REPLACE FUNCTION public.fn_trigger_async_size_split(
  p_tenant_id uuid,
  p_run_id uuid,
  p_table_name text DEFAULT 'alloc'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_anon_key text;
  v_service_key text;
BEGIN
  -- Get project URL from config
  v_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, try environment approach
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://ujteggwzllzbhbwrqsmk.supabase.co';
  END IF;
  
  -- Use pg_net to make async HTTP call to backfill function
  PERFORM net.http_post(
    url := v_url || '/functions/v1/inventory-backfill-size-split',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, current_setting('supabase.service_role_key', true), '')
    ),
    body := jsonb_build_object(
      'run_id', p_run_id,
      'table', p_table_name
    )
  );
END;
$$;
