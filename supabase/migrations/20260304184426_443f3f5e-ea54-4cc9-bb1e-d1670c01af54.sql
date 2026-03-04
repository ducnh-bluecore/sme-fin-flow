
CREATE OR REPLACE FUNCTION fn_lifecycle_progress(p_tenant_id UUID)
RETURNS TABLE(
  fc_id UUID, fc_code TEXT, fc_name TEXT, category TEXT,
  batch_number INTEGER, batch_qty INTEGER, batch_start_date DATE,
  age_days INTEGER, current_on_hand INTEGER, batch_sold INTEGER,
  sell_through_pct NUMERIC, target_pct NUMERIC, gap_pct NUMERIC,
  status TEXT, velocity_current NUMERIC, velocity_required NUMERIC,
  is_restocked BOOLEAN, total_batches INTEGER, cash_at_risk NUMERIC,
  source TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_milestones JSONB;
  v_lifecycle_days INTEGER;
BEGIN
  -- Get default template once
  SELECT t.milestones, t.lifecycle_days INTO v_milestones, v_lifecycle_days
  FROM inv_lifecycle_templates t
  WHERE t.tenant_id = p_tenant_id AND t.is_default = true
  LIMIT 1;

  v_lifecycle_days := COALESCE(v_lifecycle_days, 180);

  RETURN QUERY
  WITH active_batches AS (
    SELECT DISTINCT ON (b.fc_id)
      b.fc_id, b.batch_number, b.batch_qty, b.batch_start_date,
      b.source, b.lifecycle_template_id,
      (v_today - b.batch_start_date) AS age_days_val
    FROM inv_lifecycle_batches b
    WHERE b.tenant_id = p_tenant_id AND b.is_completed = false
    ORDER BY b.fc_id, b.batch_number DESC
  ),
  batch_counts AS (
    SELECT b2.fc_id, COUNT(*)::INTEGER AS total_batch_count, MAX(b2.batch_number) AS max_batch
    FROM inv_lifecycle_batches b2
    WHERE b2.tenant_id = p_tenant_id
    GROUP BY b2.fc_id
  ),
  latest_snapshots AS (
    SELECT p.store_id, MAX(p.snapshot_date) AS max_date
    FROM inv_state_positions p
    WHERE p.tenant_id = p_tenant_id
    GROUP BY p.store_id
  ),
  current_stock AS (
    SELECT m.fc_id, SUM(p.on_hand)::INTEGER AS total_on_hand
    FROM inv_state_positions p
    JOIN latest_snapshots ls ON ls.store_id = p.store_id AND ls.max_date = p.snapshot_date
    JOIN inv_sku_fc_mapping m ON m.sku = p.sku AND m.tenant_id = p.tenant_id
    WHERE p.tenant_id = p_tenant_id
    GROUP BY m.fc_id
  )
  SELECT
    ab.fc_id, fc.fc_code, fc.fc_name, fc.category,
    ab.batch_number, ab.batch_qty, ab.batch_start_date,
    ab.age_days_val::INTEGER,
    COALESCE(cs.total_on_hand, 0)::INTEGER,
    GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::INTEGER,
    -- sell_through_pct
    CASE WHEN ab.batch_qty > 0 
      THEN ROUND(GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.batch_qty * 100, 1)
      ELSE 0 END,
    -- target_pct
    COALESCE(
      (SELECT (mi->>'target_pct')::NUMERIC
       FROM jsonb_array_elements(
         COALESCE(
           (SELECT t2.milestones FROM inv_lifecycle_templates t2 WHERE t2.id = ab.lifecycle_template_id),
           v_milestones
         )
       ) mi
       WHERE (mi->>'day')::INTEGER >= ab.age_days_val
       ORDER BY (mi->>'day')::INTEGER ASC LIMIT 1),
      100
    )::NUMERIC,
    -- gap_pct (sell_through - target)
    (CASE WHEN ab.batch_qty > 0 
      THEN ROUND(GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.batch_qty * 100, 1)
      ELSE 0 END)
    - COALESCE(
      (SELECT (mi->>'target_pct')::NUMERIC
       FROM jsonb_array_elements(
         COALESCE(
           (SELECT t3.milestones FROM inv_lifecycle_templates t3 WHERE t3.id = ab.lifecycle_template_id),
           v_milestones
         )
       ) mi
       WHERE (mi->>'day')::INTEGER >= ab.age_days_val
       ORDER BY (mi->>'day')::INTEGER ASC LIMIT 1),
      100
    ),
    -- status
    CASE
      WHEN ab.batch_qty <= 0 THEN 'no_data'
      WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / NULLIF(ab.batch_qty, 0) * 100 >= 
           COALESCE((SELECT (mi->>'target_pct')::NUMERIC FROM jsonb_array_elements(COALESCE((SELECT t4.milestones FROM inv_lifecycle_templates t4 WHERE t4.id = ab.lifecycle_template_id), v_milestones)) mi WHERE (mi->>'day')::INTEGER >= ab.age_days_val ORDER BY (mi->>'day')::INTEGER ASC LIMIT 1), 100)
        THEN 'ahead'
      WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / NULLIF(ab.batch_qty, 0) * 100 >= 
           COALESCE((SELECT (mi->>'target_pct')::NUMERIC FROM jsonb_array_elements(COALESCE((SELECT t5.milestones FROM inv_lifecycle_templates t5 WHERE t5.id = ab.lifecycle_template_id), v_milestones)) mi WHERE (mi->>'day')::INTEGER >= ab.age_days_val ORDER BY (mi->>'day')::INTEGER ASC LIMIT 1), 100) - 15
        THEN 'on_track'
      WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / NULLIF(ab.batch_qty, 0) * 100 >= 
           COALESCE((SELECT (mi->>'target_pct')::NUMERIC FROM jsonb_array_elements(COALESCE((SELECT t6.milestones FROM inv_lifecycle_templates t6 WHERE t6.id = ab.lifecycle_template_id), v_milestones)) mi WHERE (mi->>'day')::INTEGER >= ab.age_days_val ORDER BY (mi->>'day')::INTEGER ASC LIMIT 1), 100) - 30
        THEN 'behind'
      ELSE 'critical'
    END,
    -- velocity_current
    CASE WHEN ab.age_days_val > 0 
      THEN ROUND(GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.age_days_val, 2)
      ELSE 0 END,
    -- velocity_required
    CASE WHEN v_lifecycle_days - ab.age_days_val > 0
      THEN ROUND(COALESCE(cs.total_on_hand, 0)::NUMERIC / GREATEST(v_lifecycle_days - ab.age_days_val, 1), 2)
      ELSE 0 END,
    -- is_restocked
    COALESCE(bc.max_batch, 1) > 1,
    COALESCE(bc.total_batch_count, 1),
    -- cash_at_risk
    ROUND(COALESCE(cs.total_on_hand, 0)::NUMERIC * 200000 / 1000000, 1),
    ab.source
  FROM active_batches ab
  JOIN inv_family_codes fc ON fc.id = ab.fc_id
  LEFT JOIN current_stock cs ON cs.fc_id = ab.fc_id
  LEFT JOIN batch_counts bc ON bc.fc_id = ab.fc_id
  ORDER BY
    CASE
      WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / NULLIF(ab.batch_qty, 0) * 100 < 
           COALESCE((SELECT (mi->>'target_pct')::NUMERIC FROM jsonb_array_elements(COALESCE((SELECT t7.milestones FROM inv_lifecycle_templates t7 WHERE t7.id = ab.lifecycle_template_id), v_milestones)) mi WHERE (mi->>'day')::INTEGER >= ab.age_days_val ORDER BY (mi->>'day')::INTEGER ASC LIMIT 1), 100) - 30
        THEN 0
      ELSE 1
    END,
    COALESCE(cs.total_on_hand, 0) DESC;
END;
$$;
