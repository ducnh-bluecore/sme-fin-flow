
CREATE OR REPLACE FUNCTION public.fn_size_breakdown(p_tenant_id uuid, p_fc_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_latest_date date;
  v_result jsonb;
  v_fc_uuid uuid;
BEGIN
  v_fc_uuid := p_fc_id::uuid;

  -- Get latest snapshot date
  SELECT MAX(snapshot_date) INTO v_latest_date
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id;

  IF v_latest_date IS NULL THEN
    RETURN jsonb_build_object('entries', '[]'::jsonb, 'summary', '[]'::jsonb);
  END IF;

  -- Use fc_id directly from inv_state_positions (no need to join mapping)
  -- Include ALL rows (even on_hand = 0) to show stockouts
  WITH positions AS (
    SELECT
      p.sku,
      COALESCE(m.size, p.sku) AS size_code,
      COALESCE(st.store_name, p.store_id::text) AS store_name,
      p.on_hand::int AS on_hand
    FROM inv_state_positions p
    LEFT JOIN inv_sku_fc_mapping m ON m.sku = p.sku AND m.tenant_id = p_tenant_id
    LEFT JOIN inv_stores st ON st.id = p.store_id AND st.tenant_id = p_tenant_id
    WHERE p.tenant_id = p_tenant_id
      AND p.fc_id = v_fc_uuid
      AND p.snapshot_date = v_latest_date
  ),
  entries_json AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'sku', sku,
        'size_code', size_code,
        'store_name', store_name,
        'on_hand', on_hand
      )
    ) AS entries
    FROM positions
  ),
  summary_json AS (
    SELECT jsonb_agg(
      jsonb_build_object('size_code', size_code, 'total', total)
      ORDER BY total DESC
    ) AS summary
    FROM (
      SELECT size_code, SUM(on_hand)::int AS total
      FROM positions
      GROUP BY size_code
    ) agg
  )
  SELECT jsonb_build_object(
    'entries', COALESCE(e.entries, '[]'::jsonb),
    'summary', COALESCE(s.summary, '[]'::jsonb)
  ) INTO v_result
  FROM entries_json e, summary_json s;

  RETURN v_result;
END;
$function$;
