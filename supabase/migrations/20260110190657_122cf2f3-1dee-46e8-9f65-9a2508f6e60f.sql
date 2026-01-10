-- Add dynamic calculation fields to alert_objects
ALTER TABLE public.alert_objects 
ADD COLUMN IF NOT EXISTS sales_velocity numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_of_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_time_days integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS safety_stock integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS reorder_point integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_daily_sales numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS trend_direction text DEFAULT 'stable',
ADD COLUMN IF NOT EXISTS trend_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sale_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS stockout_risk_days integer DEFAULT 0;

-- Add action suggestions to alert_instances
ALTER TABLE public.alert_instances 
ADD COLUMN IF NOT EXISTS suggested_action text,
ADD COLUMN IF NOT EXISTS action_priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS calculation_details jsonb,
ADD COLUMN IF NOT EXISTS auto_action_available boolean DEFAULT false;

-- Create intelligent_alert_rules table for dynamic rule definitions
CREATE TABLE IF NOT EXISTS public.intelligent_alert_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_code text NOT NULL,
  rule_name text NOT NULL,
  rule_category text NOT NULL,
  description text,
  calculation_formula text NOT NULL,
  threshold_type text NOT NULL DEFAULT 'dynamic',
  threshold_config jsonb NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'medium',
  suggested_actions jsonb DEFAULT '[]',
  is_enabled boolean DEFAULT true,
  priority integer DEFAULT 50,
  cooldown_hours integer DEFAULT 24,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, rule_code)
);

-- Enable RLS
ALTER TABLE public.intelligent_alert_rules ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy - users can access their tenant's rules
CREATE POLICY "Tenant rules access" 
ON public.intelligent_alert_rules FOR ALL 
USING (true);

-- Create alert_calculations_log for tracking
CREATE TABLE IF NOT EXISTS public.alert_calculations_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.intelligent_alert_rules(id) ON DELETE SET NULL,
  object_id uuid REFERENCES public.alert_objects(id) ON DELETE CASCADE,
  calculation_type text NOT NULL,
  input_values jsonb NOT NULL,
  output_value numeric,
  threshold_value numeric,
  is_triggered boolean DEFAULT false,
  calculated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for log
ALTER TABLE public.alert_calculations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calculation logs access" 
ON public.alert_calculations_log FOR ALL 
USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_intelligent_rules_tenant ON public.intelligent_alert_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intelligent_rules_category ON public.intelligent_alert_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_alert_calc_log_tenant ON public.alert_calculations_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alert_calc_log_calculated ON public.alert_calculations_log(calculated_at DESC);