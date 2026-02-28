
CREATE OR REPLACE FUNCTION public.fn_size_breakdown(p_tenant_id uuid, p_fc_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest_date date;
  v_result jsonb;
BEGIN
  -- Get latest snapshot date
  SELECT MAX(snapshot_date) INTO v_latest_date
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id;

  IF v_latest_date IS NULL THEN
    RETURN jsonb_build_object('entries', '[]'::jsonb, 'summary', '[]'::jsonb);
  END IF;

  -- Build result with entries and summary in one query
  WITH skus AS (
    SELECT sku, COALESCE(size, sku) AS size_code
    FROM inv_sku_fc_mapping
    WHERE tenant_id = p_tenant_id
      AND fc_id = p_fc_id
      AND is_active = true
  ),
  positions AS (
    SELECT
      p.sku,
      s.size_code,
      COALESCE(st.store_name, p.store_id::text) AS store_name,
      p.on_hand::int AS on_hand
    FROM inv_state_positions p
    JOIN skus s ON s.sku = p.sku
    LEFT JOIN inv_stores st ON st.id = p.store_id AND st.tenant_id = p_tenant_id
    WHERE p.tenant_id = p_tenant_id
      AND p.snapshot_date = v_latest_date
      AND p.on_hand > 0
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
$$;
