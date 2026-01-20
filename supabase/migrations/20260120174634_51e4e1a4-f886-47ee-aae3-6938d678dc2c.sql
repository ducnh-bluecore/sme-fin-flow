-- ================================================
-- PREDICTIVE ALERT ENGINE - Early Warning System
-- ================================================

-- Table: metric_trend_snapshots
-- Stores historical metric values for trend analysis
CREATE TABLE IF NOT EXISTS public.metric_trend_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  metric_code TEXT NOT NULL,
  dimension_key TEXT DEFAULT 'global',
  metric_value NUMERIC NOT NULL,
  period_date DATE NOT NULL,
  period_type TEXT DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, metric_code, dimension_key, period_date, period_type)
);

-- Table: predictive_alert_rules
CREATE TABLE IF NOT EXISTS public.predictive_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  metric_code TEXT NOT NULL,
  dimension_filter TEXT,
  lookback_periods INTEGER DEFAULT 7,
  min_data_points INTEGER DEFAULT 3,
  trend_type TEXT DEFAULT 'slope',
  breach_threshold NUMERIC NOT NULL,
  threshold_direction TEXT DEFAULT 'below',
  min_slope_trigger NUMERIC,
  min_acceleration_trigger NUMERIC,
  consecutive_periods INTEGER DEFAULT 3,
  severity TEXT DEFAULT 'warning',
  suggested_actions JSONB DEFAULT '[]',
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  cooldown_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, rule_code)
);

-- Table: early_warning_alerts
CREATE TABLE IF NOT EXISTS public.early_warning_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  rule_id UUID REFERENCES public.predictive_alert_rules(id),
  alert_class TEXT NOT NULL,
  metric_code TEXT NOT NULL,
  dimension_key TEXT DEFAULT 'global',
  title TEXT NOT NULL,
  message TEXT,
  trajectory JSONB NOT NULL,
  current_value NUMERIC NOT NULL,
  slope NUMERIC,
  acceleration NUMERIC,
  r_squared NUMERIC,
  estimated_breach_date DATE,
  days_to_breach INTEGER,
  breach_threshold NUMERIC,
  exposure_amount NUMERIC,
  exposure_currency TEXT DEFAULT 'VND',
  impact_description TEXT,
  confidence_level TEXT NOT NULL,
  confidence_score NUMERIC,
  confidence_factors JSONB,
  status TEXT DEFAULT 'active',
  severity TEXT DEFAULT 'warning',
  priority INTEGER DEFAULT 5,
  suggested_action TEXT,
  action_url TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metric_trend_snapshots_lookup 
  ON public.metric_trend_snapshots(tenant_id, metric_code, dimension_key, period_date DESC);

CREATE INDEX IF NOT EXISTS idx_early_warning_alerts_active 
  ON public.early_warning_alerts(tenant_id, status, alert_class) 
  WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.metric_trend_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.early_warning_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies using tenant_users join
CREATE POLICY "Tenant isolation for metric_trend_snapshots" 
  ON public.metric_trend_snapshots FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for predictive_alert_rules" 
  ON public.predictive_alert_rules FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for early_warning_alerts" 
  ON public.early_warning_alerts FOR ALL 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Function: Calculate linear regression for trend analysis
CREATE OR REPLACE FUNCTION calculate_trend_metrics(p_values NUMERIC[])
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  n INTEGER;
  sum_x NUMERIC := 0;
  sum_y NUMERIC := 0;
  sum_xy NUMERIC := 0;
  sum_x2 NUMERIC := 0;
  slope NUMERIC;
  intercept NUMERIC;
  r_squared NUMERIC;
  ss_tot NUMERIC := 0;
  ss_res NUMERIC := 0;
  mean_y NUMERIC;
  i INTEGER;
  predicted NUMERIC;
