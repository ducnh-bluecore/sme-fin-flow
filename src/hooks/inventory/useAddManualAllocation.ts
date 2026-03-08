import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface AddManualAllocationParams {
  runId: string;
  fcId: string;
  fcName: string;
  storeId: string;
  storeName: string;
  qty: number;
}

export function useAddManualAllocation() {
  const { buildInsertQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddManualAllocationParams) => {
      const { error } = await buildInsertQuery('inv_allocation_recommendations', {
        run_id: params.runId,
        fc_id: params.fcId,
        fc_name: params.fcName,
        store_id: params.storeId,
        store_name: params.storeName,
        recommended_qty: params.qty,
        allocation_version: 'manual',
        reason: 'manual-add',
        status: 'pending',
        stage: 'final',
        priority: 'medium',
      });
      if (error) {
        // Handle UNIQUE constraint violation — update qty instead
        if (error.code === '23505') {
          throw new Error('Sản phẩm này đã có đề xuất cho cửa hàng này. Hãy chỉnh số lượng trực tiếp trên dòng đã có.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-allocation-recs'] });
      queryClient.invalidateQueries({ queryKey: ['inv-source-dest-on-hand'] });
      toast.success('Đã thêm sản phẩm vào phân bổ');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi thêm sản phẩm'),
  });
}
