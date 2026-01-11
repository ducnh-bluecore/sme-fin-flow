-- ============================================
-- BẢNG TÍNH TOÁN SẴN CHO ALERT METRICS
-- ============================================

-- 1. Bảng lưu metrics đã tính toán sẵn
CREATE TABLE public.object_calculated_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  object_id UUID REFERENCES public.alert_objects(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_name TEXT NOT NULL,
  external_id TEXT,
  
  -- Inventory Metrics
  days_of_stock NUMERIC,
  sales_velocity NUMERIC,
  avg_daily_sales NUMERIC,
  reorder_point NUMERIC,
  stockout_risk_days NUMERIC,
  days_since_last_sale INTEGER,
  current_stock NUMERIC,
  
  -- Trend Metrics  
  trend_direction TEXT, -- 'up', 'down', 'stable'
  trend_percent NUMERIC,
  velocity_change_percent NUMERIC,
  
  -- Revenue Metrics
  daily_revenue NUMERIC,
  target_revenue NUMERIC,
  target_progress NUMERIC,
  revenue_variance_percent NUMERIC,
  gross_margin_percent NUMERIC,
  
  -- Service Metrics
  conversion_rate NUMERIC,
  avg_response_time_minutes NUMERIC,
  refund_rate NUMERIC,
  return_rate NUMERIC,
  
  -- Threshold Status (pre-calculated)
  dos_status TEXT DEFAULT 'normal', -- 'normal', 'warning', 'critical'
  velocity_status TEXT DEFAULT 'normal',
  revenue_status TEXT DEFAULT 'normal',
  margin_status TEXT DEFAULT 'normal',
  
  -- Meta
  calculation_inputs JSONB DEFAULT '{}'::jsonb,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_object_metrics UNIQUE(tenant_id, object_id)
);

-- 2. Indexes cho query nhanh
CREATE INDEX idx_calc_metrics_tenant ON public.object_calculated_metrics(tenant_id);
CREATE INDEX idx_calc_metrics_object_type ON public.object_calculated_metrics(object_type);
CREATE INDEX idx_calc_metrics_dos_status ON public.object_calculated_metrics(dos_status) WHERE dos_status != 'normal';
CREATE INDEX idx_calc_metrics_revenue_status ON public.object_calculated_metrics(revenue_status) WHERE revenue_status != 'normal';

-- 3. Enable RLS
ALTER TABLE public.object_calculated_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for calculated metrics" 
ON public.object_calculated_metrics 
FOR ALL 
USING (tenant_id IN (
  SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
));

