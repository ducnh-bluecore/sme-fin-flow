-- Create SKU profitability cache table for faster loading
CREATE TABLE public.sku_profitability_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT,
  channel TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  revenue NUMERIC(18, 2) DEFAULT 0,
  cogs NUMERIC(18, 2) DEFAULT 0,
  fees NUMERIC(18, 2) DEFAULT 0,
  profit NUMERIC(18, 2) DEFAULT 0,
  margin_percent NUMERIC(8, 2) DEFAULT 0,
  aov NUMERIC(18, 2) DEFAULT 0,
  status TEXT DEFAULT 'profitable',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for upsert operations
CREATE UNIQUE INDEX idx_sku_profitability_unique 
ON public.sku_profitability_cache (tenant_id, period_start, period_end, sku, channel);

-- Create indexes for faster lookups
CREATE INDEX idx_sku_profitability_tenant_period ON public.sku_profitability_cache (tenant_id, period_start, period_end);
CREATE INDEX idx_sku_profitability_channel ON public.sku_profitability_cache (tenant_id, channel);

-- Enable Row Level Security
ALTER TABLE public.sku_profitability_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using tenant_users
CREATE POLICY "Users can view their tenant's SKU profitability cache"
ON public.sku_profitability_cache
FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert to their tenant's SKU profitability cache"
ON public.sku_profitability_cache
FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant's SKU profitability cache"
ON public.sku_profitability_cache
FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant's SKU profitability cache"
ON public.sku_profitability_cache
FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sku_profitability_cache_updated_at
BEFORE UPDATE ON public.sku_profitability_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();