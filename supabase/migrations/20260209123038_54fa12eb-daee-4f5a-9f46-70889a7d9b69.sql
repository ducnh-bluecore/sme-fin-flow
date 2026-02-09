
CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
  result jsonb;
  lower_query text;
  allowed_tables text[] := ARRAY[
    'external_orders', 'external_order_items', 'products', 'external_products',
    'invoices', 'invoice_items', 'bills', 'bill_items',
    'bank_transactions', 'payment_receipts', 'promotion_campaigns',
    'ad_spend_daily', 'cdp_orders', 'cdp_order_items'
  ];
  table_name text;
  is_allowed boolean := false;
BEGIN
  lower_query := lower(trim(query_text));
  
  -- Block dangerous statements
  IF lower_query ~ '(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\s' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  -- Allow any view with v_ prefix
  IF lower_query ~ 'from\s+v_' OR lower_query ~ 'join\s+v_' THEN
    is_allowed := true;
  END IF;
  
  -- Check allowed tables
  IF NOT is_allowed THEN
    FOREACH table_name IN ARRAY allowed_tables LOOP
      IF lower_query LIKE '%' || table_name || '%' THEN
        is_allowed := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  IF NOT is_allowed THEN
    RAISE EXCEPTION 'Query references tables not in the allowed list';
  END IF;
  
  -- Auto-cast tenant_id string to UUID
  query_text := regexp_replace(
    query_text,
    'tenant_id\s*=\s*''([0-9a-f\-]{36})''',
    'tenant_id = ''\1''::uuid',
    'gi'
  );
  
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
