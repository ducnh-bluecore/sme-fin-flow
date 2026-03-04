import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransferLine {
  fcId: string;
  fcName: string;
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  qty: number;
}

export function useCreateManualTransfer() {
  const { tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lines: TransferLine[]) => {
      const { data: { user } } = await supabase.auth.getUser();

      const rows = lines.map(l => ({
        tenant_id: tenantId!,
        fc_id: l.fcId,
        fc_name: l.fcName,
        from_store_id: l.fromStoreId,
        from_store_name: l.fromStoreName,
        to_store_id: l.toStoreId,
        to_store_name: l.toStoreName,
        qty: l.qty,
        reason: 'manual',
        status: 'pending',
        created_by: user?.id,
      }));

      const { error } = await supabase
        .from('inv_manual_transfers' as any)
        .insert(rows as any);

      if (error) throw error;
    },
    onSuccess: (_, lines) => {
      queryClient.invalidateQueries({ queryKey: ['manual-transfers'] });
      toast.success(`Đã tạo ${lines.length} lệnh điều chuyển`);
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}
