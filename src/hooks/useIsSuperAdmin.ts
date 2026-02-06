/**
 * useIsSuperAdmin - Check if current user has admin role
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * NOTE: This is a CONTROL PLANE hook for authorization.
 * Uses direct supabase client because:
 * 1. user_roles is a PLATFORM table (not tenant-specific)
 * 2. Super admin status is cross-tenant privilege
 * 3. This check runs before tenant context is established
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
export function useIsSuperAdmin() {
  const { user, loading: authLoading } = useAuth();

  const { data: isSuperAdmin = false, isLoading } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // user_roles is a global table - use base client
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error) {
        console.error('Error checking super admin status:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { isSuperAdmin, isLoading: isLoading || authLoading };
}
