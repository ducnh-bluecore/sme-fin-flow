import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useApproveTransfer() {
  const { buildUpdateQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferIds, action }: {
      transferIds: string[];
      action: 'approved' | 'rejected';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      for (const id of transferIds) {
        const { error } = await buildUpdateQuery('state_size_transfer_daily' as any, {
          status: action,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        }).eq('id', id);

        if (error) throw error;
      }
    },
    onSuccess: (_, { action, transferIds }) => {
      queryClient.invalidateQueries({ queryKey: ['si-transfer-by-dest'] });
      queryClient.invalidateQueries({ queryKey: ['size-transfers'] });
      const label = action === 'approved' ? 'Đã duyệt' : 'Đã từ chối';
      toast.success(`${label} ${transferIds.length} đề xuất`);
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}
