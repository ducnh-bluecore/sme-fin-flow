/**
 * useChannelBudgets - Channel budget management
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain MDP/Marketing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

export interface ChannelBudget {
  id: string;
  tenant_id: string;
  channel: string;
  year: number;
  month: number;
  budget_amount: number;
  revenue_target: number;
  target_roas: number;
  max_cpa: number;
  min_contribution_margin: number;
  target_ctr: number;
  target_cvr: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ChannelBudgetInput {
  channel: string;
  year?: number;
  month?: number;
  budget_amount?: number;
  revenue_target?: number;
  target_roas?: number;
  max_cpa?: number;
  min_contribution_margin?: number;
  target_ctr?: number;
  target_cvr?: number;
  is_active?: boolean;
  notes?: string;
}

const DEFAULT_CHANNELS = ['shopee', 'lazada', 'tiktok', 'facebook', 'google', 'website', 'offline'];

export function useChannelBudgets(year?: number, month?: number) {
  const { buildSelectQuery, client, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  
  const currentYear = year || new Date().getFullYear();
  const currentMonth = month || new Date().getMonth() + 1;

  const query = useQuery({
    queryKey: ['channel-budgets', tenantId, currentYear, currentMonth],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await buildSelectQuery('channel_budgets', '*')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .order('channel');
      
      if (error) throw error;
      return ((data || []) as unknown) as ChannelBudget[];
    },
    enabled: !!tenantId && isReady,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: ChannelBudgetInput) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const budgetData = {
        tenant_id: tenantId,
        channel: input.channel.toLowerCase(),
        year: input.year || currentYear,
        month: input.month || currentMonth,
        budget_amount: input.budget_amount ?? 0,
        revenue_target: input.revenue_target ?? 0,
        target_roas: input.target_roas ?? 3,
        max_cpa: input.max_cpa ?? 100000,
        min_contribution_margin: input.min_contribution_margin ?? 15,
        target_ctr: input.target_ctr ?? 1.5,
        target_cvr: input.target_cvr ?? 2,
        is_active: input.is_active ?? true,
        notes: input.notes || null,
      };

      const { data, error } = await client
        .from('channel_budgets')
        .upsert(budgetData, {
          onConflict: 'tenant_id,channel,year,month',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ChannelBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-budgets'] });
      toast.success('Đã lưu cấu hình kênh');
    },
    onError: (error) => {
      console.error('Error saving channel budget:', error);
      toast.error('Lỗi khi lưu cấu hình kênh');
    },
  });

  const bulkUpsertMutation = useMutation({
    mutationFn: async (inputs: ChannelBudgetInput[]) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const budgetDataArray = inputs.map(input => ({
        tenant_id: tenantId,
        channel: input.channel.toLowerCase(),
        year: input.year || currentYear,
        month: input.month || currentMonth,
        budget_amount: input.budget_amount ?? 0,
        revenue_target: input.revenue_target ?? 0,
        target_roas: input.target_roas ?? 3,
        max_cpa: input.max_cpa ?? 100000,
        min_contribution_margin: input.min_contribution_margin ?? 15,
        target_ctr: input.target_ctr ?? 1.5,
        target_cvr: input.target_cvr ?? 2,
        is_active: input.is_active ?? true,
        notes: input.notes || null,
      }));

      const { data, error } = await client
        .from('channel_budgets')
        .upsert(budgetDataArray, {
          onConflict: 'tenant_id,channel,year,month',
        })
        .select();
      
      if (error) throw error;
      return data as ChannelBudget[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-budgets'] });
      toast.success('Đã lưu tất cả cấu hình kênh');
    },
    onError: (error) => {
      console.error('Error saving channel budgets:', error);
      toast.error('Lỗi khi lưu cấu hình kênh');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('channel_budgets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-budgets'] });
      toast.success('Đã xóa cấu hình kênh');
    },
    onError: (error) => {
      console.error('Error deleting channel budget:', error);
      toast.error('Lỗi khi xóa cấu hình kênh');
    },
  });

  // Get budget for a specific channel
  const getChannelBudget = (channel: string): ChannelBudget | undefined => {
    return query.data?.find(b => b.channel.toLowerCase() === channel.toLowerCase());
  };

  // Get all budgets as a map
  const budgetsMap = new Map<string, ChannelBudget>();
  query.data?.forEach(b => {
    budgetsMap.set(b.channel.toLowerCase(), b);
  });

  return {
    budgets: query.data || [],
    budgetsMap,
    isLoading: query.isLoading,
    error: query.error,
    getChannelBudget,
    upsertBudget: upsertMutation.mutate,
    bulkUpsertBudgets: bulkUpsertMutation.mutate,
    deleteBudget: deleteMutation.mutate,
    isUpdating: upsertMutation.isPending || bulkUpsertMutation.isPending,
    defaultChannels: DEFAULT_CHANNELS,
    currentYear,
    currentMonth,
  };
}
