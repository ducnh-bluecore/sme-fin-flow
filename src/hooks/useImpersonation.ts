import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

const IMPERSONATION_KEY = 'super_admin_impersonation';

interface ImpersonationState {
  isImpersonating: boolean;
  originalTenantId: string | null;
  impersonatedTenantId: string | null;
  impersonatedTenantName: string | null;
}

export function useImpersonation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const getStoredState = (): ImpersonationState => {
    try {
      const stored = sessionStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading impersonation state:', e);
    }
    return {
      isImpersonating: false,
      originalTenantId: null,
      impersonatedTenantId: null,
      impersonatedTenantName: null,
    };
  };

  const [state, setState] = useState<ImpersonationState>(getStoredState);

  const startImpersonation = useCallback(async (tenantId: string, tenantName: string) => {
    if (!user?.id) return;

    try {
      // Get current active tenant to restore later
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single();

      const originalTenantId = profile?.active_tenant_id;

      // Update active tenant to the impersonated one
      const { error } = await supabase
        .from('profiles')
        .update({ active_tenant_id: tenantId })
        .eq('id', user.id);

      if (error) throw error;

      const newState: ImpersonationState = {
        isImpersonating: true,
        originalTenantId,
        impersonatedTenantId: tenantId,
        impersonatedTenantName: tenantName,
      };

      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(newState));
      setState(newState);

      // Invalidate all queries to refetch with new tenant context
      await queryClient.invalidateQueries();

      toast({
        title: 'Đang xem với tư cách Admin',
        description: `Bạn đang xem tenant: ${tenantName}`,
      });

      return true;
    } catch (error) {
      console.error('Error starting impersonation:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể vào tenant này',
        variant: 'destructive',
      });
      return false;
    }
  }, [user?.id, queryClient, toast]);

  const stopImpersonation = useCallback(async () => {
    if (!user?.id || !state.originalTenantId) return;

    try {
      // Restore original tenant
      const { error } = await supabase
        .from('profiles')
        .update({ active_tenant_id: state.originalTenantId })
        .eq('id', user.id);

      if (error) throw error;

      sessionStorage.removeItem(IMPERSONATION_KEY);
      setState({
        isImpersonating: false,
        originalTenantId: null,
        impersonatedTenantId: null,
        impersonatedTenantName: null,
      });

      // Invalidate all queries
      await queryClient.invalidateQueries();

      toast({
        title: 'Đã thoát chế độ xem',
        description: 'Bạn đã quay về tenant gốc',
      });

      return true;
    } catch (error) {
      console.error('Error stopping impersonation:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thoát chế độ xem',
        variant: 'destructive',
      });
      return false;
    }
  }, [user?.id, state.originalTenantId, queryClient, toast]);

  return {
    isImpersonating: state.isImpersonating,
    impersonatedTenantName: state.impersonatedTenantName,
    impersonatedTenantId: state.impersonatedTenantId,
    startImpersonation,
    stopImpersonation,
  };
}
