/**
 * useExpensesDaily - CANONICAL HOOK for Expense Metrics
 * 
 * ⚠️ THIS IS THE SINGLE SOURCE OF TRUTH FOR EXPENSE METRICS
 * 
 * This hook ONLY fetches precomputed data from finance_expenses_daily.
 * NO business calculations are performed in this hook.
 * 
 * REPLACES:
 * - Direct queries to expenses table
 * - Client-side aggregation by category
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

// =============================================================
// TYPES - Mirror the database schema exactly
// =============================================================

export interface ExpensesDailyRow {
  id: string;
  tenant_id: string;
  day: string;
  total_amount: number;
  cogs_amount: number;
  salary_amount: number;
  rent_amount: number;
  utilities_amount: number;
  marketing_amount: number;
  logistics_amount: number;
  depreciation_amount: number;
  interest_amount: number;
  tax_amount: number;
  other_amount: number;
  expense_count: number;
  created_at: string;
  updated_at: string;
}

// Formatted for UI
export interface FormattedExpensesDaily {
  day: string;
  totalAmount: number;
  cogsAmount: number;
  salaryAmount: number;
  rentAmount: number;
  utilitiesAmount: number;
  marketingAmount: number;
  logisticsAmount: number;
  depreciationAmount: number;
  interestAmount: number;
  taxAmount: number;
  otherAmount: number;
  expenseCount: number;
}

// Aggregated summary
export interface ExpensesSummary {
  totalAmount: number;
  byCategory: {
    cogs: number;
    salary: number;
    rent: number;
    utilities: number;
    marketing: number;
    logistics: number;
    depreciation: number;
    interest: number;
    tax: number;
    other: number;
  };
  totalCount: number;
  periodStart: string;
  periodEnd: string;
}

// =============================================================
// MAIN HOOK - Fetch expenses daily (NO CALCULATIONS)
// =============================================================

interface UseExpensesDailyOptions {
  days?: number;
}

export function useExpensesDaily(options: UseExpensesDailyOptions = {}) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  const { days = 30 } = options;
  
  return useQuery({
    queryKey: ['expenses-daily', tenantId, startDateStr, endDateStr, days],
    queryFn: async (): Promise<FormattedExpensesDaily[]> => {
      if (!tenantId) return [];
      
      // Try RPC first (preferred)
      const { data: rpcData, error: rpcError } = await client
        .rpc('get_expenses_daily', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        });
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData.map(mapToFormatted);
      }
      
      // Fallback to direct table query
      let query = client
        .from('finance_expenses_daily')
        .select('*');
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query
        .gte('day', startDateStr)
        .lte('day', endDateStr)
        .order('day', { ascending: false })
        .limit(days);
      
      if (error) {
        console.error('[useExpensesDaily] Fetch error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) return [];
      
      // Map to formatted shape - NO CALCULATIONS
      return data.map(mapToFormatted);
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// =============================================================
// SPECIALIZED HOOKS (thin wrappers, NO CALCULATIONS)
// =============================================================

/**
 * Get expenses summary for period from precomputed data
 */
export function useExpensesSummary() {
  const { tenantId } = useTenantSupabaseCompat();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  const { data: dailyData } = useExpensesDaily({ days: 365 });
  
  return useQuery({
    queryKey: ['expenses-summary', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<ExpensesSummary | null> => {
      if (!dailyData || dailyData.length === 0) return null;
      
      // Sum up daily values (these are already precomputed in DB)
      // This is simple aggregation of precomputed daily values, NOT raw data calculation
      const summary: ExpensesSummary = {
        totalAmount: dailyData.reduce((sum, d) => sum + d.totalAmount, 0),
        byCategory: {
          cogs: dailyData.reduce((sum, d) => sum + d.cogsAmount, 0),
          salary: dailyData.reduce((sum, d) => sum + d.salaryAmount, 0),
          rent: dailyData.reduce((sum, d) => sum + d.rentAmount, 0),
          utilities: dailyData.reduce((sum, d) => sum + d.utilitiesAmount, 0),
          marketing: dailyData.reduce((sum, d) => sum + d.marketingAmount, 0),
          logistics: dailyData.reduce((sum, d) => sum + d.logisticsAmount, 0),
          depreciation: dailyData.reduce((sum, d) => sum + d.depreciationAmount, 0),
          interest: dailyData.reduce((sum, d) => sum + d.interestAmount, 0),
          tax: dailyData.reduce((sum, d) => sum + d.taxAmount, 0),
          other: dailyData.reduce((sum, d) => sum + d.otherAmount, 0),
        },
        totalCount: dailyData.reduce((sum, d) => sum + d.expenseCount, 0),
        periodStart: startDateStr,
        periodEnd: endDateStr,
      };
      
      return summary;
    },
    enabled: !!tenantId && !!dailyData && dailyData.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================
// HELPER - Map DB row to formatted UI object (NO CALCULATIONS)
// =============================================================

function mapToFormatted(raw: ExpensesDailyRow | Record<string, unknown>): FormattedExpensesDaily {
  return {
    day: String(raw.day || ''),
    totalAmount: Number(raw.total_amount) || 0,
    cogsAmount: Number(raw.cogs_amount) || 0,
    salaryAmount: Number(raw.salary_amount) || 0,
    rentAmount: Number(raw.rent_amount) || 0,
    utilitiesAmount: Number(raw.utilities_amount) || 0,
    marketingAmount: Number(raw.marketing_amount) || 0,
    logisticsAmount: Number(raw.logistics_amount) || 0,
    depreciationAmount: Number(raw.depreciation_amount) || 0,
    interestAmount: Number(raw.interest_amount) || 0,
    taxAmount: Number(raw.tax_amount) || 0,
    otherAmount: Number(raw.other_amount) || 0,
    expenseCount: Number(raw.expense_count) || 0,
  };
}
