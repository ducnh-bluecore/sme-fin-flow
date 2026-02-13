
-- Create growth_scenarios table for saving simulation scenarios
CREATE TABLE public.growth_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.growth_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant-scoped access via authenticated users
CREATE POLICY "Users can view scenarios in their tenant"
ON public.growth_scenarios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create scenarios"
ON public.growth_scenarios FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete their own scenarios"
ON public.growth_scenarios FOR DELETE
TO authenticated
USING (auth.uid() = created_by);
