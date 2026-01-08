-- Create capex_projects table for Capital Expenditure projects
CREATE TABLE public.capex_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other', -- infrastructure, technology, equipment, other
  budget NUMERIC NOT NULL DEFAULT 0,
  spent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, in-progress, completed, cancelled
  expected_roi NUMERIC, -- percentage
  actual_roi NUMERIC, -- percentage
  payback_months INTEGER,
  start_date DATE,
  end_date DATE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create investments table for financial investments
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  investment_type TEXT NOT NULL DEFAULT 'deposit', -- deposit, bond, fund, stock, venture, other
  principal_amount NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  expected_return NUMERIC, -- percentage
  actual_return NUMERIC, -- percentage
  maturity_date DATE,
  institution TEXT, -- bank/fund name
  account_number TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, matured, withdrawn, cancelled
  risk_level TEXT DEFAULT 'medium', -- low, medium, high
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.capex_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- RLS policies for capex_projects
CREATE POLICY "Users can view capex projects in their tenant" 
ON public.capex_projects FOR SELECT 
USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can create capex projects in their tenant" 
ON public.capex_projects FOR INSERT 
WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY "Users can update capex projects in their tenant" 
ON public.capex_projects FOR UPDATE 
USING (has_tenant_access(tenant_id));

CREATE POLICY "Admins can delete capex projects in their tenant" 
ON public.capex_projects FOR DELETE 
USING (is_tenant_admin(tenant_id));

-- RLS policies for investments
CREATE POLICY "Users can view investments in their tenant" 
ON public.investments FOR SELECT 
USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can create investments in their tenant" 
ON public.investments FOR INSERT 
WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY "Users can update investments in their tenant" 
ON public.investments FOR UPDATE 
USING (has_tenant_access(tenant_id));

CREATE POLICY "Admins can delete investments in their tenant" 
ON public.investments FOR DELETE 
USING (is_tenant_admin(tenant_id));

-- Create indexes
CREATE INDEX idx_capex_projects_tenant ON public.capex_projects(tenant_id);
CREATE INDEX idx_capex_projects_status ON public.capex_projects(status);
CREATE INDEX idx_capex_projects_category ON public.capex_projects(category);
CREATE INDEX idx_investments_tenant ON public.investments(tenant_id);
CREATE INDEX idx_investments_type ON public.investments(investment_type);
CREATE INDEX idx_investments_status ON public.investments(status);

-- Trigger for updated_at
CREATE TRIGGER update_capex_projects_updated_at
BEFORE UPDATE ON public.capex_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investments_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();