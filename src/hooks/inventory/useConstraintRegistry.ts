import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';

export interface ConstraintItem {
  id: string;
  constraint_key: string;
  constraint_value: Record<string, any>;
  description: string;
  is_active: boolean;
  version: number;
  updated_by: string | null;
  updated_at: string;
}

export function useConstraintRegistry() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-constraints', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_constraint_registry', '*')
        .order('constraint_key');
      if (error) throw error;
      return (data || []) as unknown as ConstraintItem[];
    },
    enabled: isReady,
  });
}

export function useUpdateConstraint() {
  const { buildUpdateQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, constraint_value, is_active }: { id: string; constraint_value?: Record<string, any>; is_active?: boolean }) => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (constraint_value !== undefined) updates.constraint_value = constraint_value;
      if (is_active !== undefined) updates.is_active = is_active;

      const { error } = await buildUpdateQuery('inv_constraint_registry', updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-constraints'] });
      toast.success('Đã cập nhật tham số');
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}
