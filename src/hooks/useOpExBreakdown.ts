/**
 * useOpExBreakdown - Hook for detailed Operating Expense breakdown
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses RPC get_opex_breakdown for server-side categorization
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

export interface OpExCategory {
  category: 'salary' | 'rent' | 'utilities' | 'other';
  label: string;
  amount: number;
  percentOfTotal: number;
  source: 'baseline' | 'actual' | 'mixed';
}

export interface OpExBreakdown {
  salary: number;
  rent: number;
  utilities: number;
  other: number;
  total: number;
  
  categories: OpExCategory[];
  
  hasBaselineData: boolean;
  hasActualData: boolean;
  periodLabel: string;
  
  calculationMethod: string;
  calculationDescription: string;
}

export function useOpExBreakdown() {
  const { tenantId, isReady, callRpc } = useTenantQueryBuilder();

  const { data: rpcResult, isLoading } = useQuery({
    queryKey: ['opex-breakdown', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await callRpc('get_opex_breakdown', {
        p_tenant_id: tenantId,
      });

      if (error) {
        console.error('[useOpExBreakdown] RPC error:', error);
        return null;
      }

      return data as unknown as {
        salary: number;
        rent: number;
        utilities: number;
        other: number;
        total: number;
        has_baseline: boolean;
        has_actual: boolean;
        categories: Array<{
          category: string;
          label: string;
          amount: number;
          percent_of_total: number;
          source: string;
        }>;
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const breakdown: OpExBreakdown = rpcResult ? {
    salary: rpcResult.salary || 0,
    rent: rpcResult.rent || 0,
    utilities: rpcResult.utilities || 0,
    other: rpcResult.other || 0,
    total: rpcResult.total || 0,
    categories: (rpcResult.categories || [])
      .filter((c: any) => c.amount > 0)
      .map((c: any) => ({
        category: c.category as OpExCategory['category'],
        label: c.label,
        amount: c.amount,
        percentOfTotal: c.percent_of_total,
        source: c.source as OpExCategory['source'],
      })),
    hasBaselineData: rpcResult.has_baseline,
    hasActualData: rpcResult.has_actual,
    periodLabel: rpcResult.has_baseline ? 'Định mức hàng tháng' : 'Tháng hiện tại',
    calculationMethod: rpcResult.has_baseline ? 'baseline_monthly' : 'actual_current_month',
    calculationDescription: rpcResult.has_baseline
      ? 'Dựa trên định mức chi phí cố định được cấu hình trong Định nghĩa chi phí'
      : 'Dựa trên chi phí thực tế phát sinh trong tháng hiện tại',
  } : {
    salary: 0, rent: 0, utilities: 0, other: 0, total: 0,
    categories: [], hasBaselineData: false, hasActualData: false,
    periodLabel: '', calculationMethod: '', calculationDescription: '',
  };

  return {
    breakdown,
    isLoading,
    hasData: breakdown.total > 0,
  };
}
