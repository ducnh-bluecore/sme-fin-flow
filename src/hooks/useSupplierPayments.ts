/**
 * useSupplierPayments - Supplier payment schedule management
 * 
 * @architecture Schema-per-Tenant v1.4.1 / DB-First SSOT
 * Summary aggregation via get_supplier_payment_optimization RPC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

export interface SupplierPaymentSchedule {
  id: string;
  tenant_id: string;
  vendor_id: string;
  bill_id: string | null;
  original_amount: number;
  due_date: string;
  early_payment_date: string | null;
  early_payment_discount_percent: number;
  early_payment_discount_amount: number;
  net_amount_if_early: number | null;
  recommended_action: string | null;
  cash_available_on_early_date: number | null;
  opportunity_cost: number | null;
  net_benefit: number | null;
  payment_status: string;
  paid_date: string | null;
  paid_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor?: {
    id: string;
    name: string;
  };
}

export interface PaymentOptimizationSummary {
  totalPayables: number;
  totalDueThisWeek: number;
  totalDueThisMonth: number;
  potentialSavings: number;
  recommendedEarlyPayments: SupplierPaymentSchedule[];
  overduePayments: SupplierPaymentSchedule[];
  averageDiscountRate: number;
}

export const useSupplierPayments = () => {
  const { tenantId, isReady, buildSelectQuery } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['supplier-payments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const query = buildSelectQuery('supplier_payment_schedules' as any, `
          *,
          vendor:vendors(id, name)
        `)
        .order('due_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown) as SupplierPaymentSchedule[];
    },
    enabled: !!tenantId && isReady,
  });
};

export const usePaymentOptimization = () => {
  const { data: payments = [], isLoading, error } = useSupplierPayments();
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  // DB-First: Get aggregated summary from RPC
  const { data: dbSummary } = useQuery({
    queryKey: ['supplier-payment-optimization', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await callRpc('get_supplier_payment_optimization', {
        p_tenant_id: tenantId,
      });
      if (error) {
        console.error('[usePaymentOptimization] RPC error:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!tenantId && isReady,
  });

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Filtering for lists still done on FE (need actual records, not aggregates)
  const pendingPayments = payments.filter(p => p.payment_status === 'pending');
  const dueThisWeek = pendingPayments.filter(p => new Date(p.due_date) <= nextWeek);
  const dueThisMonth = pendingPayments.filter(p => new Date(p.due_date) <= nextMonth);
  const overduePayments = pendingPayments.filter(p => new Date(p.due_date) < today);

  const recommendedEarlyPayments = pendingPayments.filter(p => 
    p.early_payment_discount_percent > 0 && 
    p.early_payment_date && 
    new Date(p.early_payment_date) > today &&
    (p.net_benefit ?? (p.early_payment_discount_amount - (p.opportunity_cost || 0))) > 0
  );

  // Use DB-computed summary values
  const summary: PaymentOptimizationSummary = {
    totalPayables: Number(dbSummary?.total_payables) || 0,
    totalDueThisWeek: Number(dbSummary?.total_due_this_week) || 0,
    totalDueThisMonth: Number(dbSummary?.total_due_this_month) || 0,
    potentialSavings: Number(dbSummary?.potential_savings) || 0,
    recommendedEarlyPayments,
    overduePayments,
    averageDiscountRate: Number(dbSummary?.avg_discount_rate) || 0,
  };

  return {
    payments,
    pendingPayments,
    dueThisWeek,
    dueThisMonth,
    summary,
    isLoading,
    error,
  };
};

export const useCreatePaymentSchedule = () => {
  const queryClient = useQueryClient();
  const { tenantId, buildInsertQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (schedule: Omit<SupplierPaymentSchedule, 'id' | 'tenant_id' | 'early_payment_discount_amount' | 'created_at' | 'updated_at' | 'vendor'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildInsertQuery('supplier_payment_schedules' as any, schedule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payment-optimization'] });
      toast.success('Đã tạo lịch thanh toán');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useUpdatePaymentSchedule = () => {
  const queryClient = useQueryClient();
  const { buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupplierPaymentSchedule> & { id: string }) => {
      const { data, error } = await buildUpdateQuery('supplier_payment_schedules' as any, updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payment-optimization'] });
      toast.success('Đã cập nhật lịch thanh toán');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useMarkAsPaid = () => {
  const queryClient = useQueryClient();
  const { buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, paid_amount, paid_date, payment_status }: { 
      id: string; 
      paid_amount: number; 
      paid_date: string;
      payment_status: 'paid_early' | 'paid_on_time' | 'paid_late';
    }) => {
      const { data, error } = await buildUpdateQuery('supplier_payment_schedules' as any, { paid_amount, paid_date, payment_status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payment-optimization'] });
      toast.success('Đã ghi nhận thanh toán');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};
