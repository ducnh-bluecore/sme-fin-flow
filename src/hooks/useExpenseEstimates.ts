/**
 * useExpenseEstimates - Hook for Variable Cost Estimates
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain FDP/Expenses
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';
import { useMemo } from 'react';

// =============================================================
// TYPES
// =============================================================

export type EstimateCategory = 'marketing' | 'logistics';
export type EstimateStatus = 'draft' | 'locked' | 'closed';

export interface ExpenseEstimate {
  id: string;
  tenantId: string;
  year: number;
  month: number;
  category: EstimateCategory;
  channel: string | null;
  estimatedAmount: number;
  actualAmount: number | null;
  variance: number | null;
  notes: string | null;
  status: EstimateStatus;
  lockedAt: string | null;
  lockedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEstimateInput {
  year: number;
  month: number;
  category: EstimateCategory;
  channel?: string | null;
  estimatedAmount: number;
  notes?: string | null;
}

export interface UpdateEstimateInput {
  id: string;
  estimatedAmount?: number;
  actualAmount?: number | null;
  notes?: string | null;
}

// =============================================================
// LABELS
// =============================================================

export const estimateCategoryLabels: Record<EstimateCategory, string> = {
  marketing: 'Marketing',
  logistics: 'Vận chuyển',
};

export const channelLabels: Record<string, string> = {
  shopee: 'Shopee',
  lazada: 'Lazada',
  tiktok: 'TikTok',
  meta: 'Meta (Facebook)',
  google: 'Google Ads',
  other: 'Kênh khác',
  all: 'Tất cả',
};

// =============================================================
// HELPER
// =============================================================

function mapToEstimate(row: Record<string, unknown>): ExpenseEstimate {
  return {
    id: String(row.id || ''),
    tenantId: String(row.tenant_id || ''),
    year: Number(row.year) || new Date().getFullYear(),
    month: Number(row.month) || 1,
    category: (row.category as EstimateCategory) || 'marketing',
    channel: row.channel ? String(row.channel) : null,
    estimatedAmount: Number(row.estimated_amount) || 0,
    actualAmount: row.actual_amount !== null ? Number(row.actual_amount) : null,
    variance: row.variance !== null ? Number(row.variance) : null,
    notes: row.notes ? String(row.notes) : null,
    status: (row.status as EstimateStatus) || 'draft',
    lockedAt: row.locked_at ? String(row.locked_at) : null,
    lockedBy: row.locked_by ? String(row.locked_by) : null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

// =============================================================
// MAIN HOOK
// =============================================================

export function useExpenseEstimates(year?: number, month?: number) {
  const { tenantId, isReady, buildSelectQuery } = useTenantQueryBuilder();
  const currentYear = year ?? new Date().getFullYear();
  const currentMonth = month ?? (new Date().getMonth() + 1);

  const query = useQuery({
    queryKey: ['expense-estimates', tenantId, currentYear, currentMonth],
    queryFn: async (): Promise<ExpenseEstimate[]> => {
      if (!tenantId) return [];

      const queryBuilder = buildSelectQuery('expense_estimates', '*')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .order('category', { ascending: true })
        .order('channel', { ascending: true });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('[useExpenseEstimates] Error:', error);
        throw error;
      }

      return ((data as unknown) as Record<string, unknown>[] || []).map(mapToEstimate);
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const derived = useMemo(() => {
    const estimates = query.data || [];
    const totalEstimated = estimates.reduce((sum, e) => sum + e.estimatedAmount, 0);
    const totalActual = estimates.reduce((sum, e) => sum + (e.actualAmount || 0), 0);
    const totalVariance = totalActual - totalEstimated;
    const variancePercent = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0;

    const byCategory: Record<EstimateCategory, ExpenseEstimate[]> = {
      marketing: [],
      logistics: [],
    };

    const categoryTotals: Record<EstimateCategory, { estimated: number; actual: number }> = {
      marketing: { estimated: 0, actual: 0 },
      logistics: { estimated: 0, actual: 0 },
    };

    estimates.forEach(e => {
      byCategory[e.category].push(e);
      categoryTotals[e.category].estimated += e.estimatedAmount;
      categoryTotals[e.category].actual += e.actualAmount || 0;
    });

    const dataCompleteness = estimates.length > 0
      ? (estimates.filter(e => e.actualAmount !== null).length / estimates.length) * 100
      : 0;

    return {
      estimates,
      totalEstimated,
      totalActual,
      totalVariance,
      variancePercent,
      byCategory,
      categoryTotals,
      dataCompleteness,
      year: currentYear,
      month: currentMonth,
    };
  }, [query.data, currentYear, currentMonth]);

  return {
    ...query,
    ...derived,
  };
}

// =============================================================
// MUTATIONS
// =============================================================

export function useCreateExpenseEstimate() {
  const queryClient = useQueryClient();
  const { tenantId, buildInsertQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: CreateEstimateInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildInsertQuery('expense_estimates', {
        year: input.year,
        month: input.month,
        category: input.category,
        channel: input.channel || null,
        estimated_amount: input.estimatedAmount,
        notes: input.notes || null,
      })
        .select()
        .single();

      if (error) throw error;
      return mapToEstimate(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-estimates'] });
      toast.success('Đã thêm tạm tính chi phí');
    },
    onError: (error) => {
      console.error('[useCreateExpenseEstimate] Error:', error);
      toast.error('Lỗi khi thêm tạm tính chi phí');
    },
  });
}

export function useUpdateExpenseEstimate() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: UpdateEstimateInput) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      
      if (input.estimatedAmount !== undefined) updates.estimated_amount = input.estimatedAmount;
      if (input.actualAmount !== undefined) updates.actual_amount = input.actualAmount;
      if (input.notes !== undefined) updates.notes = input.notes;

      const { data, error } = await buildUpdateQuery('expense_estimates', updates)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return mapToEstimate(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-estimates'] });
      toast.success('Đã cập nhật tạm tính');
    },
    onError: (error) => {
      console.error('[useUpdateExpenseEstimate] Error:', error);
      toast.error('Lỗi khi cập nhật tạm tính');
    },
  });
}

export function useLockExpenseEstimate() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await buildUpdateQuery('expense_estimates', {
        status: 'locked',
        locked_at: new Date().toISOString(),
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapToEstimate(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-estimates'] });
      toast.success('Đã khóa tạm tính');
    },
    onError: (error) => {
      console.error('[useLockExpenseEstimate] Error:', error);
      toast.error('Lỗi khi khóa tạm tính');
    },
  });
}

export function useDeleteExpenseEstimate() {
  const queryClient = useQueryClient();
  const { buildDeleteQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('expense_estimates')
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-estimates'] });
      toast.success('Đã xóa tạm tính');
    },
    onError: (error) => {
      console.error('[useDeleteExpenseEstimate] Error:', error);
      toast.error('Lỗi khi xóa tạm tính');
    },
  });
}
