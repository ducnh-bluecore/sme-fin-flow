/**
 * useWorkingCapitalDaily - CANONICAL HOOK for Working Capital Metrics
 * 
 * ⚠️ THIS IS THE SINGLE SOURCE OF TRUTH FOR WORKING CAPITAL METRICS
 * 
 * This hook ONLY fetches precomputed data from working_capital_daily.
 * NO business calculations are performed in this hook.
 * 
 * REPLACES:
 * - useCentralFinancialMetrics for DSO/DPO/DIO/CCC
 * - useWorkingCapitalSummary with raw table queries
 * - useCashConversionCycle with client-side calculations
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

// =============================================================
// TYPES - Mirror the database schema exactly
// =============================================================

export interface WorkingCapitalDailyRow {
  id: string;
  tenant_id: string;
  day: string;
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  total_ar: number;
  overdue_ar: number;
  total_ap: number;
  overdue_ap: number;
  inventory: number;
  net_working_capital: number;
  cash_balance: number;
  ar_turnover: number;
  ap_turnover: number;
  inventory_turnover: number;
  created_at: string;
  updated_at: string;
}

// Formatted for UI
export interface FormattedWorkingCapital {
  day: string;
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  totalAR: number;
  overdueAR: number;
  totalAP: number;
  overdueAP: number;
  inventory: number;
  netWorkingCapital: number;
  cashBalance: number;
  arTurnover: number;
  apTurnover: number;
  inventoryTurnover: number;
}

// =============================================================
// MAIN HOOK - Fetch working capital daily (NO CALCULATIONS)
// =============================================================

interface UseWorkingCapitalDailyOptions {
  days?: number;
}

export function useWorkingCapitalDaily(options: UseWorkingCapitalDailyOptions = {}) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  const { days = 30 } = options;
  
  return useQuery({
    queryKey: ['working-capital-daily', tenantId, startDateStr, endDateStr, days],
    queryFn: async (): Promise<FormattedWorkingCapital[]> => {
      if (!tenantId) return [];
      
      // Try RPC first (preferred)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_working_capital_daily', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        });
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData.map(mapToFormatted);
      }
      
      // Fallback to direct table query
      const { data, error } = await supabase
        .from('working_capital_daily')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('day', startDateStr)
        .lte('day', endDateStr)
        .order('day', { ascending: false })
        .limit(days);
      
      if (error) {
        console.error('[useWorkingCapitalDaily] Fetch error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) return [];
      
      // Map to formatted shape - NO CALCULATIONS
      return data.map(mapToFormatted);
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// =============================================================
// SPECIALIZED HOOKS (thin wrappers, NO CALCULATIONS)
// =============================================================

/**
 * Get latest working capital snapshot
 */
export function useLatestWorkingCapital() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['working-capital-latest', tenantId],
    queryFn: async (): Promise<FormattedWorkingCapital | null> => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('working_capital_daily')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('day', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) return null;
      
      return mapToFormatted(data);
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get CCC trend for charts
 */
export function useCCCTrend(days: number = 30) {
  return useWorkingCapitalDaily({ days });
}

// =============================================================
// HELPER - Map DB row to formatted UI object (NO CALCULATIONS)
// =============================================================

function mapToFormatted(raw: WorkingCapitalDailyRow | Record<string, unknown>): FormattedWorkingCapital {
  return {
    day: String(raw.day || ''),
    dso: Number(raw.dso) || 0,
    dpo: Number(raw.dpo) || 0,
    dio: Number(raw.dio) || 0,
    ccc: Number(raw.ccc) || 0,
    totalAR: Number(raw.total_ar) || 0,
    overdueAR: Number(raw.overdue_ar) || 0,
    totalAP: Number(raw.total_ap) || 0,
    overdueAP: Number(raw.overdue_ap) || 0,
    inventory: Number(raw.inventory) || 0,
    netWorkingCapital: Number(raw.net_working_capital) || 0,
    cashBalance: Number(raw.cash_balance) || 0,
    arTurnover: Number(raw.ar_turnover) || 0,
    apTurnover: Number(raw.ap_turnover) || 0,
    inventoryTurnover: Number(raw.inventory_turnover) || 0,
  };
}
