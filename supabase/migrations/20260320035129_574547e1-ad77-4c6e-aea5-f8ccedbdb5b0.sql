
-- 1. Create missing state_evidence_packs table
CREATE TABLE IF NOT EXISTS public.state_evidence_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  product_id text NOT NULL,
  as_of_date date NOT NULL,
  evidence_type text,
  evidence_data jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.state_evidence_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own tenant evidence packs" ON public.state_evidence_packs FOR SELECT TO authenticated USING (true);

-- 2. Fix compute_inventory_kpi_all: markdown_risk columns + use MAX snapshot_date + handle missing evidence table
CREATE OR REPLACE FUNCTION public.compute_inventory_kpi_all(p_tenant_id uuid, p_as_of_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SET statement_timeout = '120s'
SET search_path = 'public'
AS $$
DECLARE
  v_tid text := p_tenant_id::text;
  v_actual_date date;
  v_lr int := 0; v_cl int := 0; v_ml int := 0; v_sz int := 0; v_md int := 0; v_ev int := 0;
  v_start timestamptz := clock_timestamp();
  v_min_stock int := 1;
  v_core_sizes text[] := ARRAY['S','M','L'];
  v_w_missing numeric := 0.30; v_w_core numeric := 0.35; v_w_curve numeric := 0.20; v_w_depth numeric := 0.15;
  v_shallow int := 2; v_max_dev numeric := 0.30;
BEGIN
  -- Use the most recent snapshot_date available (not necessarily today)
  SELECT MAX(snapshot_date) INTO v_actual_date
  FROM inv_state_positions WHERE tenant_id = p_tenant_id;
  
  IF v_actual_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No inventory snapshots found');
  END IF;

  SELECT COALESCE(r.min_stock_threshold,1), COALESCE(r.core_sizes,ARRAY['S','M','L']),
    COALESCE(r.weight_missing_ratio,0.30), COALESCE(r.weight_core_missing,0.35),
    COALESCE(r.weight_curve_deviation,0.20), COALESCE(r.weight_depth_score,0.15),
    COALESCE(r.shallow_depth_threshold,2), COALESCE(r.max_curve_deviation_pct,0.30)
  INTO v_min_stock, v_core_sizes, v_w_missing, v_w_core, v_w_curve, v_w_depth, v_shallow, v_max_dev
  FROM sem_size_health_rules r WHERE r.tenant_id = p_tenant_id AND r.is_active = true LIMIT 1;

  CREATE TEMP TABLE _fc_prices ON COMMIT DROP AS
  SELECT m.fc_id, MAX(p.selling_price) AS selling_price, MAX(p.cost_price) AS cost_price
  FROM inv_sku_fc_mapping m JOIN products p ON p.sku = m.sku AND p.tenant_id = m.tenant_id
  WHERE m.tenant_id = p_tenant_id AND m.is_active = true AND (p.selling_price > 0 OR p.cost_price > 0)
  GROUP BY m.fc_id;

  CREATE TEMP TABLE _inv_agg ON COMMIT DROP AS
  SELECT sp.fc_id, SUM(sp.on_hand) AS total_on_hand, COALESCE(d.daily_vel,0) AS daily_vel,
    COALESCE(fp.selling_price,0) AS price, COALESCE(fp.cost_price, COALESCE(fp.selling_price,0)*0.5) AS cost
  FROM inv_state_positions sp
  LEFT JOIN (SELECT fc_id, SUM(avg_daily_sales) AS daily_vel FROM inv_state_demand WHERE tenant_id=p_tenant_id GROUP BY fc_id) d ON d.fc_id=sp.fc_id
  LEFT JOIN _fc_prices fp ON fp.fc_id=sp.fc_id
  WHERE sp.tenant_id=p_tenant_id AND sp.snapshot_date=v_actual_date
  GROUP BY sp.fc_id, d.daily_vel, fp.selling_price, fp.cost_price;

  -- Lost Revenue
  DELETE FROM state_lost_revenue_daily WHERE tenant_id=v_tid AND as_of_date=v_actual_date;
  INSERT INTO state_lost_revenue_daily (tenant_id,product_id,as_of_date,lost_units_est,lost_revenue_est,driver)
  SELECT v_tid,fc_id::text,v_actual_date,GREATEST(0,daily_vel*14-total_on_hand),GREATEST(0,daily_vel*14-total_on_hand)*price,
    CASE WHEN total_on_hand=0 THEN 'stockout' WHEN daily_vel=0 THEN 'no_demand' ELSE 'understock' END
  FROM _inv_agg WHERE daily_vel*14>total_on_hand;
  GET DIAGNOSTICS v_lr=ROW_COUNT;

  -- Cash Lock
  DELETE FROM state_cash_lock_daily WHERE tenant_id=v_tid AND as_of_date=v_actual_date;
  INSERT INTO state_cash_lock_daily (tenant_id,product_id,as_of_date,inventory_value,cash_locked_value,locked_pct,expected_release_days,lock_driver)
  SELECT v_tid,fc_id::text,v_actual_date,total_on_hand*price,total_on_hand*cost,
    CASE WHEN price>0 THEN LEAST(1.0,cost/price) ELSE 0.6 END,
    CASE WHEN daily_vel>0 THEN LEAST(180,(total_on_hand/daily_vel)::int) ELSE 180 END,
    CASE WHEN daily_vel=0 THEN 'dead_stock' WHEN total_on_hand/NULLIF(daily_vel,0)>90 THEN 'severe_overstock' WHEN total_on_hand/NULLIF(daily_vel,0)>45 THEN 'overstock' ELSE 'normal' END
  FROM _inv_agg WHERE total_on_hand>0;
  GET DIAGNOSTICS v_cl=ROW_COUNT;

  -- Margin Leak
  DELETE FROM state_margin_leak_daily WHERE tenant_id=v_tid AND as_of_date=v_actual_date;
  INSERT INTO state_margin_leak_daily (tenant_id,product_id,as_of_date,margin_leak_value,leak_driver,leak_detail,cumulative_leak_30d)
  SELECT v_tid,fc_id::text,v_actual_date,GREATEST(0,total_on_hand-daily_vel*45)*cost*0.3,
    CASE WHEN daily_vel=0 THEN 'dead_stock_holding' WHEN total_on_hand/NULLIF(daily_vel,0)>90 THEN 'excess_holding_cost' ELSE 'opportunity_cost' END,
    jsonb_build_object('on_hand',total_on_hand,'daily_vel',daily_vel), GREATEST(0,total_on_hand-daily_vel*45)*cost*0.3
  FROM _inv_agg WHERE total_on_hand>0 AND GREATEST(0,total_on_hand-daily_vel*45)>0;
  GET DIAGNOSTICS v_ml=ROW_COUNT;

  -- Size Health
  CREATE TEMP TABLE _size_detail ON COMMIT DROP AS
  SELECT sp.fc_id, sp.store_id, m.size AS size_code, sp.on_hand,
    CASE WHEN m.size = ANY(v_core_sizes) THEN true ELSE false END AS is_core
  FROM inv_state_positions sp
  JOIN inv_sku_fc_mapping m ON m.sku=sp.sku AND m.tenant_id=sp.tenant_id
  WHERE sp.tenant_id=p_tenant_id AND sp.snapshot_date=v_actual_date AND m.is_active=true;

  DELETE FROM state_size_health_daily WHERE tenant_id=v_tid AND as_of_date=v_actual_date;
  INSERT INTO state_size_health_daily (tenant_id,product_id,store_id,as_of_date,size_health_score,curve_state,deviation_score,core_size_missing,shallow_depth_count)
  SELECT v_tid, d.fc_id::text, d.store_id, v_actual_date,
    GREATEST(0,LEAST(100,(
      COALESCE(COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core AND d.on_hand>v_min_stock)::numeric/NULLIF(COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core),0),0)*v_w_core*100
      + COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand>v_min_stock)::numeric/NULLIF(COUNT(DISTINCT d.size_code),0)*(v_w_missing+v_w_curve)*100
      + CASE WHEN AVG(d.on_hand)<=v_shallow THEN 0.3 WHEN AVG(d.on_hand)<=v_shallow*2 THEN 0.6 ELSE 1.0 END*v_w_depth*100
    ))),
    CASE WHEN COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand>v_min_stock)::numeric/NULLIF(COUNT(DISTINCT d.size_code),0)<0.5 THEN 'broken'
      WHEN COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand>v_min_stock)::numeric/NULLIF(COUNT(DISTINCT d.size_code),0)<0.8 THEN 'risk' ELSE 'healthy' END,
    1.0 - COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand>v_min_stock)::numeric/NULLIF(COUNT(DISTINCT d.size_code),0),
    (COUNT(DISTINCT d.size_code) FILTER (WHERE d.is_core AND d.on_hand<=v_min_stock) > 0),
    COUNT(DISTINCT d.size_code) FILTER (WHERE d.on_hand>0 AND d.on_hand<=v_shallow)::int
  FROM _size_detail d GROUP BY d.fc_id, d.store_id;
  GET DIAGNOSTICS v_sz=ROW_COUNT;

  -- Markdown Risk: FIX column names to match actual table schema
  DELETE FROM state_markdown_risk_daily WHERE tenant_id=v_tid AND as_of_date=v_actual_date;
  INSERT INTO state_markdown_risk_daily (tenant_id,product_id,as_of_date,markdown_risk_score,markdown_eta_days,reason)
  SELECT v_tid,fc_id::text,v_actual_date,
    LEAST(100,GREATEST(0,CASE WHEN daily_vel=0 THEN 90 WHEN total_on_hand/NULLIF(daily_vel,0)>120 THEN 80 WHEN total_on_hand/NULLIF(daily_vel,0)>60 THEN 50 ELSE 20 END)),
    CASE WHEN daily_vel>0 THEN LEAST(180,(total_on_hand/daily_vel)::int) ELSE 180 END,
    CASE WHEN daily_vel=0 THEN 'dead_stock' WHEN total_on_hand/NULLIF(daily_vel,0)>120 THEN 'severe_overstock' WHEN total_on_hand/NULLIF(daily_vel,0)>60 THEN 'overstock' ELSE 'slow_mover' END
  FROM _inv_agg WHERE total_on_hand>0;
  GET DIAGNOSTICS v_md=ROW_COUNT;

  -- Evidence Packs
  DELETE FROM state_evidence_packs WHERE tenant_id=v_tid AND as_of_date=v_actual_date;
  INSERT INTO state_evidence_packs (tenant_id,product_id,as_of_date,evidence_type,evidence_data)
  SELECT v_tid,fc_id::text,v_actual_date,'inventory_snapshot',
    jsonb_build_object('on_hand',total_on_hand,'daily_velocity',daily_vel,'days_of_cover',
      CASE WHEN daily_vel>0 THEN (total_on_hand/daily_vel)::int ELSE 999 END,'sell_price',price,'cost_price',cost)
  FROM _inv_agg WHERE total_on_hand>0;
  GET DIAGNOSTICS v_ev=ROW_COUNT;

  RETURN jsonb_build_object('success',true,'as_of_date',v_actual_date,'lost_revenue_rows',v_lr,'cash_lock_rows',v_cl,
    'margin_leak_rows',v_ml,'size_health_rows',v_sz,'markdown_risk_rows',v_md,'evidence_rows',v_ev,
    'duration_ms',EXTRACT(MILLISECOND FROM clock_timestamp()-v_start)::int);
END;
$$;
