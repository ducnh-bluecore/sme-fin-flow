-- Create marketing_expenses table
CREATE TABLE IF NOT EXISTS public.marketing_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  expense_date DATE NOT NULL,
  channel VARCHAR(100) NOT NULL,
  campaign_name VARCHAR(500),
  campaign_id VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, channel, campaign_id, expense_date)
);

ALTER TABLE public.marketing_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view marketing expenses"
ON public.marketing_expenses FOR SELECT
USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "Users can insert marketing expenses"
ON public.marketing_expenses FOR INSERT
WITH CHECK (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

-- Create inventory_levels table
CREATE TABLE IF NOT EXISTS public.inventory_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(500),
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  location VARCHAR(255),
  warehouse_id VARCHAR(100),
  unit_cost DECIMAL(15,4),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku, warehouse_id)
);

ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory"
ON public.inventory_levels FOR SELECT
USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "Users can insert inventory"
ON public.inventory_levels FOR INSERT
WITH CHECK (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));