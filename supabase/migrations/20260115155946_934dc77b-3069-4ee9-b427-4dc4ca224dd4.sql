-- Bảng cấu hình ngưỡng khẩn cấp cho Decision Center
CREATE TABLE public.decision_threshold_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Financial Thresholds
  runway_critical_months INTEGER NOT NULL DEFAULT 3,
  runway_warning_months INTEGER NOT NULL DEFAULT 6,
  
  -- Contribution Margin thresholds (%)
  cm_critical_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  cm_warning_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  cm_good_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
  
  -- ROAS thresholds
  roas_critical NUMERIC(5,2) NOT NULL DEFAULT 1,
  roas_warning NUMERIC(5,2) NOT NULL DEFAULT 2,
  roas_good NUMERIC(5,2) NOT NULL DEFAULT 3,
  
  -- SKU Margin thresholds (%)
  sku_stop_margin_percent NUMERIC(5,2) NOT NULL DEFAULT -5,
  sku_critical_margin_percent NUMERIC(5,2) NOT NULL DEFAULT -15,
  sku_review_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 5,
  
  -- Days thresholds
  dso_warning_days INTEGER NOT NULL DEFAULT 45,
  dso_critical_days INTEGER NOT NULL DEFAULT 60,
  ccc_warning_days INTEGER NOT NULL DEFAULT 60,
  ccc_critical_days INTEGER NOT NULL DEFAULT 90,
  inventory_warning_days INTEGER NOT NULL DEFAULT 60,
  inventory_critical_days INTEGER NOT NULL DEFAULT 90,
  
  -- AR thresholds (%)
  ar_overdue_warning_percent NUMERIC(5,2) NOT NULL DEFAULT 15,
  ar_overdue_critical_percent NUMERIC(5,2) NOT NULL DEFAULT 30,
  ar_aging_90_critical_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  
  -- Channel Fee thresholds (%)
  channel_fee_warning_percent NUMERIC(5,2) NOT NULL DEFAULT 15,
  channel_fee_critical_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
  
  -- Gross Margin thresholds (%)
  gross_margin_warning_percent NUMERIC(5,2) NOT NULL DEFAULT 25,
  gross_margin_critical_percent NUMERIC(5,2) NOT NULL DEFAULT 15,
  
  -- Impact Amount thresholds for approval workflow
  impact_approval_threshold NUMERIC(15,2) NOT NULL DEFAULT 50000000,
  
  -- LTV:CAC thresholds
  ltv_cac_critical NUMERIC(5,2) NOT NULL DEFAULT 1,
  ltv_cac_warning NUMERIC(5,2) NOT NULL DEFAULT 2,
  ltv_cac_good NUMERIC(5,2) NOT NULL DEFAULT 3,
  
  -- Customer churn risk (days since last purchase)
  customer_risk_medium_days INTEGER NOT NULL DEFAULT 30,
  customer_risk_high_days INTEGER NOT NULL DEFAULT 60,
  customer_risk_critical_days INTEGER NOT NULL DEFAULT 90,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_tenant_threshold_config UNIQUE (tenant_id)
);

-- Enable RLS
ALTER TABLE public.decision_threshold_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies using tenant_users table
CREATE POLICY "Users can view their tenant's threshold config"
ON public.decision_threshold_configs FOR SELECT
USING (tenant_id IN (
  SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
));

CREATE POLICY "Admins can manage threshold configs"
ON public.decision_threshold_configs FOR ALL
USING (tenant_id IN (
  SELECT tu.tenant_id FROM public.tenant_users tu 
  WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
));

-- Auto-update trigger
CREATE TRIGGER update_decision_threshold_configs_updated_at
BEFORE UPDATE ON public.decision_threshold_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index
CREATE INDEX idx_decision_threshold_configs_tenant ON public.decision_threshold_configs(tenant_id);