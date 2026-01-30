import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { toast } from 'sonner';

export interface Investment {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  investment_type: string;
  principal_amount: number;
  current_value: number;
  expected_return: number | null;
  actual_return: number | null;
  maturity_date: string | null;
  institution: string | null;
  account_number: string | null;
  status: string;
  risk_level: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InvestmentInsert = Omit<Investment, 'id' | 'created_at' | 'updated_at'>;
export type InvestmentUpdate = Partial<InvestmentInsert>;

export function useInvestments() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['investments', tenantId],
    queryFn: async (): Promise<Investment[]> => {
      if (!tenantId) return [];

      let query = client
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useInvestmentMutations() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  const createInvestment = useMutation({
    mutationFn: async (investment: Omit<InvestmentInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client
        .from('investments')
        .insert({ ...investment, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Đã tạo khoản đầu tư');
    },
    onError: (error) => {
      toast.error('Lỗi tạo đầu tư: ' + error.message);
    },
  });

  const updateInvestment = useMutation({
    mutationFn: async ({ id, ...updates }: InvestmentUpdate & { id: string }) => {
      const { data, error } = await client
        .from('investments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Đã cập nhật khoản đầu tư');
    },
    onError: (error) => {
      toast.error('Lỗi cập nhật: ' + error.message);
    },
  });

  const deleteInvestment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('investments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Đã xóa khoản đầu tư');
    },
    onError: (error) => {
      toast.error('Lỗi xóa: ' + error.message);
    },
  });

  return { createInvestment, updateInvestment, deleteInvestment };
}
