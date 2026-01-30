-- Create user_data_assessments table for storing survey responses and import plans
CREATE TABLE public.user_data_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  module_key TEXT NOT NULL, -- 'fdp', 'mdp', 'cdp', 'control_tower'
  
  -- Survey responses (JSONB)
  survey_responses JSONB DEFAULT '{}',
  -- Example: {
  --   "data_sources": ["shopee", "lazada", "excel"],
  --   "data_types": ["orders", "customers", "expenses"],
  --   "data_format": "mixed"
  -- }
  
  -- Generated import plan (JSONB)
  import_plan JSONB DEFAULT '{}',
  -- Example: {
  --   "connect": ["shopee", "lazada"],
  --   "import": ["expenses", "marketing_expenses"],
  --   "skip": ["channel_analytics"],
  --   "existing": []
  -- }
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one assessment per user per tenant per module
  UNIQUE(user_id, tenant_id, module_key)
);

-- Add indexes for common queries
CREATE INDEX idx_user_data_assessments_user_tenant ON public.user_data_assessments(user_id, tenant_id);
CREATE INDEX idx_user_data_assessments_status ON public.user_data_assessments(status);
CREATE INDEX idx_user_data_assessments_module ON public.user_data_assessments(module_key);

-- Enable RLS
ALTER TABLE public.user_data_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own assessments"
  ON public.user_data_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessments"
  ON public.user_data_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessments"
  ON public.user_data_assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assessments"
  ON public.user_data_assessments FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_data_assessments_updated_at
  BEFORE UPDATE ON public.user_data_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();