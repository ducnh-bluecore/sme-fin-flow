/**
 * useActiveTenantId - Get active tenant ID for the current user
 * 
 * @architecture Control Plane - Auth/Profile management
 * Uses direct supabase client because:
 * 1. profiles is in public schema
 * 2. This hook PROVIDES the tenantId that other hooks depend on
 * 3. Cannot use useTenantQueryBuilder which requires tenantId
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Simple hook to get the active tenant ID for use in other hooks.
 * Uses the same query key pattern as useActiveTenant for cache coherence.
 * This avoids circular dependencies with TenantContext.
 */
export function useActiveTenantId() {
  return useQuery({
    queryKey: ['active-tenant-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      return profile?.active_tenant_id || null;
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

/**
 * Re-export types from useTenant for convenience
 */
export type { Tenant, TenantUser } from './useTenant';
