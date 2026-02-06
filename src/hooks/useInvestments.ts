/**
 * useInvestments - Investment management
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['investments', tenantId],
    queryFn: async (): Promise<Investment[]> => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('investments', '*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as Investment[]) || [];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useInvestmentMutations() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, buildUpdateQuery, buildDeleteQuery, tenantId } = useTenantQueryBuilder();

  const createInvestment = useMutation({
    mutationFn: async (investment: Omit<InvestmentInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildInsertQuery('investments', investment)
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
      const { data, error } = await buildUpdateQuery('investments', updates)
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
      const { error } = await buildDeleteQuery('investments')
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
