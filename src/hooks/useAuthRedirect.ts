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
        return;
      }

      // Check user's onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_status')
        .eq('id', userId)
        .maybeSingle();

      // If onboarding not completed, redirect to onboarding
      if (!profile || profile.onboarding_status === 'pending') {
        navigate('/onboarding/welcome', { replace: true });
        return;
      }

      if (profile.onboarding_status === 'platform_done') {
        // Platform done but tenant not complete -> go to company setup
        navigate('/onboarding/company', { replace: true });
        return;
      }

      // Onboarding complete (completed or skipped) -> go to portal
      navigate('/portal', { replace: true });
    } catch (error) {
      console.error('Error checking user role:', error);
      // Default to portal on error
      navigate('/portal', { replace: true });
    }
  }, [navigate]);

  return { redirectBasedOnRole };
}
