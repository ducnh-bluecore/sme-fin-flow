-- Create formula_settings table to store configurable formula parameters per tenant
CREATE TABLE public.formula_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Financial Period Settings
  fiscal_year_days INTEGER DEFAULT 365, -- 360 or 365
  fiscal_year_start_month INTEGER DEFAULT 1, -- 1-12
  
  -- Working Capital Parameters (DSO/DIO/DPO)
  dso_calculation_days INTEGER DEFAULT 365,
  dio_calculation_days INTEGER DEFAULT 365,
  dpo_calculation_days INTEGER DEFAULT 365,
  
  -- AR Aging Buckets (in days)
  ar_bucket_1 INTEGER DEFAULT 30,
  ar_bucket_2 INTEGER DEFAULT 60,
  ar_bucket_3 INTEGER DEFAULT 90,
  ar_bucket_4 INTEGER DEFAULT 120,
  
  -- Industry Benchmarks
  target_gross_margin NUMERIC(5,2) DEFAULT 30.00, -- percentage
  target_net_margin NUMERIC(5,2) DEFAULT 10.00, -- percentage
  target_dso INTEGER DEFAULT 45, -- days
  target_collection_rate NUMERIC(5,2) DEFAULT 95.00, -- percentage
  
  -- Cash Management
  min_cash_runway_months INTEGER DEFAULT 3,
  safe_cash_runway_months INTEGER DEFAULT 6,
  cash_reserve_percentage NUMERIC(5,2) DEFAULT 20.00,
  
  -- Commission Rates by Channel (JSONB for flexibility)
  channel_commission_rates JSONB DEFAULT '{
    "shopee": 5.0,
    "lazada": 5.0,
    "tiktok": 4.0,
    "tiki": 6.0,
    "sendo": 5.0,
    "offline": 0.0,
    "b2b": 2.0,
    "website": 3.0
  }'::jsonb,
  
  -- Forecasting Parameters
  forecast_confidence_level NUMERIC(5,2) DEFAULT 95.00, -- percentage
  forecast_default_growth_rate NUMERIC(5,2) DEFAULT 5.00, -- percentage
  forecast_collection_rate NUMERIC(5,2) DEFAULT 85.00, -- percentage
  
  -- Payment Terms Defaults
  default_payment_terms_ar INTEGER DEFAULT 30, -- days
  default_payment_terms_ap INTEGER DEFAULT 30, -- days
  
  -- Depreciation Defaults
  default_depreciation_years INTEGER DEFAULT 5,
  
  -- Tax Rates
  vat_rate NUMERIC(5,2) DEFAULT 10.00, -- percentage
  corporate_tax_rate NUMERIC(5,2) DEFAULT 20.00, -- percentage
  
  -- Custom Parameters (for additional flexibility)
  custom_parameters JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.formula_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view formula settings for their tenants"
ON public.formula_settings
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage formula settings"
ON public.formula_settings
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'owner'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_formula_settings_updated_at
BEFORE UPDATE ON public.formula_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.formula_settings IS 'Stores configurable formula parameters per tenant for customizing financial calculations';