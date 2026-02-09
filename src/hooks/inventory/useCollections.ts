import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

export interface InvCollection {
  id: string;
  tenant_id: string;
  collection_code: string;
  collection_name: string;
  air_date: string | null;
  is_new_collection: boolean;
  season: string | null;
  created_at: string;
}

export function useCollections() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-collections', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_collections', '*')
        .order('air_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as InvCollection[];
    },
    enabled: isReady,
  });
}

export function useCreateCollection() {
  const { buildInsertQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collection: Omit<InvCollection, 'id' | 'tenant_id' | 'created_at'>) => {
      const { error } = await buildInsertQuery('inv_collections', collection);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-collections'] });
      toast.success('Đã tạo BST mới');
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });
}
