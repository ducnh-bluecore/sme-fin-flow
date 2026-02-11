import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUpdateStoreCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storeId, capacity }: { storeId: string; capacity: number }) => {
      const { error } = await supabase
        .from('inv_stores')
        .update({ capacity } as any)
        .eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Đã cập nhật sức chứa kho');
      queryClient.invalidateQueries({ queryKey: ['inv-stores'] });
      queryClient.invalidateQueries({ queryKey: ['inv-store-directory-stores'] });
    },
    onError: (err: any) => {
      toast.error(`Lỗi cập nhật: ${err.message}`);
    },
  });
}