-- 4. Function tính toán metrics cho 1 object
CREATE OR REPLACE FUNCTION public.calculate_object_metrics(p_object_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_object RECORD;
  v_metrics JSONB;
  v_dos NUMERIC;
  v_velocity NUMERIC;
  v_trend_percent NUMERIC;
  v_dos_status TEXT;
  v_velocity_status TEXT;
  v_revenue_status TEXT;
BEGIN
  -- Get object data
  SELECT * INTO v_object FROM alert_objects WHERE id = p_object_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  v_metrics := COALESCE(v_object.current_metrics, '{}'::jsonb);
  
  -- Calculate inventory metrics
  v_velocity := COALESCE(
    (v_metrics->>'sales_last_30_days')::numeric / 30,
    v_object.avg_daily_sales,
    0.1
  );
  
  v_dos := CASE 
    WHEN v_velocity > 0 THEN COALESCE((v_metrics->>'total_stock')::numeric, 0) / v_velocity
    ELSE 999
  END;
  
  v_trend_percent := COALESCE(v_object.trend_percent, 0);
  
  -- Determine threshold status
  v_dos_status := CASE
    WHEN v_dos <= 3 THEN 'critical'
    WHEN v_dos <= 7 THEN 'warning'
    ELSE 'normal'
  END;
  
  v_velocity_status := CASE
    WHEN v_velocity < 0.1 AND COALESCE((v_metrics->>'total_stock')::numeric, 0) > 0 THEN 'warning'
    ELSE 'normal'
  END;
  
  v_revenue_status := CASE
    WHEN v_object.object_type = 'store' AND COALESCE((v_metrics->>'target_revenue')::numeric, 0) > 0 THEN
      CASE 
        WHEN COALESCE((v_metrics->>'daily_revenue')::numeric, 0) / (v_metrics->>'target_revenue')::numeric < 0.6 THEN 'critical'
        WHEN COALESCE((v_metrics->>'daily_revenue')::numeric, 0) / (v_metrics->>'target_revenue')::numeric < 0.8 THEN 'warning'
        ELSE 'normal'
      END
    ELSE 'normal'
  END;
  
  -- Upsert calculated metrics
  INSERT INTO object_calculated_metrics (
    tenant_id, object_id, object_type, object_name, external_id,
    days_of_stock, sales_velocity, avg_daily_sales, reorder_point, stockout_risk_days,
    days_since_last_sale, current_stock,
    trend_direction, trend_percent, velocity_change_percent,
    daily_revenue, target_revenue, target_progress, revenue_variance_percent, gross_margin_percent,
    conversion_rate,
    dos_status, velocity_status, revenue_status,
    calculation_inputs, last_calculated_at, updated_at
  )
  VALUES (
    v_object.tenant_id, p_object_id, v_object.object_type, v_object.object_name, v_object.external_id,
    v_dos, v_velocity, v_velocity, v_object.reorder_point, 
    GREATEST(0, v_dos - COALESCE(v_object.lead_time_days, 7)),
    COALESCE((v_metrics->>'days_since_last_sale')::int, 
      EXTRACT(DAY FROM (now() - COALESCE(v_object.last_sale_date, now() - interval '999 days')))::int),
    COALESCE((v_metrics->>'total_stock')::numeric, 0),
    v_object.trend_direction, v_trend_percent, v_trend_percent,
    (v_metrics->>'daily_revenue')::numeric,
    (v_metrics->>'target_revenue')::numeric,
    CASE WHEN (v_metrics->>'target_revenue')::numeric > 0 
      THEN ((v_metrics->>'daily_revenue')::numeric / (v_metrics->>'target_revenue')::numeric) * 100
      ELSE NULL END,
    CASE WHEN (v_metrics->>'target_revenue')::numeric > 0 
      THEN (((v_metrics->>'daily_revenue')::numeric / (v_metrics->>'target_revenue')::numeric) - 1) * 100
      ELSE NULL END,
    (v_metrics->>'gross_margin')::numeric,
    CASE WHEN (v_metrics->>'footfall')::numeric > 0 
      THEN ((v_metrics->>'transactions')::numeric / (v_metrics->>'footfall')::numeric) * 100
      ELSE NULL END,
    v_dos_status, v_velocity_status, v_revenue_status,
    v_metrics, now(), now()
  )
  ON CONFLICT (tenant_id, object_id) 
  DO UPDATE SET
    object_name = EXCLUDED.object_name,
    days_of_stock = EXCLUDED.days_of_stock,
    sales_velocity = EXCLUDED.sales_velocity,
    avg_daily_sales = EXCLUDED.avg_daily_sales,
    reorder_point = EXCLUDED.reorder_point,
    stockout_risk_days = EXCLUDED.stockout_risk_days,
    days_since_last_sale = EXCLUDED.days_since_last_sale,
    current_stock = EXCLUDED.current_stock,
    trend_direction = EXCLUDED.trend_direction,
    trend_percent = EXCLUDED.trend_percent,
    velocity_change_percent = EXCLUDED.velocity_change_percent,
    daily_revenue = EXCLUDED.daily_revenue,
    target_revenue = EXCLUDED.target_revenue,
    target_progress = EXCLUDED.target_progress,
    revenue_variance_percent = EXCLUDED.revenue_variance_percent,
    gross_margin_percent = EXCLUDED.gross_margin_percent,
    conversion_rate = EXCLUDED.conversion_rate,
    dos_status = EXCLUDED.dos_status,
    velocity_status = EXCLUDED.velocity_status,
    revenue_status = EXCLUDED.revenue_status,
    calculation_inputs = EXCLUDED.calculation_inputs,
    last_calculated_at = now(),
    updated_at = now();
END;
$$;

-- 5. Trigger function khi alert_objects thay đổi
CREATE OR REPLACE FUNCTION public.trigger_recalculate_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate metrics when object changes
  PERFORM calculate_object_metrics(NEW.id);
  RETURN NEW;
END;
$$;

-- 6. Trigger on alert_objects
CREATE TRIGGER trg_alert_objects_recalculate
AFTER INSERT OR UPDATE OF current_metrics, avg_daily_sales, sales_velocity, days_of_stock, trend_percent
ON public.alert_objects
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_metrics();

-- 7. Function batch recalculate cho tenant
CREATE OR REPLACE FUNCTION public.batch_recalculate_metrics(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_object_id UUID;
BEGIN
  FOR v_object_id IN 
    SELECT id FROM alert_objects 
    WHERE tenant_id = p_tenant_id AND is_monitored = true
    LIMIT 1000
  LOOP
    PERFORM calculate_object_metrics(v_object_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- 8. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.object_calculated_metrics;