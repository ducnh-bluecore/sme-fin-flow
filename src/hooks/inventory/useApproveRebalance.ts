import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useApproveRebalance() {
  const { buildUpdateQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionIds, action, editedQty }: { 
      suggestionIds: string[]; 
      action: 'approved' | 'rejected';
      editedQty?: Record<string, number>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const id of suggestionIds) {
        const updateData: Record<string, any> = {
          status: action,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        };

        // If user edited qty before approving, update it
        if (action === 'approved' && editedQty && id in editedQty) {
          updateData.qty = editedQty[id];
        }

        const { error } = await buildUpdateQuery('inv_rebalance_suggestions', updateData).eq('id', id);
        
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
