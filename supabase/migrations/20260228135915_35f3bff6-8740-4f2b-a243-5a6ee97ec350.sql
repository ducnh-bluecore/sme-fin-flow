
CREATE OR REPLACE FUNCTION public.fn_batch_size_split_alloc(
  p_tenant_id uuid,
  p_run_id uuid,
  p_batch_size int DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rec record;
  v_size_data jsonb;
  v_updated int := 0;
  v_skipped int := 0;
BEGIN
  FOR rec IN
    SELECT id, fc_id, store_id, recommended_qty
    FROM inv_allocation_recommendations
    WHERE tenant_id = p_tenant_id
      AND run_id = p_run_id
      AND size_breakdown IS NULL
    LIMIT p_batch_size
  LOOP
    BEGIN
      SELECT fn_allocate_size_split(
        p_tenant_id,
        rec.fc_id,
        NULL::uuid,
        rec.store_id,
        COALESCE(rec.recommended_qty, 0)
      ) INTO v_size_data;

      UPDATE inv_allocation_recommendations
      SET size_breakdown = COALESCE(v_size_data, '[]'::jsonb)
      WHERE id = rec.id;

      v_updated := v_updated + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('updated', v_updated, 'skipped', v_skipped);
END;
$$;
