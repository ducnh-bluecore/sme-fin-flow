import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useApproveManualTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: 'approved' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser();

      for (const id of ids) {
        const { error } = await supabase
          .from('inv_manual_transfers' as any)
          .update({
            status: action,
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
          } as any)
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: (_, { action, ids }) => {
      queryClient.invalidateQueries({ queryKey: ['manual-transfers'] });
      toast.success(`${action === 'approved' ? 'Đã duyệt' : 'Đã từ chối'} ${ids.length} lệnh`);
    },
    onError: (err: any) => toast.error(err.message),
  });
}
