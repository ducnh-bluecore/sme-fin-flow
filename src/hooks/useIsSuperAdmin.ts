import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useIsSuperAdmin() {
  const { user, loading: authLoading } = useAuth();

  const { data: isSuperAdmin = false, isLoading } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
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
      
      console.log('Super admin check:', { userId: user.id, data, isSuperAdmin: !!data });
      return !!data;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { isSuperAdmin, isLoading: isLoading || authLoading };
}
