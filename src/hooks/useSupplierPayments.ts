import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['supplier-payments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('supplier_payment_schedules' as any)
        .select(`
          *,
          vendor:vendors(id, name)
        `)
        .order('due_date', { ascending: true });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown) as SupplierPaymentSchedule[];
    },
    enabled: !!tenantId && isReady,
  });
};

export const usePaymentOptimization = () => {
  const { data: payments = [], isLoading, error } = useSupplierPayments();

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const pendingPayments = payments.filter(p => p.payment_status === 'pending');

  const dueThisWeek = pendingPayments.filter(p => {
    const dueDate = new Date(p.due_date);
    return dueDate <= nextWeek;
  });

  const dueThisMonth = pendingPayments.filter(p => {
    const dueDate = new Date(p.due_date);
    return dueDate <= nextMonth;
  });

  const overduePayments = pendingPayments.filter(p => {
    const dueDate = new Date(p.due_date);
    return dueDate < today;
  });

  // Calculate early payment opportunities
  const earlyPaymentOpportunities = pendingPayments.filter(p => 
    p.early_payment_discount_percent > 0 && 
    p.early_payment_date && 
    new Date(p.early_payment_date) > today
  );

  const potentialSavings = earlyPaymentOpportunities.reduce(
    (sum, p) => sum + (p.early_payment_discount_amount || 0), 
    0
  );

  const recommendedEarlyPayments = earlyPaymentOpportunities.filter(p => {
    // Recommend if net benefit is positive (discount > opportunity cost)
    const benefit = p.net_benefit ?? (p.early_payment_discount_amount - (p.opportunity_cost || 0));
    return benefit > 0;
  });

  const summary: PaymentOptimizationSummary = {
    totalPayables: pendingPayments.reduce((sum, p) => sum + p.original_amount, 0),
    totalDueThisWeek: dueThisWeek.reduce((sum, p) => sum + p.original_amount, 0),
    totalDueThisMonth: dueThisMonth.reduce((sum, p) => sum + p.original_amount, 0),
    potentialSavings,
    recommendedEarlyPayments,
    overduePayments,
    averageDiscountRate: earlyPaymentOpportunities.length > 0
      ? earlyPaymentOpportunities.reduce((sum, p) => sum + p.early_payment_discount_percent, 0) / earlyPaymentOpportunities.length
      : 0,
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
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (schedule: Omit<SupplierPaymentSchedule, 'id' | 'tenant_id' | 'early_payment_discount_amount' | 'created_at' | 'updated_at' | 'vendor'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client
        .from('supplier_payment_schedules' as any)
        .insert({ ...schedule, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      toast.success('Đã tạo lịch thanh toán');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useUpdatePaymentSchedule = () => {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupplierPaymentSchedule> & { id: string }) => {
      const { data, error } = await client
        .from('supplier_payment_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      toast.success('Đã cập nhật lịch thanh toán');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useMarkAsPaid = () => {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, paid_amount, paid_date, payment_status }: { 
      id: string; 
      paid_amount: number; 
      paid_date: string;
      payment_status: 'paid_early' | 'paid_on_time' | 'paid_late';
    }) => {
      const { data, error } = await client
        .from('supplier_payment_schedules')
        .update({ paid_amount, paid_date, payment_status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      toast.success('Đã ghi nhận thanh toán');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};
