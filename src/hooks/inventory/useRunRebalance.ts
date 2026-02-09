import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';

export function useRunRebalance() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('inventory-allocation-engine', {
        body: { tenant_id: tenantId, user_id: user?.id, action: 'rebalance' },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inv-rebalance'] });
      queryClient.invalidateQueries({ queryKey: ['inv-rebalance-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['inv-rebalance-latest-run'] });
      toast.success(`Đã tạo ${data.total_suggestions} đề xuất (Push: ${data.push_units} units, Lateral: ${data.lateral_units} units)`);
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}

export function useRunAllocate() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('inventory-allocation-engine', {
        body: { tenant_id: tenantId, user_id: user?.id, action: 'allocate' },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inv-allocation'] });
      toast.success(`Đã tạo ${data.recommendations} đề xuất phân bổ (${data.total_units} units)`);
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}
