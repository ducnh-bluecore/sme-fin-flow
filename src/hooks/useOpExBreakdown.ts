/**
 * useOpExBreakdown - Hook for detailed Operating Expense breakdown
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useExpenseBaselines } from '@/hooks/useExpenseBaselines';

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

const CATEGORY_LABELS: Record<string, string> = {
  salary: 'Lương nhân viên',
  rent: 'Thuê mặt bằng',
  utilities: 'Điện nước & Internet',
  other: 'Chi phí khác',
};

export function useOpExBreakdown() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { baselines, totalMonthlyFixed, isLoading: baselinesLoading } = useExpenseBaselines();

  // Fetch actual expenses from expenses table for current month
  const { data: actualExpenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['opex-actual-expenses', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await buildSelectQuery('expenses', 'id, category, description, amount, is_recurring')
        .gte('expense_date', startOfMonth.toISOString())
        .order('expense_date', { ascending: false });
      
      if (error) {
        console.error('[useOpExBreakdown] Expenses error:', error);
        return [];
      }
      
      return (data || []) as unknown as Array<{
        id: string;
        category: string;
        description: string;
        amount: number;
        is_recurring: boolean;
      }>;
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });

  const breakdown = useMemo<OpExBreakdown>(() => {
    let salary = 0;
    let rent = 0;
    let utilities = 0;
    let other = 0;

    // Aggregate baselines by category
    if (baselines && baselines.length > 0) {
      baselines.forEach(b => {
        switch (b.category) {
          case 'salary':
            salary += b.monthlyAmount;
            break;
          case 'rent':
            rent += b.monthlyAmount;
            break;
          case 'utilities':
            utilities += b.monthlyAmount;
            break;
          default:
            other += b.monthlyAmount;
        }
      });
    }

    // If no baselines, try to categorize from actual expenses
    if (totalMonthlyFixed === 0 && actualExpenses && actualExpenses.length > 0) {
      actualExpenses.forEach(exp => {
        const desc = (exp.description || '').toLowerCase();
        const amount = exp.amount || 0;
        
        if (desc.includes('lương') || desc.includes('salary') || desc.includes('nhân viên')) {
          salary += amount;
        } else if (desc.includes('thuê') || desc.includes('rent') || desc.includes('mặt bằng')) {
          rent += amount;
        } else if (desc.includes('điện') || desc.includes('nước') || desc.includes('internet') || desc.includes('utility')) {
          utilities += amount;
        } else {
          other += amount;
        }
      });
    }

    const total = salary + rent + utilities + other;

    const allCategories: OpExCategory[] = [
      {
        category: 'salary' as const,
        label: CATEGORY_LABELS.salary,
        amount: salary,
        percentOfTotal: total > 0 ? (salary / total) * 100 : 0,
        source: baselines.some(b => b.category === 'salary') ? 'baseline' as const : 'actual' as const,
      },
      {
        category: 'rent' as const,
        label: CATEGORY_LABELS.rent,
        amount: rent,
        percentOfTotal: total > 0 ? (rent / total) * 100 : 0,
        source: baselines.some(b => b.category === 'rent') ? 'baseline' as const : 'actual' as const,
      },
      {
        category: 'utilities' as const,
        label: CATEGORY_LABELS.utilities,
        amount: utilities,
        percentOfTotal: total > 0 ? (utilities / total) * 100 : 0,
        source: baselines.some(b => b.category === 'utilities') ? 'baseline' as const : 'actual' as const,
      },
      {
        category: 'other' as const,
        label: CATEGORY_LABELS.other,
        amount: other,
        percentOfTotal: total > 0 ? (other / total) * 100 : 0,
        source: baselines.some(b => b.category === 'other') ? 'baseline' as const : 'actual' as const,
      },
    ];
    
    const categories = allCategories.filter(c => c.amount > 0);

    const hasBaselineData = totalMonthlyFixed > 0;
    const hasActualData = (actualExpenses?.length ?? 0) > 0;

    return {
      salary,
      rent,
      utilities,
      other,
      total,
      categories,
      hasBaselineData,
      hasActualData,
      periodLabel: hasBaselineData ? 'Định mức hàng tháng' : 'Tháng hiện tại',
      calculationMethod: hasBaselineData ? 'baseline_monthly' : 'actual_current_month',
      calculationDescription: hasBaselineData
        ? 'Dựa trên định mức chi phí cố định được cấu hình trong Định nghĩa chi phí'
        : 'Dựa trên chi phí thực tế phát sinh trong tháng hiện tại',
    };
  }, [baselines, totalMonthlyFixed, actualExpenses]);

  return {
    breakdown,
    isLoading: baselinesLoading || expensesLoading,
    hasData: breakdown.total > 0,
  };
}
