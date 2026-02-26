
CREATE OR REPLACE FUNCTION public.compute_inventory_kpi_all(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '300s'
AS $fn$
DECLARE
  v_tid text := p_tenant_id::text;
  v_result jsonb := '{}'::jsonb;
  v_idi_count int := 0;
  v_scs_count int := 0;
  v_chi_count int := 0;
  v_size_count int := 0;
  v_md_count int := 0;
  v_ev_count int := 0;
  v_start timestamptz := clock_timestamp();
BEGIN
  -- =========================================================
  -- 1) IDI  (Inventory Distortion Index)
  -- =========================================================
  INSERT INTO state_idi_daily (
    tenant_id, fc_id, store_id, sku, snapshot_date,
    on_hand, doc, velocity_7d, velocity_30d,
    idi_score, idi_grade, overstock_units, understock_units,
    financial_damage, demand_trend
  )
  SELECT
    v_tid,
    sp.fc_id,
    sp.store_id,
    sp.sku,
    p_as_of_date,
    sp.on_hand,
    CASE WHEN COALESCE(d.velocity_30d, 0) > 0
         THEN LEAST(sp.on_hand / d.velocity_30d, 180)
         ELSE 180 END,                              -- doc capped 180
    COALESCE(d.velocity_7d, 0),
    COALESCE(d.velocity_30d, 0),
    -- idi_score
    CASE
      WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 100
      ELSE LEAST(100, GREATEST(0,
             ABS(sp.on_hand - d.velocity_30d * 30) / NULLIF(d.velocity_30d * 30, 0) * 100
           ))
    END,
    -- idi_grade
    CASE
      WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'dead'
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 90 THEN 'severe_over'
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 45 THEN 'over'
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) < 7  THEN 'under'
      ELSE 'healthy'
    END,
    -- overstock
    GREATEST(0, sp.on_hand - COALESCE(d.velocity_30d, 0) * 45),
    -- understock
    GREATEST(0, COALESCE(d.velocity_30d, 0) * 14 - sp.on_hand),
    -- financial_damage (approx)
    GREATEST(0, sp.on_hand - COALESCE(d.velocity_30d, 0) * 45)
      * COALESCE(d.avg_price, 0) * 0.3,
    -- demand_trend
    CASE
      WHEN COALESCE(d.velocity_7d, 0) > COALESCE(d.velocity_30d, 0) * 1.2 THEN 'accelerating'
      WHEN COALESCE(d.velocity_7d, 0) < COALESCE(d.velocity_30d, 0) * 0.8 THEN 'decelerating'
      ELSE 'stable'
    END
  FROM inv_state_positions sp
  LEFT JOIN inv_state_demand d
    ON d.tenant_id = v_tid AND d.store_id = sp.store_id AND d.sku = sp.sku
  WHERE sp.tenant_id = v_tid
    AND sp.snapshot_date = p_as_of_date
    AND sp.on_hand > 0
  ON CONFLICT (tenant_id, store_id, sku, snapshot_date)
  DO UPDATE SET
    on_hand          = EXCLUDED.on_hand,
    doc              = EXCLUDED.doc,
    velocity_7d      = EXCLUDED.velocity_7d,
    velocity_30d     = EXCLUDED.velocity_30d,
    idi_score        = EXCLUDED.idi_score,
    idi_grade        = EXCLUDED.idi_grade,
    overstock_units  = EXCLUDED.overstock_units,
    understock_units = EXCLUDED.understock_units,
    financial_damage = EXCLUDED.financial_damage,
    demand_trend     = EXCLUDED.demand_trend;

  GET DIAGNOSTICS v_idi_count = ROW_COUNT;

  -- =========================================================
  -- 2) SCS  (Supply Chain Score)
  -- =========================================================
  INSERT INTO state_scs_daily (
    tenant_id, fc_id, store_id, sku, snapshot_date,
    fill_rate, in_stock_rate, replenishment_efficiency, scs_score, scs_grade
  )
  SELECT
    v_tid,
    sp.fc_id,
    sp.store_id,
    sp.sku,
    p_as_of_date,
    CASE WHEN COALESCE(d.velocity_30d, 0) > 0
         THEN LEAST(1.0, sp.on_hand / (d.velocity_30d * 30))
         ELSE 0 END,
    CASE WHEN sp.on_hand > 0 THEN 1.0 ELSE 0 END,
    0.5,
    -- scs_score
    LEAST(100, GREATEST(0,
      (CASE WHEN sp.on_hand > 0 THEN 40 ELSE 0 END) +
      (CASE WHEN COALESCE(d.velocity_30d, 0) > 0
            THEN LEAST(40, (sp.on_hand / (d.velocity_30d * 30)) * 40)
            ELSE 0 END) +
      20
    )),
    -- scs_grade
    CASE
      WHEN sp.on_hand = 0 THEN 'stockout'
      WHEN COALESCE(d.velocity_30d, 0) > 0
           AND sp.on_hand / (d.velocity_30d * 30) >= 0.8 THEN 'excellent'
      WHEN COALESCE(d.velocity_30d, 0) > 0
           AND sp.on_hand / (d.velocity_30d * 30) >= 0.5 THEN 'good'
      ELSE 'poor'
    END
  FROM inv_state_positions sp
  LEFT JOIN inv_state_demand d
    ON d.tenant_id = v_tid AND d.store_id = sp.store_id AND d.sku = sp.sku
  WHERE sp.tenant_id = v_tid
    AND sp.snapshot_date = p_as_of_date
  ON CONFLICT (tenant_id, store_id, sku, snapshot_date)
  DO UPDATE SET
    fill_rate                = EXCLUDED.fill_rate,
    in_stock_rate            = EXCLUDED.in_stock_rate,
    replenishment_efficiency = EXCLUDED.replenishment_efficiency,
    scs_score                = EXCLUDED.scs_score,
    scs_grade                = EXCLUDED.scs_grade;

  GET DIAGNOSTICS v_scs_count = ROW_COUNT;

  -- =========================================================
  -- 3) CHI  (Cash Health Index)
  -- =========================================================
  INSERT INTO state_cash_health_daily (
    tenant_id, fc_id, store_id, sku, snapshot_date,
    cash_locked, opportunity_cost, aging_penalty, chi_score, chi_grade
  )
  SELECT
    v_tid,
    sp.fc_id,
    sp.store_id,
    sp.sku,
    p_as_of_date,
    sp.on_hand * COALESCE(d.avg_price, 0) * 0.6,
    GREATEST(0, sp.on_hand - COALESCE(d.velocity_30d, 0) * 30)
      * COALESCE(d.avg_price, 0) * 0.3,
    CASE
      WHEN COALESCE(d.velocity_30d, 0) = 0 THEN sp.on_hand * COALESCE(d.avg_price, 0) * 0.1
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 90 THEN sp.on_hand * COALESCE(d.avg_price, 0) * 0.08
      ELSE 0
    END,
    -- chi_score
    LEAST(100, GREATEST(0,
      100 - (
        CASE WHEN COALESCE(d.avg_price, 0) > 0
             THEN (sp.on_hand * d.avg_price * 0.6) / 1000000 * 10
             ELSE 0 END
      )
    )),
    -- chi_grade
    CASE
      WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'frozen'
      WHEN sp.on_hand * COALESCE(d.avg_price, 0) > 5000000 THEN 'stressed'
      ELSE 'healthy'
    END
  FROM inv_state_positions sp
  LEFT JOIN inv_state_demand d
    ON d.tenant_id = v_tid AND d.store_id = sp.store_id AND d.sku = sp.sku
  WHERE sp.tenant_id = v_tid
    AND sp.snapshot_date = p_as_of_date
    AND sp.on_hand > 0
  ON CONFLICT (tenant_id, store_id, sku, snapshot_date)
  DO UPDATE SET
    cash_locked      = EXCLUDED.cash_locked,
    opportunity_cost = EXCLUDED.opportunity_cost,
    aging_penalty    = EXCLUDED.aging_penalty,
    chi_score        = EXCLUDED.chi_score,
    chi_grade        = EXCLUDED.chi_grade;

  GET DIAGNOSTICS v_chi_count = ROW_COUNT;

  -- =========================================================
  -- 4) Size Health
  -- =========================================================
  INSERT INTO state_size_health_daily (
    tenant_id, fc_id, store_id, sku, snapshot_date,
    size_code, on_hand, velocity_30d,
    size_score, size_grade, size_break_flag
  )
  SELECT
    v_tid,
    sp.fc_id,
    sp.store_id,
    sp.sku,
    p_as_of_date,
    COALESCE(
      UPPER(regexp_replace(sp.sku, '^.*?([A-Z]+)$', '\1')),
      'OS'
    ),
    sp.on_hand,
    COALESCE(d.velocity_30d, 0),
    LEAST(100, GREATEST(0,
      CASE
        WHEN sp.on_hand = 0 THEN 0
        WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 20
        ELSE LEAST(100, (sp.on_hand / (d.velocity_30d * 30)) * 100)
      END
    )),
    CASE
      WHEN sp.on_hand = 0 THEN 'broken'
      WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'stale'
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 60 THEN 'excess'
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) < 7  THEN 'critical'
      ELSE 'balanced'
    END,
    CASE WHEN sp.on_hand = 0 AND COALESCE(d.velocity_30d, 0) > 0 THEN true ELSE false END
  FROM inv_state_positions sp
  LEFT JOIN inv_state_demand d
    ON d.tenant_id = v_tid AND d.store_id = sp.store_id AND d.sku = sp.sku
  WHERE sp.tenant_id = v_tid
    AND sp.snapshot_date = p_as_of_date
  ON CONFLICT (tenant_id, store_id, sku, snapshot_date)
  DO UPDATE SET
    size_code      = EXCLUDED.size_code,
    on_hand        = EXCLUDED.on_hand,
    velocity_30d   = EXCLUDED.velocity_30d,
    size_score     = EXCLUDED.size_score,
    size_grade     = EXCLUDED.size_grade,
    size_break_flag = EXCLUDED.size_break_flag;

  GET DIAGNOSTICS v_size_count = ROW_COUNT;

  -- =========================================================
  -- 5) Markdown Risk
  -- =========================================================
  INSERT INTO state_markdown_risk_daily (
    tenant_id, fc_id, store_id, sku, snapshot_date,
    doc, velocity_trend, aging_score,
    markdown_risk_score, markdown_risk_grade
  )
  SELECT
    v_tid,
    sp.fc_id,
    sp.store_id,
    sp.sku,
    p_as_of_date,
    CASE WHEN COALESCE(d.velocity_30d, 0) > 0
         THEN LEAST(sp.on_hand / d.velocity_30d, 180)
         ELSE 180 END,
    CASE
      WHEN COALESCE(d.velocity_7d, 0) > COALESCE(d.velocity_30d, 0) * 1.2 THEN 'improving'
      WHEN COALESCE(d.velocity_7d, 0) < COALESCE(d.velocity_30d, 0) * 0.8 THEN 'declining'
      ELSE 'stable'
    END,
    CASE
      WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 100
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 90 THEN 80
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 60 THEN 50
      ELSE 20
    END,
    -- markdown_risk_score
    LEAST(100, GREATEST(0,
      CASE
        WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 90
        WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 90 THEN 75
        WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 60 THEN 50
        WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 30 THEN 25
        ELSE 10
      END
    )),
    CASE
      WHEN COALESCE(d.velocity_30d, 0) = 0 THEN 'critical'
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 90 THEN 'high'
      WHEN sp.on_hand / NULLIF(d.velocity_30d, 0) > 45 THEN 'moderate'
      ELSE 'low'
    END
  FROM inv_state_positions sp
  LEFT JOIN inv_state_demand d
    ON d.tenant_id = v_tid AND d.store_id = sp.store_id AND d.sku = sp.sku
  WHERE sp.tenant_id = v_tid
    AND sp.snapshot_date = p_as_of_date
    AND sp.on_hand > 0
  ON CONFLICT (tenant_id, store_id, sku, snapshot_date)
  DO UPDATE SET
    doc                  = EXCLUDED.doc,
    velocity_trend       = EXCLUDED.velocity_trend,
    aging_score          = EXCLUDED.aging_score,
    markdown_risk_score  = EXCLUDED.markdown_risk_score,
    markdown_risk_grade  = EXCLUDED.markdown_risk_grade;

  GET DIAGNOSTICS v_md_count = ROW_COUNT;

  -- =========================================================
  -- 6) Evidence Packs (top problems only)
  -- =========================================================
  INSERT INTO inv_evidence_packs (
    tenant_id, fc_id, store_id, sku, snapshot_date,
    evidence_type, evidence_data
  )
  SELECT
    v_tid,
    fc_id,
    store_id,
    sku,
    p_as_of_date,
    'idi_alert',
    jsonb_build_object(
      'idi_score', idi_score,
      'idi_grade', idi_grade,
      'on_hand', on_hand,
      'velocity_30d', velocity_30d,
      'doc', doc,
      'overstock', overstock_units,
      'damage', financial_damage
    )
  FROM state_idi_daily
  WHERE tenant_id = v_tid
    AND snapshot_date = p_as_of_date
    AND idi_grade IN ('severe_over', 'dead')
  ON CONFLICT (tenant_id, store_id, sku, snapshot_date, evidence_type)
  DO UPDATE SET evidence_data = EXCLUDED.evidence_data;

  GET DIAGNOSTICS v_ev_count = ROW_COUNT;

  -- =========================================================
  -- Build result
  -- =========================================================
  v_result := jsonb_build_object(
    'success', true,
    'idi_rows', v_idi_count,
    'scs_rows', v_scs_count,
    'chi_rows', v_chi_count,
    'size_health_rows', v_size_count,
    'markdown_risk_rows', v_md_count,
    'evidence_packs', v_ev_count,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::int
  );

  RETURN v_result;
END;
$fn$;
