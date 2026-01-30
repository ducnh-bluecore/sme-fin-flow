import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * useIsSuperAdmin - Check if current user has admin role
 * 
 * Note: This hook intentionally uses the global supabase client
 * because user_roles is a global table, not tenant-specific.
 */
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
