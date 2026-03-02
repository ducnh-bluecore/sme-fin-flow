
-- Fix fn_batch_size_split: log actual error and use proper error handling
CREATE OR REPLACE FUNCTION public.fn_batch_size_split(
  p_tenant_id uuid,
  p_run_id uuid,
  p_table_name text,
  p_max_records int DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '300s'
SET search_path = public
AS $$
DECLARE
  rec record;
  v_size_data jsonb;
  v_updated int := 0;
  v_skipped int := 0;
  v_total int := 0;
  v_last_error text := '';
BEGIN
  IF p_table_name = 'alloc' THEN
    FOR rec IN
      SELECT id, fc_id, store_id AS dest_id, COALESCE(recommended_qty, 0) AS qty
      FROM public.inv_allocation_recommendations
      WHERE tenant_id = p_tenant_id
        AND run_id = p_run_id
        AND size_breakdown IS NULL
      LIMIT p_max_records
    LOOP
      v_total := v_total + 1;
      BEGIN
        v_size_data := public.fn_allocate_size_split(
          p_tenant_id, rec.fc_id, NULL::uuid, rec.dest_id, rec.qty
        );

        UPDATE public.inv_allocation_recommendations
        SET size_breakdown = COALESCE(v_size_data, '[]'::jsonb)
        WHERE id = rec.id;

        v_updated := v_updated + 1;
      EXCEPTION WHEN OTHERS THEN
        v_last_error := SQLERRM;
        v_skipped := v_skipped + 1;
      END;
    END LOOP;

  ELSIF p_table_name = 'rebalance' THEN
    FOR rec IN
      SELECT id, fc_id, to_location AS dest_id, COALESCE(qty, 0) AS qty
      FROM public.inv_rebalance_suggestions
      WHERE tenant_id = p_tenant_id
        AND run_id = p_run_id
        AND size_breakdown IS NULL
      LIMIT p_max_records
    LOOP
      v_total := v_total + 1;
      BEGIN
        v_size_data := public.fn_allocate_size_split(
          p_tenant_id, rec.fc_id, NULL::uuid, rec.dest_id, rec.qty
        );

        UPDATE public.inv_rebalance_suggestions
        SET size_breakdown = COALESCE(v_size_data, '[]'::jsonb)
        WHERE id = rec.id;

        v_updated := v_updated + 1;
      EXCEPTION WHEN OTHERS THEN
        v_last_error := SQLERRM;
        v_skipped := v_skipped + 1;
      END;
    END LOOP;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid table_name. Use alloc or rebalance');
  END IF;

  RETURN jsonb_build_object(
    'total', v_total,
    'updated', v_updated,
    'skipped', v_skipped,
    'last_error', v_last_error
  );
END;
$$;
