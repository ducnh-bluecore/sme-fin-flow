import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useApproveRebalance() {
  const { buildUpdateQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionIds, action }: { suggestionIds: string[]; action: 'approved' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const id of suggestionIds) {
        const { error } = await buildUpdateQuery('inv_rebalance_suggestions', {
          status: action,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        }).eq('id', id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { action, suggestionIds }) => {
      queryClient.invalidateQueries({ queryKey: ['inv-rebalance-suggestions'] });
      const label = action === 'approved' ? 'Đã duyệt' : 'Đã từ chối';
      toast.success(`${label} ${suggestionIds.length} đề xuất`);
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}
