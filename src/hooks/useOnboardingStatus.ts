/**
 * useOnboardingStatus - Check and update onboarding status for profile and tenant
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  OnboardingStatus, 
  TenantOnboardingStatus, 
  UserRole, 
  CompanyScale, 
  Industry 
} from '@/lib/onboardingConfig';

export interface ProfileOnboarding {
  id: string;
  onboarding_status: OnboardingStatus;
  user_role: UserRole | null;
  onboarding_completed_at: string | null;
}

export interface TenantOnboarding {
  id: string;
  name: string;
  onboarding_status: TenantOnboardingStatus;
  industry: Industry | null;
  company_scale: CompanyScale | null;
  monthly_revenue_range: string | null;
  data_sources: string[];
}

// Fetch current user's onboarding status
export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['onboarding-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch profile onboarding data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, onboarding_status, user_role, onboarding_completed_at')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch active tenant onboarding data
      const { data: tenantUser, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select(`
          tenant_id,
          tenant:tenants(
            id,
            name,
            onboarding_status,
            industry,
            company_scale,
            monthly_revenue_range,
            data_sources
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (tenantUserError && tenantUserError.code !== 'PGRST116') {
        throw tenantUserError;
      }

      return {
        profile: profile as ProfileOnboarding | null,
        tenant: tenantUser?.tenant as TenantOnboarding | null,
        userId: user.id,
      };
    },
  });
}

// Update profile onboarding status
export function useUpdateProfileOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      onboarding_status?: OnboardingStatus;
      user_role?: UserRole;
      onboarding_completed_at?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update tenant onboarding status
export function useUpdateTenantOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      tenantId, 
      data 
    }: { 
      tenantId: string; 
      data: {
        onboarding_status?: TenantOnboardingStatus;
        industry?: Industry;
        company_scale?: CompanyScale;
        monthly_revenue_range?: string;
        data_sources?: string[];
      };
    }) => {
      const { error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', tenantId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['active-tenant'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Check if user needs onboarding
export function useNeedsOnboarding() {
  const { data, isLoading } = useOnboardingStatus();

  const needsPlatformOnboarding = data?.profile?.onboarding_status === 'pending';
  const needsTenantOnboarding = 
    data?.profile?.onboarding_status === 'platform_done' && 
    data?.tenant?.onboarding_status === 'pending';
  
  const isOnboardingComplete = 
    data?.profile?.onboarding_status === 'completed' || 
    data?.profile?.onboarding_status === 'skipped';

  return {
    isLoading,
    needsPlatformOnboarding,
    needsTenantOnboarding,
    isOnboardingComplete,
    profile: data?.profile,
    tenant: data?.tenant,
  };
}