BEGIN
  n := array_length(p_values, 1);
  IF n < 2 THEN
    RETURN jsonb_build_object('slope', 0, 'intercept', COALESCE(p_values[1], 0), 'r_squared', 0, 'n', n);
  END IF;
  
  FOR i IN 1..n LOOP
    sum_x := sum_x + i;
    sum_y := sum_y + p_values[i];
    sum_xy := sum_xy + (i * p_values[i]);
    sum_x2 := sum_x2 + (i * i);
  END LOOP;
  
  mean_y := sum_y / n;
  
  IF (n * sum_x2 - sum_x * sum_x) = 0 THEN
    slope := 0;
    intercept := mean_y;
  ELSE
    slope := (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x);
    intercept := (sum_y - slope * sum_x) / n;
  END IF;
  
  FOR i IN 1..n LOOP
    predicted := intercept + slope * i;
    ss_tot := ss_tot + POWER(p_values[i] - mean_y, 2);
    ss_res := ss_res + POWER(p_values[i] - predicted, 2);
  END LOOP;
  
  IF ss_tot = 0 THEN r_squared := 1;
  ELSE r_squared := GREATEST(0, 1 - (ss_res / ss_tot));
  END IF;
  
  RETURN jsonb_build_object(
    'slope', ROUND(slope::NUMERIC, 4),
    'intercept', ROUND(intercept::NUMERIC, 4),
    'r_squared', ROUND(r_squared::NUMERIC, 4),
    'n', n,
    'latest_value', p_values[n],
    'first_value', p_values[1]
  );
END;
$$;

-- Insert default predictive rules for all tenants
INSERT INTO public.predictive_alert_rules (
  tenant_id, rule_code, rule_name, description, metric_code, dimension_filter,
  lookback_periods, min_data_points, trend_type, breach_threshold, threshold_direction,
  min_slope_trigger, consecutive_periods, severity, suggested_actions, priority
) 
SELECT 
  t.id, 'CASH_RUNWAY_DECLINING', 'Cash Runway Giảm', 
  'Phát hiện xu hướng giảm cash runway trước khi chạm ngưỡng nguy hiểm',
  'cash_runway_days', 'global', 14, 5, 'slope', 30, 'below', -2, 3,
  'warning', '["Review upcoming payables", "Accelerate collections", "Pause non-essential spend"]'::JSONB, 1
FROM public.tenants t
ON CONFLICT (tenant_id, rule_code) DO NOTHING;

INSERT INTO public.predictive_alert_rules (
  tenant_id, rule_code, rule_name, description, metric_code, dimension_filter,
  lookback_periods, min_data_points, trend_type, breach_threshold, threshold_direction,
  min_slope_trigger, consecutive_periods, severity, suggested_actions, priority
) 
SELECT 
  t.id, 'SKU_MARGIN_EROSION', 'SKU Margin Đang Suy Giảm',
  'Phát hiện SKU có biên lợi nhuận đang giảm liên tục',
  'contribution_margin_percent', 'sku', 7, 4, 'slope', 5, 'below', -1.5, 3,
  'warning', '["Review pricing", "Check COGS changes", "Evaluate promotion ROI"]'::JSONB, 2
FROM public.tenants t
ON CONFLICT (tenant_id, rule_code) DO NOTHING;

INSERT INTO public.predictive_alert_rules (
  tenant_id, rule_code, rule_name, description, metric_code, dimension_filter,
  lookback_periods, min_data_points, trend_type, breach_threshold, threshold_direction,
  min_slope_trigger, consecutive_periods, severity, suggested_actions, priority
) 
SELECT 
  t.id, 'MARKETING_CASH_LOCK', 'Marketing Cash Lock Tăng',
  'Phát hiện tiền bị khóa trong marketing đang tăng nhanh',
  'marketing_cash_locked', 'global', 7, 4, 'slope', 500000000, 'above', 20000000, 3,
  'warning', '["Review campaign efficiency", "Check settlement cycles", "Pause underperforming campaigns"]'::JSONB, 3
FROM public.tenants t
ON CONFLICT (tenant_id, rule_code) DO NOTHING;

INSERT INTO public.predictive_alert_rules (
  tenant_id, rule_code, rule_name, description, metric_code, dimension_filter,
  lookback_periods, min_data_points, trend_type, breach_threshold, threshold_direction,
  min_slope_trigger, consecutive_periods, severity, suggested_actions, priority
) 
SELECT 
  t.id, 'DSO_INCREASING', 'DSO Đang Tăng',
  'Phát hiện Days Sales Outstanding đang tăng đều',
  'dso', 'global', 14, 5, 'slope', 45, 'above', 1, 3,
  'warning', '["Review AR aging", "Follow up overdue invoices", "Tighten credit terms"]'::JSONB, 4
FROM public.tenants t
ON CONFLICT (tenant_id, rule_code) DO NOTHING;