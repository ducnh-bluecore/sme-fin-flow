
-- fn_lifecycle_progress: Calculate sell-through progress per FC batch
-- Returns active batch info with sell-through %, target comparison, velocity metrics

CREATE OR REPLACE FUNCTION public.fn_lifecycle_progress(p_tenant_id UUID)
RETURNS TABLE(
  fc_id UUID,
  fc_code TEXT,
  fc_name TEXT,
  category TEXT,
  batch_number INTEGER,
  batch_qty INTEGER,
  batch_start_date DATE,
  age_days INTEGER,
  current_on_hand INTEGER,
  batch_sold INTEGER,
  sell_through_pct NUMERIC,
  target_pct NUMERIC,
  gap_pct NUMERIC,
  status TEXT,
  velocity_current NUMERIC,
  velocity_required NUMERIC,
  is_restocked BOOLEAN,
  total_batches INTEGER,
  cash_at_risk NUMERIC,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  WITH active_batches AS (
    -- Get the latest non-completed batch per FC
    SELECT DISTINCT ON (b.fc_id)
      b.fc_id,
      b.batch_number,
      b.batch_qty,
      b.batch_start_date,
      b.source,
      b.lifecycle_template_id,
      (v_today - b.batch_start_date) AS age_days_val
    FROM inv_lifecycle_batches b
    WHERE b.tenant_id = p_tenant_id
      AND b.is_completed = false
    ORDER BY b.fc_id, b.batch_number DESC
  ),
  batch_counts AS (
    SELECT b2.fc_id, COUNT(*) AS total_batch_count,
           MAX(b2.batch_number) AS max_batch
    FROM inv_lifecycle_batches b2
    WHERE b2.tenant_id = p_tenant_id
    GROUP BY b2.fc_id
  ),
  current_stock AS (
    -- Current on_hand per FC from latest snapshot
    SELECT 
      m.fc_id,
      SUM(p.on_hand) AS total_on_hand
    FROM inv_state_positions p
    JOIN inv_sku_fc_mapping m ON m.sku = p.sku AND m.tenant_id = p.tenant_id
    WHERE p.tenant_id = p_tenant_id
      AND p.snapshot_date = (
        SELECT MAX(p2.snapshot_date) 
        FROM inv_state_positions p2 
        WHERE p2.tenant_id = p_tenant_id 
          AND p2.store_id = p.store_id
      )
    GROUP BY m.fc_id
  ),
  default_template AS (
    SELECT t.milestones, t.lifecycle_days
    FROM inv_lifecycle_templates t
    WHERE t.tenant_id = p_tenant_id AND t.is_default = true
    LIMIT 1
  )
  SELECT
    ab.fc_id,
    fc.fc_code,
    fc.fc_name,
    fc.category,
    ab.batch_number,
    ab.batch_qty,
    ab.batch_start_date,
    ab.age_days_val::INTEGER AS age_days,
    COALESCE(cs.total_on_hand, 0)::INTEGER AS current_on_hand,
    GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0)::INTEGER, 0)::INTEGER AS batch_sold,
    CASE WHEN ab.batch_qty > 0 
      THEN ROUND(GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.batch_qty * 100, 1)
      ELSE 0 
    END AS sell_through_pct,
    -- Find target_pct from milestones based on age
    COALESCE((
      SELECT COALESCE(
        (SELECT (m_item->>'target_pct')::NUMERIC
         FROM jsonb_array_elements(
           COALESCE(
             (SELECT t2.milestones FROM inv_lifecycle_templates t2 WHERE t2.id = ab.lifecycle_template_id),
             (SELECT dt.milestones FROM default_template dt)
           )
         ) m_item
         WHERE (m_item->>'day')::INTEGER >= ab.age_days_val
         ORDER BY (m_item->>'day')::INTEGER ASC
         LIMIT 1),
        100
      )
    ), 100)::NUMERIC AS target_pct,
    -- gap = actual - target (negative = behind)
    (CASE WHEN ab.batch_qty > 0 
      THEN ROUND(GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.batch_qty * 100, 1)
      ELSE 0 
    END - COALESCE((
      SELECT COALESCE(
        (SELECT (m_item->>'target_pct')::NUMERIC
         FROM jsonb_array_elements(
           COALESCE(
             (SELECT t3.milestones FROM inv_lifecycle_templates t3 WHERE t3.id = ab.lifecycle_template_id),
             (SELECT dt.milestones FROM default_template dt)
           )
         ) m_item
         WHERE (m_item->>'day')::INTEGER >= ab.age_days_val
         ORDER BY (m_item->>'day')::INTEGER ASC
         LIMIT 1),
        100
      )
    ), 100))::NUMERIC AS gap_pct,
    -- status
    CASE
      WHEN ab.batch_qty <= 0 THEN 'no_data'
      WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / NULLIF(ab.batch_qty, 0) * 100 >= 
           COALESCE((SELECT COALESCE((SELECT (m_item->>'target_pct')::NUMERIC FROM jsonb_array_elements(COALESCE((SELECT t4.milestones FROM inv_lifecycle_templates t4 WHERE t4.id = ab.lifecycle_template_id),(SELECT dt.milestones FROM default_template dt))) m_item WHERE (m_item->>'day')::INTEGER >= ab.age_days_val ORDER BY (m_item->>'day')::INTEGER ASC LIMIT 1),100)),100)
        THEN 'ahead'
      WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / NULLIF(ab.batch_qty, 0) * 100 >= 
           COALESCE((SELECT COALESCE((SELECT (m_item->>'target_pct')::NUMERIC FROM jsonb_array_elements(COALESCE((SELECT t5.milestones FROM inv_lifecycle_templates t5 WHERE t5.id = ab.lifecycle_template_id),(SELECT dt.milestones FROM default_template dt))) m_item WHERE (m_item->>'day')::INTEGER >= ab.age_days_val ORDER BY (m_item->>'day')::INTEGER ASC LIMIT 1),100)),100) - 15
        THEN 'on_track'
      WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / NULLIF(ab.batch_qty, 0) * 100 >= 
           COALESCE((SELECT COALESCE((SELECT (m_item->>'target_pct')::NUMERIC FROM jsonb_array_elements(COALESCE((SELECT t6.milestones FROM inv_lifecycle_templates t6 WHERE t6.id = ab.lifecycle_template_id),(SELECT dt.milestones FROM default_template dt))) m_item WHERE (m_item->>'day')::INTEGER >= ab.age_days_val ORDER BY (m_item->>'day')::INTEGER ASC LIMIT 1),100)),100) - 30
        THEN 'behind'
      ELSE 'critical'
    END AS status,
    -- velocity_current = units sold / days elapsed
    CASE WHEN ab.age_days_val > 0 
      THEN ROUND(GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.age_days_val, 2)
      ELSE 0 
    END AS velocity_current,
    -- velocity_required = remaining units / remaining days to lifecycle end
    CASE WHEN COALESCE((SELECT dt.lifecycle_days FROM default_template dt), 180) - ab.age_days_val > 0
      THEN ROUND(COALESCE(cs.total_on_hand, 0)::NUMERIC / GREATEST(COALESCE((SELECT dt.lifecycle_days FROM default_template dt), 180) - ab.age_days_val, 1), 2)
      ELSE 0
    END AS velocity_required,
    -- is_restocked
    COALESCE(bc.max_batch, 1) > 1 AS is_restocked,
    COALESCE(bc.total_batch_count, 1)::INTEGER AS total_batches,
    -- cash_at_risk: on_hand * avg unit cost (simplified: use 200k VND avg)
    ROUND(COALESCE(cs.total_on_hand, 0)::NUMERIC * 200000 / 1000000, 1) AS cash_at_risk,
    ab.source
  FROM active_batches ab
  JOIN inv_family_codes fc ON fc.id = ab.fc_id
  LEFT JOIN current_stock cs ON cs.fc_id = ab.fc_id
  LEFT JOIN batch_counts bc ON bc.fc_id = ab.fc_id
  ORDER BY
    CASE
      WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / NULLIF(ab.batch_qty, 0) * 100 < 
           COALESCE((SELECT COALESCE((SELECT (m_item->>'target_pct')::NUMERIC FROM jsonb_array_elements(COALESCE((SELECT t7.milestones FROM inv_lifecycle_templates t7 WHERE t7.id = ab.lifecycle_template_id),(SELECT dt.milestones FROM default_template dt))) m_item WHERE (m_item->>'day')::INTEGER >= ab.age_days_val ORDER BY (m_item->>'day')::INTEGER ASC LIMIT 1),100)),100) - 30
        THEN 0  -- critical first
      ELSE 1
    END,
    COALESCE(cs.total_on_hand, 0) DESC;  -- highest stock = highest cash at risk
END;
$$;
