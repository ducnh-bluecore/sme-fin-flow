/**
 * useCashFlowDirect - Cash Flow Direct Method
 * 
 * Migrated to useTenantQueryBuilder (Schema-per-Tenant v1.4.1)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';
import { useCashRunway } from './useCashRunway';

export interface CashFlowDirect {
  id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  period_type: string;
  
  // Operating - Inflows
  cash_from_customers: number;
  cash_from_interest_received: number;
  cash_from_other_operating: number;
  
  // Operating - Outflows
  cash_to_suppliers: number;
  cash_to_employees: number;
  cash_for_rent: number;
  cash_for_utilities: number;
  cash_for_taxes: number;
  cash_for_interest_paid: number;
  cash_for_other_operating: number;
  
  // Computed
  net_cash_operating: number;
  
  // Investing
  cash_from_asset_sales: number;
  cash_for_asset_purchases: number;
  cash_for_investments: number;
  net_cash_investing: number;
  
  // Financing
  cash_from_loans: number;
  cash_from_equity: number;
  cash_for_loan_repayments: number;
  cash_for_dividends: number;
  net_cash_financing: number;
  
  // Summary
  opening_cash_balance: number;
  closing_cash_balance: number;
  
  notes: string | null;
  is_actual: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashFlowSummary {
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  cashConversionRatio: number;
  burnRate: number; // monthly average outflow
  runway: number; // months of cash remaining
}

export const useCashFlowDirect = (periodType?: string) => {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cash-flow-direct', tenantId, periodType],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = buildSelectQuery('cash_flow_direct', '*');

      if (periodType) {
        query = query.eq('period_type', periodType);
      }

      const { data, error } = await query.order('period_start', { ascending: false });

      if (error) throw error;
      return (data as unknown) as CashFlowDirect[];
    },
    enabled: !!tenantId && isReady,
  });
};

/**
 * Cash Flow Analysis Hook - Refactored to use SSOT
 * Now uses useCashRunway for burn rate and runway calculations
 * to ensure consistency across all pages.
 */
export const useCashFlowAnalysis = () => {
  const { data: cashFlows = [], isLoading: cashFlowsLoading, error } = useCashFlowDirect();
  const { data: runwayData, isLoading: runwayLoading } = useCashRunway();
  const { tenantId, callRpc } = useTenantQueryBuilder();

  const isLoading = cashFlowsLoading || runwayLoading;

  // Use RPC for summary aggregation instead of client-side .reduce()
  const { data: summaryFromRpc } = useQuery({
    queryKey: ['cash-flow-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await callRpc('get_cash_flow_summary', {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });

  const summary: CashFlowSummary = {
    totalInflows: Number(summaryFromRpc?.totalInflows) || 0,
    totalOutflows: Number(summaryFromRpc?.totalOutflows) || 0,
    netChange: Number(summaryFromRpc?.netChange) || 0,
    operatingCashFlow: Number(summaryFromRpc?.operatingCashFlow) || 0,
    investingCashFlow: Number(summaryFromRpc?.investingCashFlow) || 0,
    financingCashFlow: Number(summaryFromRpc?.financingCashFlow) || 0,
    cashConversionRatio: 0,
    burnRate: 0,
    runway: 0,
  };

  // Use SSOT for burn rate and runway from useCashRunway
  if (runwayData) {
    summary.burnRate = runwayData.avgMonthlyBurn;
    summary.runway = runwayData.runwayMonths ?? 0;
  }

  // Cash conversion ratio (Operating CF / Net Income approximation)
  if (summary.totalInflows > 0) {
    summary.cashConversionRatio = (summary.operatingCashFlow / summary.totalInflows) * 100;
  }

  // Group by period for charts
  const periodData = cashFlows.map(cf => ({
    period: `${cf.period_start} - ${cf.period_end}`,
    periodStart: cf.period_start,
    operating: cf.net_cash_operating,
    investing: cf.net_cash_investing,
    financing: cf.net_cash_financing,
    netChange: cf.net_cash_operating + cf.net_cash_investing + cf.net_cash_financing,
    closingBalance: cf.closing_cash_balance,
  }));

  return {
    cashFlows,
    summary,
    periodData,
    isLoading,
    error,
  };
};

export const useCreateCashFlowDirect = () => {
  const queryClient = useQueryClient();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (cashFlow: Omit<CashFlowDirect, 'id' | 'tenant_id' | 'net_cash_operating' | 'net_cash_investing' | 'net_cash_financing' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildInsertQuery('cash_flow_direct', cashFlow)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-direct'] });
      toast.success('Đã tạo báo cáo dòng tiền');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useUpdateCashFlowDirect = () => {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CashFlowDirect> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildUpdateQuery('cash_flow_direct', updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-direct'] });
      toast.success('Đã cập nhật báo cáo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useDeleteCashFlowDirect = () => {
  const queryClient = useQueryClient();
  const { buildDeleteQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { error } = await buildDeleteQuery('cash_flow_direct')
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-direct'] });
      toast.success('Đã xóa báo cáo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};
