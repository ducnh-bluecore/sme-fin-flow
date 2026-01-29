/**
 * useExpenseBaselines - Hook for Fixed Cost Baselines
 * 
 * Manages expense_baselines table for CFO-defined recurring costs
 * like salary, rent, utilities that don't change monthly.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';
import { useMemo } from 'react';

// =============================================================
// TYPES
// =============================================================

export type BaselineCategory = 'salary' | 'rent' | 'utilities' | 'other';

export interface ExpenseBaseline {
  id: string;
  tenantId: string;
  category: BaselineCategory;
  name: string;
  monthlyAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  paymentDueDay: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBaselineInput {
  category: BaselineCategory;
  name: string;
  monthlyAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  paymentDueDay?: number | null;
  notes?: string | null;
}

export interface UpdateBaselineInput {
  id: string;
  category?: BaselineCategory;
  name?: string;
  monthlyAmount?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  paymentDueDay?: number | null;
  notes?: string | null;
}

// =============================================================
// CATEGORY LABELS
// =============================================================

export const baselineCategoryLabels: Record<BaselineCategory, string> = {
  salary: 'Lương nhân viên',
  rent: 'Thuê mặt bằng',
  utilities: 'Điện nước',
  other: 'Chi phí cố định khác',
};

export const baselineCategoryColors: Record<BaselineCategory, string> = {
  salary: 'hsl(var(--chart-1))',
  rent: 'hsl(var(--chart-2))',
  utilities: 'hsl(var(--chart-3))',
  other: 'hsl(var(--chart-4))',
};

// =============================================================
// HELPER - Map DB row to typed object
// =============================================================

function mapToBaseline(row: Record<string, unknown>): ExpenseBaseline {
  return {
    id: String(row.id || ''),
    tenantId: String(row.tenant_id || ''),
    category: (row.category as BaselineCategory) || 'other',
    name: String(row.name || ''),
    monthlyAmount: Number(row.monthly_amount) || 0,
    effectiveFrom: String(row.effective_from || ''),
    effectiveTo: row.effective_to ? String(row.effective_to) : null,
    paymentDueDay: row.payment_due_day ? Number(row.payment_due_day) : null,
    notes: row.notes ? String(row.notes) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

// =============================================================
// MAIN HOOK
// =============================================================

export function useExpenseBaselines() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const today = new Date().toISOString().split('T')[0];

  const query = useQuery({
    queryKey: ['expense-baselines', tenantId],
    queryFn: async (): Promise<ExpenseBaseline[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('expense_baselines')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('[useExpenseBaselines] Error:', error);
        throw error;
      }

      return (data || []).map(mapToBaseline);
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Derived data
  const derived = useMemo(() => {
    const baselines = query.data || [];
    
    // Filter to only active baselines (effective today)
    const activeBaselines = baselines.filter(b => {
      const fromOk = b.effectiveFrom <= today;
      const toOk = !b.effectiveTo || b.effectiveTo >= today;
      return fromOk && toOk;
    });

    // Calculate totals
    const totalMonthlyFixed = activeBaselines.reduce((sum, b) => sum + b.monthlyAmount, 0);

    // Group by category
    const byCategory: Record<BaselineCategory, ExpenseBaseline[]> = {
      salary: [],
      rent: [],
      utilities: [],
      other: [],
    };

    const categoryTotals: Record<BaselineCategory, number> = {
      salary: 0,
      rent: 0,
      utilities: 0,
      other: 0,
    };

    activeBaselines.forEach(b => {
      byCategory[b.category].push(b);
      categoryTotals[b.category] += b.monthlyAmount;
    });

    return {
      baselines,
      activeBaselines,
      totalMonthlyFixed,
      byCategory,
      categoryTotals,
    };
  }, [query.data, today]);

  return {
    ...query,
    ...derived,
  };
}

// =============================================================
// MUTATIONS
// =============================================================

export function useCreateExpenseBaseline() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (input: CreateBaselineInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('expense_baselines')
        .insert({
          tenant_id: tenantId,
          category: input.category,
          name: input.name,
          monthly_amount: input.monthlyAmount,
          effective_from: input.effectiveFrom,
          effective_to: input.effectiveTo || null,
          payment_due_day: input.paymentDueDay || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapToBaseline(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-baselines'] });
      toast.success('Đã thêm chi phí cố định');
    },
    onError: (error) => {
      console.error('[useCreateExpenseBaseline] Error:', error);
      toast.error('Lỗi khi thêm chi phí cố định');
    },
  });
}

export function useUpdateExpenseBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBaselineInput) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      
      if (input.category !== undefined) updates.category = input.category;
      if (input.name !== undefined) updates.name = input.name;
      if (input.monthlyAmount !== undefined) updates.monthly_amount = input.monthlyAmount;
      if (input.effectiveFrom !== undefined) updates.effective_from = input.effectiveFrom;
      if (input.effectiveTo !== undefined) updates.effective_to = input.effectiveTo;
      if (input.paymentDueDay !== undefined) updates.payment_due_day = input.paymentDueDay;
      if (input.notes !== undefined) updates.notes = input.notes;

      const { data, error } = await supabase
        .from('expense_baselines')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return mapToBaseline(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-baselines'] });
      toast.success('Đã cập nhật chi phí cố định');
    },
    onError: (error) => {
      console.error('[useUpdateExpenseBaseline] Error:', error);
      toast.error('Lỗi khi cập nhật chi phí cố định');
    },
  });
}

export function useDeleteExpenseBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_baselines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-baselines'] });
      toast.success('Đã xóa chi phí cố định');
    },
    onError: (error) => {
      console.error('[useDeleteExpenseBaseline] Error:', error);
      toast.error('Lỗi khi xóa chi phí cố định');
    },
  });
}
