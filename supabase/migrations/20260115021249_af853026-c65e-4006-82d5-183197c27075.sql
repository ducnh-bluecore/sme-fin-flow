-- Create channel_budgets table for channel-specific KPIs and budgets
CREATE TABLE public.channel_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  
  -- Budget targets
  budget_amount NUMERIC DEFAULT 0,
  revenue_target NUMERIC DEFAULT 0,
  
  -- KPI targets
  target_roas NUMERIC DEFAULT 3,
  max_cpa NUMERIC DEFAULT 100000,
  min_contribution_margin NUMERIC DEFAULT 15,
  target_ctr NUMERIC DEFAULT 1.5,
  target_cvr NUMERIC DEFAULT 2,
  
  -- Tracking
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Unique constraint: one budget per channel per month
  UNIQUE(tenant_id, channel, year, month)
);

-- Enable RLS
ALTER TABLE public.channel_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policy using tenant_users (same pattern as promotion_campaigns)
CREATE POLICY "channel_budgets_tenant_access"
ON public.channel_budgets FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_users.tenant_id FROM public.tenant_users
    WHERE tenant_users.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_users.tenant_id FROM public.tenant_users
    WHERE tenant_users.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_channel_budgets_updated_at
BEFORE UPDATE ON public.channel_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_channel_budgets_tenant_month ON public.channel_budgets(tenant_id, year, month);
CREATE INDEX idx_channel_budgets_channel ON public.channel_budgets(channel);