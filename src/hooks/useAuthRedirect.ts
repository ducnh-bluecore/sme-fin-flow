import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function useAuthRedirect() {
  const navigate = useNavigate();

  const redirectBasedOnRole = useCallback(async (userId: string) => {
    try {
      // Check if user is super admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        // Super admin -> go to admin dashboard
        navigate('/admin', { replace: true });
      } else {
        // Regular tenant user -> go to portal hub
        navigate('/portal', { replace: true });
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      // Default to portal on error
      navigate('/portal', { replace: true });
    }
  }, [navigate]);

  return { redirectBasedOnRole };
}
