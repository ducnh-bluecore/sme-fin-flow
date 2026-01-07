-- Create table for storing decision analyses
CREATE TABLE public.decision_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  analysis_type TEXT NOT NULL, -- 'make_vs_buy', 'break_even', 'roi', 'npv_irr', 'sensitivity', 'payback'
  title TEXT NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation TEXT,
  ai_insights TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'completed', 'approved', 'archived'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.decision_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view analyses for their tenant"
ON public.decision_analyses
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create analyses for their tenant"
ON public.decision_analyses
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update analyses for their tenant"
ON public.decision_analyses
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own analyses"
ON public.decision_analyses
FOR DELETE
USING (
  created_by = auth.uid() OR
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Indexes
CREATE INDEX idx_decision_analyses_tenant ON public.decision_analyses(tenant_id);
CREATE INDEX idx_decision_analyses_type ON public.decision_analyses(analysis_type);
CREATE INDEX idx_decision_analyses_status ON public.decision_analyses(status);

-- Trigger for updated_at
CREATE TRIGGER update_decision_analyses_updated_at
BEFORE UPDATE ON public.decision_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();