CREATE OR REPLACE FUNCTION public.backfill_order_fees(
  p_schema text,
  p_updates jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_count integer := 0;
  v_item jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    EXECUTE format(
      'UPDATE %I.cdp_orders SET shipping_fee = $1, platform_fee = $2, voucher_discount = $3, discount_amount = $4, total_fees = $5 WHERE order_key = $6 AND channel = $7',
      p_schema
    ) USING 
      (v_item->>'shipping_fee')::numeric,
      (v_item->>'platform_fee')::numeric,
      (v_item->>'voucher_discount')::numeric,
      (v_item->>'discount_amount')::numeric,
      (v_item->>'total_fees')::numeric,
      v_item->>'order_key',
      v_item->>'channel';
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_order_fees(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backfill_order_fees(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.backfill_order_fees(text, jsonb) FROM authenticated;