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

        // Try rebalance table first
        const { error: rebalErr } = await buildUpdateQuery('inv_rebalance_suggestions', updateData).eq('id', id);
        
        if (rebalErr) {
          // Try allocation table - use recommended_qty field
          const allocUpdate: Record<string, any> = {
            status: action,
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
          };
          if (action === 'approved' && editedQty && id in editedQty) {
            allocUpdate.recommended_qty = editedQty[id];
          }
          const { error: allocErr } = await buildUpdateQuery('inv_allocation_recommendations', allocUpdate).eq('id', id);
          if (allocErr) throw allocErr;
        }
      }
    },
    onSuccess: (_, { action, suggestionIds }) => {
      queryClient.invalidateQueries({ queryKey: ['inv-rebalance-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['inv-allocation-recs'] });
      const label = action === 'approved' ? 'Đã duyệt' : 'Đã từ chối';
      toast.success(`${label} ${suggestionIds.length} đề xuất`);
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}
