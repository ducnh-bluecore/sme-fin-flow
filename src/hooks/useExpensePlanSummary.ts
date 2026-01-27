/**
 * useExpensePlanSummary - Budget vs Actual Summary
 * 
 * Combines expense_baselines (fixed) and expense_estimates (variable)
 * to provide a unified view of planned vs actual expenses.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useMemo } from 'react';

// =============================================================
// TYPES
// =============================================================

export interface ExpensePlanSummary {
  tenantId: string;
  year: number;
  month: number;
  fixedBaseline: number;
  variableEstimated: number;
  variableActual: number;
  totalPlanned: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  dataCompleteness: number;
}

// =============================================================
// HOOK
// =============================================================

export function useExpensePlanSummary(months: number = 6) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const now = new Date();

  const query = useQuery({
    queryKey: ['expense-plan-summary', tenantId, months],
    queryFn: async (): Promise<ExpensePlanSummary[]> => {
      if (!tenantId) return [];

      // Query the view
      const { data, error } = await supabase
        .from('v_expense_plan_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(months);

      if (error) {
        console.error('[useExpensePlanSummary] Error:', error);
        throw error;
      }

      return (data || []).map(row => ({
        tenantId: String(row.tenant_id || ''),
        year: Number(row.year) || now.getFullYear(),
        month: Number(row.month) || (now.getMonth() + 1),
        fixedBaseline: Number(row.fixed_baseline) || 0,
        variableEstimated: Number(row.variable_estimated) || 0,
        variableActual: Number(row.variable_actual) || 0,
        totalPlanned: Number(row.total_planned) || 0,
        totalActual: Number(row.total_actual) || 0,
        variance: Number(row.variance) || 0,
        variancePercent: row.total_planned > 0 
          ? (Number(row.variance) / Number(row.total_planned)) * 100 
          : 0,
        dataCompleteness: 100, // Will be calculated if needed
      }));
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Derived data for current month
  const derived = useMemo(() => {
    const summaries = query.data || [];
    
    const currentMonth = summaries.find(s => 
      s.year === now.getFullYear() && s.month === (now.getMonth() + 1)
    );

    // YTD totals
    const ytdSummaries = summaries.filter(s => 
      s.year === now.getFullYear() && s.month <= (now.getMonth() + 1)
    );

    const ytdPlanned = ytdSummaries.reduce((sum, s) => sum + s.totalPlanned, 0);
    const ytdActual = ytdSummaries.reduce((sum, s) => sum + s.totalActual, 0);
    const ytdVariance = ytdActual - ytdPlanned;

    return {
      summaries,
      currentMonth: currentMonth || {
        tenantId: tenantId || '',
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        fixedBaseline: 0,
        variableEstimated: 0,
        variableActual: 0,
        totalPlanned: 0,
        totalActual: 0,
        variance: 0,
        variancePercent: 0,
        dataCompleteness: 0,
      },
      ytdPlanned,
      ytdActual,
      ytdVariance,
      ytdVariancePercent: ytdPlanned > 0 ? (ytdVariance / ytdPlanned) * 100 : 0,
    };
  }, [query.data, tenantId, now]);

  return {
    ...query,
    ...derived,
  };
}
