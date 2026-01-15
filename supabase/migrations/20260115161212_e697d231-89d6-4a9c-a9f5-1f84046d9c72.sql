-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their tenant thresholds" ON public.decision_threshold_configs;
DROP POLICY IF EXISTS "Users can insert their tenant thresholds" ON public.decision_threshold_configs;
DROP POLICY IF EXISTS "Users can update their tenant thresholds" ON public.decision_threshold_configs;

-- Create new RLS policies that work with the tenant_users table
CREATE POLICY "Users can view their tenant thresholds" 
ON public.decision_threshold_configs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_users.tenant_id = decision_threshold_configs.tenant_id 
    AND tenant_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their tenant thresholds" 
ON public.decision_threshold_configs FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_users.tenant_id = decision_threshold_configs.tenant_id 
    AND tenant_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their tenant thresholds" 
ON public.decision_threshold_configs FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_users.tenant_id = decision_threshold_configs.tenant_id 
    AND tenant_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their tenant thresholds" 
ON public.decision_threshold_configs FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_users.tenant_id = decision_threshold_configs.tenant_id 
    AND tenant_users.user_id = auth.uid()
  )
);