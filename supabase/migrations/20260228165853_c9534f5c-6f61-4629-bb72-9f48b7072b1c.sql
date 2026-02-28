CREATE OR REPLACE FUNCTION public.fn_size_breakdown(p_tenant_id uuid, p_fc_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_fc_uuid uuid;
BEGIN
  v_fc_uuid := p_fc_id::uuid;

  /*
    IMPORTANT:
    Use latest snapshot per store (not global max date) to avoid undercount
    when some stores sync later than others.
  */
  WITH latest_store_snapshot AS (
    SELECT p.store_id, MAX(p.snapshot_date) AS snapshot_date
    FROM inv_state_positions p
    WHERE p.tenant_id = p_tenant_id
    GROUP BY p.store_id
  ),
  size_map AS (
    SELECT m.sku, MAX(m.size) AS size_code
    FROM inv_sku_fc_mapping m
    WHERE m.tenant_id = p_tenant_id
      AND m.fc_id = v_fc_uuid
      AND m.is_active = true
    GROUP BY m.sku
  ),
  positions AS (
    SELECT
      p.sku,
      COALESCE(size_map.size_code, p.sku) AS size_code,
      COALESCE(st.store_name, p.store_id::text) AS store_name,
      COALESCE(p.on_hand, 0)::int AS on_hand
    FROM inv_state_positions p
    JOIN latest_store_snapshot ls
      ON ls.store_id = p.store_id
     AND ls.snapshot_date = p.snapshot_date
    LEFT JOIN size_map ON size_map.sku = p.sku
    LEFT JOIN inv_stores st
      ON st.id = p.store_id
     AND st.tenant_id = p_tenant_id
    WHERE p.tenant_id = p_tenant_id
      AND p.fc_id = v_fc_uuid
  ),
  entries_json AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'sku', sku,
        'size_code', size_code,
        'store_name', store_name,
        'on_hand', on_hand
      )
      ORDER BY store_name, size_code, sku
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
  )
  INTO v_result
  FROM entries_json e, summary_json s;

  RETURN v_result;
END;
$function$;