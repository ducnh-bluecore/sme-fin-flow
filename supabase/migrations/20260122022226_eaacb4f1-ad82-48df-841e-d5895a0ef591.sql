-- Create feature_decisions table for product governance
CREATE TABLE public.feature_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  system TEXT NOT NULL CHECK (system IN ('FDP', 'MDP', 'Control Tower', 'CDP')),
  route TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('BUILD', 'HOLD', 'DROP', 'PENDING')),
  target_version TEXT CHECK (target_version IN ('v1', 'v2', 'v3')),
  priority TEXT CHECK (priority IN ('P0', 'P1', 'P2')),
  persona TEXT CHECK (persona IN ('CEO', 'CFO', 'Ops', 'Growth', 'CRM')),
  data_entities JSONB DEFAULT '{"entities": [], "grain": null}'::jsonb,
  required_tables JSONB DEFAULT '{"serve_tables": [], "dims": []}'::jsonb,
  dependencies JSONB DEFAULT '{"pipelines": [], "upstream": []}'::jsonb,
  rationale TEXT,
  owner TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, system, route)
);

-- Create page_reviews table for tracking review progress
CREATE TABLE public.page_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  system TEXT NOT NULL CHECK (system IN ('FDP', 'MDP', 'Control Tower', 'CDP')),
  route TEXT NOT NULL,
  reviewed_status TEXT DEFAULT 'pending' CHECK (reviewed_status IN ('pending', 'reviewed', 'blocked')),
  notes TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, system, route)
);

-- Enable RLS
ALTER TABLE public.feature_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for feature_decisions
CREATE POLICY "Users can view feature decisions for their tenant"
ON public.feature_decisions FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert feature decisions for their tenant"
ON public.feature_decisions FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update feature decisions for their tenant"
ON public.feature_decisions FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete feature decisions for their tenant"
ON public.feature_decisions FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS policies for page_reviews
CREATE POLICY "Users can view page reviews for their tenant"
ON public.page_reviews FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert page reviews for their tenant"
ON public.page_reviews FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update page reviews for their tenant"
ON public.page_reviews FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete page reviews for their tenant"
ON public.page_reviews FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_feature_decisions_updated_at
BEFORE UPDATE ON public.feature_decisions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_reviews_updated_at
BEFORE UPDATE ON public.page_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();