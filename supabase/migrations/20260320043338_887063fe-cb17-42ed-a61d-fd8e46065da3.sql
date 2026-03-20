
-- Fix forecast_revenue_cohort_based to use SECURITY DEFINER
-- This is needed because cdp_orders has RLS and the user may not have user_roles entries

-- Fix the 6-arg version
ALTER FUNCTION public.forecast_revenue_cohort_based(uuid, integer, numeric, numeric, numeric, date) SECURITY DEFINER;

-- Fix the 5-arg wrapper
ALTER FUNCTION public.forecast_revenue_cohort_based(uuid, integer, numeric, numeric, numeric) SECURITY DEFINER;

-- Also fix the broken RLS policy on cdp_orders
-- Current policy references cdp_orders in its own subquery and requires user_roles
DROP POLICY IF EXISTS "Users can manage cdp_orders in their tenant" ON public.cdp_orders;

CREATE POLICY "Users can manage cdp_orders in their tenant"
ON public.cdp_orders
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.is_active = true
  )
);
